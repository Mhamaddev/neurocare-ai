import { formatMetric } from '../lib/modelPresentation'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { useInView } from '../hooks/useInView'

/** One 0–1 measure as a ring that fills while the number counts up. */
export function MetricDisplay({ label, value, percent = true, description }: {
  label: string; value: number | undefined; percent?: boolean; description: string
}) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
  const shown = useAnimatedNumber(valid ? value : 0, inView, 1400)
  return <div className="metric" ref={ref}>
    <svg className="metric-ring" viewBox="0 0 120 120" role="img" aria-label={`${label}: ${formatMetric(value, percent)}`}>
      <circle className="metric-ring-track" cx="60" cy="60" r="52" />
      {valid && <circle className="metric-ring-value" cx="60" cy="60" r="52" pathLength={100} strokeDasharray={`${(shown * 100).toFixed(2)} 100`} transform="rotate(-90 60 60)" />}
      <text className={valid ? 'metric-ring-number' : 'metric-ring-missing'} x="60" y="61" textAnchor="middle" dominantBaseline="middle">{valid ? formatMetric(shown, percent) : 'Unavailable'}</text>
    </svg>
    <span>{label}</span><p>{description}</p>
  </div>
}
