import { describe, expect, it } from 'vitest'
import {
  amountFor,
  bankrollFields,
  legacyStart,
  parseBankrolls,
  setAmount,
  siteRolls,
  startingTotal,
  underwater,
} from './siteBankrolls'
import { UNKNOWN_SITE } from './sites'
import type { Entry } from './tracker'

let seq = 0
const entry = (over: Partial<Entry> = {}): Entry => ({
  id: `e${(seq += 1)}`,
  date: '2026-11-01',
  name: 'Bounty Hunters',
  site: 'GGPoker',
  buyIn: 22,
  fee: 0,
  cashed: 0,
  bounties: 0,
  ...over,
})

describe('the starting money', () => {
  it('adds the rooms up for the combined roll', () => {
    expect(startingTotal([{ id: 'GGPoker', amount: 300 }, { id: 'PokerStars', amount: 150 }])).toBe(
      450,
    )
    expect(startingTotal([])).toBe(0)
  })

  it('reads a room that was never given any as nothing, not as missing', () => {
    expect(amountFor([{ id: 'GGPoker', amount: 300 }], 'PokerStars')).toBe(0)
  })

  it('replaces a room amount rather than adding a second record', () => {
    const rolls = setAmount(setAmount([], 'GGPoker', 300), 'GGPoker', 400)
    expect(rolls).toEqual([{ id: 'GGPoker', amount: 400 }])
  })

  it('drops the room when the box is cleared', () => {
    // Clearing it is how you say "no money here", and a lingering $0 row would
    // keep claiming an account you closed.
    expect(setAmount([{ id: 'GGPoker', amount: 300 }], 'GGPoker', 0)).toEqual([])
  })

  it('keeps the rooms in dropdown order, not entry order', () => {
    const rolls = setAmount(setAmount([], 'PokerStars', 150), 'GGPoker', 300)
    expect(rolls.map((roll) => roll.id)).toEqual(['GGPoker', 'PokerStars'])
  })
})

describe('each room as an account', () => {
  it('measures a room balance from its own starting money', () => {
    const rows = siteRolls(
      [entry({ site: 'GGPoker', cashed: 100 }), entry({ site: 'GGPoker' })],
      [{ id: 'GGPoker', amount: 300 }],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ site: 'GGPoker', start: 300, count: 2, staked: 44, profit: 56 })
    expect(rows[0].balance).toBe(356)
  })

  it('keeps one room out of another room balance', () => {
    const rows = siteRolls(
      [entry({ site: 'GGPoker', cashed: 200 }), entry({ site: 'PokerStars' })],
      [
        { id: 'GGPoker', amount: 300 },
        { id: 'PokerStars', amount: 150 },
      ],
    )
    expect(rows.map((row) => [row.site, row.balance])).toEqual([
      ['GGPoker', 478],
      ['PokerStars', 128],
    ])
  })

  it('shows a room holding money before anything has been played there', () => {
    const rows = siteRolls([], [{ id: '888 Poker', amount: 60 }])
    expect(rows).toEqual([
      { site: '888 Poker', start: 60, count: 0, staked: 0, profit: 0, balance: 60 },
    ])
  })

  it('leaves out rooms with neither money nor results', () => {
    expect(siteRolls([entry({ site: 'GGPoker' })], []).map((row) => row.site)).toEqual(['GGPoker'])
  })

  it('collects untagged results in one place rather than losing them', () => {
    const rows = siteRolls([entry({ site: '  ', cashed: 50 })], [])
    expect(rows[0].site).toBe(UNKNOWN_SITE)
    expect(rows[0].profit).toBe(28)
  })

  it('puts the untagged bucket last, whatever it is called', () => {
    const rows = siteRolls([entry({ site: '' }), entry({ site: 'Aardvark Poker' })], [])
    expect(rows.map((row) => row.site)).toEqual(['Aardvark Poker', UNKNOWN_SITE])
  })

  it('flags a room the log has overspent, which the combined total hides', () => {
    // $300 staked against $100 ever put there: money arrived from somewhere
    // nobody told this app about.
    const rows = siteRolls(
      [entry({ site: 'Coin Poker', buyIn: 300 })],
      [{ id: 'Coin Poker', amount: 100 }],
    )
    expect(rows[0].balance).toBe(-200)
    expect(underwater(rows).map((row) => row.site)).toEqual(['Coin Poker'])
  })

  it('has no complaint about a room that is merely down', () => {
    const rows = siteRolls([entry({ site: 'GGPoker' })], [{ id: 'GGPoker', amount: 300 }])
    expect(underwater(rows)).toEqual([])
  })
})

describe('which rooms get a box', () => {
  it('offers every listed room before anything is logged', () => {
    expect(bankrollFields([], [])).toEqual([
      'GGPoker',
      'iPoker',
      'Coin Poker',
      'PokerStars',
      '888 Poker',
    ])
  })

  it('adds a room the log mentions that the list has never heard of', () => {
    expect(bankrollFields([entry({ site: 'Aardvark Poker' })], [])).toContain('Aardvark Poker')
  })

  it('offers the untagged bucket only when something is in it', () => {
    expect(bankrollFields([], [])).not.toContain(UNKNOWN_SITE)
    expect(bankrollFields([entry({ site: '' })], [])).toContain(UNKNOWN_SITE)
  })

  it('always offers a box for money that is stored, so it can be moved', () => {
    // Money with no box to edit is money you cannot correct.
    expect(bankrollFields([], [{ id: UNKNOWN_SITE, amount: 500 }])).toContain(UNKNOWN_SITE)
  })
})

describe('reading stored bankrolls back', () => {
  it('takes the rooms it can read', () => {
    expect(parseBankrolls([{ id: 'GGPoker', amount: 300 }])).toEqual([
      { id: 'GGPoker', amount: 300 },
    ])
  })

  it('throws out rows that are not money', () => {
    expect(
      parseBankrolls([
        { id: 'GGPoker', amount: 'lots' },
        { id: '', amount: 10 },
        { amount: 10 },
        { id: 'PokerStars', amount: -5 },
        { id: 'iPoker', amount: 0 },
        null,
        'nonsense',
      ]),
    ).toEqual([])
  })

  it('keeps one record per room if an older build wrote two', () => {
    expect(
      parseBankrolls([
        { id: 'GGPoker', amount: 100 },
        { id: 'GGPoker', amount: 300 },
      ]),
    ).toEqual([{ id: 'GGPoker', amount: 300 }])
  })

  it('has nothing to say about anything that is not a list', () => {
    expect(parseBankrolls(undefined)).toEqual([])
    expect(parseBankrolls({ GGPoker: 300 })).toEqual([])
  })
})

describe('the single bankroll this app used to keep', () => {
  it('moves it somewhere obvious rather than guessing a room', () => {
    // Guessing GG because most people play there would be inventing a fact
    // about someone's money.
    expect(legacyStart('500')).toEqual([{ id: UNKNOWN_SITE, amount: 500 }])
  })

  it('migrates nothing when there was nothing', () => {
    expect(legacyStart('0')).toEqual([])
    expect(legacyStart(null)).toEqual([])
    expect(legacyStart('')).toEqual([])
    expect(legacyStart('not a number')).toEqual([])
  })

  it('leaves the combined total exactly where it was', () => {
    expect(startingTotal(legacyStart('500'))).toBe(500)
  })
})
