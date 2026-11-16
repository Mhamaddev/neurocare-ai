import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { FeatureEffect, SurveyField } from '../types/model'
import { formatPoints, rankEffects } from '../lib/effects'
import { answerLabel } from '../lib/surveySteps'
import { Button } from './ui/Button'
import { useInView } from '../hooks/useInView'

const VISIBLE = 6

/** Diverging bars around a zero line: which answers moved this profile's score, and which way. */
export function ScoreEffects({ effects, fields, values }: {
  effects: FeatureEffect[] | undefined; fields: SurveyField[]; values: Record<string, string>
}) {
  const [expanded, setExpanded] = useState(false)
  const [ref, inView] = useInView<HTMLElement>()
  const ranked = rankEffects(effects, fields)
  if (!ranked.length) return null
  const shown = expanded ? ranked : ranked.slice(0, VISIBLE)
  return <section ref={ref} className="score-effects" aria-labelledby="effects-title" data-inview={inView}>
    <h3 id="effects-title">What moved the score</h3>
    <p className="insight-intro">Each bar shows how the score changes when that one answer is swapped for the training-set average, with every other answer held fixed.</p>
    <div className="effects-legend" aria-hidden="true">
      <span><i className="effect-swatch effect-swatch--down" />Lowered the score</span>
      <span><i className="effect-swatch effect-swatch--up" />Raised the score</span>
    </div>
    <ol className="effects-list">
      {shown.map((item, index) => {
        const direction = item.effect > 0 ? 'up' : item.effect < 0 ? 'down' : 'none'
        return <li key={item.name} style={{ '--i': Math.min(index, 8) } as CSSProperties}>
          <div className="effect-name">
            <span>{item.label}</span>
            <small>{answerLabel(fields.find(field => field.name === item.name)!, values[item.name])}</small>
          </div>
          <div className="effect-track" aria-hidden="true">
            {direction !== 'none' && <span className={`effect-bar effect-bar--${direction}`} style={{ width: `${Math.max(item.share * 50, 0.6)}%` }} />}
          </div>
          <strong className="effect-value">{formatPoints(item.effect)}<span className="sr-only"> {direction === 'up' ? 'raised the score' : direction === 'down' ? 'lowered the score' : 'no change'}</span></strong>
        </li>
      })}
    </ol>
    {ranked.length > VISIBLE && <Button variant="ghost" small aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      {expanded ? 'Show the largest only' : `Show all ${ranked.length} answers`}
    </Button>}
    <p className="insight-caveat">These effects describe how this model behaves. They do not add up to the score, and they are not causes or medical risk factors.</p>
  </section>
}
