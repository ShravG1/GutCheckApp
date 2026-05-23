import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { enGB } from 'date-fns/locale'
import { computeInsights, describePattern, capitalise } from './insights.js'
import { MEAL_LABELS } from './constants.js'
import { FINE } from './constants.js'

const L = { locale: enGB }

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function csvCell(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function groupByDay(meals) {
  const days = new Map()
  for (const m of [...meals].sort((a, b) => a.timestamp - b.timestamp)) {
    const key = format(new Date(m.timestamp), 'yyyy-MM-dd')
    if (!days.has(key)) days.set(key, [])
    days.get(key).push(m)
  }
  return days
}

// --- CSV ------------------------------------------------------------------

export function exportCSV(meals, checkIns, rangeSlug) {
  const rows = [
    [
      'Entry',
      'Date',
      'Time',
      'Meal',
      'Food',
      'Tags',
      'Symptoms',
      'Severity',
      'Notes',
    ],
  ]
  const checkInsByMeal = new Map()
  for (const c of checkIns) {
    if (!checkInsByMeal.has(c.mealId)) checkInsByMeal.set(c.mealId, [])
    checkInsByMeal.get(c.mealId).push(c)
  }

  for (const m of [...meals].sort((a, b) => a.timestamp - b.timestamp)) {
    const d = new Date(m.timestamp)
    rows.push([
      'Meal',
      format(d, 'yyyy-MM-dd'),
      format(d, 'HH:mm'),
      MEAL_LABELS[m.mealType] || m.mealType,
      m.foodText || '',
      (m.tags || []).join('; '),
      '',
      '',
      m.notes || '',
    ])
    const cis = (checkInsByMeal.get(m.id) || []).sort(
      (a, b) => a.scheduledFor - b.scheduledFor,
    )
    for (const c of cis) {
      if (!c.completedAt && !c.skipped) continue
      const when = new Date(c.completedAt || c.scheduledFor)
      rows.push([
        c.skipped ? 'Check-in (skipped)' : 'Check-in',
        format(when, 'yyyy-MM-dd'),
        format(when, 'HH:mm'),
        '',
        m.foodText || '',
        '',
        (c.symptoms || []).join('; '),
        c.severity ?? '',
        c.notes || '',
      ])
    }
  }

  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    `gutcheck-${rangeSlug}.csv`,
  )
}

// --- PDF ------------------------------------------------------------------

export function exportPDF(meals, checkIns, { rangeLabel, rangeSlug, sinceTs }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 48
  let y = margin

  const ink = [44, 44, 44]
  const sage = [95, 138, 107]
  const muted = [120, 120, 120]

  function ensure(space) {
    if (y + space > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }
  function heading(text) {
    ensure(34)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...sage)
    doc.text(text, margin, y)
    y += 8
    doc.setDrawColor(220, 222, 215)
    doc.line(margin, y, pageW - margin, y)
    y += 16
  }
  function body(text, opts = {}) {
    const size = opts.size || 10
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(opts.colour || ink))
    const lines = doc.splitTextToSize(text, pageW - margin * 2 - (opts.indent || 0))
    for (const line of lines) {
      ensure(size + 4)
      doc.text(line, margin + (opts.indent || 0), y)
      y += size + 4
    }
  }

  // Title block.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...sage)
  doc.text('GutCheck', margin, y)
  y += 22
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...ink)
  doc.text('Food & symptom diary', margin, y)
  y += 16
  doc.setFontSize(9)
  doc.setTextColor(...muted)
  doc.text(
    `${rangeLabel}  ·  Generated ${format(new Date(), 'd MMM yyyy', L)}`,
    margin,
    y,
  )
  y += 24

  const insights = computeInsights(meals, checkIns, sinceTs)

  // Summary.
  heading('Summary')
  const completed = checkIns.filter((c) => c.completedAt && !c.skipped).length
  body(`Meals logged: ${insights.totalMeals}`)
  body(`Meals with at least one check-in: ${insights.trackedMeals}`)
  body(`Check-ins completed: ${completed}`)
  if (insights.topSymptoms.length) {
    const top = insights.topSymptoms
      .slice(0, 5)
      .map((s) => `${s.symptom} (${s.count})`)
      .join(', ')
    body(`Most common symptoms: ${top}`)
  } else {
    body('No symptoms recorded in this period.')
  }
  y += 8

  // Patterns.
  heading('Patterns noticed')
  if (insights.patterns.length) {
    body(
      'These are associations only — not a diagnosis. Discuss them with a doctor.',
      { colour: muted, size: 9 },
    )
    y += 4
    for (const p of insights.patterns.slice(0, 12)) {
      body(`•  ${describePattern(p)}  (${Math.round(p.rate * 100)}%)`, {
        indent: 6,
      })
    }
  } else {
    body('Not enough data yet to highlight reliable patterns.', {
      colour: muted,
    })
  }
  y += 8

  // Daily log.
  heading('Daily log')
  const checkInsByMeal = new Map()
  for (const c of checkIns) {
    if (!checkInsByMeal.has(c.mealId)) checkInsByMeal.set(c.mealId, [])
    checkInsByMeal.get(c.mealId).push(c)
  }
  const days = groupByDay(meals)
  if (!days.size) {
    body('No meals logged in this period.', { colour: muted })
  }
  for (const [key, dayMeals] of days) {
    ensure(40)
    body(format(new Date(key), 'EEEE d MMMM yyyy', L), { bold: true, size: 11 })
    y += 2
    for (const m of dayMeals) {
      const t = format(new Date(m.timestamp), 'HH:mm')
      const label = MEAL_LABELS[m.mealType] || m.mealType
      body(`${t}  ${label} — ${m.foodText || '(no description)'}`, {
        indent: 8,
        bold: true,
      })
      if (m.tags?.length) {
        body(`Tags: ${m.tags.join(', ')}`, { indent: 18, colour: muted, size: 9 })
      }
      if (m.notes) {
        body(`Note: ${m.notes}`, { indent: 18, colour: muted, size: 9 })
      }
      const cis = (checkInsByMeal.get(m.id) || [])
        .filter((c) => c.completedAt && !c.skipped)
        .sort((a, b) => a.completedAt - b.completedAt)
      for (const c of cis) {
        const real = (c.symptoms || []).filter((s) => s !== FINE)
        const txt = real.length
          ? `${real.join(', ')}${c.severity != null ? ` · severity ${c.severity}/10` : ''}`
          : 'felt fine'
        body(
          `Check-in ${format(new Date(c.completedAt), 'HH:mm')}: ${capitalise(txt)}`,
          { indent: 18, size: 9 },
        )
        if (c.notes) {
          body(`“${c.notes}”`, { indent: 28, colour: muted, size: 9 })
        }
      }
      y += 4
    }
    y += 6
  }

  // Footer on every page.
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...muted)
    doc.text(
      'Generated by GutCheck · stored only on this device',
      margin,
      pageH - 24,
    )
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 24, {
      align: 'right',
    })
  }

  doc.save(`gutcheck-${rangeSlug}.pdf`)
}
