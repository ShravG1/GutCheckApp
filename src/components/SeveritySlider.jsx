// 0–10 severity slider with plain-language anchors.

export default function SeveritySlider({ value, onChange }) {
  const v = value ?? 5
  const descriptor =
    v === 0 ? 'Barely there' : v <= 3 ? 'Mild' : v <= 6 ? 'Noticeable' : v <= 8 ? 'Strong' : 'Severe'

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[15px] font-medium">How strong was it?</span>
        <span className="text-[15px] font-semibold text-sage-dark">
          {descriptor} · {v}/10
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 rounded-full appearance-none bg-sage-light accent-sage-dark"
        style={{ accentColor: '#5F8A6B' }}
      />
      <div className="flex justify-between text-[12px] text-muted mt-1">
        <span>Mild</span>
        <span>Severe</span>
      </div>
    </div>
  )
}
