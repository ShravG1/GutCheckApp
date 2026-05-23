import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db.js'
import { DEFAULT_SETTINGS } from '../lib/constants.js'
import { dayRange } from '../lib/dates.js'

// Returns undefined while loading, then the merged settings object.
export function useSettings() {
  return useLiveQuery(async () => {
    const row = await db.settings.get(1)
    return row ? { ...DEFAULT_SETTINGS, ...row } : { ...DEFAULT_SETTINGS }
  }, [])
}

export function useMealsForDay(date) {
  const ts = date.getTime()
  return useLiveQuery(
    async () => {
      const { start, end } = dayRange(date)
      return db.meals
        .where('timestamp')
        .between(start, end, true, true)
        .sortBy('timestamp')
    },
    [ts],
    [],
  )
}

export function useAllMeals() {
  return useLiveQuery(() => db.meals.orderBy('timestamp').toArray(), [], [])
}

export function useAllCheckIns() {
  return useLiveQuery(() => db.checkIns.toArray(), [], [])
}

export function useCheckInsForMeals(mealIds) {
  const key = mealIds.join(',')
  return useLiveQuery(
    async () => {
      if (!mealIds.length) return []
      return db.checkIns.where('mealId').anyOf(mealIds).toArray()
    },
    [key],
    [],
  )
}

// Check-ins that are due (or overdue) and not yet answered or skipped.
export function usePendingCheckIns() {
  return useLiveQuery(
    async () => {
      const now = Date.now()
      const due = await db.checkIns
        .where('scheduledFor')
        .belowOrEqual(now)
        .filter((c) => !c.completedAt && !c.skipped)
        .toArray()
      if (!due.length) return []
      const mealIds = [...new Set(due.map((c) => c.mealId))]
      const meals = await db.meals.bulkGet(mealIds)
      const mealById = new Map(
        meals.filter(Boolean).map((m) => [m.id, m]),
      )
      return due
        .map((c) => ({ checkIn: c, meal: mealById.get(c.mealId) }))
        .filter((x) => x.meal)
        .sort((a, b) => a.checkIn.scheduledFor - b.checkIn.scheduledFor)
    },
    [],
    [],
  )
}

// Distinct previously-logged foods, most recent first — used for autocomplete.
export function useFoodSuggestions() {
  return useLiveQuery(
    async () => {
      const meals = await db.meals
        .orderBy('timestamp')
        .reverse()
        .limit(400)
        .toArray()
      const seen = new Set()
      const out = []
      for (const m of meals) {
        const f = (m.foodText || '').trim()
        const key = f.toLowerCase()
        if (f && !seen.has(key)) {
          seen.add(key)
          out.push(f)
        }
      }
      return out
    },
    [],
    [],
  )
}
