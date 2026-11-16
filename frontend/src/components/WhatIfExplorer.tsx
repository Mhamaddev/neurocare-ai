import { useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { api } from '../services/api'
import type { PreviewResult, SurveyField as Field } from '../types/model'
import { formatPoints } from '../lib/effects'
import { surveyFormData, surveySteps } from '../lib/surveySteps'
import { validateSurvey } from '../lib/surveyValidation'
import { SurveyField } from './SurveyField'
import { Accordion } from './ui/Accordion'
import { Button } from './ui/Button'
import { AnimatedNumber } from './motion/AnimatedNumber'

const percent = (value: number) => `${(value * 100).toFixed(1)}%`

/** Edit the saved answers and rescore live. Nothing here is written to the database. */
export function WhatIfExplorer({ fields, saved, savedScore, threshold }: {
  fields: Field[]; saved: Record<string, string>; savedScore: number; threshold: number
}) {
  const [draft, setDraft] = useState(saved)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [failed, setFailed] = useState(false)
  const steps = useMemo(() => surveySteps(fields), [fields])
  const { values: payload, issues } = useMemo(() => validateSurvey(fields, surveyFormData(draft)), [fields, draft])
  const changed = fields.filter(field => draft[field.name] !== saved[field.name])
  const valid = Object.keys(issues).length === 0
  const request = changed.length && valid ? JSON.stringify(payload) : ''

  useEffect(() => {
    if (!request) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void api.post<PreviewResult>('/api/v1/predictions/preview', JSON.parse(request), { signal: controller.signal, timeout: 20000 }).then(
        response => { if (!controller.signal.aborted) { setPreview(response.data); setFailed(false) } },
        () => { if (!controller.signal.aborted) setFailed(true) },
      )
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [request])

  const score = changed.length && preview ? preview.predicted_probability : savedScore
  const label = (value: number) => value >= threshold ? 1 : 0
  const status = !changed.length ? 'Change any answer below to see the score respond.'
    : !valid ? 'Complete the highlighted answer to rescore.'
      : failed ? 'The what-if score could not be loaded. Check the connection and change an answer to retry.'
        : !preview ? 'Rescoring…'
          : label(score) === label(savedScore) ? `Still dataset label ${label(score)}.` : `Crosses the cutoff: dataset label ${label(savedScore)} becomes ${label(score)}.`

  return <section className="what-if" aria-labelledby="what-if-title">
    <h3 id="what-if-title">What if an answer were different?</h3>
    <p className="insight-intro">Edit the profile and the network rescores it straight away. What-if scores are not saved.</p>
    <Accordion title="Open the what-if explorer">
      <div className="what-if-readout" role="status">
        <div className="what-if-scores">
          <div><span>Saved profile</span><strong>{percent(savedScore)}</strong></div>
          <div><span>What-if</span><strong><AnimatedNumber value={score} format={percent} duration={500} active /></strong></div>
          <div data-direction={score > savedScore ? 'up' : score < savedScore ? 'down' : 'none'}><span>Change</span><strong><AnimatedNumber value={score - savedScore} format={formatPoints} duration={500} active /></strong></div>
        </div>
        <div className="score-track what-if-track" aria-hidden="true">
          <span style={{ width: `${score * 100}%` }} />
          <b style={{ left: `${savedScore * 100}%` }} />
          <i style={{ left: `${threshold * 100}%` }} />
        </div>
        <p className="what-if-key" aria-hidden="true"><span><i className="key-cutoff" />Cutoff {(threshold * 100).toFixed(1)}%</span><span><i className="key-saved" />Saved score</span></p>
        <p>{status}</p>
      </div>
      {steps.map(step => <fieldset className="what-if-group" key={step.label}>
        <legend>{step.label}</legend>
        <div className="input-grid">
          {step.fields.map(name => <SurveyField key={name} field={fields.find(field => field.name === name)!}
            value={draft[name] ?? ''} onChange={value => setDraft(previous => ({ ...previous, [name]: value }))}
            error={issues[name]} register={() => {}} />)}
        </div>
      </fieldset>)}
      <Button variant="secondary" small disabled={!changed.length} onClick={() => { setDraft(saved); setPreview(null); setFailed(false) }}>
        <RotateCcw size={13} aria-hidden="true" />Reset to the saved answers{changed.length ? ` (${changed.length} changed)` : ''}
      </Button>
    </Accordion>
  </section>
}
