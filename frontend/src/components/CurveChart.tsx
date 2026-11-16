import { useId, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { interpolate } from '../lib/curves'
import { useInView } from '../hooks/useInView'
import type { Point } from '../lib/curves'

export interface CurveSeries { id: string; label: string; points: Point[] }

const WIDTH = 360, HEIGHT = 300
const PLOT = { left: 44, right: 14, top: 14, bottom: 40 }
const INNER = { width: WIDTH - PLOT.left - PLOT.right, height: HEIGHT - PLOT.top - PLOT.bottom }
const TICKS = [0, 0.25, 0.5, 0.75, 1]
const px = (x: number) => PLOT.left + x * INNER.width
const py = (y: number) => PLOT.top + (1 - y) * INNER.height
const percent = (value: number) => `${Math.round(value * 100)}%`
const path = (points: Point[]) => points.map((point, index) => `${index ? 'L' : 'M'}${px(point.x).toFixed(1)},${py(point.y).toFixed(1)}`).join('')

/** Two-series line chart on a shared 0–100% scale, with a hover readout and a cutoff marker. */
export function CurveChart({ title, summary, xLabel, yLabel, series, reference, referenceLabel, marker }: {
  title: string; summary: string; xLabel: string; yLabel: string; series: CurveSeries[]
  reference: [Point, Point]; referenceLabel: string; marker?: Point
}) {
  const titleId = useId()
  const frame = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [figure, inView] = useInView<HTMLElement>()

  function track(event: PointerEvent<HTMLDivElement>) {
    const box = frame.current?.getBoundingClientRect()
    if (!box) return
    const x = ((event.clientX - box.left) / box.width * WIDTH - PLOT.left) / INNER.width
    setHover(x >= 0 && x <= 1 ? x : null)
  }
  const readings = hover === null ? [] : series.map(item => ({ ...item, y: interpolate(item.points, hover) }))

  return <figure ref={figure} className="curve-chart" aria-labelledby={titleId} data-inview={inView}>
    <figcaption id={titleId}>{title}<span>{summary}</span></figcaption>
    <div className="curve-frame" ref={frame} onPointerMove={track} onPointerDown={track} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${title}. ${summary}`}>
        {TICKS.map(tick => <g key={tick}>
          <line className="curve-grid" x1={px(0)} x2={px(1)} y1={py(tick)} y2={py(tick)} />
          <text className="curve-tick" x={px(0) - 8} y={py(tick) + 4} textAnchor="end">{percent(tick)}</text>
          <text className="curve-tick" x={px(tick)} y={py(0) + 17} textAnchor="middle">{percent(tick)}</text>
        </g>)}
        <text className="curve-axis" x={px(0.5)} y={HEIGHT - 4} textAnchor="middle">{xLabel}</text>
        <text className="curve-axis" x={12} y={py(0.5)} textAnchor="middle" transform={`rotate(-90 12 ${py(0.5)})`}>{yLabel}</text>
        <line className="curve-reference" x1={px(reference[0].x)} y1={py(reference[0].y)} x2={px(reference[1].x)} y2={py(reference[1].y)} />
        {series.map((item, index) => <path key={item.id} className={`curve-line curve-line--${item.id}`} d={path(item.points)} pathLength={1} style={{ transitionDelay: `${index * 250}ms` }} />)}
        {hover !== null && <line className="curve-crosshair" x1={px(hover)} x2={px(hover)} y1={py(1)} y2={py(0)} />}
        {readings.map(item => item.y !== undefined && <circle key={item.id} className={`curve-dot curve-dot--${item.id}`} cx={px(hover!)} cy={py(item.y)} r={4} />)}
        {marker && <g className="curve-marker" style={{ transform: `translate(${px(marker.x).toFixed(1)}px, ${py(marker.y).toFixed(1)}px)` }}><circle className="curve-marker-halo" r={6} /><circle r={6} /></g>}
      </svg>
      {hover !== null && <div className="curve-tooltip" data-side={hover > 0.55 ? 'left' : 'right'} style={{ left: `${px(hover) / WIDTH * 100}%` }}>
        <span>{xLabel} <strong>{(hover * 100).toFixed(0)}%</strong></span>
        {readings.map(item => <span key={item.id}><i className={`series-swatch series-swatch--${item.id}`} />{item.label} <strong>{item.y === undefined ? 'not measured' : `${(item.y * 100).toFixed(1)}%`}</strong></span>)}
      </div>}
    </div>
    <p className="curve-note"><i className="reference-swatch" aria-hidden="true" />{referenceLabel}</p>
  </figure>
}
