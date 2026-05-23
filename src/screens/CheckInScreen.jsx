import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Icon from '../components/Icon.jsx'
import Chip from '../components/Chip.jsx'
import SeveritySlider from '../components/SeveritySlider.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  db,
  completeCheckIn,
  skipCheckIn,
  addCompletedCheckIn,
} from '../db/db.js'
import { SYMPTOMS, FINE, MEAL_LABELS } from '../lib/constants.js'
import { clockTime } from '../lib/dates.js'

function CheckInForm({ meal, target, onDone }) {
  const toast = useToast()
  const reopening = !!target?.completedAt

  const [symptoms, setSymptoms] = useState(() =>
    reopening ? target.symptoms || [] : [],
  )
  const [severity, setSeverity] = useState(() => target?.severity ?? 5)
  const [notes, setNotes] = useState(() => (reopening ? target.notes || '' : ''))
  const [busy, setBusy] = useState(false)

  const hasRealSymptom = symptoms.some((s) => s !== FINE)
  const mealName = meal.foodText || MEAL_LABELS[meal.mealType]

  function toggleSymptom(s) {
    setSymptoms((prev) => {
      if (s === FINE) return prev.includes(FINE) ? [] : [FINE]
      const next = prev.filter((x) => x !== FINE)
      return next.includes(s) ? next.filter((x) => x !== s) : [...next, s]
    })
  }

  async function handleSave() {
    if (symptoms.length === 0) {
      toast('Pick a symptom, or tap “I feel fine”.', 'terracotta')
      return
    }
    setBusy(true)
    const data = {
      symptoms,
      severity: hasRealSymptom ? severity : null,
      notes,
    }
    if (target) await completeCheckIn(target.id, data)
    else await addCompletedCheckIn(meal.id, data)
    toast('Check-in saved — thank you')
    onDone()
  }

  async function handleSkip() {
    if (target && !target.completedAt) await skipCheckIn(target.id)
    onDone()
  }

  return (
    <>
      <div className="flex-1 px-4 pb-40 space-y-6">
        <div className="bg-white rounded-card card-shadow p-4">
          <p className="text-[17px] leading-snug">
            How have you felt since your{' '}
            <span className="font-bold">{mealName}</span>
            <span className="text-muted"> at {clockTime(meal.timestamp)}?</span>
          </p>
        </div>

        <section>
          <label className="block text-[15px] font-semibold mb-2">
            Any symptoms? Tap all that apply.
          </label>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="I feel fine"
              emoji="🌿"
              selected={symptoms.includes(FINE)}
              onClick={() => toggleSymptom(FINE)}
            />
            {SYMPTOMS.map((s) => (
              <Chip
                key={s}
                label={s}
                tone="terracotta"
                selected={symptoms.includes(s)}
                onClick={() => toggleSymptom(s)}
              />
            ))}
          </div>
        </section>

        {hasRealSymptom && (
          <section className="bg-white rounded-card card-shadow p-4 animate-fade-in">
            <SeveritySlider value={severity} onChange={setSeverity} />
          </section>
        )}

        <section>
          <label className="block text-[15px] font-semibold mb-2">
            Notes <span className="text-muted font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything you noticed"
            className="w-full rounded-2xl border border-line bg-white p-3.5 text-[16px] resize-none focus:outline-none focus:border-sage"
          />
        </section>
      </div>

      <div
        className="fixed bottom-0 inset-x-0 bg-cream/95 backdrop-blur border-t border-line px-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="max-w-md mx-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="w-full min-h-[56px] rounded-2xl bg-sage-dark text-white text-[17px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]"
          >
            <Icon name="check" size={22} strokeWidth={2.6} />
            Save check-in
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full min-h-[48px] rounded-2xl text-muted font-medium"
          >
            {target && !target.completedAt ? 'Skip this one' : 'Cancel'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function CheckInScreen({ mealId, checkInId, onDone }) {
  const meal = useLiveQuery(() => db.meals.get(mealId), [mealId])
  const checkIns = useLiveQuery(
    () => db.checkIns.where('mealId').equals(mealId).sortBy('scheduledFor'),
    [mealId],
    [],
  )

  // Choose which check-in to answer: an explicit one, else the earliest
  // unanswered. If none, target is null and a fresh one is created on save.
  const target = useMemo(() => {
    if (checkInId) return checkIns.find((c) => c.id === checkInId) || null
    return checkIns.find((c) => !c.completedAt && !c.skipped) || null
  }, [checkIns, checkInId])

  return (
    <div className="min-h-dvh bg-cream flex flex-col">
      <header className="sticky top-0 z-10 bg-cream/95 backdrop-blur px-4 pt-3 pb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onDone}
          aria-label="Close"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-line"
        >
          <Icon name="close" size={24} />
        </button>
        <h1 className="text-[20px] font-bold">Check-in</h1>
      </header>

      {!meal ? (
        <div className="flex-1 flex items-center justify-center text-muted">
          Loading…
        </div>
      ) : (
        <CheckInForm
          key={target?.id ?? 'new'}
          meal={meal}
          target={target}
          onDone={onDone}
        />
      )}
    </div>
  )
}
