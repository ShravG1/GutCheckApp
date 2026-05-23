import Icon from './Icon.jsx'
import { MEAL_LABELS } from '../lib/constants.js'
import { clockTime } from '../lib/dates.js'

export default function PendingCheckInsCard({ pending, onOpen }) {
  if (!pending.length) return null
  return (
    <div className="bg-sage rounded-card p-4 text-white card-shadow animate-slide-up">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="heart" size={20} />
        <h2 className="text-[17px] font-bold">
          {pending.length === 1
            ? 'A check-in is ready'
            : `${pending.length} check-ins ready`}
        </h2>
      </div>
      <p className="text-[14px] text-white/85 mb-3">
        How have you felt since these meals? A quick tap helps spot patterns.
      </p>
      <div className="flex flex-col gap-2">
        {pending.slice(0, 4).map(({ checkIn, meal }) => (
          <button
            key={checkIn.id}
            type="button"
            onClick={() => onOpen(meal.id)}
            className="w-full flex items-center justify-between gap-3 bg-white/15 rounded-2xl px-3.5 min-h-[52px] text-left active:bg-white/25"
          >
            <span className="min-w-0">
              <span className="block font-semibold text-[15px] truncate">
                {meal.foodText || MEAL_LABELS[meal.mealType]}
              </span>
              <span className="block text-[13px] text-white/75">
                {MEAL_LABELS[meal.mealType]} · {clockTime(meal.timestamp)}
              </span>
            </span>
            <Icon name="chevron" size={20} className="shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
