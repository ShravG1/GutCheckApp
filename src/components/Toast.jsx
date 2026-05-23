/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react'
import Icon from './Icon.jsx'

const ToastContext = createContext(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, tone = 'sage') => {
    setToast({ message, tone, key: Date.now() })
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.key}
          className="fixed left-1/2 -translate-x-1/2 z-50 animate-toast"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
          onAnimationEnd={() => setToast(null)}
        >
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl card-shadow-lg text-white text-[15px] font-medium ${
              toast.tone === 'terracotta' ? 'bg-terracotta' : 'bg-sage-dark'
            }`}
          >
            <Icon name="check" size={18} strokeWidth={2.6} />
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
