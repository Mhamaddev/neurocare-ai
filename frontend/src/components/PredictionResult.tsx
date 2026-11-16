import type { CSSProperties } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import type { PredictionResult as Result, SurveyField } from '../types/model'
import { ScoreEffects } from './ScoreEffects'
import { ScoreGauge } from './ScoreGauge'
import { WhatIfExplorer } from './WhatIfExplorer'
import { Button, ButtonLink } from './ui/Button'
import { Accordion } from './ui/Accordion'

export function PredictionResult({ result, fields, values, hiddenUnits, onReset }: {
  result: Result; fields: SurveyField[]; values: Record<string, string>; hiddenUnits?: number[]; onReset: () => void
}) {
  const above = result.predicted_probability >= result.decision_threshold
  const stages = [`${fields.length} answers scaled`, ...(hiddenUnits ?? []).map(units => `${units} hidden units`), 'Sigmoid score', `Saved as #${result.id}`]
  return <section className="prediction-result" aria-labelledby="result-title">
    <p className="result-saved"><span><Check size={15} aria-hidden="true" /></span>Your exploration is saved</p>
    <h2 id="result-title" tabIndex={-1}>Your model result.<br /><em>With the context it needs.</em></h2>
    <ol className="result-pipeline" aria-label="What the model did with this profile">
      {stages.map((stage, index) => <li key={stage} style={{ '--i': index } as CSSProperties}><span aria-hidden="true">{index + 1}</span>{stage}</li>)}
    </ol>
    <div className="result-hero">
      <ScoreGauge score={result.predicted_probability} threshold={result.decision_threshold} />
      <div className="result-verdict">
        <span className="result-verdict-label">The network returned</span>
        <strong className="class-label" data-label={result.predicted_class}>Dataset label {result.predicted_class}</strong>
        <p>The score is {above ? 'at or above' : 'below'} the {(result.decision_threshold * 100).toFixed(2)}% classification cutoff for this fictional profile.</p>
        <p className="result-context">This is a learned survey pattern, not a personal probability of disease. Neither label establishes a health status.</p>
      </div>
    </div>
    <ScoreEffects effects={result.effects} fields={fields} values={values} />
    <WhatIfExplorer fields={fields} saved={values} savedScore={result.predicted_probability} threshold={result.decision_threshold} />
    <p className="result-policy">{result.notice}</p>
    <div className="result-actions"><Button onClick={onReset}>Try another profile<ArrowRight size={16} aria-hidden="true" /></Button><ButtonLink to="/model" variant="ghost">Understand the result</ButtonLink></div>
    <Accordion title="Details of this saved exploration"><dl className="result-details"><div><dt>Saved record</dt><dd>#{result.id}</dd></div><div><dt>Model version</dt><dd>{result.model_version}</dd></div><div><dt>Classification cutoff</dt><dd>{result.decision_threshold.toFixed(6)}</dd></div></dl><p>{result.notice}</p><p>Saved in PostgreSQL. Other visitors’ inputs and history are not available here.</p></Accordion>
  </section>
}
