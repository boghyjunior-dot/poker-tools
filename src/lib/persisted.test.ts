import { describe, expect, it } from 'vitest'
import { planLoad, shouldPersist } from './persisted'

const db = [{ id: 'db1' }, { id: 'db2' }]
const legacy = [{ id: 'ls1' }]
const seed = () => [{ id: 'seed1' }, { id: 'seed2' }]

describe('deciding what a list starts as', () => {
  it('takes the database whenever it holds anything', () => {
    const plan = planLoad({ fromDatabase: db, fromLegacy: legacy, seed })
    expect(plan.records).toEqual(db)
    expect(plan.source).toBe('database')
    expect(plan.writeBack).toBe(false)
  })

  it('never lets a stale localStorage copy overwrite newer work', () => {
    // An older build left rows behind. The database has moved on since.
    const plan = planLoad({ fromDatabase: db, fromLegacy: legacy, seed })
    expect(plan.records.map((r) => r.id)).not.toContain('ls1')
  })

  it('moves localStorage across once, when the database is empty', () => {
    const plan = planLoad({ fromDatabase: [], fromLegacy: legacy, seed })
    expect(plan.records).toEqual(legacy)
    expect(plan.source).toBe('migrated')
    expect(plan.writeBack).toBe(true)
  })

  it('migrates in preference to seeding, so a first run keeps what you had', () => {
    // The seed is the built-in cards. Handing those to someone who already
    // has a schedule would bury it under three hundred rows.
    const plan = planLoad({ fromDatabase: [], fromLegacy: legacy, seed, seeded: false })
    expect(plan.source).toBe('migrated')
  })

  it('seeds only when there is nothing anywhere and nothing has been seeded', () => {
    const plan = planLoad({ fromDatabase: [], fromLegacy: [], seed, seeded: false })
    expect(plan.records).toEqual(seed())
    expect(plan.source).toBe('seeded')
    expect(plan.writeBack).toBe(true)
  })

  it('stays empty once the seed has been offered, so clearing means it', () => {
    const plan = planLoad({ fromDatabase: [], fromLegacy: [], seed, seeded: true })
    expect(plan.records).toEqual([])
    expect(plan.source).toBe('empty')
    expect(plan.writeBack).toBe(false)
  })

  it('stays empty when there is no seed to fall back on', () => {
    const plan = planLoad({ fromDatabase: [], fromLegacy: [] })
    expect(plan.source).toBe('empty')
    expect(plan.writeBack).toBe(false)
  })

  it('copies rather than handing back the arrays it was given', () => {
    const source = [{ id: 'a' }]
    const plan = planLoad({ fromDatabase: source, fromLegacy: [] })
    expect(plan.records).not.toBe(source)
    plan.records.push({ id: 'b' })
    expect(source).toHaveLength(1)
  })
})

describe('the guard on saving', () => {
  it('refuses every write until the load has returned', () => {
    // The whole point. A save before then is the page's empty starting
    // state, and writing that is how a year of results disappears.
    expect(shouldPersist(false)).toBe(false)
    expect(shouldPersist(true)).toBe(true)
  })
})
