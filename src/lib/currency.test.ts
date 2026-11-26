import { describe, expect, it } from 'vitest'
import {
  CURRENCIES,
  CURRENCY_CODES,
  convert,
  formatAmount,
  fromUsd,
  showInCurrency,
  toUsd,
  type CurrencyCode,
} from './currency'
import { bountyPoints, stakeFactor } from './leaderboard'

describe('the currencies on offer', () => {
  it('lists three, dollars first', () => {
    expect(CURRENCY_CODES).toEqual(['USD', 'EUR', 'CNY'])
  })

  it('has a symbol and a rate for every one of them', () => {
    for (const code of CURRENCY_CODES) {
      expect(CURRENCIES[code].symbol).not.toBe('')
      expect(CURRENCIES[code].perUsd).toBeGreaterThan(0)
    }
  })

  it('leaves the dollar alone', () => {
    expect(CURRENCIES.USD.perUsd).toBe(1)
    expect(toUsd(22, 'USD')).toBe(22)
    expect(fromUsd(22, 'USD')).toBe(22)
  })
})

describe('turning money into dollars and back', () => {
  it('comes back to where it started', () => {
    for (const code of CURRENCY_CODES) {
      expect(fromUsd(toUsd(54, code), code)).toBeCloseTo(54, 10)
    }
  })

  it('knows a euro is worth more than a dollar', () => {
    expect(toUsd(100, 'EUR')).toBeGreaterThan(100)
  })

  it('knows a yuan is worth less', () => {
    expect(toUsd(100, 'CNY')).toBeLessThan(100)
  })

  it('treats a half-typed box as nothing rather than as NaN', () => {
    expect(toUsd(Number.NaN, 'EUR')).toBe(0)
    expect(fromUsd(Number.NaN, 'CNY')).toBe(0)
    expect(convert(Number.NaN, 'USD', 'USD')).toBe(0)
  })
})

describe('changing the currency under the figures', () => {
  it('is a no-op when the currency has not changed', () => {
    expect(convert(22.5, 'EUR', 'EUR')).toBe(22.5)
  })

  it('keeps the same money through a round trip', () => {
    expect(convert(convert(54, 'USD', 'CNY'), 'CNY', 'USD')).toBeCloseTo(54, 10)
  })

  it('goes between two non-dollar currencies through the dollar', () => {
    expect(convert(100, 'EUR', 'CNY')).toBeCloseTo(
      fromUsd(toUsd(100, 'EUR'), 'CNY'),
      10,
    )
  })
})

describe('what the conversion is allowed to change', () => {
  /**
   * The point of the whole exercise: the same tournament scores the same
   * however it was priced, so converting may only move the terms that are
   * denominated in dollars.
   */
  it('leaves the bounty term alone, because it is a ratio', () => {
    const inDollars = bountyPoints(44, 22)
    for (const code of CURRENCY_CODES) {
      const buyIn = fromUsd(22, code)
      const bounties = fromUsd(44, code)
      expect(bountyPoints(toUsd(bounties, code), toUsd(buyIn, code))).toBeCloseTo(inDollars, 10)
    }
  })

  it('leaves the stake multiplier alone once the buy-in is back in dollars', () => {
    for (const code of CURRENCY_CODES) {
      expect(stakeFactor(toUsd(fromUsd(33, code), code))).toBeCloseTo(stakeFactor(33), 10)
    }
  })

  it('would move the stake multiplier if the conversion were skipped', () => {
    // Not a rule, a warning: a yuan buy-in taken at face value is a
    // different and much dearer tournament as far as the formula is
    // concerned, which is why the band check converts first.
    expect(stakeFactor(fromUsd(33, 'CNY'))).toBeGreaterThan(stakeFactor(33))
  })
})

describe('writing an amount out', () => {
  it('puts the symbol in front', () => {
    expect(formatAmount(22, 'USD')).toBe('$22')
    expect(formatAmount(22, 'EUR')).toBe('€22')
    expect(formatAmount(22, 'CNY')).toBe('¥22')
  })

  it('leaves a whole number whole', () => {
    expect(formatAmount(66, 'USD')).toBe('$66')
  })

  it('gives two places to anything that has them', () => {
    expect(formatAmount(60.1982, 'EUR')).toBe('€60.20')
  })

  it('groups the thousands', () => {
    expect(formatAmount(1500, 'CNY')).toBe('¥1,500')
  })

  it('rounds a converted figure to the cent rather than to the atom', () => {
    const shown = showInCurrency(66, 'EUR')
    expect(shown).toBe('€60.20')
    expect(shown).not.toContain('60.1982')
  })

  it('shows a dollar amount in dollars unchanged', () => {
    expect(showInCurrency(5, 'USD')).toBe('$5')
  })
})

describe('every currency, for every helper', () => {
  it('is handled without a special case falling through', () => {
    for (const code of CURRENCY_CODES as readonly CurrencyCode[]) {
      expect(Number.isFinite(toUsd(10, code))).toBe(true)
      expect(Number.isFinite(fromUsd(10, code))).toBe(true)
      expect(showInCurrency(10, code)).toContain(CURRENCIES[code].symbol)
    }
  })
})
