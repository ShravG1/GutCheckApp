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
      <header className="sticky top-0 z-10 bg-cream/95 backdrop-blur px-4 pt-3 pb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDone({ saved: false })}
          aria-label="Close"
          className="w-11 h-11 flex items-center justify-center rounded-full text-charcoal active:bg-line"
        >
          <Icon name="close" size={24} />
        </button>
        <h1 className="text-[20px] font-bold">
          {isEditing ? 'Edit meal' : 'Log a meal'}
        </h1>
      </header>

      <div className="flex-1 px-4 pb-40 space-y-6">
        {/* Meal type */}
        <section>
          <label className="block text-[15px] font-semibold mb-2">
            What kind of meal?
          </label>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMealType(t)}
                className={`min-h-[64px] rounded-2xl border flex flex-col items-center justify-center gap-1 transition-colors ${
                  mealType === t
                    ? 'bg-sage text-white border-sage'
                    : 'bg-white text-charcoal border-line'
                }`}
              >
                <span className="text-[22px] leading-none">{MEAL_EMOJI[t]}</span>
                <span className="text-[13px] font-medium">{MEAL_LABELS[t]}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Food */}
        <section className="relative">
          <label className="block text-[15px] font-semibold mb-2">
            What did you eat or drink?
          </label>
          <textarea
            value={foodText}
            onChange={(e) => setFoodText(e.target.value)}
            onFocus={() => setFoodFocused(true)}
            onBlur={() => setTimeout(() => setFoodFocused(false), 150)}
            rows={2}
            placeholder="e.g. Porridge with banana and milk"
            className="w-full rounded-2xl border border-line bg-white p-3.5 text-[16px] resize-none focus:outline-none focus:border-sage"
          />
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
          <label className="block text-[15px] font-semibold mb-2">
            Anything notable about it?{' '}
            <span className="text-muted font-normal">(optional)</span>
          </label>
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
          <div className="flex gap-2 mt-2.5">
            <input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomTag()
                }
              }}
              placeholder="Add your own tag"
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

        {/* Time */}
        <section>
          <label className="block text-[15px] font-semibold mb-2">
            When was it?
          </label>
          <input
            type="datetime-local"
            value={toLocalInputValue(new Date(timestamp))}
            max={toLocalInputValue(new Date())}
            onChange={(e) => {
              if (e.target.value) setTimestamp(fromLocalInputValue(e.target.value))
            }}
            className="w-full rounded-2xl border border-line bg-white p-3.5 text-[16px] focus:outline-none focus:border-sage"
          />
        </section>

        {/* Photo */}
        <section>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickPhoto}
          />
          {!showPhoto && !photoBlob ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full min-h-[52px] rounded-2xl border border-line bg-white flex items-center justify-center gap-2 text-[15px] font-medium text-muted"
            >
              <Icon name="camera" size={20} /> Add a photo (optional)
            </button>
          ) : (
            <div>
              <label className="block text-[15px] font-semibold mb-2">Photo</label>
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="Meal"
                  className="w-full h-52 object-cover rounded-2xl"
                />
              )}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 min-h-[48px] rounded-2xl bg-sage-light text-sage-dark font-semibold"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoBlob(null)
                    setShowPhoto(false)
                  }}
                  className="flex-1 min-h-[48px] rounded-2xl bg-cream text-charcoal font-semibold"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Notes */}
        <section>
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="w-full min-h-[52px] rounded-2xl border border-line bg-white flex items-center justify-center gap-2 text-[15px] font-medium text-muted"
            >
              <Icon name="edit" size={18} /> Add a note (optional)
            </button>
          ) : (
            <div>
              <label className="block text-[15px] font-semibold mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Anything else worth remembering"
                className="w-full rounded-2xl border border-line bg-white p-3.5 text-[16px] resize-none focus:outline-none focus:border-sage"
              />
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
