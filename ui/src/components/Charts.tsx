import type { ReactNode } from 'react'

interface BarChartProps {
  data: { label: string; value: number }[]
  height?: number
}

export function MiniBarChart({ data }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <div className="flex items-end justify-between gap-2 h-full">
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * 100
        return (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex-1 w-full flex items-end">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary/60 transition-all duration-300 hover:from-primary-600 hover:to-primary/80"
                style={{ height: `${barHeight}%`, minHeight: '8px' }}
              />
            </div>
            <span className="text-xs text-text-muted dark:text-text-muted-dark">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

interface LineChartProps {
  data: number[]
  color?: string
}

export function MiniLineChart({ data, color = '#5b7bf5' }: LineChartProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 80
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Gradient fill */}
      <polygon
        points={`0,100 ${points} 100,100`}
        fill="url(#lineGradient)"
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface DonutChartProps {
  value: number
  max?: number
  color?: string
  size?: number
  children?: ReactNode
}

export function DonutChart({ value, max = 100, color = '#5b7bf5', size = 120, children }: DonutChartProps) {
  const percentage = (value / max) * 100
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={40}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-surface-light dark:text-surface-darker"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={40}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children || (
          <span className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  )
}

interface PieChartSegment {
  value: number
  color: string
  label: string
}

export function PieChart({ segments }: { segments: PieChartSegment[] }) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0)
  let currentAngle = 0

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
        {segments.map((segment, index) => {
          const percentage = segment.value / total
          const angle = percentage * 360
          const startAngle = currentAngle
          currentAngle += angle

          const startRad = (startAngle * Math.PI) / 180
          const endRad = (currentAngle * Math.PI) / 180

          const x1 = 80 + 70 * Math.cos(startRad)
          const y1 = 80 + 70 * Math.sin(startRad)
          const x2 = 80 + 70 * Math.cos(endRad)
          const y2 = 80 + 70 * Math.sin(endRad)

          const largeArc = angle > 180 ? 1 : 0

          return (
            <path
              key={index}
              d={`M 80 80 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={segment.color}
              className="transition-all duration-300 hover:opacity-80"
            />
          )
        })}
      </svg>
      
      <div className="grid grid-cols-2 gap-2 w-full">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
              {segment.label}
            </span>
            <span className="ml-auto text-xs font-semibold text-text-primary dark:text-text-primary-dark">
              {Math.round((segment.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

