import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import MealCard from '../components/MealCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useAllMeals, useAllCheckIns } from '../hooks/useData.js'
import { dayLabel, sameDayKey } from '../lib/dates.js'

export default function HistoryScreen({ onClose, onOpenCheckIn, onEditMeal }) {
  const meals = useAllMeals()
  const checkIns = useAllCheckIns()
  const [query, setQuery] = useState('')

  const checkInsByMeal = useMemo(() => {
    const map = new Map()
    for (const c of checkIns) {
      if (!map.has(c.mealId)) map.set(c.mealId, [])
      map.get(c.mealId).push(c)
    }
    return map
  }, [checkIns])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...meals].sort((a, b) => b.timestamp - a.timestamp)
    if (!q) return list
    return list.filter((m) => {
      const inFood = (m.foodText || '').toLowerCase().includes(q)
      const inTags = (m.tags || []).some((t) => t.toLowerCase().includes(q))
      const inNotes = (m.notes || '').toLowerCase().includes(q)
      const inSymptoms = (checkInsByMeal.get(m.id) || []).some((c) =>
        (c.symptoms || []).some((s) => s.toLowerCase().includes(q)),
      )
      return inFood || inTags || inNotes || inSymptoms
    })
  }, [meals, query, checkInsByMeal])

  const days = useMemo(() => {
    const map = new Map()
    for (const m of filtered) {
      const key = sameDayKey(m.timestamp)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(m)
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <div className="min-h-dvh bg-cream flex flex-col">
      <header className="sticky top-0 z-10 bg-cream/95 backdrop-blur px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="w-11 h-11 flex items-center justify-center rounded-full active:bg-line"
          >
            <Icon name="back" size={24} />
          </button>
          <h1 className="text-[20px] font-bold">History</h1>
        </div>
        <div className="relative mt-2">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="search" size={20} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search food, tag or symptom"
            className="w-full rounded-2xl border border-line bg-white pl-11 pr-4 min-h-[50px] text-[16px] focus:outline-none focus:border-sage"
          />
        </div>
      </header>

      <div className="flex-1 px-4 pb-10 pt-2">
        {days.length === 0 ? (
          <div className="bg-card rounded-card card-shadow mt-4">
            <EmptyState
              icon={query ? 'search' : 'history'}
              title={query ? 'Nothing matches that' : 'No meals logged yet'}
              message={
                query
                  ? 'Try a different word.'
                  : 'Your meal history will appear here once you start logging.'
              }
            />
          </div>
        ) : (
          days.map(([key, dayMeals]) => (
            <div key={key} className="mb-5">
              <h2 className="text-[15px] font-semibold text-muted mb-2">
                {dayLabel(new Date(key))}
              </h2>
              <div className="space-y-3">
                {dayMeals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    checkIns={checkInsByMeal.get(meal.id) || []}
                    onEdit={() => onEditMeal(meal)}
                    onOpenCheckIn={(c) => onOpenCheckIn(meal.id, c?.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
