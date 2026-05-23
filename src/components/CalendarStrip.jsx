import { format, isToday, isSameDay } from 'date-fns'
import { enGB } from 'date-fns/locale'
import { lastNDays } from '../lib/dates.js'

export default function CalendarStrip({ selected, onPick }) {
  const days = lastNDays(7)
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
      {days.map((day) => {
        const today = isToday(day)
        const active = selected && isSameDay(day, selected)
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onPick(day)}
            className={`shrink-0 w-[52px] min-h-[64px] rounded-2xl flex flex-col items-center justify-center gap-0.5 border transition-colors
              ${
                active
                  ? 'bg-sage text-white border-sage'
                  : 'bg-white text-charcoal border-line'
              }`}
          >
            <span
              className={`text-[12px] font-medium ${
                active ? 'text-white/80' : 'text-muted'
              }`}
            >
              {format(day, 'EEE', { locale: enGB })}
            </span>
            <span className="text-[18px] font-semibold leading-none">
              {format(day, 'd')}
            </span>
            {today && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  active ? 'bg-white' : 'bg-sage'
                }`}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
