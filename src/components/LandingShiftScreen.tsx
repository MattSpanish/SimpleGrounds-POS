import { useEffect, useState } from 'react'
import type { Shift } from '../types/pos'
import {
  BarChartIcon,
  CheckCircleIcon,
  ClockIcon,
  CoffeeIcon,
  UsersIcon,
} from './Icons'

export type ShiftSession = {
  staff: string
  shift: Shift
  startedAt: string
  startingFloat?: number
}

type Props = {
  onStartShift: (session: ShiftSession) => void
  onDirectToSales: () => void
  defaultStaff?: string
}

function getInitialRecentStaff(): string[] {
  try {
    const raw = localStorage.getItem('sg-recent-staff-list')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.slice(0, 4)
    }
  } catch {
    // ignore
  }
  return ['Matt', 'Barista 1', 'Barista 2']
}

export default function LandingShiftScreen({ onStartShift, onDirectToSales, defaultStaff = '' }: Props) {
  const [staff, setStaff] = useState<string>(() => {
    try {
      return defaultStaff || localStorage.getItem('sg-last-staff') || ''
    } catch {
      return defaultStaff || ''
    }
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [recentStaff] = useState<string[]>(getInitialRecentStaff)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const currentHour = currentTime.getHours()
  const greeting = (() => {
    if (currentHour >= 5 && currentHour < 12) return 'Good Morning, Barista!'
    if (currentHour >= 12 && currentHour < 17) return 'Good Afternoon, Barista!'
    if (currentHour >= 17 && currentHour < 24) return 'Good Evening • 5 PM – 2 AM Shift!'
    return 'Night Owl Garage Brews!'
  })()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = staff.trim()
    if (!name) return

    // Save staff list
    try {
      const existing = recentStaff.filter((s) => s.toLowerCase() !== name.toLowerCase())
      const updated = [name, ...existing].slice(0, 5)
      localStorage.setItem('sg-recent-staff-list', JSON.stringify(updated))
      localStorage.setItem('sg-last-staff', name)
    } catch {
      // ignore
    }

    onStartShift({
      staff: name,
      shift: '5pm-2am',
      startedAt: new Date().toISOString(),
      startingFloat: 0,
    })
  }

  return (
    <div className="landing-screen-wrapper">
      <div className="landing-card-glass">
        {/* Brand Header */}
        <div className="landing-brand-header">
          <div className="landing-logo-emblem">
            <CoffeeIcon size={32} />
          </div>
          <div className="landing-brand-titles">
            <h1 className="landing-main-title">
              <span className="brand-accent-text">Simpli</span>Grounds
            </h1>
            <p className="landing-sub-title">Coffee Street Garage • Terminal POS Station</p>
          </div>
        </div>

        {/* Live Clock & Shift Greeting Banner */}
        <div className="landing-greeting-banner">
          <div className="greeting-text-wrap">
            <span className="greeting-pill">{greeting}</span>
            <h3 className="greeting-lead">Ready to start today's shift?</h3>
          </div>
          <div className="landing-clock-box">
            <div className="landing-live-time">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="landing-live-date">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Main Shift Initiation Form */}
        <form className="landing-shift-form" onSubmit={handleSubmit}>
          {/* Staff Name Input */}
          <div className="landing-form-group">
            <label className="landing-field-label">
              <UsersIcon size={16} />
              <span>Cashier / Barista On Duty</span>
            </label>
            <div className="landing-input-wrapper">
              <input
                type="text"
                className="landing-staff-input"
                placeholder="Enter your name or nickname"
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Quick staff selector pills */}
            <div className="quick-staff-pills-row">
              <span className="quick-staff-hint">Recent:</span>
              {recentStaff.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`quick-staff-pill ${staff.toLowerCase() === s.toLowerCase() ? 'is-selected' : ''}`}
                  onClick={() => setStaff(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Active Work Shift Display */}
          <div className="landing-form-group">
            <label className="landing-field-label">
              <ClockIcon size={16} />
              <span>Operating Work Shift</span>
            </label>
            <div className="single-shift-banner">
              <span className="shift-card-emoji">🌙</span>
              <div className="shift-card-texts">
                <span className="shift-card-name">Garage Shift (Night Brews)</span>
                <span className="shift-card-time">5:00 PM – 2:00 AM • Active Daily Schedule</span>
              </div>
              <span className="shift-selected-check">
                <CheckCircleIcon size={20} />
              </span>
            </div>
          </div>

          {/* Submit CTA Button */}
          <div className="landing-submit-section">
            <button
              type="submit"
              className="btn-start-shift"
              disabled={!staff.trim()}
            >
              <CoffeeIcon size={20} />
              <span>Start Shift & Open Register</span>
            </button>
          </div>
        </form>

        {/* Manager / Analytics Bypass */}
        <div className="landing-footer-bypass">
          <button
            type="button"
            className="btn-bypass-analytics"
            onClick={onDirectToSales}
          >
            <BarChartIcon size={16} />
            <span>Open Sales & Analytics Dashboard (Manager Direct)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
