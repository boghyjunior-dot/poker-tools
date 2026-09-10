# Poker Tools

A free study suite for tournament poker that runs entirely in your browser. No
account, no server, no install — every calculation happens on your machine and
anything you save stays in your own `localStorage`.

**Live at [boghyjunior-dot.github.io/poker-tools](https://boghyjunior-dot.github.io/poker-tools/)**

| Tool | What it answers | Status |
| --- | --- | --- |
| [Roadmap](#roadmap) | What do I actually understand, and what comes next? | Local only |
| [Schedule](#schedule) | How long have I got to register? | Local only |
| [Bankroll Tracker](#bankroll-tracker) | What is my roll actually doing? | Local only |
| [MDF Range Tool](#mdf-range-tool) | How much of my range do I have to defend? | In progress |
| [MDF Practice](#mdf-practice) | Can I actually hit that frequency under fire? | Coming soon |
| [Equity Calculator](#equity-calculator) | How does this hand run against that range? | In review |
| [Mystery Bounty](#mystery-bounty) | What is a knockout worth right now? | In review |
| [Bankroll](#bankroll) | What stakes can I afford to play? | Done |
| [MTT Variance](#mtt-variance) | How bad can a downswing get? | Done |
| [Preflop Charts](#preflop-charts) | What do I open from here? | In progress |
| [Quiz Me](#quiz-me) | Do I know the numbers cold? | In progress |
| [Randomizer](#randomizer) | Which branch of a mixed strategy do I take? | Done |
| [Leak Finder](#leak-finder) | What should I fix first? | Done |

---

## Roadmap

Six stages of understanding, from not knowing the rules to knowing the
baseline well enough to leave it on purpose.

The rungs are what you know, not what you play. Stakes make a bad ladder:
players move up on a heater and down on a downswing without their game
changing either way, and plenty of strong players stay low on purpose. Money
and volume still appear on every stage, because a concept is not learned until
it has survived a sample — but they sit under the idea rather than above it.

- Each stage names the one idea it is about, what you can explain by the end,
  and the test for owning it — phrased as understanding rather than results
- **What you still cannot see**: the blind spot each stage leaves, which is
  what points at the next one
- An animated SVG road whose geometry is generated from the milestone
  positions, so the curve keeps passing through them if a stage is added
- Mark the last stage you could explain out loud and the road fills in behind
  you; every animation is dropped for `prefers-reduced-motion`

**Local only.** The Roadmap is visible in the dev server but left out of the
published site. It is not just hidden: the build drops the entry entirely, so
no HTML reaches `dist`, there is no URL to stumble onto and nothing in the
sitemap. To ship it, set the variable:

```bash
VITE_PUBLISH_ROADMAP=true npm run build
```

Schedule and Bankroll Tracker are held back the same way, behind
`VITE_PUBLISH_SESSION`. The mechanism works for any page — add it to `LOCAL_ONLY` in
`vite.config.ts` and gate its menu section with a flag from
`src/lib/featureFlags.ts`. While a page is local-only it says so in a banner,
so you cannot mistake the dev server for the live site.

## Schedule

The tournaments you are registered for, with late registration counting down
on each and an alarm before it closes.

There is no feed to subscribe to — everything here runs in your browser — so
the schedule is what you type or paste. Paste a few lines from a lobby and it
picks the start time, buy-in and late-reg window out of each one:

```
20:15  $22  Bounty Hunter  90m
21:00 | $5.50 | Micro Millions | late 120
```

- Sorted by which deadline lands first, with finished tournaments pushed down
- Per-tournament alarm, set in minutes before late reg closes
- Alarms show a browser notification, beep, and raise a banner that keeps
  counting down
- **They only fire while the tab is open.** There is no service worker and no
  server, so a closed tab means no alarm

## Bankroll Tracker

Where the ROI the other tools ask for should come from — measured rather than
remembered, since almost everybody remembers it high.

- Profit, ROI on total cost, ITM percentage and average buy-in
- Worst peak-to-trough drawdown, counting the roll you started with as the
  first peak
- Bounties are logged apart from the cash so they do not hide inside it
- A running bankroll line, and CSV export
- Says plainly when a sample is too short to size a bankroll from

## MDF Range Tool

Build defending ranges against different bet sizes using **minimum defence
frequency**: the share of your range you have to continue with so a bluff at
that price shows no automatic profit.

- 13×13 hand matrix, painted by click or drag
- Bet presets from b25 to b200, each with its target fold percentage
- Tag hands call or fold and watch your combo-weighted fold percentage against
  the target
- Bulk filters by rank, hand category or suit
- Board picker for flop, turn and river — folded combos drop out each street
- Everything persists in `localStorage`

| Bet | Target fold % | | Bet | Target fold % |
| --- | --- | --- | --- | --- |
| b25 | 20% | | b100 | 50% |
| b33 | 25% | | b120 | 54% |
| b40 | 28% | | b150 | 60% |
| b50 | 33% | | b200 | 66% |
| b67 | 40% | | | |
| b75 | 42% | | | |

## MDF Practice

The same idea as a drill. Defend a preset range against random bet sizes on
flop, turn and river, and get scored on how close your folding frequency lands
to the target.

## Equity Calculator

Preflop equity by Monte Carlo simulation: a specific hand or a whole range
against one or more opponents.

- Hand vs range, range vs range, and multiway
- Preset opening ranges from top 10% through to the full range
- Margin of error reported alongside every result, so you know how much to
  trust it
- Bounty-aware call EV, including whether you actually cover the player whose
  bounty you would be winning

## Mystery Bounty

What a knockout is worth — both before the bounty phase starts and, more
usefully, right now.

- Average and typical bounty in cash, chips and big blinds, converted through
  the prize-pool share of the buy-in rather than the total
- **The drum**: enter the envelopes still in it, rung by rung, and every figure
  follows as they get drawn
- Which rung you are most likely to draw, the median, and each rung's share of
  the money left
- Whether the drum is still rich or has been picked over, against the
  start-of-phase average
- How long the top rung is likely to survive as players bust
- Calling maths with **coverage handled**: a bounty is only winnable if you can
  eliminate the player holding it, so anyone who covers you contributes nothing
- A bubble factor applied to the chips you risk — bounty money is cash and is
  not discounted by ICM, which is why bounties loosen bubble play
- Turns the break-even number into hands by scoring the standard range widths
  against a chosen jamming range
- Saved events, ladder presets, paste-a-table import and Markdown export

## Bankroll

Which buy-ins your roll actually supports. Rather than quote a flat number of
buy-ins — which has to be wrong for almost everybody, since a 180-man turbo and
a 5,000-runner major have completely different variance — it simulates the
tournaments you play and reads the answer off the loss distribution.

- Three tiers, each a tolerance for busting over the stretch you set:
  **aggressive** 15%, **normal** 5%, **conservative** 1%
- Each gives a buy-in range in cash, with the floor at a tenth of the ceiling
- Every common buy-in judged: how deep you are, your risk of ruin, and the cash
  each tier demands
- What the buy-in you play would need to become a normal-tier game rather than
  a shot, and how many tournaments of grinding gets you there
- A losing ROI short-circuits the tiers, because a bigger roll only buys a
  longer decline

## MTT Variance

Simulate a run of tournaments and see what the swings look like.

- Fan chart of confidence bands with individual simulated runs drawn over it
- Histogram of where every run finished
- Typical and worst downswing, chance of losing over the stretch, and risk of
  ruin against a bankroll
- Seeded, so the same inputs always give the same run

## Preflop Charts

MTT opening ranges by seat and stack depth, entered as plain range strings.

- Accepts `22+`, `Ax+`, `K6s+`, `A5s-A2s`, `76s` and the rest of the usual
  shorthand
- Layered charts with colours by action — red raise, dark red all-in, green call
- Mixed strategies render as diagonal stripes and carry their frequency
- Combo-weighted drill that accepts either answer on a mixed hand
- Ships cEV at 100bb for all eight seats; ICM and other depths are wired up and
  waiting on ranges

## Quiz Me

Flashcards, heuristics and multiple-choice questions for drilling the numbers.
Bundled decks cover combo maths, pot odds and MDF, and you can import your own
from a JSON or Markdown file.

## Randomizer

A random number from 1 to 100 for executing mixed strategies at the table.
Auto-rolls every 15 seconds, and opens in a small always-on-top window that
fits in the corner of your screen while you play.

## Leak Finder

Import a positional export from **PokerTracker**, **Hold'em Manager** or
**Hand2Note** and find out what to work on.

- Reads a positional CSV or a flat list of stats, and aggregates an Overall
  column that trackers do not export
- Every leak ranked across every seat, so the report opens on what to fix first
  rather than seven scores to compare by hand
- Sample size actually counts: per-stat opportunity counts cap a thin leak's
  severity and weight it down in the score
- Each leak links to the tool that fixes it
- Editable targets — the baselines are opinions, and you can disagree with them
- Snapshots you can diff, to see whether last month's work moved anything
- Markdown export

---

## Development

```bash
npm install
npm run dev      # dev server
npm run build    # production build into dist/
npm run test     # unit tests
npm run lint     # eslint
```

Vite multi-page app: every tool has its own HTML entry at the repo root, a
`src/<tool>-main.tsx` mount, a page component under `src/components/`, and an
entry in `vite.config.ts`. `base` is `./` so the build works from a subpath.

Pushing to `main` deploys `dist/` to GitHub Pages via
`.github/workflows/static.yml`.

### Conventions

- Combo weighting throughout: a pair is 6 combos, a suited hand 4, an offsuit
  hand 12 — 1,326 in a full range across 169 grid cells
- Monte Carlo simulations are seeded, so results are reproducible
- Charts are hand-rolled inline SVG; there is no charting dependency
- Saved data lives in `localStorage` and can shadow bundled content, so tools
  that ship content also ship a way to reset to it

### SEO

Each page carries its own title, description, canonical URL and social card
tags. `public/robots.txt` and `public/sitemap.xml` are generated for the live
URL, and the home page carries JSON-LD describing the suite and its tools. If
the site ever moves to another domain, those URLs need updating in the page
heads, the sitemap and robots.txt.
