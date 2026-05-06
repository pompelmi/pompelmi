# @pompelmi/testing

Mock utilities for unit-testing applications that use [pompelmi](https://pompelmi.app).

Compatible with **Jest**, **Vitest**, and the **Node.js built-in test runner**.

## Installation

```bash
npm install --save-dev @pompelmi/testing pompelmi
```

## Usage

### `mockClean()` / `mockInfected()` / `mockScanError()`

```js
const { mockClean, mockInfected, mockScanError, Verdict } = require('@pompelmi/testing')

it('passes clean files through', async () => {
  const scanner = mockClean()
  const result = await scanner.scanBuffer(Buffer.from('hello'))
  assert.equal(result, Verdict.Clean)
})

it('rejects infected files', async () => {
  const scanner = mockInfected('Win.Malware.Test')
  const result = await scanner.scanBuffer(Buffer.from('eicar'))
  assert.equal(result, Verdict.Malicious)
  assert.equal(scanner.virusName, 'Win.Malware.Test')
})

it('handles scan errors', async () => {
  const scanner = mockScanError()
  const result = await scanner.scanBuffer(Buffer.from('data'))
  assert.equal(result, Verdict.ScanError)
})
```

### `createMockScanner(defaultVerdict)`

Creates a scanner that resolves every scan call to the given verdict.

```js
const { createMockScanner, Verdict } = require('@pompelmi/testing')

const scanner = createMockScanner(Verdict.Malicious)
// scanner.scan(), scanner.scanBuffer(), scanner.scanStream() all → Verdict.Malicious
```

### `withMockedPompelmi(verdict, fn)`

Convenience wrapper that creates the mock and passes it to your test function.

```js
const { withMockedPompelmi, Verdict } = require('@pompelmi/testing')

it('rejects infected files', () =>
  withMockedPompelmi(Verdict.Malicious, async (scanner) => {
    const result = await scanner.scanBuffer(Buffer.from('eicar'))
    assert.equal(result, Verdict.Malicious)
  })
)
```

## Jest Example

```js
import { mockInfected, Verdict } from '@pompelmi/testing'

// Manually inject the mock scanner into a module under test
jest.mock('pompelmi', () => mockInfected('Eicar'))

test('upload handler rejects infected files', async () => {
  const { handleUpload } = await import('./upload-handler')
  const response = await handleUpload(evilBuffer)
  expect(response.status).toBe(422)
})
```

## Vitest Example

```ts
import { mockClean, Verdict } from '@pompelmi/testing'
import { vi, it, expect } from 'vitest'

vi.mock('pompelmi', () => mockClean())

it('allows clean files', async () => {
  const { handleUpload } = await import('./upload-handler')
  const res = await handleUpload(cleanBuffer)
  expect(res.status).toBe(200)
})
```

## Node.js built-in test runner

```js
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { mockInfected, Verdict } = require('@pompelmi/testing')

describe('upload handler', () => {
  it('rejects infected files', async () => {
    const scanner = mockInfected('Win.Malware.Agent')
    const result = await scanner.scanBuffer(Buffer.from('eicar'))
    assert.equal(result, Verdict.Malicious)
    assert.equal(scanner.virusName, 'Win.Malware.Agent')
  })
})
```

## API

| Export | Description |
|--------|-------------|
| `createMockScanner(verdict)` | Returns a mock scanner that resolves to `verdict` |
| `mockClean()` | Shorthand for `createMockScanner(Verdict.Clean)` |
| `mockInfected(virusName?)` | Shorthand for `createMockScanner(Verdict.Malicious)` |
| `mockScanError()` | Shorthand for `createMockScanner(Verdict.ScanError)` |
| `withMockedPompelmi(verdict, fn)` | Runs `fn` with a mock scanner, returns a Promise |
| `Verdict` | Re-exported from `pompelmi` |

## License

ISC — see root [LICENSE](../../LICENSE).
