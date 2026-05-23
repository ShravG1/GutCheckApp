import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isYesterday,
  startOfDay,
  endOfDay,
  subDays,
} from 'date-fns'
import { enGB } from 'date-fns/locale'

const opts = { locale: enGB }

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function longDate(date) {
  return format(date, 'EEEE d MMMM', opts)
}

export function shortDate(date) {
  return format(date, 'EEE d MMM', opts)
}

export function dayLabel(date) {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE d MMMM', opts)
}

export function clockTime(date) {
  return format(date, 'HH:mm', opts)
}

// Value usable by <input type="datetime-local">.
export function toLocalInputValue(date) {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function fromLocalInputValue(value) {
  return new Date(value).getTime()
}

export function relativeFromNow(date) {
  return formatDistanceToNowStrict(date, { ...opts, addSuffix: true })
}

export function dayRange(date) {
  return { start: startOfDay(date).getTime(), end: endOfDay(date).getTime() }
}

// Returns the last `n` days as Date objects, oldest first.
export function lastNDays(n, from = new Date()) {
  const out = []
  for (let i = n - 1; i >= 0; i--) out.push(startOfDay(subDays(from, i)))
  return out
}

export function sameDayKey(ts) {
  return format(new Date(ts), 'yyyy-MM-dd')
}
