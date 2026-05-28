import { useState, useEffect, useRef, useCallback } from 'react'

const DURATIONS = [5, 10, 15, 20, 30]

type Phase = 'idle' | 'running' | 'paused' | 'done'

export function PomodoroTimer() {
  const [duration, setDuration] = useState(25)   // minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60) // seconds
  const [phase, setPhase] = useState<Phase>('idle')
  const [opacity, setOpacity] = useState(0.12)
  const [_hovering, setHovering] = useState(false)

  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Transparency logic ───────────────────────────────────────────────────
  const scheduleFade = useCallback(() => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current)
    fadeTimer.current = setTimeout(() => setOpacity(0.12), 5000)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setHovering(true)
    setOpacity(1)
    if (fadeTimer.current) clearTimeout(fadeTimer.current)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHovering(false)
    scheduleFade()
  }, [scheduleFade])

  useEffect(() => {
    scheduleFade()
    return () => { if (fadeTimer.current) clearTimeout(fadeTimer.current) }
  }, [scheduleFade])

  // ── Timer tick ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setPhase('done')
            clearInterval(intervalRef.current!)
            // notification beep via Web Audio
            try {
              const ctx = new AudioContext()
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain); gain.connect(ctx.destination)
              osc.type = 'sine'; osc.frequency.value = 880
              gain.gain.setValueAtTime(0.3, ctx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
              osc.start(); osc.stop(ctx.currentTime + 1.2)
            } catch { /* audio not available */ }
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase])

  // ── Controls ─────────────────────────────────────────────────────────────
  const selectDuration = useCallback((mins: number) => {
    setDuration(mins)
    setTimeLeft(mins * 60)
    setPhase('idle')
  }, [])

  const toggle = useCallback(() => {
    if (phase === 'done') return
    setPhase(p => (p === 'running' ? 'paused' : 'running'))
  }, [phase])

  const reset = useCallback(() => {
    setPhase('idle')
    setTimeLeft(duration * 60)
  }, [duration])

  // ── Display ───────────────────────────────────────────────────────────────
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const progress = 1 - timeLeft / (duration * 60)

  const digitColor = phase === 'done'
    ? '#D97757'
    : phase === 'running'
    ? '#EAE0D4'
    : '#9A8878'

  const circumference = 2 * Math.PI * 28 // r=28
  const strokeDash = circumference * progress

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 200,
        opacity,
        transition: 'opacity 1.2s ease',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(20,16,11,0.92)',
          border: '1px solid #3A3028',
          borderRadius: 16,
          padding: '14px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(217,119,87,0.08)',
          backdropFilter: 'blur(12px)',
          minWidth: 180,
        }}
      >
        {/* SVG ring + time */}
        <div className="flex items-center justify-center gap-4 mb-3">
          {/* Progress ring */}
          <div style={{ position: 'relative', width: 68, height: 68 }}>
            <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
              {/* Track */}
              <circle cx="34" cy="34" r="28" fill="none" stroke="#2A2015" strokeWidth="3" />
              {/* Progress arc */}
              <circle
                cx="34" cy="34" r="28"
                fill="none"
                stroke={phase === 'done' ? '#D97757' : '#D9775780'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${strokeDash} ${circumference}`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            {/* Time display in center */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: "'Share Tech Mono', 'Courier New', monospace",
                fontSize: 16,
                fontWeight: 400,
                color: digitColor,
                letterSpacing: '0.05em',
                textShadow: phase === 'running' ? `0 0 8px ${digitColor}55` : 'none',
                transition: 'color 0.3s, text-shadow 0.3s',
              }}>
                {mins}:{secs}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2">
            <button
              onClick={toggle}
              disabled={phase === 'done'}
              style={{
                width: 32, height: 32,
                borderRadius: 8,
                background: phase === 'running' ? '#3A3028' : 'rgba(217,119,87,0.15)',
                border: `1px solid ${phase === 'running' ? '#5A4A38' : '#D97757'}`,
                color: phase === 'running' ? '#9A8878' : '#D97757',
                cursor: phase === 'done' ? 'default' : 'pointer',
                fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {phase === 'running' ? '⏸' : phase === 'done' ? '✓' : '▶'}
            </button>
            <button
              onClick={reset}
              style={{
                width: 32, height: 32,
                borderRadius: 8,
                background: 'transparent',
                border: '1px solid #3A3028',
                color: '#5A4A38',
                cursor: 'pointer',
                fontSize: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ↺
            </button>
          </div>
        </div>

        {/* Duration selector */}
        <div className="flex gap-1 justify-center flex-wrap">
          {DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => selectDuration(d)}
              style={{
                padding: '2px 7px',
                borderRadius: 6,
                fontSize: 10,
                fontFamily: "'Share Tech Mono', monospace",
                background: duration === d ? 'rgba(217,119,87,0.18)' : 'transparent',
                border: `1px solid ${duration === d ? '#D97757' : '#2A2015'}`,
                color: duration === d ? '#D97757' : '#5A4A38',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {d}m
            </button>
          ))}
        </div>

        {/* Phase label */}
        <div style={{
          textAlign: 'center',
          marginTop: 8,
          fontSize: 10,
          fontFamily: "'Share Tech Mono', monospace",
          color: phase === 'done' ? '#D97757' : '#3A3028',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          {phase === 'idle' ? 'ready' : phase === 'running' ? 'focus' : phase === 'paused' ? 'paused' : '✦ done'}
        </div>
      </div>
    </div>
  )
}
