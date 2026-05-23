// An accessible on/off switch with a large tap area.

export default function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-[52px] h-[32px] shrink-0 rounded-full transition-colors ${
        checked ? 'bg-sage' : 'bg-line'
      }`}
    >
      <span
        className={`absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white card-shadow transition-transform ${
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}
