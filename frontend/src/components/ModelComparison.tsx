import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { Curves, ModelInfo, TestMetrics } from '../types/model'
import { metricsAt, nearestIndex, precisionRecallPoints, rocPoints } from '../lib/curves'
import { formatMetric } from '../lib/modelPresentation'
import { CurveChart } from './CurveChart'
import { Button } from './ui/Button'
import { AnimatedNumber } from './motion/AnimatedNumber'
import { useInView } from '../hooks/useInView'

function Cell({ value, percent = true, fallback }: { value: number | undefined; percent?: boolean; fallback?: string }) {
  const valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
  return <td>{fallback ?? (valid ? <AnimatedNumber value={value} format={shown => formatMetric(shown, percent)} /> : formatMetric(value, percent))}
    <span className="cell-bar" aria-hidden="true"><span style={{ transform: `scaleX(${valid && !fallback ? value : 0})` }} /></span></td>
}

function ComparisonTable({ model }: { model: ModelInfo }) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const baseline: TestMetrics | undefined = model.baseline_metrics?.logistic_regression
  const majority = model.baseline_metrics?.majority_class_accuracy
  const rows: [string, string, TestMetrics | undefined, boolean][] = [
    ['Neural network', 'ann', model.test_metrics, false],
    ['Logistic regression', 'logistic_regression', baseline, false],
    ['Always label 0', 'none', majority === undefined ? undefined : { accuracy: majority, recall: 0, roc_auc: 0.5 }, true],
  ]
  return <div ref={ref} className="comparison-scroll" data-inview={inView}><table className="comparison-table">
    <caption className="sr-only">Test-partition results for the neural network and two simpler baselines</caption>
    <thead><tr><th scope="col">Model</th><th scope="col">Accuracy</th><th scope="col">Recall</th><th scope="col">Precision</th><th scope="col">ROC AUC</th></tr></thead>
    <tbody>{rows.map(([label, id, metrics, trivial]) => <tr key={id}>
      <th scope="row"><i className={`series-swatch series-swatch--${id}`} aria-hidden="true" />{label}</th>
      <Cell value={metrics?.accuracy} />
      <Cell value={metrics?.recall} />
      <Cell value={metrics?.precision} fallback={trivial ? 'None flagged' : undefined} />
      <Cell value={metrics?.roc_auc} percent={false} />
    </tr>)}</tbody>
  </table></div>
}

function CutoffExplorer({ curves }: { curves: Curves }) {
  const { ann, logistic_regression: baseline } = curves.models
  const savedIndex = useMemo(() => nearestIndex(ann.sweep, ann.threshold), [ann])
  const [index, setIndex] = useState(savedIndex)
  const charts = useMemo(() => ({
    roc: [{ id: 'ann', label: ann.label, points: rocPoints(ann.sweep, curves.positives, curves.negatives) },
      { id: 'logistic_regression', label: baseline.label, points: rocPoints(baseline.sweep, curves.positives, curves.negatives) }],
    precisionRecall: [{ id: 'ann', label: ann.label, points: precisionRecallPoints(ann.sweep, curves.positives) },
      { id: 'logistic_regression', label: baseline.label, points: precisionRecallPoints(baseline.sweep, curves.positives) }],
  }), [ann, baseline, curves])
  const current = metricsAt(ann.sweep[index], curves.positives, curves.negatives)
  const prevalence = curves.positives / curves.rows
  const cutoff = `${(current.threshold * 100).toFixed(1)}%`

  return <div className="cutoff-explorer">
    <div className="cutoff-control">
      <label htmlFor="cutoff-slider">Move the network’s cutoff <strong>{cutoff}</strong>{index === savedIndex && <span className="cutoff-saved">saved cutoff</span>}</label>
      <input id="cutoff-slider" type="range" min={0} max={ann.sweep.length - 1} step={1} value={index}
        onChange={event => setIndex(Number(event.target.value))} aria-valuetext={`Cutoff ${cutoff}`} />
      <div className="cutoff-scale" aria-hidden="true"><span>Flags almost everyone</span><span>Flags almost no one</span></div>
      <Button variant="ghost" small disabled={index === savedIndex} onClick={() => setIndex(savedIndex)}><RotateCcw size={13} aria-hidden="true" />Back to the saved cutoff</Button>
    </div>
    <dl className="cutoff-readout" aria-live="polite">
      <div><dt>Accuracy</dt><dd><AnimatedNumber value={current.accuracy} format={formatMetric} duration={350} /></dd></div>
      <div><dt>Recall</dt><dd><AnimatedNumber value={current.recall} format={formatMetric} duration={350} /></dd></div>
      <div><dt>Precision</dt><dd>{current.precision === undefined ? 'None flagged' : <AnimatedNumber value={current.precision} format={formatMetric} duration={350} />}</dd></div>
      <div><dt>Records flagged</dt><dd><AnimatedNumber value={current.flagged} format={formatMetric} duration={350} /></dd></div>
    </dl>
    <div className="series-legend"><span><i className="series-swatch series-swatch--ann" />{ann.label}</span><span><i className="series-swatch series-swatch--logistic_regression" />{baseline.label}</span><span><i className="marker-swatch" />Network at the chosen cutoff</span></div>
    <div className="curve-grid-layout">
      <CurveChart title="ROC curve" summary={`Area under the curve: network ${ann.roc_auc.toFixed(3)}, logistic regression ${baseline.roc_auc.toFixed(3)}.`}
        xLabel="Negative labels flagged" yLabel="Positive labels found" series={charts.roc}
        reference={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} referenceLabel="Dashed line: guessing at random."
        marker={{ x: current.falsePositiveRate, y: current.recall }} />
      <CurveChart title="Precision and recall" summary={`Average precision: network ${ann.average_precision.toFixed(3)}, logistic regression ${baseline.average_precision.toFixed(3)}.`}
        xLabel="Recall" yLabel="Precision" series={charts.precisionRecall}
        reference={[{ x: 0, y: prevalence }, { x: 1, y: prevalence }]} referenceLabel={`Dashed line: flagging everyone (${(prevalence * 100).toFixed(1)}% are label 1).`}
        marker={current.precision === undefined ? undefined : { x: current.recall, y: current.precision }} />
    </div>
    <p className="insight-caveat">The slider explores {curves.rows.toLocaleString()} saved test records for learning. The model’s real cutoff was chosen on validation data only and is not changed here.</p>
  </div>
}

/** The network beside its baselines, plus the trade-off every cutoff makes. */
export function ModelComparison({ model, curves }: { model: ModelInfo | null; curves: Curves | null }) {
  if (!model) return <p role="status" className="insight-intro">The comparison appears when the saved model connects. No substitute numbers are shown.</p>
  const gap = (model.test_metrics?.roc_auc ?? NaN) - (model.baseline_metrics?.logistic_regression?.roc_auc ?? NaN)
  return <>
    <ComparisonTable model={model} />
    <p className="evaluation-note">
      {Number.isFinite(gap) && `The network’s ROC AUC is ${Math.abs(gap).toFixed(3)} ${gap >= 0 ? 'higher' : 'lower'} than logistic regression’s: the two rank test records almost equally well. `}
      Always answering label 0 has the highest accuracy and finds no positive labels at all, which is why accuracy alone is a poor guide on imbalanced data.
    </p>
    {curves ? <CutoffExplorer curves={curves} /> : <p role="status" className="insight-intro">Curve data has not been generated for this model version, so the charts are not shown.</p>}
  </>
}
