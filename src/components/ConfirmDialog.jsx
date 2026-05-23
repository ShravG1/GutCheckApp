// A calm modal confirmation. Used for destructive actions.

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'terracotta',
  onConfirm,
  onCancel,
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-charcoal/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl p-6 card-shadow-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[20px] font-bold mb-2">{title}</h2>
        <p className="text-[15px] text-muted leading-relaxed mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[52px] rounded-2xl font-semibold text-white ${
              tone === 'terracotta' ? 'bg-terracotta' : 'bg-sage-dark'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[52px] rounded-2xl font-semibold text-charcoal bg-cream"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
