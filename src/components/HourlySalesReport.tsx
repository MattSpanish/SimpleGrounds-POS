import { useMemo } from 'react'

type Props = {
  bins: number[]
  selectedHour?: number
  onSelectHour?: (h: number) => void
}

export default function HourlySalesReport({ bins, selectedHour, onSelectHour }: Props) {
  const max = useMemo(() => Math.max(1, ...bins), [bins])
  const total = useMemo(() => bins.reduce((a, b) => a + b, 0), [bins])

  const formatHour12 = (h: number) => {
    const hr = h % 24
    const ampm = hr < 12 ? 'AM' : 'PM'
    const twelve = hr % 12 === 0 ? 12 : hr % 12
    return `${twelve}:00 ${ampm}`
  }

  const formatTick = (h: number) => {
    const hr = h % 24
    const ampm = hr < 12 ? 'a' : 'p'
    const twelve = hr % 12 === 0 ? 12 : hr % 12
    return `${twelve}${ampm}`
  }

  return (
    <div className="hourly-chart-component">
      <div className="hourly-bars-track">
        {bins.map((val, h) => {
          const heightPct = total > 0 && max > 0 ? (val / max) * 100 : 0
          const isSelected = h === selectedHour
          const isPeak = val > 0 && val === max
          const hasSales = val > 0

          return (
            <div
              key={h}
              className={`hourly-bar-slot ${isSelected ? 'is-selected' : ''} ${isPeak ? 'is-peak' : ''}`}
              onClick={() => onSelectHour?.(h)}
              title={`${formatHour12(h)}: ₱${val.toLocaleString()} (${total > 0 ? ((val / total) * 100).toFixed(1) : 0}% of day)`}
            >
              <div className="bar-wrapper">
                {isPeak && <span className="peak-star">★</span>}
                <div
                  className={`bar-fill ${hasSales ? 'has-sales' : 'is-zero'}`}
                  style={{
                    height: `${Math.max(hasSales ? 12 : 3, heightPct)}%`,
                  }}
                />
              </div>
              <span className={`bar-tick-label ${h % 3 === 0 ? 'tick-visible' : 'tick-subtle'}`}>
                {h % 2 === 0 ? formatTick(h) : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
