import { describe, it, expect } from 'vitest'
import { computeInsights, describePattern } from './insights.js'
import { FINE } from './constants.js'

// Small fixture builders. Meals and check-ins use the same shape the app's
// Dexie store produces: a meal has { id, timestamp, tags, foodText }; a
// check-in has { mealId, completedAt, skipped, symptoms, severity }.
let nextId = 1
function meal({ tags = [], foodText = '', timestamp = Date.parse('2026-06-01T12:00:00Z') } = {}) {
  return { id: nextId++, timestamp, tags, foodText }
}

// A "logged" check-in is completed and not skipped — only these count.
function checkIn(mealId, symptoms, { completed = true, skipped = false, severity = 2 } = {}) {
  return {
    mealId,
    completedAt: completed ? Date.parse('2026-06-01T16:00:00Z') : null,
    skipped,
    symptoms,
    severity,
  }
}

describe('computeInsights / detectPatterns', () => {
  it('surfaces a symptom that follows a tag 3 times as the headline pattern at the right rate', () => {
    // Four 'dairy' meals, 'bloating' on three of them → 3 of 4 = 0.75.
    const meals = [
      meal({ tags: ['dairy'] }),
      meal({ tags: ['dairy'] }),
      meal({ tags: ['dairy'] }),
      meal({ tags: ['dairy'] }),
    ]
    const checkIns = [
      checkIn(meals[0].id, ['bloating']),
      checkIn(meals[1].id, ['bloating']),
      checkIn(meals[2].id, ['bloating']),
      checkIn(meals[3].id, [FINE]), // tracked but no real symptom
    ]

    const { headline, patterns } = computeInsights(meals, checkIns)

    expect(headline).not.toBeNull()
    expect(headline).toMatchObject({
      type: 'tag',
      key: 'dairy',
      symptom: 'bloating',
      hits: 3,
      total: 4,
    })
    expect(headline.rate).toBeCloseTo(0.75)
    // Only the bloating/dairy pattern clears MIN_OCCURRENCES (3).
    expect(patterns).toHaveLength(1)
    expect(describePattern(headline)).toBe('Bloating followed dairy foods 3 of 4 times')
  })

  it('does NOT surface a 2x association (below MIN_OCCURRENCES)', () => {
    // 'spicy' → 'cramping' only twice. Must stay hidden.
    const meals = [meal({ tags: ['spicy'] }), meal({ tags: ['spicy'] }), meal({ tags: ['spicy'] })]
    const checkIns = [
      checkIn(meals[0].id, ['cramping']),
      checkIn(meals[1].id, ['cramping']),
      checkIn(meals[2].id, [FINE]),
    ]

    const { headline, patterns } = computeInsights(meals, checkIns)

    expect(patterns).toHaveLength(0)
    expect(headline).toBeNull()
  })

  it('excludes "fine"-only check-ins from symptom counts and patterns', () => {
    const meals = [
      meal({ tags: ['gluten'] }),
      meal({ tags: ['gluten'] }),
      meal({ tags: ['gluten'] }),
    ]
    const checkIns = meals.map((m) => checkIn(m.id, [FINE]))

    const { patterns, topSymptoms, headline } = computeInsights(meals, checkIns)

    expect(patterns).toHaveLength(0)
    expect(headline).toBeNull()
    expect(topSymptoms).toHaveLength(0)
    // All three meals are still counted as tracked (they had logged check-ins).
    const result = computeInsights(meals, checkIns)
    expect(result.trackedMeals).toBe(3)
  })

  it('ignores skipped and incomplete check-ins (only isLogged ones count)', () => {
    // Three 'caffeine' meals + headache, but the symptoms arrive via a skipped
    // and an incomplete check-in on two of them → only one real hit.
    const meals = [
      meal({ tags: ['caffeine'] }),
      meal({ tags: ['caffeine'] }),
      meal({ tags: ['caffeine'] }),
    ]
    const checkIns = [
      checkIn(meals[0].id, ['headache']),
      checkIn(meals[1].id, ['headache'], { skipped: true }),
      checkIn(meals[2].id, ['headache'], { completed: false }),
    ]

    const { patterns, topSymptoms, trackedMeals } = computeInsights(meals, checkIns)

    // 1 real headache hit < MIN_OCCURRENCES → no pattern.
    expect(patterns).toHaveLength(0)
    expect(topSymptoms).toEqual([{ symptom: 'headache', count: 1 }])
    // Only the first meal has a logged check-in.
    expect(trackedMeals).toBe(1)
  })

  it('derives both a tag pattern and a food-text pattern, sorted by rate then hits', () => {
    // Same four meals tagged 'fried' AND with foodText 'chips'. Bloating on 3.
    // Both 'tag:fried' and 'food:chips' should produce a bloating pattern with
    // identical hits/total, so two patterns surface.
    const meals = [
      meal({ tags: ['fried'], foodText: 'Chips' }),
      meal({ tags: ['fried'], foodText: 'chips' }),
      meal({ tags: ['fried'], foodText: 'chips ' }),
      meal({ tags: ['fried'], foodText: 'chips' }),
    ]
    const checkIns = [
      checkIn(meals[0].id, ['bloating']),
      checkIn(meals[1].id, ['bloating']),
      checkIn(meals[2].id, ['bloating']),
      checkIn(meals[3].id, [FINE]),
    ]

    const { patterns } = computeInsights(meals, checkIns)

    const types = patterns.map((p) => p.type).sort()
    expect(types).toEqual(['food', 'tag'])
    // foodText is normalised (trim + lowercase) so all four collapse to "chips".
    const food = patterns.find((p) => p.type === 'food')
    expect(food.key).toBe('chips')
    expect(food).toMatchObject({ symptom: 'bloating', hits: 3, total: 4 })
  })

  it('filters meals by sinceTs', () => {
    const old = Date.parse('2026-05-01T12:00:00Z')
    const recent = Date.parse('2026-06-10T12:00:00Z')
    const meals = [
      meal({ tags: ['alcohol'], timestamp: old }),
      meal({ tags: ['alcohol'], timestamp: recent }),
      meal({ tags: ['alcohol'], timestamp: recent }),
      meal({ tags: ['alcohol'], timestamp: recent }),
    ]
    const checkIns = meals.map((m) => checkIn(m.id, ['nausea']))

    const sinceJune = Date.parse('2026-06-01T00:00:00Z')
    const { totalMeals, patterns } = computeInsights(meals, checkIns, sinceJune)

    // Only the three recent meals are in range → 3 nausea hits, just clears the bar.
    expect(totalMeals).toBe(3)
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({ symptom: 'nausea', hits: 3, total: 3 })
  })
})
