import { describe, expect, it } from 'vitest'
import { monthsToReach, stageIndex, STAGES, TRUTHS } from './roadmap'

/** Pull the first number out of a string like "$3,000 – $8,000" or "8–12 h". */
const firstNumber = (text: string): number => {
  const match = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

describe('the road', () => {
  it('climbs through six stages of understanding', () => {
    expect(STAGES).toHaveLength(6)
    expect(STAGES.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6])
    expect(STAGES[0].id).toBe('rules')
    expect(STAGES[STAGES.length - 1].id).toBe('deviation')
  })

  it('gives every stage a unique id and a colour', () => {
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length)
    for (const stage of STAGES) {
      expect(stage.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('names each rung after an idea rather than a stake level', () => {
    // A stage called "Micro stakes" would be the old, wrong axis.
    for (const stage of STAGES) {
      expect(stage.name).not.toMatch(/stakes/i)
      expect(stage.concept.length).toBeGreaterThan(6)
      // The concept is a phrase, not a buy-in.
      expect(stage.concept).not.toMatch(/^\$/)
    }
    expect(new Set(STAGES.map((s) => s.concept)).size).toBe(STAGES.length)
  })

  it('tests understanding rather than results', () => {
    for (const stage of STAGES) {
      expect(stage.proof.length).toBeGreaterThan(20)
      expect(stage.skills.length).toBeGreaterThanOrEqual(4)
      expect(stage.reality.length).toBeGreaterThan(40)
    }
    // Most rungs are proved by being able to say the thing out loud.
    const spoken = STAGES.filter((s) => /explain|say|name|write/i.test(s.proof))
    expect(spoken.length).toBeGreaterThanOrEqual(5)
  })

  it('tells you what you cannot see yet from every stage', () => {
    for (const stage of STAGES) {
      expect(stage.blindSpot.length).toBeGreaterThan(40)
    }
    expect(new Set(STAGES.map((s) => s.blindSpot)).size).toBe(STAGES.length)
  })

  it('keeps the blind spot of one stage pointed at the next idea', () => {
    // Ranges come before boards, boards before frequencies, frequencies before ICM.
    expect(STAGES[1].blindSpot).toMatch(/their|theirs/i)
    expect(STAGES[2].blindSpot).toMatch(/turn|river/i)
    expect(STAGES[3].blindSpot).toMatch(/chips|tournament/i)
  })

  it('still carries stakes and bankroll, as context under the idea', () => {
    for (const stage of STAGES) {
      expect(stage.stakes.length).toBeGreaterThan(0)
      expect(stage.bankroll.length).toBeGreaterThan(0)
    }
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

  it('points each stage at the tool that teaches its idea', () => {
    const hrefs = (step: number) => STAGES[step - 1].tools.map((t) => t.href)
    expect(hrefs(2)).toContain('charts.html')
    expect(hrefs(3)).toContain('equity.html')
    expect(hrefs(4)).toContain('mdf.html')
    expect(hrefs(5)).toContain('bounty.html')
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

  it('puts the last stage years away, not months', () => {
    expect(monthsToReach(6).low).toBeGreaterThanOrEqual(36)
  })
})

describe('stageIndex', () => {
  it('finds a stage by id and reports nothing for an unset one', () => {
    expect(stageIndex('rules')).toBe(0)
    expect(stageIndex('deviation')).toBe(STAGES.length - 1)
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
    expect(TRUTHS.some((t) => /stop at stage/i.test(t.title))).toBe(true)
  })

  it('says outright that stakes are not the ladder', () => {
    expect(TRUTHS.some((t) => /stakes are a consequence/i.test(t.title))).toBe(true)
  })
})
