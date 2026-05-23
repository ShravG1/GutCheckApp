import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Switch from '../components/Switch.jsx'
import { saveSettings } from '../db/db.js'
import { requestPermission, notificationsSupported } from '../lib/notifications.js'
import { DEFAULT_REMINDERS, MEAL_LABELS } from '../lib/constants.js'

const SLIDES = [
  {
    icon: 'leaf',
    title: 'Welcome to GutCheck',
    body: 'A calm, private diary for your meals and how your tummy feels. No accounts, no jargon — just you and your notes.',
  },
  {
    icon: 'clock',
    title: 'Food reactions are often delayed',
    body: "A meal might not bother you straight away. GutCheck gently checks in hours later — that's when patterns really show.",
  },
  {
    icon: 'sparkle',
    title: 'Spot what your gut reacts to',
    body: 'Over time GutCheck quietly notices things like “bloating often follows dairy”, so you can take real notes to your doctor.',
  },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [reminders, setReminders] = useState(structuredClone(DEFAULT_REMINDERS))
  const total = SLIDES.length + 1
  const isSetup = step === SLIDES.length

  function updateReminder(meal, patch) {
    setReminders((r) => ({ ...r, [meal]: { ...r[meal], ...patch } }))
  }

  async function finish() {
    const anyOn = Object.values(reminders).some((r) => r.enabled)
    let notificationsEnabled = false
    if (anyOn && notificationsSupported()) {
      const result = await requestPermission()
      notificationsEnabled = result === 'granted'
    }
    await saveSettings({ onboarded: true, reminders, notificationsEnabled })
    onComplete()
  }

  return (
    <div className="min-h-dvh bg-cream flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-6">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === step ? 'w-6 bg-sage' : 'w-2 bg-line'
            }`}
          />
        ))}
      </div>

      {!isSetup ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-sage-light text-sage-dark flex items-center justify-center mb-8">
            <Icon name={SLIDES[step].icon} size={44} />
          </div>
          <h1 className="text-[26px] font-bold mb-3 leading-tight">
            {SLIDES[step].title}
          </h1>
          <p className="text-[17px] text-muted leading-relaxed max-w-sm">
            {SLIDES[step].body}
          </p>
        </div>
      ) : (
        <div className="flex-1 px-6 pt-8 overflow-y-auto animate-fade-in">
          <h1 className="text-[24px] font-bold mb-2">
            Gentle reminders (optional)
          </h1>
          <p className="text-[16px] text-muted leading-relaxed mb-6">
            GutCheck can nudge you to log your meals. Pick any you'd like — you
            can change these any time in Settings.
          </p>
          <div className="bg-white rounded-card card-shadow overflow-hidden">
            {['breakfast', 'lunch', 'dinner'].map((meal, idx) => (
              <div
                key={meal}
                className={`flex items-center gap-3 px-4 min-h-[64px] ${
                  idx < 2 ? 'border-b border-line' : ''
                }`}
              >
                <span className="flex-1 text-[16px] font-medium">
                  {MEAL_LABELS[meal]}
                </span>
                <input
                  type="time"
                  value={reminders[meal].time}
                  onChange={(e) => updateReminder(meal, { time: e.target.value })}
                  disabled={!reminders[meal].enabled}
                  className="rounded-xl border border-line bg-cream px-2.5 py-2 text-[15px] disabled:opacity-40 focus:outline-none focus:border-sage"
                />
                <Switch
                  checked={reminders[meal].enabled}
                  onChange={(v) => updateReminder(meal, { enabled: v })}
                  label={`${meal} reminder`}
                />
              </div>
            ))}
          </div>
          <p className="text-[14px] text-muted mt-4 leading-relaxed">
            If you turn any on, your browser will ask permission to show
            notifications. You can say no and still use everything else.
          </p>
        </div>
      )}

      {/* Controls */}
      <div
        className="px-6 pt-3 flex flex-col gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <button
          type="button"
          onClick={() => (isSetup ? finish() : setStep((s) => s + 1))}
          className="w-full min-h-[56px] rounded-2xl bg-sage-dark text-white text-[17px] font-bold active:scale-[0.99]"
        >
          {isSetup ? 'Get started' : 'Continue'}
        </button>
        {!isSetup ? (
          <button
            type="button"
            onClick={() => setStep(SLIDES.length)}
            className="w-full min-h-[44px] text-muted font-medium"
          >
            Skip
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="w-full min-h-[44px] text-muted font-medium"
          >
            Back
          </button>
        )}
      </div>
    </div>
  )
}
