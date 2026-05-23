// A rounded, large-tap selectable chip.

export default function Chip({ label, selected, onClick, tone = 'sage', emoji }) {
  const tones = {
    sage: selected
      ? 'bg-sage text-white border-sage'
      : 'bg-white text-charcoal border-line',
    terracotta: selected
      ? 'bg-terracotta text-white border-terracotta'
      : 'bg-white text-charcoal border-line',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-[48px] px-4 rounded-2xl border text-[16px] font-medium
        transition-colors duration-150 active:scale-[0.97] ${tones[tone]}`}
    >
      {emoji ? <span className="mr-1.5">{emoji}</span> : null}
      {label}
    </button>
  )
}
