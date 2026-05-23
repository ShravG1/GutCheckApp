import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { format } from 'date-fns'
import Icon from '../components/Icon.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useAllMeals, useAllCheckIns } from '../hooks/useData.js'
import { useNow } from '../hooks/useNow.js'
import { computeInsights, describePattern, capitalise } from '../lib/insights.js'

const RANGES = [
  { id: '7', label: '7 days', days: 7 },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
]

const SAGE = '#7BA987'
const TERRACOTTA = '#D08770'

function Card({ children, className = '' }) {
  return (
    <div className={`bg-card rounded-card card-shadow p-4 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-[15px] font-semibold text-muted mb-2 mt-5">
      {children}
    </h2>
  )
}

function PatternBar({ pattern }) {
  const pct = Math.round(pattern.rate * 100)
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] leading-snug">
          {describePattern(pattern)}
        </span>
        <span className="text-[15px] font-bold text-terracotta shrink-0">
          {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-cream overflow-hidden">
        <div
          className="h-full rounded-full bg-terracotta"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function InsightsScreen() {
  const meals = useAllMeals()
  const checkIns = useAllCheckIns()
  const now = useNow(5 * 60_000)
  const [rangeId, setRangeId] = useState('30')

  const range = RANGES.find((r) => r.id === rangeId)

  const insights = useMemo(() => {
    const sinceTs = range.days
      ? now - range.days * 24 * 60 * 60 * 1000
      : null
    return computeInsights(meals, checkIns, sinceTs)
  }, [meals, checkIns, range.days, now])

  const hasData = insights.totalMeals > 0
  const trendData = insights.trend.map((d) => ({
    ...d,
    label: format(new Date(d.date), 'd MMM'),
  }))

  return (
    <div className="min-h-dvh pb-28">
      <header className="px-4 pt-4 pb-2">
        <h1 className="text-[24px] font-bold">Insights</h1>
        <p className="text-[15px] text-muted">
          Gentle patterns from what you've logged.
        </p>
      </header>

      <div className="px-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangeId(r.id)}
              className={`shrink-0 px-4 min-h-[44px] rounded-full text-[14px] font-semibold border transition-colors ${
                r.id === rangeId
                  ? 'bg-sage text-white border-sage'
                  : 'bg-white text-charcoal border-line'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="px-4 pt-4">
          <Card>
            <EmptyState
              icon="sparkle"
              title="No insights yet"
              message="Log meals and complete a few check-ins. Once there's enough, patterns will appear here."
            />
          </Card>
        </div>
      ) : (
        <div className="px-4">
          {/* Headline */}
          <SectionTitle>Headline pattern</SectionTitle>
          {insights.headline ? (
            <Card className="bg-sage-light">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 shrink-0 rounded-full bg-sage text-white flex items-center justify-center">
                  <Icon name="sparkle" size={20} />
                </span>
                <div>
                  <p className="text-[17px] font-semibold leading-snug">
                    {describePattern(insights.headline)}
                  </p>
                  <p className="text-[14px] text-sage-dark mt-1">
                    That's{' '}
                    {Math.round(insights.headline.rate * 100)}% of the time —
                    worth keeping an eye on.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-[15px] text-muted">
                No strong pattern yet. Patterns show once something happens at
                least 3 times.
              </p>
            </Card>
          )}

          {/* Other patterns */}
          {insights.patterns.length > 1 && (
            <>
              <SectionTitle>Other patterns</SectionTitle>
              <Card>
                <div className="divide-y divide-line">
                  {insights.patterns.slice(1, 10).map((p, i) => (
                    <PatternBar key={i} pattern={p} />
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* Top symptoms */}
          {insights.topSymptoms.length > 0 && (
            <>
              <SectionTitle>Most common symptoms</SectionTitle>
              <Card>
                <div style={{ width: '100%', height: 30 + insights.topSymptoms.length * 34 }}>
                  <ResponsiveContainer>
                    <BarChart
                      layout="vertical"
                      data={insights.topSymptoms.slice(0, 8)}
                      margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="symptom"
                        width={92}
                        tick={{ fontSize: 13, fill: '#2C2C2C' }}
                        tickFormatter={capitalise}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: '#F2EEE5' }}
                        contentStyle={{ borderRadius: 12, border: '1px solid #ECE7DD' }}
                      />
                      <Bar
                        dataKey="count"
                        fill={TERRACOTTA}
                        radius={[6, 6, 6, 6]}
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          {/* Trend */}
          {trendData.length > 1 && (
            <>
              <SectionTitle>Symptom days over time</SectionTitle>
              <Card>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <LineChart
                      data={trendData}
                      margin={{ left: -16, right: 8, top: 8, bottom: 4 }}
                    >
                      <CartesianGrid stroke="#ECE7DD" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#6E6E6E' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#6E6E6E' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #ECE7DD' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="symptoms"
                        name="Symptom check-ins"
                        stroke={TERRACOTTA}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: TERRACOTTA }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          {/* Time of day */}
          {insights.byPartOfDay.some((b) => b.symptoms > 0) && (
            <>
              <SectionTitle>When symptoms tend to follow meals</SectionTitle>
              <Card>
                <div style={{ width: '100%', height: 180 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={insights.byPartOfDay}
                      margin={{ left: -16, right: 8, top: 8, bottom: 4 }}
                    >
                      <CartesianGrid stroke="#ECE7DD" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: '#6E6E6E' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#6E6E6E' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: '#F2EEE5' }}
                        contentStyle={{ borderRadius: 12, border: '1px solid #ECE7DD' }}
                      />
                      <Bar
                        dataKey="symptoms"
                        fill={SAGE}
                        radius={[6, 6, 0, 0]}
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          {/* Quiet days */}
          {insights.quietDays.length > 0 && (
            <>
              <SectionTitle>Your quietest days</SectionTitle>
              <Card>
                <p className="text-[14px] text-muted mb-2">
                  Days with check-ins but no symptoms reported.
                </p>
                <div className="divide-y divide-line">
                  {insights.quietDays.slice(0, 6).map((d) => (
                    <div key={d.date} className="py-2.5">
                      <p className="text-[15px] font-semibold">
                        {format(new Date(d.date), 'EEEE d MMMM')}
                      </p>
                      <p className="text-[14px] text-muted">
                        {d.foods.slice(0, 6).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          <p className="text-[13px] text-muted text-center mt-6 px-4 leading-relaxed">
            These are associations, not a diagnosis. If something concerns you,
            speak with your doctor.
          </p>
        </div>
      )}
    </div>
  )
}
