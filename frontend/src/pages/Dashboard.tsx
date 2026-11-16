import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { ClosingInvitation, EvaluationPreview, HowItWorks, ModelIntro, ProjectPrinciples } from '../components/LandingSections'
import { ModelDiagram } from '../components/ModelDiagram'
import { PresentationCredit } from '../components/PresentationCredit'
import { AnimatedNumber } from '../components/motion/AnimatedNumber'
import { Reveal } from '../components/motion/Reveal'
import { ButtonLink } from '../components/ui/Button'
import { useModel } from '../hooks/useModel'

const whole = (value: number) => Math.round(value).toLocaleString()

function FoundationStats() {
  const { model } = useModel()
  const rows = model?.split_sizes ? Object.values(model.split_sizes).reduce((total, size) => total + size, 0) : undefined
  const units = model?.architecture?.hidden_units
  const auc = model?.test_metrics?.roc_auc
  const stats: { key: string; value: number | undefined; format: (value: number) => string; label: string; note: string }[] = [
    { key: 'features', value: 21, format: whole, label: 'survey features', note: 'Coded answers the network reads' },
    { key: 'rows', value: rows, format: whole, label: 'survey records', note: 'CDC BRFSS, split before learning' },
    { key: 'units', value: units?.length ? units.reduce((total, size) => total + size, 0) : undefined, format: whole, label: 'hidden units', note: units?.length ? `${units.join(' + ')} across ${units.length} layers` : 'Saved architecture' },
    { key: 'auc', value: auc, format: value => value.toFixed(3), label: 'ROC AUC', note: 'Saved test partition' },
  ]
  return <div className="stat-band container" aria-label="Project foundations">
    {stats.map((stat, index) => <Reveal key={stat.key} className="stat-card" delay={index * 90}>
      <strong>{stat.value === undefined ? '—' : <AnimatedNumber value={stat.value} format={stat.format} duration={1600} />}</strong>
      <span>{stat.label}</span><small>{stat.note}</small>
    </Reveal>)}
  </div>
}

export function Dashboard() {
  return <>
    <div className="hero-wrap"><div className="hero-aurora" aria-hidden="true"><span /><span /><span /></div>
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <Reveal as="p" className="hero-badge"><span className="badge-symbol" aria-hidden="true">✳</span> A real neural network. An open explanation.</Reveal>
          <h1 id="hero-title"><span className="hero-line"><span>A neural network.</span></span><span className="hero-line hero-line--second"><em>A clearer view.</em></span></h1>
          <Reveal as="p" delay={420} className="hero-description">A hands-on look at diabetes-related classification. Explore the survey inputs, a trained ANN, and the evidence behind its output.</Reveal>
          <Reveal delay={540} className="hero-actions"><ButtonLink to="/predictions">Try the prediction<ArrowRight size={17} aria-hidden="true" /></ButtonLink><ButtonLink to="/model" variant="secondary">The model & method<ArrowUpRight size={16} aria-hidden="true" /></ButtonLink></Reveal>
          <Reveal as="p" delay={660} className="hero-note">Educational use <span aria-hidden="true">/</span> Fictional profiles only <span aria-hidden="true">/</span> No account needed</Reveal>
        </div>
        <Reveal variant="scale" delay={200} className="hero-visual"><span className="visual-overline">A LOOK INSIDE THE NETWORK</span><ModelDiagram /><p className="visual-caption"><span aria-hidden="true">↳</span> Follow the structure. Understand the process.</p></Reveal>
      </section>
    </div>
    <FoundationStats />
    <div className="container credit-slot"><PresentationCredit /></div>
    <ModelIntro /><HowItWorks /><EvaluationPreview /><ProjectPrinciples /><ClosingInvitation />
  </>
}
