import { useEffect, useMemo } from 'react'
import Icon from './Icon.jsx'
import { useNow } from '../hooks/useNow.js'
import { MEAL_LABELS, MEAL_EMOJI, FINE } from '../lib/constants.js'
import { clockTime, relativeFromNow } from '../lib/dates.js'
import { capitalise } from '../lib/insights.js'

function usePhotoUrl(blob) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}

function CheckInRow({ checkIn, now, onOpen }) {
  if (checkIn.completedAt) {
    const real = (checkIn.symptoms || []).filter((s) => s !== FINE)
    const feltFine = real.length === 0
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left flex items-start gap-2.5 py-2"
      >
        <span
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
            feltFine ? 'bg-sage text-white' : 'bg-terracotta text-white'
          }`}
        >
          <Icon name="check" size={13} strokeWidth={3} />
        </span>
        <span className="text-[15px] leading-snug">
          {feltFine ? (
            <span className="text-sage-dark font-medium">Felt fine</span>
          ) : (
            <>
              <span className="font-medium">{capitalise(real.join(', '))}</span>
              {checkIn.severity != null && (
                <span className="text-muted"> · {checkIn.severity}/10</span>
              )}
            </>
          )}
          <span className="text-muted">
            {' '}
            · {clockTime(checkIn.completedAt)}
          </span>
        </span>
      </button>
    )
  }

  if (checkIn.skipped) {
    return (
      <div className="flex items-center gap-2.5 py-2 text-[14px] text-muted">
        <span className="w-5 h-5 shrink-0 rounded-full border border-line" />
        Check-in skipped
      </div>
    )
  }

  const due = checkIn.scheduledFor <= now
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!due}
      className="w-full text-left flex items-center gap-2.5 py-2"
    >
      <span
        className={`w-5 h-5 shrink-0 rounded-full border-2 ${
          due ? 'border-sage animate-gentle-pulse' : 'border-line'
        }`}
      />
      <span className={`text-[15px] ${due ? 'text-sage-dark font-medium' : 'text-muted'}`}>
        {due
          ? 'Check-in ready — tap to answer'
          : `Check-in ${relativeFromNow(checkIn.scheduledFor)}`}
      </span>
    </button>
  )
}

export default function MealCard({ meal, checkIns = [], onEdit, onOpenCheckIn }) {
  const photoUrl = usePhotoUrl(meal.photoBlob)
  const now = useNow()
  const sorted = [...checkIns].sort((a, b) => a.scheduledFor - b.scheduledFor)

  return (
    <div className="bg-card rounded-card card-shadow p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="text-[26px] leading-none mt-0.5">
          {MEAL_EMOJI[meal.mealType]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-[16px]">
              {MEAL_LABELS[meal.mealType]}
            </span>
            <span className="text-[14px] text-muted">
              {clockTime(meal.timestamp)}
            </span>
          </div>
          <p className="text-[16px] mt-0.5 break-words">
            {meal.foodText || (
              <span className="text-muted italic">No description</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit meal"
          className="shrink-0 w-11 h-11 -mr-1 -mt-1 flex items-center justify-center rounded-full text-muted active:bg-cream"
        >
          <Icon name="edit" size={19} />
        </button>
      </div>

      {meal.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {meal.tags.map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-full bg-sage-light text-sage-dark text-[13px] font-medium"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {photoUrl && (
        <img
          src={photoUrl}
          alt="Meal"
          className="mt-3 w-full h-44 object-cover rounded-2xl"
        />
      )}

      {meal.notes && (
        <p className="mt-2.5 text-[14px] text-muted leading-relaxed">
          {meal.notes}
        </p>
      )}

      {sorted.length > 0 && (
        <div className="mt-3 pt-2 border-t border-line">
          {sorted.map((c) => (
            <CheckInRow
              key={c.id}
              checkIn={c}
              now={now}
              onOpen={() => onOpenCheckIn(c)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
