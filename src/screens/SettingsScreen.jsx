import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Switch from '../components/Switch.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useToast } from '../components/Toast.jsx'
import { saveSettings, clearAllData } from '../db/db.js'
import { formatInterval, MEAL_LABELS } from '../lib/constants.js'
import {
  requestPermission,
  permissionState,
  notificationsSupported,
} from '../lib/notifications.js'

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="text-[14px] font-semibold text-muted uppercase tracking-wide px-1 mb-2">
        {title}
      </h2>
      <div className="bg-card rounded-card card-shadow overflow-hidden">
        {children}
      </div>
    </section>
  )
}

function Row({ children, onClick, last }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 min-h-[60px] text-left ${
        last ? '' : 'border-b border-line'
      } ${onClick ? 'active:bg-cream' : ''}`}
    >
      {children}
    </Tag>
  )
}

function IntervalRow({ minutes, onChange, onRemove }) {
  const unit = minutes % 60 === 0 && minutes >= 60 ? 'hours' : 'minutes'
  const value = unit === 'hours' ? minutes / 60 : minutes

  function setValue(raw) {
    const n = Math.max(1, Math.round(Number(raw) || 0))
    onChange(unit === 'hours' ? n * 60 : n)
  }
  function setUnit(u) {
    if (u === unit) return
    onChange(u === 'hours' ? Math.max(60, value * 60) : minutes)
  }

  return (
    <Row>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-16 rounded-xl border border-line bg-cream px-2 py-2 text-[15px] text-center focus:outline-none focus:border-sage"
      />
      <div className="flex rounded-xl border border-line overflow-hidden">
        {['minutes', 'hours'].map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => setUnit(u)}
            className={`px-2.5 py-2 text-[13px] font-medium ${
              unit === u ? 'bg-sage text-white' : 'bg-white text-muted'
            }`}
          >
            {u === 'minutes' ? 'min' : 'hrs'}
          </button>
        ))}
      </div>
      <span className="flex-1 text-[14px] text-muted">after the meal</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove interval"
        className="w-10 h-10 flex items-center justify-center rounded-full text-terracotta active:bg-terracotta-light"
      >
        <Icon name="trash" size={18} />
      </button>
    </Row>
  )
}

export default function SettingsScreen({ settings, onOpenExport }) {
  const toast = useToast()
  const [confirmClear, setConfirmClear] = useState(false)
  const [newTag, setNewTag] = useState('')

  const intervals = settings.checkInIntervals || []
  const reminders = settings.reminders || {}

  async function toggleNotifications(on) {
    if (on && permissionState() !== 'granted') {
      const result = await requestPermission()
      if (result !== 'granted') {
        toast('Notifications were not allowed by your browser.', 'terracotta')
        return
      }
    }
    await saveSettings({ notificationsEnabled: on })
  }

  function updateIntervals(next) {
    saveSettings({ checkInIntervals: next })
  }

  function updateReminder(meal, patch) {
    saveSettings({
      reminders: { ...reminders, [meal]: { ...reminders[meal], ...patch } },
    })
  }

  function removeCustomTag(tag) {
    saveSettings({
      customTags: (settings.customTags || []).filter((t) => t !== tag),
    })
  }

  function addCustomTag() {
    const t = newTag.trim().toLowerCase()
    if (!t) return
    if (!(settings.customTags || []).includes(t)) {
      saveSettings({ customTags: [...(settings.customTags || []), t] })
    }
    setNewTag('')
  }

  async function handleClear() {
    await clearAllData()
    setConfirmClear(false)
    toast('All data cleared')
  }

  const notifSupported = notificationsSupported()

  return (
    <div className="min-h-dvh pb-28">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-[24px] font-bold">Settings</h1>
      </header>

      <div className="px-4">
        {/* Notifications */}
        <Section title="Notifications">
          <Row last>
            <span className="text-sage-dark">
              <Icon name="bell" size={22} />
            </span>
            <div className="flex-1">
              <p className="text-[16px] font-medium">Enable reminders</p>
              <p className="text-[13px] text-muted">
                {notifSupported
                  ? 'Check-in and meal reminders on this device.'
                  : 'Not supported by this browser.'}
              </p>
            </div>
            <Switch
              checked={!!settings.notificationsEnabled}
              onChange={toggleNotifications}
              label="Enable notifications"
            />
          </Row>
        </Section>

        {/* Check-in intervals */}
        <Section title="Check-in timing">
          {intervals.length === 0 && (
            <Row>
              <span className="text-[14px] text-muted">
                No check-ins scheduled after meals.
              </span>
            </Row>
          )}
          {intervals
            .map((m, i) => ({ m, i }))
            .sort((a, b) => a.m - b.m)
            .map(({ m, i }) => (
              <IntervalRow
                key={i}
                minutes={m}
                onChange={(v) => {
                  const next = [...intervals]
                  next[i] = v
                  updateIntervals(next)
                }}
                onRemove={() =>
                  updateIntervals(intervals.filter((_, j) => j !== i))
                }
              />
            ))}
          <Row
            last
            onClick={() => updateIntervals([...intervals, 120])}
          >
            <span className="text-sage-dark">
              <Icon name="plus" size={20} />
            </span>
            <span className="text-[15px] font-medium text-sage-dark">
              Add a check-in
            </span>
          </Row>
        </Section>

        <p className="text-[13px] text-muted -mt-4 mb-6 px-1">
          After each meal you'll be asked how you feel at:{' '}
          {intervals.length
            ? [...intervals].sort((a, b) => a - b).map(formatInterval).join(', ')
            : 'never'}
          .
        </p>

        {/* Meal reminders */}
        <Section title="Meal reminders">
          {['breakfast', 'lunch', 'dinner'].map((meal, idx) => {
            const r = reminders[meal] || { enabled: false, time: '12:00' }
            return (
              <Row key={meal} last={idx === 2}>
                <div className="flex-1">
                  <p className="text-[16px] font-medium">
                    {MEAL_LABELS[meal]}
                  </p>
                  <p className="text-[13px] text-muted">
                    Remind me to log {meal}
                  </p>
                </div>
                <input
                  type="time"
                  value={r.time}
                  onChange={(e) =>
                    updateReminder(meal, { time: e.target.value })
                  }
                  disabled={!r.enabled}
                  className="rounded-xl border border-line bg-cream px-2.5 py-2 text-[15px] disabled:opacity-40 focus:outline-none focus:border-sage"
                />
                <Switch
                  checked={!!r.enabled}
                  onChange={(v) => updateReminder(meal, { enabled: v })}
                  label={`${meal} reminder`}
                />
              </Row>
            )
          })}
        </Section>

        {/* Custom tags */}
        <Section title="Your tags">
          {(settings.customTags || []).length === 0 && (
            <Row>
              <span className="text-[14px] text-muted">
                No custom tags yet. Add ones that matter to you.
              </span>
            </Row>
          )}
          {(settings.customTags || []).map((tag) => (
            <Row key={tag} last={false}>
              <span className="flex-1 text-[16px]">{tag}</span>
              <button
                type="button"
                onClick={() => removeCustomTag(tag)}
                aria-label={`Remove ${tag}`}
                className="w-10 h-10 flex items-center justify-center rounded-full text-terracotta active:bg-terracotta-light"
              >
                <Icon name="trash" size={18} />
              </button>
            </Row>
          ))}
          <div className="flex gap-2 p-3 border-t border-line">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
              placeholder="New tag name"
              className="flex-1 rounded-xl border border-line bg-cream px-3 min-h-[48px] text-[15px] focus:outline-none focus:border-sage"
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="px-4 min-h-[48px] rounded-xl bg-sage-light text-sage-dark font-semibold"
            >
              Add
            </button>
          </div>
        </Section>

        {/* Data */}
        <Section title="Your data">
          <Row onClick={onOpenExport}>
            <span className="text-sage-dark">
              <Icon name="download" size={22} />
            </span>
            <span className="flex-1 text-[16px] font-medium">
              Export for your doctor
            </span>
            <Icon name="chevron" size={20} className="text-muted" />
          </Row>
          <Row last onClick={() => setConfirmClear(true)}>
            <span className="text-terracotta">
              <Icon name="trash" size={22} />
            </span>
            <span className="flex-1 text-[16px] font-medium text-terracotta">
              Clear all data
            </span>
          </Row>
        </Section>

        <p className="text-[13px] text-muted text-center px-6 leading-relaxed mb-4">
          GutCheck keeps everything on this device only. No account, no cloud,
          no tracking. Your health data stays with you.
        </p>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all data?"
        message="This permanently removes every meal, check-in and setting from this device. It cannot be undone."
        confirmLabel="Yes, clear everything"
        cancelLabel="Keep my data"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
