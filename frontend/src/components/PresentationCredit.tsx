import { GraduationCap } from 'lucide-react'
import { credits } from '../lib/credits'
import { Reveal } from './motion/Reveal'

/** Who prepared the project and who it is presented to. Names come from lib/credits.ts. */
export function PresentationCredit({ compact = false }: { compact?: boolean }) {
  const students = credits.students
  return <Reveal as="section" variant="scale" className={`credit-card${compact ? ' credit-card--compact' : ''}`} labelledBy="credit-title">
    <span className="credit-glow" aria-hidden="true" />
    <div className="credit-mark" aria-hidden="true"><GraduationCap size={26} /></div>
    <div className="credit-body">
      <span className="eyebrow">AN ARTIFICIAL NEURAL NETWORKS PROJECT</span>
      <h2 id="credit-title">Presented to<br /><em>{credits.supervisor}</em></h2>
      <p>With thanks for the guidance behind this work.</p>
    </div>
    <div className="credit-team">
      <span className="credit-label">PREPARED BY</span>
      {students.length
        ? <ul>{students.map((name, index) => <li key={name} style={{ animationDelay: `${300 + index * 90}ms` }}>{name}</li>)}</ul>
        : <p>The NeuroCare student team</p>}
    </div>
  </Reveal>
}
