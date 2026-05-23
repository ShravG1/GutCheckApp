// Shared vocabulary and defaults for GutCheck.

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export const MEAL_EMOJI = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

// Predefined food tags (UK English).
export const PREDEFINED_TAGS = [
  'dairy',
  'gluten',
  'spicy',
  'fried',
  'caffeine',
  'alcohol',
  'processed',
  'raw',
  'high-fibre',
  'sugary',
]

// Symptoms a check-in can record. 'fine' is special — it clears the others.
export const SYMPTOMS = [
  'bloating',
  'cramping',
  'gas',
  'nausea',
  'heartburn',
  'diarrhoea',
  'constipation',
  'fatigue',
  'headache',
  'brain fog',
  'skin reaction',
]

export const FINE = 'fine'

// Default check-in intervals in minutes after a meal: 1h, 4h, 12h, 24h.
export const DEFAULT_CHECK_IN_INTERVALS = [60, 240, 720, 1440]

export const DEFAULT_REMINDERS = {
  breakfast: { enabled: false, time: '08:00' },
  lunch: { enabled: false, time: '13:00' },
  dinner: { enabled: false, time: '19:00' },
}

export const DEFAULT_SETTINGS = {
  id: 1,
  checkInIntervals: [...DEFAULT_CHECK_IN_INTERVALS],
  reminders: structuredClone(DEFAULT_REMINDERS),
  notificationsEnabled: false,
  customTags: [],
  onboarded: false,
}

// Suggest a meal type from the time of day.
export function mealTypeForHour(hour) {
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 17 && hour < 22) return 'dinner'
  return 'snack'
}

// Human-friendly description of a minute offset.
export function formatInterval(minutes) {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  if (Number.isInteger(hours)) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }
  return `${hours.toFixed(1)} hours`
}
