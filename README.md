# Poker Tools

A client-side poker study suite:

- **MDF Range Tool** — build defending ranges and track fold % vs MDF targets
- **MDF Practice** — gamified flop → turn → river drill with random bets
- **Equity Calculator** — preflop Monte Carlo equity (hand vs range, multiway)
- **Randomizer** — 1–100 randomizer with auto-roll and color zones

## MDF Range Tool

Build defending ranges against different bet sizes using **Minimum Defense Frequency (MDF)**.

### Features

- **13×13 hand matrix** with standard layout (suited above diagonal, offsuit below, pairs on diagonal)
- **Custom range painting** — click or drag to add hands to your range
- **MDF bet presets** — b25 through b200 with target fold percentages
- **Manual call/fold tagging** — mark hands and track combo-weighted fold % vs target
- **Bulk filters** — exclude entire ranks, hand categories, or specific suits (♠♥♦♣)
- **Auto-save** — range and settings persist in `localStorage`
- **Board picker** — set flop, turn, and river; folded combos drop out each street

### MDF Targets

| Bet | Target fold % |
|-----|---------------|
| b25 | 20% |
| b33 | 25% |
| b40 | 28% |
| b50 | 33% |
| b67 | 40% |
| b75 | 42% |
| b100 | 50% |
| b120 | 54% |
| b150 | 60% |
| b200 | 66% |

## Development

```bash
npm install
npm run dev      # start dev server → home.html
npm run build    # production build
npm run test     # run unit tests
```

Deploy the `dist` folder to GitHub Pages (or any static host). Entry point: `home.html`.

## Combo math

Fold % uses standard combo weighting: pairs = 6, suited = 4, offsuit = 12 combos per cell.
