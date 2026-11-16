import { gaugePoint } from '../lib/motion'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

const CX = 130, CY = 132, R = 108

/** Half-circle gauge: the score sweeps in from zero, with the classification cutoff marked on the arc. */
export function ScoreGauge({ score, threshold }: { score: number; threshold: number }) {
  const shown = useAnimatedNumber(score, true, 1800)
  const knob = gaugePoint(shown, CX, CY, R)
  const inner = gaugePoint(threshold, CX, CY, R - 15)
  const outer = gaugePoint(threshold, CX, CY, R + 15)
  const arc = `M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`
  return <figure className="score-gauge">
    <svg viewBox="0 0 260 160" role="img" aria-label={`Model score for label 1: ${(score * 100).toFixed(1)}%. Classification cutoff: ${(threshold * 100).toFixed(1)}%.`}>
      <path className="gauge-track" d={arc} />
      <path className="gauge-value" d={arc} pathLength={100} strokeDasharray={`${(shown * 100).toFixed(2)} 100`} />
      <line className="gauge-cutoff" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
      <circle className="gauge-knob" cx={knob.x} cy={knob.y} r={8} />
      <text className="gauge-number" x={CX} y={CY - 22} textAnchor="middle">{(shown * 100).toFixed(1)}<tspan className="gauge-unit" dx="2">%</tspan></text>
      <text className="gauge-caption" x={CX} y={CY - 2} textAnchor="middle">model score for label 1</text>
      <text className="gauge-end" x={CX - R} y={CY + 20} textAnchor="middle">0%</text>
      <text className="gauge-end" x={CX + R} y={CY + 20} textAnchor="middle">100%</text>
    </svg>
    <figcaption><i className="key-cutoff" aria-hidden="true" />Cutoff {(threshold * 100).toFixed(1)}%</figcaption>
  </figure>
}
