import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { ToastProvider } from './components/Toast.jsx'
import BottomTabBar from './components/BottomTabBar.jsx'
import InstallPrompt from './components/InstallPrompt.jsx'
import Onboarding from './screens/Onboarding.jsx'
import TodayScreen from './screens/TodayScreen.jsx'
import LogScreen from './screens/LogScreen.jsx'
import CheckInScreen from './screens/CheckInScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'
import HistoryScreen from './screens/HistoryScreen.jsx'
import { useSettings, useAllMeals, useAllCheckIns } from './hooks/useData.js'
import { syncSchedule } from './lib/notifications.js'

// Charts (recharts) and PDF generation (jspdf) are heavy — load them only
// when the user actually opens those screens.
const InsightsScreen = lazy(() => import('./screens/InsightsScreen.jsx'))
const ExportScreen = lazy(() => import('./screens/ExportScreen.jsx'))

function ScreenLoading() {
  return (
    <div className="min-h-dvh flex items-center justify-center text-muted text-[15px]">
      Loading…
    </div>
  )
}

function Splash() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-cream">
      <img src="/icon.svg" alt="" className="w-16 h-16 rounded-2xl" />
      <p className="text-muted text-[15px]">GutCheck</p>
    </div>
  )
}

// Parse a deep-link URL (?checkin=ID or ?tab=log) into an action.
function parseDeepLink(search) {
  const params = new URLSearchParams(search)
  if (params.has('checkin')) {
    const id = Number(params.get('checkin'))
    if (!Number.isNaN(id)) return { type: 'checkin', mealId: id }
  }
  if (params.get('tab') === 'log') return { type: 'log' }
  return null
}

export default function App() {
  const settings = useSettings()
  const meals = useAllMeals()
  const checkIns = useAllCheckIns()

  const [tab, setTab] = useState('today')
  const [overlay, setOverlay] = useState(() => {
    const action = parseDeepLink(window.location.search)
    if (action?.type === 'checkin') {
      return { type: 'checkin', mealId: action.mealId }
    }
    if (action?.type === 'log') return { type: 'log' }
    return null
  })

  // Keep notification timers in sync with the data.
  useEffect(() => {
    if (settings) syncSchedule({ checkIns, meals, settings })
  }, [checkIns, meals, settings])

  const applyDeepLink = useCallback((action) => {
    if (!action) return
    if (action.type === 'checkin') {
      setOverlay({ type: 'checkin', mealId: action.mealId })
    } else if (action.type === 'log') {
      setOverlay({ type: 'log' })
    }
  }, [])

  // Strip deep-link params from the URL after the first render.
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Handle notification taps relayed by the service worker.
  useEffect(() => {
    function onMessage(event) {
      if (event.data?.type === 'notification-click' && event.data.url) {
        const search = event.data.url.split('?')[1] || ''
        applyDeepLink(parseDeepLink('?' + search))
      }
    }
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () =>
      navigator.serviceWorker?.removeEventListener('message', onMessage)
  }, [applyDeepLink])

  if (!settings) return <Splash />
  if (!settings.onboarded) {
    return (
      <ToastProvider>
        <Onboarding onComplete={() => setTab('today')} />
      </ToastProvider>
    )
  }

  const openCheckIn = (mealId, checkInId) =>
    setOverlay({ type: 'checkin', mealId, checkInId })
  const closeOverlay = () => setOverlay(null)

  return (
    <ToastProvider>
      <div className="mx-auto max-w-md min-h-dvh bg-cream">
        {tab === 'today' && (
          <TodayScreen
            onOpenLog={() => setOverlay({ type: 'log' })}
            onOpenCheckIn={openCheckIn}
            onOpenHistory={() => setOverlay({ type: 'history' })}
            onEditMeal={(meal) => setOverlay({ type: 'editMeal', meal })}
          />
        )}
        {tab === 'insights' && (
          <Suspense fallback={<ScreenLoading />}>
            <InsightsScreen />
          </Suspense>
        )}
        {tab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onOpenExport={() => setOverlay({ type: 'export' })}
          />
        )}

        {tab !== 'log' && (
          <BottomTabBar
            active={tab}
            onChange={(id) =>
              id === 'log' ? setOverlay({ type: 'log' }) : setTab(id)
            }
          />
        )}

        {overlay?.type === 'log' && (
          <div className="fixed inset-0 z-40 bg-cream overflow-y-auto">
            <LogScreen settings={settings} onDone={closeOverlay} />
          </div>
        )}
        {overlay?.type === 'editMeal' && (
          <div className="fixed inset-0 z-40 bg-cream overflow-y-auto">
            <LogScreen
              editMeal={overlay.meal}
              settings={settings}
              onDone={closeOverlay}
            />
          </div>
        )}
        {overlay?.type === 'checkin' && (
          <div className="fixed inset-0 z-40 bg-cream overflow-y-auto">
            <CheckInScreen
              mealId={overlay.mealId}
              checkInId={overlay.checkInId}
              onDone={closeOverlay}
            />
          </div>
        )}
        {overlay?.type === 'history' && (
          <div className="fixed inset-0 z-40 bg-cream overflow-y-auto">
            <HistoryScreen
              onClose={closeOverlay}
              onOpenCheckIn={openCheckIn}
              onEditMeal={(meal) => setOverlay({ type: 'editMeal', meal })}
            />
          </div>
        )}
        {overlay?.type === 'export' && (
          <div className="fixed inset-0 z-40 bg-cream overflow-y-auto">
            <Suspense fallback={<ScreenLoading />}>
              <ExportScreen onClose={closeOverlay} />
            </Suspense>
          </div>
        )}

        {!overlay && <InstallPrompt />}
      </div>
    </ToastProvider>
  )
}
