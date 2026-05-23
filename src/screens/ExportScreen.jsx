import { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAllMeals, useAllCheckIns } from '../hooks/useData.js'
import { useNow } from '../hooks/useNow.js'
import { exportPDF, exportCSV } from '../lib/exporters.js'

const RANGES = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
]

export default function ExportScreen({ onClose }) {
  const toast = useToast()
  const meals = useAllMeals()
  const checkIns = useAllCheckIns()
  const now = useNow(5 * 60_000)
  const [rangeId, setRangeId] = useState('30')

  const range = RANGES.find((r) => r.id === rangeId)

  const rangeMeals = useMemo(() => {
    const sinceTs = range.days
      ? now - range.days * 24 * 60 * 60 * 1000
      : null
    return sinceTs ? meals.filter((m) => m.timestamp >= sinceTs) : meals
  }, [meals, range.days, now])

  function handle(kind) {
    if (rangeMeals.length === 0) {
      toast('Nothing to export in this period.', 'terracotta')
      return
    }
    try {
      const args = {
        rangeLabel: range.label,
        rangeSlug: range.id === 'all' ? 'all-time' : `${range.days}-days`,
        sinceTs: null,
      }
      if (kind === 'pdf') exportPDF(rangeMeals, checkIns, args)
      else exportCSV(rangeMeals, checkIns, args.rangeSlug)
      toast(`${kind.toUpperCase()} downloaded`)
    } catch {
      toast('Export failed — please try again.', 'terracotta')
    }
  }

  return (
    <div className="min-h-dvh bg-cream flex flex-col">
      <header className="sticky top-0 z-10 bg-cream/95 backdrop-blur px-4 pt-3 pb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-line"
        >
          <Icon name="back" size={24} />
        </button>
        <h1 className="text-[20px] font-bold">Export</h1>
      </header>

      <div className="flex-1 px-4 pb-10">
        <p className="text-[15px] text-muted leading-relaxed mt-1 mb-5">
          Create a tidy summary to take to a doctor's appointment. The PDF
          opens with your patterns and summary, then a day-by-day log.
        </p>

        <h2 className="text-[15px] font-semibold mb-2">Time period</h2>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangeId(r.id)}
              className={`min-h-[56px] rounded-2xl border text-[15px] font-semibold transition-colors ${
                r.id === rangeId
                  ? 'bg-sage text-white border-sage'
                  : 'bg-white text-charcoal border-line'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <p className="text-[14px] text-muted mb-3">
          {rangeMeals.length} meal{rangeMeals.length === 1 ? '' : 's'} in this
          period.
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handle('pdf')}
            className="w-full min-h-[60px] rounded-2xl bg-sage-dark text-white text-[16px] font-bold flex items-center justify-center gap-2.5"
          >
            <Icon name="download" size={22} />
            Download PDF summary
          </button>
          <button
            type="button"
            onClick={() => handle('csv')}
            className="w-full min-h-[60px] rounded-2xl bg-white border border-line text-charcoal text-[16px] font-bold flex items-center justify-center gap-2.5"
          >
            <Icon name="download" size={22} />
            Download CSV (spreadsheet)
          </button>
        </div>

        <p className="text-[13px] text-muted text-center mt-6 leading-relaxed">
          Files are created on your device and saved to your downloads. Nothing
          is uploaded anywhere.
        </p>
      </div>
    </div>
  )
}
