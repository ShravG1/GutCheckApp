import { FINE } from './constants.js'
import { sameDayKey } from './dates.js'

// Minimum occurrences before a pattern is shown — keeps noise down.
const MIN_OCCURRENCES = 3

const PARTS_OF_DAY = [
  { key: 'morning', label: 'Morning', from: 5, to: 11 },
  { key: 'midday', label: 'Midday', from: 11, to: 16 },
  { key: 'evening', label: 'Evening', from: 16, to: 22 },
  { key: 'night', label: 'Night', from: 22, to: 5 },
]

function partOfDay(hour) {
  for (const p of PARTS_OF_DAY) {
    if (p.key === 'night') {
      if (hour >= 22 || hour < 5) return p
    } else if (hour >= p.from && hour < p.to) {
      return p
    }
  }
  return PARTS_OF_DAY[0]
}

// Completed, non-skipped check-ins only.
function isLogged(checkIn) {
  return !!checkIn.completedAt && !checkIn.skipped
}

function realSymptoms(symptoms) {
  return (symptoms || []).filter((s) => s && s !== FINE)
}

/**
 * Build all insight data from the raw meals + check-ins.
 * `sinceTs` filters meals by their timestamp (null = all time).
 */
export function computeInsights(meals, checkIns, sinceTs = null) {
  const inRange = sinceTs
    ? meals.filter((m) => m.timestamp >= sinceTs)
    : meals.slice()

  const checkInsByMeal = new Map()
  for (const c of checkIns) {
    if (!checkInsByMeal.has(c.mealId)) checkInsByMeal.set(c.mealId, [])
    checkInsByMeal.get(c.mealId).push(c)
  }

  // Per-meal analysis: which symptoms followed, and was it tracked at all.
  const analysed = inRange.map((meal) => {
    const cis = (checkInsByMeal.get(meal.id) || []).filter(isLogged)
    const symptomSet = new Set()
    let maxSeverity = 0
    for (const c of cis) {
      for (const s of realSymptoms(c.symptoms)) symptomSet.add(s)
      if (typeof c.severity === 'number') {
        maxSeverity = Math.max(maxSeverity, c.severity)
      }
    }
    return {
      meal,
      tracked: cis.length > 0,
      symptoms: [...symptomSet],
      maxSeverity,
    }
  })

  const patterns = detectPatterns(analysed)
  const topSymptoms = countSymptoms(inRange, checkInsByMeal)
  const trend = buildTrend(inRange, checkInsByMeal)
  const byPartOfDay = buildPartOfDay(analysed)
  const quietDays = buildQuietDays(analysed)
  const trackedMeals = analysed.filter((a) => a.tracked).length

  return {
    patterns,
    headline: patterns[0] || null,
    topSymptoms,
    trend,
    byPartOfDay,
    quietDays,
    totalMeals: inRange.length,
    trackedMeals,
  }
}

function detectPatterns(analysed) {
  // item -> { total, symptoms: Map<symptom, hits> }
  const items = new Map()

  function touch(type, key) {
    const id = `${type}:${key}`
    if (!items.has(id)) {
      items.set(id, { type, key, total: 0, symptoms: new Map() })
    }
    return items.get(id)
  }

  for (const a of analysed) {
    if (!a.tracked) continue
    const keys = []
    for (const tag of a.meal.tags || []) keys.push(['tag', tag])
    const food = (a.meal.foodText || '').trim().toLowerCase()
    if (food) keys.push(['food', food])

    for (const [type, key] of keys) {
      const entry = touch(type, key)
      entry.total += 1
      for (const symptom of a.symptoms) {
        entry.symptoms.set(symptom, (entry.symptoms.get(symptom) || 0) + 1)
      }
    }
  }

  const patterns = []
  for (const entry of items.values()) {
    for (const [symptom, hits] of entry.symptoms) {
      if (hits < MIN_OCCURRENCES) continue
      patterns.push({
        type: entry.type,
        key: entry.key,
        symptom,
        hits,
        total: entry.total,
        rate: hits / entry.total,
      })
    }
  }

  patterns.sort((a, b) => b.rate - a.rate || b.hits - a.hits)
  return patterns
}

function countSymptoms(meals, checkInsByMeal) {
  const counts = new Map()
  const mealIds = new Set(meals.map((m) => m.id))
  for (const [mealId, cis] of checkInsByMeal) {
    if (!mealIds.has(mealId)) continue
    for (const c of cis) {
      if (!isLogged(c)) continue
      for (const s of realSymptoms(c.symptoms)) {
        counts.set(s, (counts.get(s) || 0) + 1)
      }
    }
  }
  return [...counts.entries()]
    .map(([symptom, count]) => ({ symptom, count }))
    .sort((a, b) => b.count - a.count)
}

function buildTrend(meals, checkInsByMeal) {
  // Symptom-reporting check-ins grouped by the day of the meal.
  const byDay = new Map()
  for (const meal of meals) {
    const key = sameDayKey(meal.timestamp)
    if (!byDay.has(key)) byDay.set(key, { date: key, symptoms: 0 })
    const cis = checkInsByMeal.get(meal.id) || []
    for (const c of cis) {
      if (isLogged(c) && realSymptoms(c.symptoms).length) {
        byDay.get(key).symptoms += 1
      }
    }
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function buildPartOfDay(analysed) {
  const buckets = PARTS_OF_DAY.map((p) => ({ label: p.label, symptoms: 0 }))
  const index = Object.fromEntries(
    PARTS_OF_DAY.map((p, i) => [p.label, i]),
  )
  for (const a of analysed) {
    if (!a.symptoms.length) continue
    const p = partOfDay(new Date(a.meal.timestamp).getHours())
    buckets[index[p.label]].symptoms += a.symptoms.length
  }
  return buckets
}

function buildQuietDays(analysed) {
  // Group meals by day; a day is "quiet" if it had tracked meals and
  // not a single symptom was reported.
  const byDay = new Map()
  for (const a of analysed) {
    const key = sameDayKey(a.meal.timestamp)
    if (!byDay.has(key)) {
      byDay.set(key, { date: key, foods: [], tracked: 0, symptoms: 0 })
    }
    const d = byDay.get(key)
    if (a.meal.foodText) d.foods.push(a.meal.foodText)
    if (a.tracked) d.tracked += 1
    d.symptoms += a.symptoms.length
  }
  return [...byDay.values()]
    .filter((d) => d.tracked > 0 && d.symptoms === 0)
    .sort((a, b) => b.date.localeCompare(a.date))
}

// Phrase a pattern in plain language.
export function describePattern(p) {
  const subject = p.type === 'tag' ? `${p.key} foods` : `“${p.key}”`
  return `${capitalise(p.symptom)} followed ${subject} ${p.hits} of ${p.total} times`
}

export function capitalise(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
