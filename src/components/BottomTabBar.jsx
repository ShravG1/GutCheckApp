import Icon from './Icon.jsx'

const TABS = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'log', label: 'Log', icon: 'log' },
  { id: 'insights', label: 'Insights', icon: 'insights' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

export default function BottomTabBar({ active, onChange }) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-line"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto max-w-md flex">
        {TABS.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-h-[60px] flex flex-col items-center justify-center gap-1
                transition-colors ${isActive ? 'text-sage-dark' : 'text-muted'}`}
            >
              <Icon
                name={tab.icon}
                size={24}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span className="text-[12px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
