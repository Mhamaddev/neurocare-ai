import type { CSSProperties } from 'react'
import { ArrowUpRight, Network } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useModel } from '../hooks/useModel'
import { useInView } from '../hooks/useInView'

const LAYER_STEP = 0.75 // seconds a signal takes to cross from one layer to the next

/** Representative nodes/connections, never learned weights or live activations. The motion is illustrative. */
export function ModelDiagram({ compact = false }: { compact?: boolean }) {
  const { model, loading } = useModel()
  const [ref, inView] = useInView<HTMLElement>()
  const units = model?.architecture?.hidden_units
  const layers = [
    { count: '21', label: 'Inputs', samples: 4 },
    ...(units?.length ? units.map((count, index) => ({ count: String(count), label: `Hidden ${index + 1}`, samples: index === 0 ? 6 : 5 }))
      : [{ count: '—', label: 'Hidden layers', samples: 6 }]),
    { count: '1', label: 'Output', samples: 1 },
  ]
  const points = layers.map((layer, index) => Array.from({ length: layer.samples }, (_, node) => ({
    x: 50 + index * (400 / (layers.length - 1)), y: 150 + (node - (layer.samples - 1) / 2) * 30,
  })))
  const links = points.slice(0, -1).flatMap((group, index) => group.flatMap((from, a) => points[index + 1].map((to, b) => ({
    key: `${index}-${a}-${b}`, layer: index, signal: (a * 2 + b * 3 + index) % 3 === 0, jitter: ((a * 7 + b * 5) % 6) * 0.03,
    d: `M${from.x} ${from.y} C${(from.x + to.x) / 2} ${from.y},${(from.x + to.x) / 2} ${to.y},${to.x} ${to.y}`,
  }))))
  const cycle = `${(layers.length * LAYER_STEP + 0.9).toFixed(2)}s`
  const grid = compact ? 'network-grid-compact' : 'network-grid'
  return <figure ref={ref} className={`model-diagram${compact ? ' model-diagram--compact' : ''}`} data-inview={inView} style={{ '--cycle': cycle } as CSSProperties}>
    <div className="diagram-topbar"><span><Network size={15} aria-hidden="true" />NeuroCare / ANN</span><span className="diagram-caption"><i className="live-dot" aria-hidden="true" />ARCHITECTURE</span></div>
    <div className="diagram-preprocess"><span className="diagram-step">PREPARE</span><strong>Training-only scaling</strong><span>21 coded survey features</span></div>
    <div className="diagram-canvas"><svg viewBox="0 0 500 282" role="img" aria-label={`Illustrative network with 21 inputs, ${units?.length ? units.map(count => `${count} hidden units`).join(', ') : 'hidden layers whose counts are unavailable'}, and one sigmoid output. Connections are schematic.`}>
      <defs><pattern id={grid} width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.6" fill="currentColor" /></pattern></defs>
      <rect width="500" height="282" fill={`url(#${grid})`} className="network-grid" />
      <g className="network-connections">{links.map(link => <path key={link.key} d={link.d} pathLength={1} style={{ animationDelay: `${link.layer * 0.28}s` }} />)}</g>
      <g className="network-signals" aria-hidden="true">{links.filter(link => link.signal).map(link => <path key={link.key} d={link.d} pathLength={100}
        style={{ animationDelay: `${(1.4 + link.layer * LAYER_STEP + link.jitter).toFixed(2)}s` }} />)}</g>
      {points.map((group, index) => {
        const output = index === layers.length - 1
        const delay = `${(1.4 + index * LAYER_STEP).toFixed(2)}s`
        return <g key={index} className={`network-layer network-layer--${index === 0 ? 'input' : output ? 'output' : 'hidden'}`}>
          <text x={group[0].x} y="32" className="network-count">{layers[index].count}</text>
          {output && <circle className="network-ripple" cx={group[0].x} cy={group[0].y} r={13} style={{ animationDelay: delay }} />}
          {group.map((point, node) => <circle key={node} className="network-node" cx={point.x} cy={point.y} r={output ? 13 : 7} style={{ animationDelay: delay }} />)}
          <text x={group[0].x} y="258" className="network-label">{layers[index].label}</text>
        </g>
      })}
    </svg></div>
    <div className="diagram-output"><span className="panel-marker" aria-hidden="true" /><span>Sigmoid score <span aria-hidden="true">→</span> validation-selected cutoff <span aria-hidden="true">→</span> dataset label</span></div>
    <figcaption><p>Representative nodes and connections; the motion is illustrative. {units?.length ? 'Counts from the loaded model.' : loading ? 'Loading saved architecture.' : 'Saved architecture unavailable.'}</p>{!compact && <Link to="/model" aria-label="Explore the model architecture"><ArrowUpRight size={18} aria-hidden="true" /></Link>}</figcaption>
  </figure>
}
