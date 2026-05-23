import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'

const DISMISS_KEY = 'gutcheck-install-dismissed'

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return
    function onPrompt(e) {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    dismiss()
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-x-0 z-40 px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}
    >
      <div className="max-w-md mx-auto bg-white rounded-card card-shadow-lg p-3.5 flex items-center gap-3 animate-slide-up">
        <span className="w-11 h-11 shrink-0 rounded-xl bg-sage-light text-sage-dark flex items-center justify-center">
          <Icon name="leaf" size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold">Add GutCheck to your home screen</p>
          <p className="text-[13px] text-muted">Open it like an app, works offline.</p>
        </div>
        <button
          type="button"
          onClick={install}
          className="px-3.5 min-h-[44px] rounded-xl bg-sage-dark text-white text-[14px] font-semibold"
        >
          Add
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-muted"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  )
}
