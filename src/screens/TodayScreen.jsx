import { useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import CalendarStrip from '../components/CalendarStrip.jsx'
import PendingCheckInsCard from '../components/PendingCheckInsCard.jsx'
import MealCard from '../components/MealCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import {
  useMealsForDay,
  useCheckInsForMeals,
  usePendingCheckIns,
} from '../hooks/useData.js'
import { greeting, longDate } from '../lib/dates.js'

export default function TodayScreen({
  onOpenLog,
  onOpenCheckIn,
  onOpenHistory,
  onEditMeal,
}) {
  const today = useMemo(() => new Date(), [])
  const meals = useMealsForDay(today)
  const mealIds = useMemo(() => meals.map((m) => m.id), [meals])
  const checkIns = useCheckInsForMeals(mealIds)
  const pending = usePendingCheckIns()

  const checkInsByMeal = useMemo(() => {
    const map = new Map()
    for (const c of checkIns) {
      if (!map.has(c.mealId)) map.set(c.mealId, [])
      map.get(c.mealId).push(c)
    }
    return map
  }, [checkIns])

  return (
    <div className="min-h-dvh pb-28">
      <header className="px-4 pt-4 pb-2">
        <p className="text-[15px] text-muted">{greeting(today)}</p>
        <h1 className="text-[24px] font-bold leading-tight">
          {longDate(today)}
        </h1>
      </header>

      <div className="px-4 pt-1 pb-3">
        <CalendarStrip selected={today} onPick={onOpenHistory} />
      </div>

      <div className="px-4 space-y-3">
        {pending.length > 0 && (
          <PendingCheckInsCard pending={pending} onOpen={onOpenCheckIn} />
        )}

        {meals.length === 0 ? (
          <div className="bg-card rounded-card card-shadow mt-2">
            <EmptyState
              icon="leaf"
              title="No meals logged yet today"
              message="Tap the + button below to log what you've eaten. It only takes a moment."
            />
          </div>
        ) : (
          <>
            <h2 className="text-[15px] font-semibold text-muted pt-1">
              Today's meals
            </h2>
            {meals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                checkIns={checkInsByMeal.get(meal.id) || []}
                onEdit={() => onEditMeal(meal)}
                onOpenCheckIn={(c) => onOpenCheckIn(meal.id, c?.id)}
              />
            ))}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenLog}
        aria-label="Log a meal"
        className="fixed z-30 right-5 w-16 h-16 rounded-full bg-sage-dark text-white flex items-center justify-center card-shadow-lg active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <Icon name="plus" size={30} strokeWidth={2.6} />
      </button>
    </div>
  )
}
