/**
 * A tournament schedule you keep yourself.
 *
 * There is no server here and no feed to subscribe to, so the schedule is
 * whatever you type or paste in. That is the honest version of the idea: the
 * value is not in scraping a lobby, it is in seeing late registration closing
 * across everything you registered for at once, and being told before it does.
 */

export interface Tournament {
  id: string
  name: string
  /** Room or network, free text — this tool does not know about sites. */
  site: string
  /** ISO timestamp of the scheduled start. */
  startsAt: string
  buyIn: number
  /** Minutes of late registration from the start. */
  lateRegMinutes: number
  guarantee?: number
  /** Whether you actually registered, as opposed to just watching it. */
  registered: boolean
  /** Alarm before late reg closes, in minutes; null means no alarm. */
  alarmMinutes: number | null
  notes?: string
}

export type TournamentStatus = 'scheduled' | 'lateReg' | 'closed'

export interface TournamentView extends Tournament {
  status: TournamentStatus
  /** Milliseconds until the clock starts; negative once it has. */
  msToStart: number
  /** Milliseconds until late registration closes; negative once it has. */
  msToLateRegClose: number
  lateRegClosesAt: string
  /** True when the alarm window is open and it has not been dismissed. */
  alarmDue: boolean
}

const MINUTE = 60_000

export function lateRegCloseTime(tournament: Tournament): number {
  return new Date(tournament.startsAt).getTime() + tournament.lateRegMinutes * MINUTE
}

/**
 * Decorate a tournament with everything that depends on the current time.
 *
 * `now` is passed in rather than read from the clock so the whole view is a
 * pure function of its inputs, which is what makes it testable.
 */
export function viewTournament(tournament: Tournament, now: number): TournamentView {
  const start = new Date(tournament.startsAt).getTime()
  const close = lateRegCloseTime(tournament)
  const msToStart = start - now
  const msToLateRegClose = close - now

  const status: TournamentStatus =
    msToStart > 0 ? 'scheduled' : msToLateRegClose > 0 ? 'lateReg' : 'closed'

  const alarmDue =
    tournament.alarmMinutes !== null &&
    tournament.registered &&
    msToLateRegClose > 0 &&
    msToLateRegClose <= tournament.alarmMinutes * MINUTE

  return {
    ...tournament,
    status,
    msToStart,
    msToLateRegClose,
    lateRegClosesAt: new Date(close).toISOString(),
    alarmDue,
  }
}

/** Soonest deadline first, with closed tournaments pushed to the bottom. */
export function sortByUrgency(views: TournamentView[]): TournamentView[] {
  return [...views].sort((a, b) => {
    if (a.status === 'closed' && b.status !== 'closed') return 1
    if (b.status === 'closed' && a.status !== 'closed') return -1
    return a.msToLateRegClose - b.msToLateRegClose
  })
}

/**
 * Which tournaments should sound an alarm right now.
 *
 * `fired` carries the ids already announced, so an alarm goes off once as its
 * window opens rather than on every tick of the clock.
 */
export function dueAlarms(
  views: TournamentView[],
  fired: ReadonlySet<string>,
): TournamentView[] {
  return views.filter((view) => view.alarmDue && !fired.has(view.id))
}

/** Total staked on everything you actually registered for. */
export function committed(views: TournamentView[]): number {
  return views
    .filter((view) => view.registered && view.status !== 'closed')
    .reduce((sum, view) => sum + view.buyIn, 0)
}

export interface ScheduleParse {
  tournaments: Tournament[]
  errors: string[]
}

const TIME = /(\d{1,2}):(\d{2})/

/**
 * Read a pasted schedule.
 *
 * Lobbies export in every layout imaginable, so rather than parse a format
 * this takes a line at a time and looks for the pieces: a time, a buy-in with a
 * currency symbol, and whatever text is left over as the name.
 *
 *     20:15  $22  Bounty Hunter  90m
 *     21:00 | $5.50 | Micro Millions | late 120
 *
 * Every line in one paste belongs to the same room, which is how a lobby is
 * actually copied — one site at a time.
 */
