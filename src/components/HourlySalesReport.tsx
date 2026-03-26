
type Props = {
  bins: number[]
  selectedHour?: number
  onSelectHour?: (h: number) => void
}

export default function HourlySalesReport({ bins, selectedHour, onSelectHour }: Props) {
  const max = Math.max(0, ...bins)
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
    <div className="hourly-report">
      <div className="hourly-report__chart" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 4, alignItems: 'end', minHeight: 120 }}>
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
              }}
            />
          )
        })}
      </div>
      <div className="hourly-report__axis" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 4, marginTop: 6 }}>
        {bins.map((_, h) => (
          <div key={h} style={{ textAlign: 'center', fontSize: 10, color: '#666' }}>{formatTick(h)}</div>
        ))}
      </div>
    </div>
  )
}
