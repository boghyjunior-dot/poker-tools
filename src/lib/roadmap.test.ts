import { describe, expect, it } from 'vitest'
import { monthsToReach, stageIndex, STAGES, TRUTHS } from './roadmap'

/** Pull the first number out of a string like "$3,000 – $8,000" or "150–250". */
const firstNumber = (text: string): number => {
  const match = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

describe('the road', () => {
  it('runs from nothing to high stakes in six numbered stages', () => {
    expect(STAGES).toHaveLength(6)
    expect(STAGES.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6])
    expect(STAGES[0].bankroll).toBe('$0')
    expect(STAGES[STAGES.length - 1].id).toBe('high')
  })

  it('gives every stage a unique id and a colour', () => {
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length)
    for (const stage of STAGES) {
      expect(stage.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('asks for more money the further along you are', () => {
    // Stage 1 is free, so the ladder starts at the second rung.
    const money = STAGES.slice(1).map((s) => firstNumber(s.bankroll))
    for (let i = 1; i < money.length; i++) {
      expect(money[i]).toBeGreaterThan(money[i - 1])
    }
  })

  it('asks for more study the further along you are', () => {
    const hours = STAGES.map((s) => firstNumber(s.study))
    for (let i = 1; i < hours.length; i++) {
      expect(hours[i]).toBeGreaterThanOrEqual(hours[i - 1])
    }
  })

  it('tells you what to learn, how to know you are done, and what really happens', () => {
    for (const stage of STAGES) {
      expect(stage.skills.length).toBeGreaterThanOrEqual(4)
      expect(stage.proof.length).toBeGreaterThan(20)
      expect(stage.reality.length).toBeGreaterThan(40)
    }
  })

  it('only links to tools that exist', () => {
    const pages = new Set([
      'quiz.html',
      'charts.html',
      'leakfinder.html',
      'variance.html',
      'equity.html',
      'bankroll.html',
      'mdf.html',
      'bounty.html',
      'practice.html',
    ])
    for (const stage of STAGES) {
      for (const tool of stage.tools) expect(pages.has(tool.href)).toBe(true)
    }
  })

  it('points the early stages at the tools a beginner can actually use', () => {
    expect(STAGES[0].tools.map((t) => t.href)).toContain('quiz.html')
    expect(STAGES[1].tools.map((t) => t.href)).toContain('charts.html')
  })
})

describe('monthsToReach', () => {
  it('starts at zero and only ever grows', () => {
    expect(monthsToReach(1)).toEqual({ low: 0, high: 0 })
    for (let step = 2; step <= STAGES.length; step++) {
      const previous = monthsToReach(step - 1)
      const current = monthsToReach(step)
      expect(current.low).toBeGreaterThanOrEqual(previous.low)
      expect(current.high).toBeGreaterThan(previous.high)
      // The earliest rungs are "about a month"; the spread only opens up later.
      expect(current.high).toBeGreaterThanOrEqual(current.low)
    }
  })

  it('widens the estimate the further out it reaches', () => {
    const spread = (step: number) => {
      const { low, high } = monthsToReach(step)
      return high - low
    }
    expect(spread(6)).toBeGreaterThan(spread(3))
    expect(spread(3)).toBeGreaterThan(spread(2))
  })

  it('clamps rather than running off the end of the table', () => {
    expect(monthsToReach(0)).toEqual(monthsToReach(1))
    expect(monthsToReach(99)).toEqual(monthsToReach(STAGES.length))
  })

  it('puts high stakes years away, not months', () => {
    expect(monthsToReach(6).low).toBeGreaterThanOrEqual(36)
  })
})

describe('stageIndex', () => {
  it('finds a stage by id and reports nothing for an unset one', () => {
    expect(stageIndex('rules')).toBe(0)
    expect(stageIndex('high')).toBe(STAGES.length - 1)
    expect(stageIndex(null)).toBe(-1)
    expect(stageIndex('not-a-stage')).toBe(-1)
  })
})

describe('the truths', () => {
  it('carries the cross-cutting ones, including the discouraging one', () => {
    expect(TRUTHS.length).toBeGreaterThanOrEqual(5)
    for (const truth of TRUTHS) {
      expect(truth.title.length).toBeGreaterThan(10)
      expect(truth.body.length).toBeGreaterThan(60)
    }
    // The page is not worth much if it only tells people what they want to hear.
    expect(TRUTHS.some((t) => /do not make it/i.test(t.title))).toBe(true)
  })
})