export function parseScheduleText(
  text: string,
  options: { today?: Date; site?: string } = {},
): ScheduleParse {
  const { today = new Date(), site = '' } = options
  const tournaments: Tournament[] = []
  const errors: string[] = []
  let seq = 0

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') continue

    const timeMatch = TIME.exec(line)
    if (!timeMatch) {
      errors.push(`No start time in "${line}"`)
      continue
    }

    const hours = Number(timeMatch[1])
    const minutes = Number(timeMatch[2])
    if (hours > 23 || minutes > 59) {
      errors.push(`"${timeMatch[0]}" is not a time`)
      continue
    }

    const rest = line.replace(timeMatch[0], ' ')

    // A buy-in carries a currency symbol; a bare number could be anything.
    const money = rest.match(/[$€£]\s?(\d+(?:[.,]\d+)?)/)
    const buyIn = money ? Number(money[1].replace(',', '.')) : 0

    // "90m", "late 120" or "+120" all mean the late-reg window.
    const late = rest.match(/(?:late\D{0,3}|\+)(\d{1,3})|(\d{1,3})\s?m\b/i)
    const lateRegMinutes = late ? Number(late[1] ?? late[2]) : 60

    const name = rest
      .replace(money?.[0] ?? '', ' ')
      .replace(late?.[0] ?? '', ' ')
      .replace(/[|,;\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    const startsAt = new Date(today)
    startsAt.setHours(hours, minutes, 0, 0)

    tournaments.push({
      id: `paste-${Date.now().toString(36)}-${seq++}`,
      name: name || 'Untitled',
      site,
      startsAt: startsAt.toISOString(),
      buyIn,
      lateRegMinutes,
      registered: false,
      alarmMinutes: 10,
    })
  }

  if (tournaments.length === 0 && errors.length === 0) {
    errors.push('Nothing to read. Each line needs at least a start time.')
  }

  return { tournaments, errors }
}

/**
 * Rooms the schedule knows by name.
 *
 * Only suggestions: the site field stays free text, because networks and skins
 * multiply faster than any list here could keep up with. Nothing about a
 * tournament is inferred from its room — late registration varies far too much
 * between events for a per-site default to be anything but a wrong guess.
 */
export const SITES = ['GGPoker', 'CoinPoker', 'iPoker', 'PokerStars', 'partypoker'] as const

/** Every room actually present in a schedule, for the filter row. */
export function sitesInUse(tournaments: readonly Tournament[]): string[] {
  const seen = new Set<string>()
  for (const tournament of tournaments) {
    const site = tournament.site.trim()
    if (site) seen.add(site)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

/** Committed money per room, so you can see where the night's stake sits. */
export function committedBySite(views: readonly TournamentView[]): { site: string; amount: number }[] {
  const totals = new Map<string, number>()
  for (const view of views) {
    if (!view.registered || view.status === 'closed') continue
    const site = view.site.trim() || 'Other'
    totals.set(site, (totals.get(site) ?? 0) + view.buyIn)
  }
  return [...totals.entries()]
    .map(([site, amount]) => ({ site, amount }))
    .sort((a, b) => b.amount - a.amount || a.site.localeCompare(b.site))
}

/** An empty filter means everything; otherwise only the rooms named. */
export function filterBySite(
  views: readonly TournamentView[],
  sites: ReadonlySet<string>,
): TournamentView[] {
  if (sites.size === 0) return [...views]
  return views.filter((view) => sites.has(view.site.trim()))
}

/** The whole schedule as JSON, so it can be backed up or shared. */
export function toJson(tournaments: readonly Tournament[]): string {
  return JSON.stringify(tournaments, null, 2)
}

export interface JsonImport {
  tournaments: Tournament[]
  error: string | null
}

/**
 * Read a schedule back from JSON.
 *
 * Ids are reissued so importing a file twice adds two copies rather than
 * silently overwriting the first — merging is the caller's decision, not this
 * function's.
 */
export function fromJson(text: string): JsonImport {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { tournaments: [], error: 'That is not valid JSON.' }
  }
  const tournaments = parseStored(raw).map((tournament) => ({
    ...tournament,
    id: newTournamentId(),
  }))
  if (tournaments.length === 0) {
    return { tournaments: [], error: 'No tournaments in that file.' }
  }
  return { tournaments, error: null }
}

export const STORAGE_KEY = 'poker-tools:schedule'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Stored JSON is untrusted, so every field is checked on the way back in. */
export function parseStored(raw: unknown): Tournament[] {
  if (!Array.isArray(raw)) return []
  const out: Tournament[] = []
  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const id = typeof entry.id === 'string' ? entry.id : null
    const startsAt = typeof entry.startsAt === 'string' ? entry.startsAt : null
    if (!id || !startsAt || Number.isNaN(new Date(startsAt).getTime())) continue

    const buyIn = Number(entry.buyIn)
    const lateRegMinutes = Number(entry.lateRegMinutes)
    const alarm = entry.alarmMinutes

    out.push({
      id,
      name: typeof entry.name === 'string' && entry.name ? entry.name : 'Untitled',
      site: typeof entry.site === 'string' ? entry.site : '',
      startsAt,
      buyIn: Number.isFinite(buyIn) && buyIn >= 0 ? buyIn : 0,
      lateRegMinutes: Number.isFinite(lateRegMinutes) && lateRegMinutes >= 0 ? lateRegMinutes : 60,
      guarantee:
        Number.isFinite(Number(entry.guarantee)) && Number(entry.guarantee) > 0
          ? Number(entry.guarantee)
          : undefined,
      registered: entry.registered === true,
      alarmMinutes:
        alarm === null || alarm === undefined
          ? null
          : Number.isFinite(Number(alarm)) && Number(alarm) >= 0
            ? Number(alarm)
            : null,
      notes: typeof entry.notes === 'string' ? entry.notes : undefined,
    })
  }
  return out
}

export function loadSchedule(): Tournament[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parseStored(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

export function saveSchedule(tournaments: Tournament[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments))
  } catch {
    // Private mode — the session still works, it just will not persist.
  }
}

export function newTournamentId(): string {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** "2h 14m", "9m", "closed" — a countdown people can read at a glance. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '—'
  const totalMinutes = Math.floor(ms / MINUTE)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) return `${hours}h ${minutes}m`
  if (totalMinutes > 0) return `${totalMinutes}m`
  return `${Math.max(1, Math.ceil(ms / 1000))}s`
}
