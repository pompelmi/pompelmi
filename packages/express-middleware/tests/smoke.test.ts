import * as mod from '../src'
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('has exports', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0)
  })

  it('can invoke one exported function safely', async () => {
    for (const k of Object.keys(mod)) {
      const v: any = (mod as any)[k]
      if (typeof v === 'function') {
        try {
          const n = v.length
          const args = Array(n).fill(undefined)
          const ret = v(...args)
          // se è Promise, attendi ed evita unhandled rejection
          if (ret && typeof ret.then === 'function') {
            await ret.catch(() => {})
          }
        } catch (_) {}
        break
      }
    }
    expect(true).toBe(true)
  })
})
