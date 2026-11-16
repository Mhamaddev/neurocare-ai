import { useInView } from '../hooks/useInView'
import { AnimatedNumber } from './motion/AnimatedNumber'

const rows = (value: number) => Math.round(value).toLocaleString()

/** How the records were divided, as one proportional bar plus the exact counts. */
export function SplitOverview({ sizes }: { sizes: Record<string, number> | undefined }) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const entries = sizes ? Object.entries(sizes) : []
  const total = entries.reduce((sum, [, size]) => sum + size, 0)
  return <div ref={ref} className="split-overview" data-inview={inView}><h3>Split before learning.</h3>
    {total > 0 ? <>
      <div className="split-bar" aria-hidden="true">{entries.map(([name, size]) => <span key={name} data-part={name} style={{ flexGrow: size }} />)}</div>
      <dl>{entries.map(([name, size]) => <div key={name}><dt><i data-part={name} aria-hidden="true" />{name}<small>{(size / total * 100).toFixed(0)}%</small></dt><dd><AnimatedNumber value={size} format={rows} active={inView} duration={1500} /><span className="split-unit"> rows</span></dd></div>)}</dl>
      <p>Identical input profiles stay in the same partition. That protects against profile overlap; it does not identify unique people.</p>
    </> : <p role="status">Saved split counts appear when the model connects. No substitute counts are shown.</p>}
  </div>
}
