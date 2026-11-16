import { useId } from 'react'
import { evaluationOutcomes } from '../lib/evaluationOutcomes'
import { formatMetric } from '../lib/modelPresentation'
import { useInView } from '../hooks/useInView'
import { AnimatedNumber } from './motion/AnimatedNumber'

const count = (value: number) => Math.round(value).toLocaleString()

export function EvaluationOutcomes({ matrix }: { matrix: number[][] | undefined }) {
  const caption = useId()
  const [ref, inView] = useInView<HTMLElement>()
  const groups = evaluationOutcomes(matrix)
  if (!groups) return null
  return <figure ref={ref} className="evaluation-outcomes" aria-labelledby={caption} data-inview={inView}>
    <figcaption id={caption}>What the cutoff finds.<span>Actual saved test records, grouped by their survey label.</span></figcaption>
    {groups.map(group => <div className="outcome-group" key={group.label}>
      <div className="outcome-heading"><span>{group.label}</span><strong>{formatMetric(group.correct / group.total)} {group.rateLabel}</strong></div>
      <div className="outcome-bar" aria-hidden="true"><span style={{ width: `${group.correct / group.total * 100}%` }} /><span style={{ width: `${group.incorrect / group.total * 100}%` }} /></div>
      <div className="outcome-key"><span><i aria-hidden="true" />{group.correctLabel} <strong><AnimatedNumber value={group.correct} format={count} active={inView} /></strong></span><span><i aria-hidden="true" />{group.incorrectLabel} <strong><AnimatedNumber value={group.incorrect} format={count} active={inView} /></strong></span></div>
    </div>)}
    <p>Finding more positive labels also flags more negative records. Neither label is a diagnosis.</p>
  </figure>
}
