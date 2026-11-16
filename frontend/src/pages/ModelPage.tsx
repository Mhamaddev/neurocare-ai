import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { ModelEvaluation } from '../components/ModelEvaluation'
import { NeuralNetworkDiagram } from '../components/ScientificDiagram'
import { Disclaimer } from '../components/SiteElements'
import { Accordion } from '../components/ui/Accordion'
import { ButtonLink } from '../components/ui/Button'
import { useModel } from '../hooks/useModel'
import { useCurves } from '../hooks/useCurves'
import { ModelComparison } from '../components/ModelComparison'
import { describeThreshold } from '../lib/modelPresentation'
import { SectionNav } from '../components/SectionNav'
import { SplitOverview } from '../components/SplitOverview'
import { Reveal } from '../components/motion/Reveal'

export function ModelPage() {
  const { model, loading, error, retry } = useModel()
  const { curves, state: curveState } = useCurves()
  const sizes = model?.split_sizes
  const dataset = model?.dataset
  return <div className="method-page container"><header className="page-heading rise"><span className="eyebrow">THE MODEL & THE METHOD</span><h1>Know the model.<br /><em>Understand the tradeoffs.</em></h1><p>What it learned, how it was measured, and why the limits belong beside the results.</p></header>
    <SectionNav label="On this page" items={[['architecture', 'Architecture'], ['evaluation', 'Evaluation'], ['comparison', 'Comparison'], ['dataset', 'Dataset']]} />
    <section id="architecture" className="method-intro" aria-labelledby="architecture-title"><Reveal variant="left"><span className="eyebrow">BUILT TO BE UNDERSTOOD</span><h2 id="architecture-title">21 inputs.<br />One learned pattern.</h2><p>The network sees coded survey answers. Training-only means and standard deviations scale each input before hidden layers turn them into a sigmoid score.</p><p>It learns to classify the stored survey label, not a person's health or future.</p></Reveal><Reveal variant="right" delay={120} className="diagram-frame"><NeuralNetworkDiagram /></Reveal></section>
    <section id="evaluation" className="evaluation-section" aria-labelledby="evaluation-title"><Reveal className="section-heading"><span className="eyebrow">MEASURED, NOT ASSUMED</span><h2 id="evaluation-title">Read the numbers together.</h2><p>These are real saved results from the previously reported test partition. They are not a new independent validation.</p></Reveal><ModelEvaluation model={model} loading={loading} error={error} retry={retry} /></section>
    <section id="comparison" className="evaluation-section" aria-labelledby="comparison-title"><Reveal className="section-heading"><span className="eyebrow">AGAINST SIMPLER MODELS</span><h2 id="comparison-title">Is the network worth it?</h2><p>The same test records, scored by the network, by a plain logistic regression and by a rule that never flags anyone.</p></Reveal>
      {loading || curveState === 'loading' ? <div className="data-state evaluation-state" role="status"><span className="loading-mark" /><p>Loading the saved comparison…</p></div> : <ModelComparison model={model} curves={curves} />}
    </section>
    <section id="dataset" className="dataset-section" aria-labelledby="dataset-title"><Reveal variant="left"><span className="eyebrow">THE SOURCE MATERIAL</span><h2 id="dataset-title">Public data.<br /><em>Specific limitations.</em></h2>{dataset ? <><p>The configured model uses {dataset.name}{dataset.year === 2015 ? ', through Alex Teboul’s cleaned Diabetes Health Indicators dataset' : ', converted from the original public survey file'}. Its 21 coded inputs describe self-reported health, habits and social categories in a historical US population.</p><p>The stored target is <code>Diabetes_binary</code>, 0 or 1. {dataset.target_note} Income uses {dataset.income_units}; the score is not a personal risk estimate.</p><div className="source-links"><a href={dataset.source_url} target="_blank" rel="noreferrer">Dataset source<ArrowUpRight size={14} aria-hidden="true" /></a><a href={dataset.codebook_url} target="_blank" rel="noreferrer">Source codebook<ArrowUpRight size={14} aria-hidden="true" /></a></div></> : <p role="status">Saved source-year and dataset details appear when the model information connects.</p>}</Reveal>
      <SplitOverview sizes={sizes} />
    </section>
    <div className="method-notes"><Accordion title="How training and evaluation work"><p>{model?.architecture ? `The loaded ANN has ReLU hidden layers with ${model.architecture.hidden_units.join(' and ')} units and one sigmoid output. Training dropout rates: ${model.architecture.dropout_rates.join(', ')}.` : 'Architecture details appear when the saved model connects.'} {model?.training ? `Training uses Adam, binary cross-entropy, a batch size of ${model.training.batch_size}, and a maximum of ${model.training.max_epochs} epochs. Validation-loss early stopping has patience ${model.training.early_stopping_patience} and restores the best weights.` : 'See the training manifest for this version’s optimizer and stopping settings.'}</p><p>{model ? describeThreshold(model) : 'Cutoff details appear when the saved model connects.'} The saved test partition then measures the frozen model and cutoff. Dropout is disabled during inference.</p></Accordion><Accordion title="What these results cannot establish"><p>Historical self-reporting, class imbalance, selection bias, coarse categories and absent survey weights limit interpretation. The results do not establish causality, clinical validity, future onset or suitability for another population.</p><p>The model's score is not established as a calibrated personal probability. A majority-class baseline can have higher accuracy while missing the positive survey class.</p></Accordion></div>
    <div className="page-invitation"><h2>See the model in action.</h2><ButtonLink to="/predictions">Explore a fictional profile<ArrowRight size={16} aria-hidden="true" /></ButtonLink><Disclaimer compact /></div>
  </div>
}
