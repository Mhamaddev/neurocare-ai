import type { FeatureEffect, SurveyField } from '../types/model'

export interface RankedEffect { name: string; label: string; effect: number; share: number }

/** Largest absolute effects first. `share` is each bar's length relative to the largest (0–1). */
export function rankEffects(effects: FeatureEffect[] | undefined, fields: SurveyField[]): RankedEffect[] {
  if (!Array.isArray(effects)) return []
  const labels = new Map(fields.map(field => [field.name, field.label]))
  const valid = effects.filter(item => labels.has(item.name) && Number.isFinite(item.effect) && Math.abs(item.effect) <= 1)
  const largest = Math.max(0, ...valid.map(item => Math.abs(item.effect)))
  return valid
    .map(item => ({ name: item.name, label: labels.get(item.name)!, effect: item.effect, share: largest > 0 ? Math.abs(item.effect) / largest : 0 }))
    .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))
}

/** Signed percentage points, e.g. +8.5 pts. Values that round to zero carry no sign. */
export function formatPoints(effect: number): string {
  const points = effect * 100
  if (Math.abs(points) < 0.05) return '0.0 pts'
  return `${points > 0 ? '+' : '−'}${Math.abs(points).toFixed(1)} pts`
}
