import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion, tween } from '../lib/motion'

/**
 * Counts from zero to `target` once `active`, then glides to each new target.
 * Jumps straight to the value for reduced motion or a background tab, where frames do not run.
 */
export function useAnimatedNumber(target: number, active = true, duration = 1100): number {
  const [value, setValue] = useState(0)
  const current = useRef(0)
  useEffect(() => {
    if (!active || !Number.isFinite(target)) return
    if (prefersReducedMotion() || document.hidden) { current.current = target; setValue(target); return }
    const from = current.current
    const started = performance.now()
    let frame = 0
    const step = (now: number) => {
      const next = tween(from, target, now - started, duration)
      current.current = next
      setValue(next)
      if (next !== target) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, active, duration])
  return Number.isFinite(target) ? value : target
}
