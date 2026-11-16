import assert from 'node:assert/strict'
import test from 'node:test'
import { formatPoints, rankEffects } from '../src/lib/effects.ts'
import { interpolate, metricsAt, nearestIndex, precisionRecallPoints, rocPoints, validCurves } from '../src/lib/curves.ts'
import { exampleProfiles } from '../src/lib/exampleProfiles.ts'
import { validateSurvey } from '../src/lib/surveyValidation.ts'

const fields = [{ name: 'BMI', label: 'BMI', min: 12, max: 98 }, { name: 'Age', label: 'Age band', min: 1, max: 13 }]

test('effects are ranked by size, scaled to the largest and limited to known fields', () => {
  const ranked = rankEffects([{ name: 'Age', effect: -0.02 }, { name: 'BMI', effect: 0.08 }, { name: 'Unknown', effect: 0.5 }, { name: 'BMI', effect: NaN }], fields)
  assert.deepEqual(ranked.map(item => item.name), ['BMI', 'Age'])
  assert.equal(ranked[0].share, 1)
  assert.equal(ranked[1].share, 0.25)
  assert.deepEqual(rankEffects(undefined, fields), [])
  assert.equal(rankEffects([{ name: 'BMI', effect: 0 }], fields)[0].share, 0)
})

test('points keep their sign and never show a signed zero', () => {
  assert.equal(formatPoints(0.0852), '+8.5 pts')
  assert.equal(formatPoints(-0.0152), '−1.5 pts')
  assert.equal(formatPoints(-0.0002), '0.0 pts')
})

// The saved operating point of the configured model: 5,188 found, 12,231 falsely flagged.
const positives = 6264, negatives = 34112
const sweep = [[0.05, 6000, 20000], [0.132, 5188, 12231], [0.5, 1000, 500], [0.9, 0, 0]]

test('cutoff metrics reproduce the saved confusion-matrix figures', () => {
  const metrics = metricsAt(sweep[1], positives, negatives)
  assert.ok(Math.abs(metrics.accuracy - 0.6704230235783634) < 1e-12)
  assert.ok(Math.abs(metrics.recall - 0.8282247765006385) < 1e-12)
  assert.ok(Math.abs(metrics.precision - 0.29783569665307996) < 1e-12)
  assert.equal(metricsAt(sweep[3], positives, negatives).precision, undefined)
})

test('curves run in x order, include ROC end points and skip undefined precision', () => {
  const roc = rocPoints(sweep, positives, negatives)
  assert.deepEqual(roc[0], { x: 0, y: 0 })
  assert.deepEqual(roc.at(-1), { x: 1, y: 1 })
  assert.ok(roc.every((point, index) => index === 0 || point.x >= roc[index - 1].x))
  assert.equal(precisionRecallPoints([...sweep, [0.95, 0, 1]], positives).length, 3)
})

test('interpolation stays inside the measured range', () => {
  const line = [{ x: 0, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 1 }]
  assert.equal(interpolate(line, 0.25), 0.5)
  assert.equal(interpolate(line, 1), 1)
  assert.equal(interpolate([{ x: 0.2, y: 1 }, { x: 0.4, y: 0.5 }], 0.1), undefined)
  assert.equal(nearestIndex(sweep, 0.13), 1)
})

test('malformed curve payloads are rejected', () => {
  const model = { label: 'm', threshold: 0.132, roc_auc: 0.8, average_precision: 0.4, sweep }
  const curves = { version: 'v', rows: positives + negatives, positives, negatives, models: { ann: model, logistic_regression: model } }
  assert.equal(validCurves(curves), true)
  assert.equal(validCurves({ ...curves, rows: 5 }), false)
  assert.equal(validCurves({ ...curves, models: { ann: model } }), false)
  assert.equal(validCurves({ ...curves, models: { ann: { ...model, sweep: [[0.5, 1, 1], [0.2, 1, 1]] }, logistic_regression: model } }), false)
  assert.equal(validCurves(null), false)
})

// Mirrors backend FIELD_SPECS ranges; the live contract is still validated in the browser.
const contract = Object.entries({
  HighBP: [0, 1], HighChol: [0, 1], CholCheck: [0, 1], BMI: [12, 98], Smoker: [0, 1], Stroke: [0, 1],
  HeartDiseaseorAttack: [0, 1], PhysActivity: [0, 1], Fruits: [0, 1], Veggies: [0, 1], HvyAlcoholConsump: [0, 1],
  AnyHealthcare: [0, 1], NoDocbcCost: [0, 1], GenHlth: [1, 5], MentHlth: [0, 30], PhysHlth: [0, 30], DiffWalk: [0, 1],
  Sex: [0, 1], Age: [1, 13], Education: [1, 6], Income: [1, 8],
}).map(([name, [min, max]]) => ({ name, label: name, min, max }))

test('every example profile answers all 21 fields with valid survey codes', () => {
  assert.equal(new Set(exampleProfiles.map(item => item.id)).size, exampleProfiles.length)
  for (const example of exampleProfiles) {
    assert.deepEqual(Object.keys(example.values).sort(), contract.map(field => field.name).sort())
    const { issues } = validateSurvey(contract, { get: name => example.values[name] ?? null })
    assert.deepEqual(issues, {})
  }
})
