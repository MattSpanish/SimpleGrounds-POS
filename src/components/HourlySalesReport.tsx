
import { memo, useEffect, useState } from 'react'

type Props = {
  bins: number[]
  selectedHour?: number
  onSelectHour?: (h: number) => void
}

function HourlySalesReport({ bins, selectedHour, onSelectHour }: Props) {
  const max = Math.max(0, ...bins)
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024)
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const formatHour = (h: number) => {
    const hr = h % 24
    const ampm = hr < 12 ? 'AM' : 'PM'
    const twelve = hr % 12 === 0 ? 12 : hr % 12
    return `${twelve}:00 ${ampm}`
  }
  const formatTick = (h: number) => {
    const hr = h % 24
    const ampm = hr < 12 ? 'AM' : 'PM'
    const twelve = hr % 12 === 0 ? 12 : hr % 12
    return `${twelve} ${ampm}`
  }

  return (
    <div className="hourly-report" style={{ overflowX: 'auto', paddingBottom: 6 }}>
      <div
        className="hourly-report__chart"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(24, 1fr)',
          gap: 4,
          alignItems: 'end',
          minHeight: 120,
          minWidth: viewportWidth <= 640 ? 720 : viewportWidth <= 900 ? 840 : 960,
        }}
      >
        {bins.map((v, h) => {
          const heightPct = max > 0 ? Math.round((v / max) * 100) : 0
          const isSelected = h === selectedHour
          return (
            <button
              key={h}
              className={`hourly-bar${isSelected ? ' is-selected' : ''}`}
              title={`${formatHour(h)} • P${v}`}
              onClick={() => onSelectHour?.(h)}
              style={{
                height: `${Math.max(6, heightPct)}%`,
                background: isSelected ? '#4b7bec' : '#85a5ff',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                minWidth: 12,
              }}
            />
          )
        })}
      </div>
      <div
        className="hourly-report__axis"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(24, 1fr)',
          gap: 4,
          marginTop: 6,
          minWidth: viewportWidth <= 640 ? 720 : viewportWidth <= 900 ? 840 : 960,
        }}
      >
        {bins.map((_, h) => {
          const showTick = viewportWidth <= 640 ? h % 2 === 0 : true
          return (
            <div key={h} style={{ textAlign: 'center', fontSize: 10, color: '#666' }}>
              {showTick ? formatTick(h) : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(HourlySalesReport)
