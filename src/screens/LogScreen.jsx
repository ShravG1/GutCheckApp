import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Chip from '../components/Chip.jsx'
import { useToast } from '../components/Toast.jsx'
import { useFoodSuggestions } from '../hooks/useData.js'
import { addMeal, updateMeal, saveSettings } from '../db/db.js'
import { compressImage } from '../lib/image.js'
import {
  MEAL_TYPES,
  MEAL_LABELS,
  MEAL_EMOJI,
  PREDEFINED_TAGS,
  mealTypeForHour,
} from '../lib/constants.js'
import { toLocalInputValue, fromLocalInputValue } from '../lib/dates.js'

const TIME_PRESETS = [
  { label: 'Just now', minutes: 0 },
  { label: '30 min ago', minutes: 30 },
  { label: '1h ago', minutes: 60 },
  { label: '2h ago', minutes: 120 },
]

export default function LogScreen({ editMeal, settings, onDone }) {
  const toast = useToast()
  const suggestions = useFoodSuggestions()

  const [mealType, setMealType] = useState(
    editMeal?.mealType || mealTypeForHour(new Date().getHours()),
  )
  const [foodText, setFoodText] = useState(editMeal?.foodText || '')
  const [tags, setTags] = useState(editMeal?.tags || [])
  const [timestamp, setTimestamp] = useState(
    () => editMeal?.timestamp || Date.now(),
  )
  const [photoBlob, setPhotoBlob] = useState(editMeal?.photoBlob || null)
  const [notes, setNotes] = useState(editMeal?.notes || '')
  const [customTag, setCustomTag] = useState('')
  const [foodFocused, setFoodFocused] = useState(false)
  const [showPhoto, setShowPhoto] = useState(!!editMeal?.photoBlob)
  const [showNotes, setShowNotes] = useState(!!editMeal?.notes)
  const [showCustomTime, setShowCustomTime] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const isEditing = !!editMeal

  const photoUrl = useMemo(
    () => (photoBlob ? URL.createObjectURL(photoBlob) : null),
    [photoBlob],
  )
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [photoUrl])

  const allTags = useMemo(() => {
    const custom = settings?.customTags || []
    return [...PREDEFINED_TAGS, ...custom.filter((t) => !PREDEFINED_TAGS.includes(t))]
  }, [settings])

  const foodMatches = useMemo(() => {
    const q = foodText.trim().toLowerCase()
    if (!q) return []
    return suggestions
      .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      .slice(0, 5)
  }, [foodText, suggestions])

  // Which preset (if any) the current timestamp matches — within a 90s window
  // of the original tap so the chip stays "stuck" instead of drifting off.
  const activePreset = useMemo(() => {
    const diffMin = (Date.now() - timestamp) / 60000
    return TIME_PRESETS.find((p) => Math.abs(p.minutes - diffMin) < 1.5)?.minutes
  }, [timestamp])

  const timeLabel = useMemo(() => {
    const d = new Date(timestamp)
    const sameDay = new Date().toDateString() === d.toDateString()
    const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return sameDay ? `Today at ${t}` : `${d.toLocaleDateString()} · ${t}`
  }, [timestamp])

  function toggleTag(tag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  async function addCustomTag() {
    const t = customTag.trim().toLowerCase()
    if (!t) return
    if (!allTags.includes(t)) {
      await saveSettings({
        customTags: [...(settings?.customTags || []), t],
      })
    }
    if (!tags.includes(t)) setTags((prev) => [...prev, t])
    setCustomTag('')
  }

  async function pickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const blob = await compressImage(file)
      setPhotoBlob(blob)
      setShowPhoto(true)
    } catch (err) {
      toast(err.message || 'Could not add that photo.', 'terracotta')
    }
  }

  async function handleSave() {
    if (!foodText.trim()) {
      toast('Add what you ate first.', 'terracotta')
      return
    }
    setBusy(true)
    try {
      if (isEditing) {
        await updateMeal(editMeal.id, {
          mealType,
          foodText,
          tags,
          timestamp,
          photoBlob,
          notes,
        })
        toast('Meal updated')
      } else {
        await addMeal({ mealType, foodText, tags, timestamp, photoBlob, notes })
        toast('Meal logged — check-ins scheduled')
      }
      onDone({ saved: true })
    } catch (err) {
      const quota = err?.name === 'QuotaExceededError'
      toast(
        quota
          ? 'Storage is full — try removing the photo.'
          : 'Could not save. Please try again.',
        'terracotta',
      )
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-cream flex flex-col">
      <header className="sticky top-0 z-10 bg-cream/95 backdrop-blur px-4 pt-3 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDone({ saved: false })}
          aria-label="Close"
          className="w-11 h-11 flex items-center justify-center rounded-full text-charcoal active:bg-line"
        >
          <Icon name="close" size={24} />
        </button>
        <h1 className="text-[20px] font-bold tracking-tight">
          {isEditing ? 'Edit meal' : 'New entry'}
        </h1>
      </header>

      <div className="flex-1 px-4 pb-40 space-y-5">
        {/* Meta card: meal type + time. Reads as a single header zone. */}
        <section className="bg-white rounded-card card-shadow overflow-hidden">
          <div className="grid grid-cols-4">
            {MEAL_TYPES.map((t) => {
              const selected = mealType === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMealType(t)}
                  className={`relative min-h-[72px] flex flex-col items-center justify-center gap-1 transition-colors ${
                    selected ? 'bg-sage-light' : 'bg-white active:bg-cream'
                  }`}
                >
                  <span className="text-[24px] leading-none">{MEAL_EMOJI[t]}</span>
                  <span
                    className={`text-[12px] font-semibold tracking-wide uppercase ${
                      selected ? 'text-sage-dark' : 'text-muted'
                    }`}
                  >
                    {MEAL_LABELS[t]}
                  </span>
                  {selected && (
                    <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-sage-dark" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="px-4 py-3 border-t border-line flex items-center gap-2">
            <Icon name="clock" size={18} className="text-muted shrink-0" />
            <span className="text-[14px] text-muted flex-1 truncate">{timeLabel}</span>
          </div>

          <div className="px-3 pb-3 flex flex-wrap gap-1.5">
            {TIME_PRESETS.map((p) => {
              const active = activePreset === p.minutes && !showCustomTime
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setTimestamp(Date.now() - p.minutes * 60_000)
                    setShowCustomTime(false)
                  }}
                  className={`px-3 min-h-[36px] rounded-full text-[13px] font-medium border transition-colors ${
                    active
                      ? 'bg-sage text-white border-sage'
                      : 'bg-white text-charcoal border-line active:bg-cream'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setShowCustomTime((v) => !v)}
              className={`px-3 min-h-[36px] rounded-full text-[13px] font-medium border transition-colors ${
                showCustomTime
                  ? 'bg-sage text-white border-sage'
                  : 'bg-white text-charcoal border-line active:bg-cream'
              }`}
            >
              Custom…
            </button>
          </div>

          {showCustomTime && (
            <div className="px-3 pb-3">
              <input
                type="datetime-local"
                value={toLocalInputValue(new Date(timestamp))}
                max={toLocalInputValue(new Date())}
                onChange={(e) => {
                  if (e.target.value) setTimestamp(fromLocalInputValue(e.target.value))
                }}
                className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-[15px] focus:outline-none focus:border-sage"
              />
            </div>
          )}
        </section>

        {/* Food — the centrepiece. No form label; a friendly prompt instead. */}
        <section className="relative">
          <div className="bg-white rounded-card card-shadow p-4">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted mb-1">
              What you had
            </p>
            <textarea
              value={foodText}
              onChange={(e) => setFoodText(e.target.value)}
              onFocus={() => setFoodFocused(true)}
              onBlur={() => setTimeout(() => setFoodFocused(false), 150)}
              rows={2}
              placeholder="Porridge with banana and milk…"
              className="w-full bg-transparent text-[18px] leading-snug resize-none focus:outline-none placeholder:text-muted/60"
            />
          </div>
          {foodFocused && foodMatches.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-2xl border border-line card-shadow-lg overflow-hidden">
              {foodMatches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setFoodText(s)
                    setFoodFocused(false)
                  }}
                  className="w-full text-left px-4 min-h-[48px] text-[15px] border-b border-line last:border-0 active:bg-cream"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Tags */}
        <section>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted mb-2 px-1">
            Tags
            <span className="ml-1.5 text-muted/70 font-normal normal-case tracking-normal">
              optional
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomTag()
                }
              }}
              placeholder="Add a custom tag"
              className="flex-1 rounded-2xl border border-line bg-white px-3.5 min-h-[48px] text-[15px] focus:outline-none focus:border-sage"
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="px-4 min-h-[48px] rounded-2xl bg-sage-light text-sage-dark font-semibold"
            >
              Add
            </button>
          </div>
        </section>

        {/* Attachments — photo + note. Two-up tiles when empty, expand when used. */}
        <section>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickPhoto}
          />
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted mb-2 px-1">
            Attach
            <span className="ml-1.5 text-muted/70 font-normal normal-case tracking-normal">
              optional
            </span>
          </p>

          {!showPhoto && !showNotes && !photoBlob && !notes ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="min-h-[96px] rounded-card bg-white border border-line flex flex-col items-center justify-center gap-1.5 text-charcoal active:bg-cream"
              >
                <Icon name="camera" size={22} className="text-sage-dark" />
                <span className="text-[14px] font-semibold">Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="min-h-[96px] rounded-card bg-white border border-line flex flex-col items-center justify-center gap-1.5 text-charcoal active:bg-cream"
              >
                <Icon name="edit" size={20} className="text-sage-dark" />
                <span className="text-[14px] font-semibold">Note</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(showPhoto || photoBlob) && (
                <div className="bg-white rounded-card card-shadow p-3">
                  {photoUrl && (
                    <img
                      src={photoUrl}
                      alt="Meal"
                      className="w-full h-52 object-cover rounded-xl"
                    />
                  )}
                  <div className="flex gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex-1 min-h-[44px] rounded-xl bg-sage-light text-sage-dark font-semibold text-[14px]"
                    >
                      Change photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoBlob(null)
                        setShowPhoto(false)
                      }}
                      className="flex-1 min-h-[44px] rounded-xl bg-cream text-charcoal font-semibold text-[14px]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
              {showNotes && (
                <div className="bg-white rounded-card card-shadow p-3">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Anything else worth remembering…"
                    className="w-full bg-transparent text-[15px] leading-relaxed resize-none focus:outline-none placeholder:text-muted/60"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNotes('')
                      setShowNotes(false)
                    }}
                    className="text-[13px] text-muted font-medium mt-1"
                  >
                    Remove note
                  </button>
                </div>
              )}
              {!(showPhoto || photoBlob) && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full min-h-[48px] rounded-xl bg-white border border-line flex items-center justify-center gap-2 text-[14px] font-semibold text-sage-dark"
                >
                  <Icon name="camera" size={18} /> Add photo
                </button>
              )}
              {!showNotes && (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="w-full min-h-[48px] rounded-xl bg-white border border-line flex items-center justify-center gap-2 text-[14px] font-semibold text-sage-dark"
                >
                  <Icon name="edit" size={16} /> Add note
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <div
        className="fixed bottom-0 inset-x-0 bg-cream/95 backdrop-blur border-t border-line px-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="w-full max-w-md mx-auto min-h-[56px] rounded-2xl bg-sage-dark text-white text-[17px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]"
        >
          <Icon name="check" size={22} strokeWidth={2.6} />
          {isEditing ? 'Save changes' : 'Save meal'}
        </button>
      </div>
    </div>
  )
}
