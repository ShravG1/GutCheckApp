// Pragmatic notification handling for a PWA (no backend / push server).
//
// While the app is open we schedule notifications with setTimeout and fire
// them through the service worker registration so taps are handled even if
// the tab is backgrounded. When the app is closed nothing fires — instead,
// any check-in whose time has passed shows as a "pending check-in" card the
// next time the app is opened. This is the honest limit of a backend-free PWA.

import { MEAL_LABELS } from './constants.js'
import { clockTime } from './dates.js'

// Don't arm timers further out than this — they get unreliable, and the app
// re-syncs whenever it is reopened anyway.
const MAX_HORIZON_MS = 24 * 60 * 60 * 1000

let timers = []

export function notificationsSupported() {
  return typeof Notification !== 'undefined'
}

export function permissionState() {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

async function fire(title, body, data) {
  if (permissionState() !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data?.tag,
        data,
      })
      return
    }
  } catch {
    /* fall through to page-level notification */
  }
  try {
    new Notification(title, { body, icon: '/icon-192.png', data })
  } catch {
    /* notifications unavailable — silently ignore */
  }
}

function clearTimers() {
  for (const t of timers) clearTimeout(t)
  timers = []
}

function arm(at, fn) {
  const delay = at - Date.now()
  if (delay < 0 || delay > MAX_HORIZON_MS) return
  timers.push(setTimeout(fn, delay))
}

/**
 * Re-arm all timers from the current data. Safe to call repeatedly — it
 * clears previous timers first.
 */
export function syncSchedule({ checkIns, meals, settings }) {
  clearTimers()
  if (!settings?.notificationsEnabled || permissionState() !== 'granted') {
    return
  }

  const mealById = new Map(meals.map((m) => [m.id, m]))

  // Check-in reminders.
  for (const c of checkIns) {
    if (c.completedAt || c.skipped) continue
    const meal = mealById.get(c.mealId)
    if (!meal) continue
    const name = meal.foodText || MEAL_LABELS[meal.mealType] || 'meal'
    arm(c.scheduledFor, () =>
      fire(
        'How are you feeling?',
        `Checking in on your ${name} from ${clockTime(meal.timestamp)}.`,
        { tag: `checkin-${c.id}`, url: `/?checkin=${meal.id}` },
      ),
    )
  }

  // Meal reminders for the rest of today.
  for (const type of ['breakfast', 'lunch', 'dinner']) {
    const r = settings.reminders?.[type]
    if (!r?.enabled || !r.time) continue
    const [h, m] = r.time.split(':').map(Number)
    const when = new Date()
    when.setHours(h, m, 0, 0)
    arm(when.getTime(), () =>
      fire('GutCheck', `Time to log your ${type}.`, {
        tag: `reminder-${type}`,
        url: '/?tab=log',
      }),
    )
  }
}

export function stopSchedule() {
  clearTimers()
}
