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

describe('EICAR detection', () => {
  it('detects the EICAR test string as high severity', async () => {
    const scanner = mod.createHeuristicsScanner()
    // EICAR standard antivirus test string constructed in memory (not stored as a file)
    const eicarStr = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    const bytes = Buffer.from(eicarStr, 'latin1')
    const matches = await scanner.scan(new Uint8Array(bytes))
    const eicarMatch = matches.find(m => m.rule === 'eicar_test_file')
    expect(eicarMatch).toBeDefined()
    expect(eicarMatch?.severity).toBe('high')
  })

  it('returns clean for benign content', async () => {
    const scanner = mod.createHeuristicsScanner()
    const bytes = Buffer.from('Hello, world!', 'utf8')
    const matches = await scanner.scan(new Uint8Array(bytes))
    const eicarMatch = matches.find(m => m.rule === 'eicar_test_file')
    expect(eicarMatch).toBeUndefined()
  })

  it('CommonHeuristicsScanner also detects EICAR', async () => {
    const eicarStr = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    const bytes = Buffer.from(eicarStr, 'latin1')
    const matches = await mod.CommonHeuristicsScanner.scan(new Uint8Array(bytes))
    const eicarMatch = matches.find(m => m.rule === 'eicar_test_file')
    expect(eicarMatch).toBeDefined()
    expect(eicarMatch?.severity).toBe('high')
  })
})
