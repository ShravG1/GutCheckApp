import Dexie from 'dexie'
import { DEFAULT_SETTINGS } from '../lib/constants.js'

// Local-only database. Nothing here ever leaves the device.
export const db = new Dexie('gutcheck')

db.version(1).stores({
  // ++id = auto-increment primary key. Other fields listed are indexes.
  meals: '++id, timestamp, mealType',
  checkIns: '++id, mealId, scheduledFor, completedAt, skipped',
  settings: 'id',
})

// --- Settings -------------------------------------------------------------

export async function getSettings() {
  const row = await db.settings.get(1)
  if (row) return { ...DEFAULT_SETTINGS, ...row, id: 1 }
  await db.settings.put({ ...DEFAULT_SETTINGS })
  return { ...DEFAULT_SETTINGS }
}

export async function saveSettings(patch) {
  const current = await getSettings()
  const next = { ...current, ...patch, id: 1 }
  await db.settings.put(next)
  return next
}

// --- Meals ----------------------------------------------------------------

/**
 * Add a meal and schedule its check-ins.
 * Returns the new meal id.
 */
export async function addMeal(meal) {
  const settings = await getSettings()
  const timestamp = meal.timestamp ?? Date.now()
  const id = await db.meals.add({
    timestamp,
    mealType: meal.mealType,
    foodText: (meal.foodText || '').trim(),
    tags: meal.tags || [],
    photoBlob: meal.photoBlob || null,
    notes: (meal.notes || '').trim(),
  })

  const intervals = settings.checkInIntervals || []
  const checkIns = intervals.map((minutes) => ({
    mealId: id,
    scheduledFor: timestamp + minutes * 60_000,
    completedAt: null,
    symptoms: [],
    severity: null,
    notes: '',
    skipped: 0,
  }))
  if (checkIns.length) await db.checkIns.bulkAdd(checkIns)
  return id
}

/**
 * Update a meal's fields. If the timestamp changes, pending (not yet
 * completed/skipped) check-ins are rescheduled relative to the new time.
 */
export async function updateMeal(id, patch) {
  await db.transaction('rw', db.meals, db.checkIns, async () => {
    const meal = await db.meals.get(id)
    if (!meal) return
    const next = { ...meal, ...patch }
    next.foodText = (next.foodText || '').trim()
    next.notes = (next.notes || '').trim()
    await db.meals.put(next)

    if (patch.timestamp && patch.timestamp !== meal.timestamp) {
      const delta = patch.timestamp - meal.timestamp
      const pending = await db.checkIns
        .where('mealId')
        .equals(id)
        .filter((c) => !c.completedAt && !c.skipped)
        .toArray()
      for (const c of pending) {
        await db.checkIns.update(c.id, {
          scheduledFor: c.scheduledFor + delta,
        })
      }
    }
  })
}

export async function deleteMeal(id) {
  await db.transaction('rw', db.meals, db.checkIns, async () => {
    await db.checkIns.where('mealId').equals(id).delete()
    await db.meals.delete(id)
  })
}

// --- Check-ins ------------------------------------------------------------

export async function completeCheckIn(id, { symptoms, severity, notes }) {
  await db.checkIns.update(id, {
    completedAt: Date.now(),
    symptoms: symptoms || [],
    severity: severity ?? null,
    notes: (notes || '').trim(),
    skipped: 0,
  })
}

export async function skipCheckIn(id) {
  await db.checkIns.update(id, { skipped: 1, completedAt: null })
}

// Create an extra, manually-triggered check-in that is already answered.
export async function addCompletedCheckIn(mealId, { symptoms, severity, notes }) {
  const now = Date.now()
  return db.checkIns.add({
    mealId,
    scheduledFor: now,
    completedAt: now,
    symptoms: symptoms || [],
    severity: severity ?? null,
    notes: (notes || '').trim(),
    skipped: 0,
  })
}

// --- Danger zone ----------------------------------------------------------

export async function clearAllData() {
  await db.transaction('rw', db.meals, db.checkIns, db.settings, async () => {
    await db.meals.clear()
    await db.checkIns.clear()
    await db.settings.clear()
  })
}
