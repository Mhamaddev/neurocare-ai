import type { Curves, SweepRow } from '../types/model'

export interface Point { x: number; y: number }
export interface CutoffMetrics { threshold: number; accuracy: number; recall: number; precision: number | undefined; falsePositiveRate: number; flagged: number }

/** Reject malformed payloads so the page never draws invented curves. */
export function validCurves(data: unknown): data is Curves {
  const curves = data as Curves
  if (!curves || typeof curves !== 'object' || !curves.models) return false
  const { positives, negatives, rows } = curves
  if (![positives, negatives, rows].every(value => Number.isSafeInteger(value) && value > 0) || positives + negatives !== rows) return false
  return [curves.models.ann, curves.models.logistic_regression].every(model => model && Array.isArray(model.sweep) && model.sweep.length >= 2
    && model.sweep.every((row, index) => Array.isArray(row) && row.length === 3
      && row[0] > 0 && row[0] < 1 && (index === 0 || row[0] > model.sweep[index - 1][0])
      && Number.isSafeInteger(row[1]) && row[1] >= 0 && row[1] <= positives
      && Number.isSafeInteger(row[2]) && row[2] >= 0 && row[2] <= negatives))
}

export function metricsAt(row: SweepRow, positives: number, negatives: number): CutoffMetrics {
  const [threshold, truePositive, falsePositive] = row
  const flagged = truePositive + falsePositive
  return {
    threshold,
    accuracy: (truePositive + negatives - falsePositive) / (positives + negatives),
    recall: truePositive / positives,
    precision: flagged > 0 ? truePositive / flagged : undefined,
    falsePositiveRate: falsePositive / negatives,
    flagged: flagged / (positives + negatives),
  }
}

/** ROC: false-positive rate against recall, from (0,0) to (1,1). */
export function rocPoints(sweep: SweepRow[], positives: number, negatives: number): Point[] {
  const points = sweep.map(row => ({ x: row[2] / negatives, y: row[1] / positives }))
  return sortByX([{ x: 0, y: 0 }, ...points, { x: 1, y: 1 }])
}

/** Precision against recall; cutoffs that find no positive label carry no information and are skipped. */
export function precisionRecallPoints(sweep: SweepRow[], positives: number): Point[] {
  return sortByX(sweep.filter(row => row[1] > 0).map(row => ({ x: row[1] / positives, y: row[1] / (row[1] + row[2]) })))
}

function sortByX(points: Point[]): Point[] {
  return points.sort((a, b) => a.x - b.x || a.y - b.y)
}

/** Linear interpolation along x; undefined outside the curve's measured range. */
export function interpolate(points: Point[], x: number): number | undefined {
  if (!points.length || x < points[0].x || x > points[points.length - 1].x) return undefined
  const upper = points.findIndex(point => point.x >= x)
  if (upper <= 0) return points[0].y
  const [a, b] = [points[upper - 1], points[upper]]
  return b.x === a.x ? b.y : a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x)
}

export function nearestIndex(sweep: SweepRow[], threshold: number): number {
  let best = 0
  sweep.forEach((row, index) => { if (Math.abs(row[0] - threshold) < Math.abs(sweep[best][0] - threshold)) best = index })
  return best
}
