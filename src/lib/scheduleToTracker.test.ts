import { describe, expect, it } from 'vitest'
import { entryDate, entryFromTournament } from './scheduleToTracker'
import { entryProfit, type Entry } from './tracker'
import type { Tournament, TournamentResult } from './schedule'

const tournament = (over: Partial<Tournament> = {}): Tournament => ({
  id: 't1',
  name: 'Bounty Hunters $21.60',
  site: 'GGPoker',
  startsAt: new Date(2026, 9, 17, 20, 30).toISOString(),
  buyIn: 21.6,
  lateRegMinutes: 120,
  plan: 'busted',
  alarmMinutes: 10,
  ...over,
})

const result = (over: Partial<TournamentResult> = {}): TournamentResult => ({
  cashed: 0,
  bounties: 0,
  position: null,
  ...over,
})

describe('the day a result is logged under', () => {
  it('is the local day the tournament started', () => {
    expect(entryDate(new Date(2026, 9, 17, 20, 30).toISOString())).toBe('2026-10-17')
  })

  it('stays on the night you played, not the UTC day it became', () => {
    // 23:30 on a Saturday is already Sunday in Greenwich east of it. The
    // session was Saturday's, and the log should agree with the player.
    expect(entryDate(new Date(2026, 9, 17, 23, 30).toISOString())).toBe('2026-10-17')
  })

  it('falls back to today rather than writing an unreadable date', () => {
    expect(entryDate('not a date')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('turning a busted tournament into a tracker entry', () => {
  it('carries the name, room and buy-in across', () => {
    const entry = entryFromTournament(tournament(), result(), 'e1')
    expect(entry).toMatchObject<Partial<Entry>>({
      id: 'e1',
      date: '2026-10-17',
      name: 'Bounty Hunters $21.60',
      site: 'GGPoker',
      buyIn: 21.6,
    })
  })

  it('logs a plain bust as a loss of the buy-in', () => {
    const entry = entryFromTournament(tournament(), result(), 'e1')
    expect(entry.cashed).toBe(0)
    expect(entry.bounties).toBe(0)
    expect(entryProfit(entry)).toBeCloseTo(-21.6, 10)
  })

  it('keeps the cash and the bounties apart', () => {
    // The Tracker reports them separately on purpose, so a bounty-heavy night
    // does not read as a deep run.
    const entry = entryFromTournament(tournament(), result({ cashed: 140, bounties: 65 }), 'e1')
    expect(entry.cashed).toBe(140)
    expect(entry.bounties).toBe(65)
    expect(entryProfit(entry)).toBeCloseTo(140 + 65 - 21.6, 10)
  })

  it('notes the finishing place, which an entry has nowhere else to keep', () => {
    const entry = entryFromTournament(tournament(), result({ position: 47 }), 'e1')
    expect(entry.notes).toContain('47')
  })

  it('says nothing about a place you did not record', () => {
    expect(entryFromTournament(tournament(), result(), 'e1').notes).toBeUndefined()
  })

  it('keeps a note the tournament already had, and adds to it', () => {
    const entry = entryFromTournament(
      tournament({ notes: 'satellite seat' }),
      result({ position: 3 }),
      'e1',
    )
    expect(entry.notes).toContain('satellite seat')
    expect(entry.notes).toContain('3')
  })

  it('refuses negative money rather than logging a profit nobody made', () => {
    const entry = entryFromTournament(
      tournament({ buyIn: -5 }),
      result({ cashed: -100, bounties: -2 }),
      'e1',
    )
    expect(entry.buyIn).toBe(0)
    expect(entry.cashed).toBe(0)
    expect(entry.bounties).toBe(0)
  })

  it('gives an unnamed tournament something to be called', () => {
    expect(entryFromTournament(tournament({ name: '   ' }), result(), 'e1').name).toBe('Untitled')
  })

  it('issues an id of its own when not given one', () => {
    const a = entryFromTournament(tournament(), result())
    const b = entryFromTournament(tournament(), result())
    expect(a.id).not.toBe(b.id)
  })
})
