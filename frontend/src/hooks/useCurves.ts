import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { validCurves } from '../lib/curves'
import type { Curves } from '../types/model'

/** Saved test-partition sweeps. `missing` covers absent, mismatched or malformed data. */
export function useCurves() {
  const [curves, setCurves] = useState<Curves | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')
  useEffect(() => {
    const controller = new AbortController()
    void api.get<unknown>('/api/v1/model/curves', { signal: controller.signal, timeout: 20000 }).then(
      ({ data }) => {
        if (controller.signal.aborted) return
        if (validCurves(data)) { setCurves(data); setState('ready') } else setState('missing')
      },
      () => { if (!controller.signal.aborted) setState('missing') },
    )
    return () => controller.abort()
  }, [])
  return { curves, state }
}
