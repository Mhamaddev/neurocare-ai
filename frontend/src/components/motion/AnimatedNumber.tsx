import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { useInView } from '../../hooks/useInView'

/** A number that counts up when first seen. Screen readers get the final value only. */
export function AnimatedNumber({ value, format, duration, active }: {
  value: number; format: (value: number) => string; duration?: number; active?: boolean
}) {
  const [ref, inView] = useInView<HTMLSpanElement>()
  const shown = useAnimatedNumber(value, active ?? inView, duration)
  return <span ref={ref} className="animated-number"><span aria-hidden="true">{format(shown)}</span><span className="sr-only">{format(value)}</span></span>
}
