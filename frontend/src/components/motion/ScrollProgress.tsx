import { useEffect, useRef } from 'react'

/** Thin reading-progress bar along the bottom edge of the header. */
export function ScrollProgress() {
  const bar = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const range = document.documentElement.scrollHeight - window.innerHeight
      const progress = range > 0 ? Math.min(1, window.scrollY / range) : 0
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`
      document.documentElement.toggleAttribute('data-scrolled', window.scrollY > 8)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame) }
  }, [])
  return <span className="scroll-progress" aria-hidden="true"><span ref={bar} /></span>
}
