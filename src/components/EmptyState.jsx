import Icon from './Icon.jsx'

export default function EmptyState({ icon = 'leaf', title, message }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-12">
      <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center text-sage-dark mb-4">
        <Icon name={icon} size={30} />
      </div>
      <h3 className="text-[18px] font-semibold mb-1">{title}</h3>
      {message && (
        <p className="text-[15px] text-muted leading-relaxed max-w-xs">
          {message}
        </p>
      )}
    </div>
  )
}
