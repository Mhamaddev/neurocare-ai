/** Decelerating ease used by every number tween. */
export function easeOutCubic(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress))
  return 1 - (1 - clamped) ** 3
}

/** Value of a tween from `from` to `to` after `elapsed` of `duration` milliseconds. */
export function tween(from: number, to: number, elapsed: number, duration: number): number {
  if (duration <= 0 || elapsed >= duration) return to
  return from + (to - from) * easeOutCubic(elapsed / duration)
}

/** Point on a half-circle gauge that runs left (0) to right (1) over the top. */
export function gaugePoint(fraction: number, centreX: number, centreY: number, radius: number): { x: number; y: number } {
  const angle = Math.PI * (1 - Math.min(1, Math.max(0, fraction)))
  return { x: centreX + Math.cos(angle) * radius, y: centreY - Math.sin(angle) * radius }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
