# Verdicts

pompelmi uses ES6 Symbols as return values instead of strings or numbers. This page explains why, how to compare them correctly, what each verdict means, and how to serialise them.

---

## Why Symbols instead of strings

Strings are error-prone at the call site:

```js
// String-based API — these all silently fail
if (result === 'clean') { }      // wrong case
if (result === 'Clean ') { }     // trailing space
if (result === 'CLEAN') { }      // wrong case
```

A Symbol comparison either matches exactly or it does not. There is no coercion, no typo that silently evaluates to `false`, and no ambiguity:

```js
const { Verdict } = require('pompelmi');

if (result === Verdict.Clean) { }     // correct — always works
if (result === Verdict.Malicious) { } // correct
if (result === Verdict.ScanError) { } // correct
```

Symbols also cannot be accidentally created by user code. No external input can produce a value that equals `Verdict.Malicious` unless pompelmi itself returned it.

---

## The three verdicts

### `Verdict.Clean`

The file was scanned and no known malware signatures were matched.

- Local mode: `clamscan` exited with code `0`.
- TCP mode: clamd responded with `stream: OK`.

**What it means:** The file passed the scan. It may still be invalid, corrupt, or undesirable — ClamAV only checks for known malware signatures. Complement with MIME type validation and size limits.

### `Verdict.Malicious`

A known virus or malware signature was matched in the file.

- Local mode: `clamscan` exited with code `1`.
- TCP mode: clamd responded with `stream: <virus-name> FOUND`.

**What to do:** Reject the file immediately. Delete it or move it to quarantine. Log the event. Do not serve it to any user.

```js
if (result === Verdict.Malicious) {
  fs.unlinkSync(filePath);
  logger.warn({ filePath, event: 'malware_detected' });
  return res.status(422).json({ error: 'Malicious file rejected.' });
}
```

### `Verdict.ScanError`

The scan could not complete.

- Local mode: `clamscan` exited with code `2` — I/O error, permission denied, encrypted archive, corrupted file.
- TCP mode: clamd sent an unexpected or error response.

**What to do:** Treat the file as untrusted. The safe default is to reject it. Do not serve a file whose safety is unknown.

```js
if (result === Verdict.ScanError) {
  fs.unlinkSync(filePath);
  return res.status(422).json({ error: 'Scan incomplete — file rejected as precaution.' });
}
```

When to retry: a `ScanError` is appropriate to retry once if you suspect a transient I/O or network issue. Do not retry indefinitely — if the second scan also returns `ScanError`, reject the file.

---

## Comparing verdicts correctly

Always use `===` strict equality:

```js
const { scan, Verdict } = require('pompelmi');

const result = await scan('/uploads/file.pdf');

// Correct
if (result === Verdict.Clean)     { /* safe */ }
if (result === Verdict.Malicious) { /* reject */ }
if (result === Verdict.ScanError) { /* reject / retry */ }

// Correct — switch works because Symbols are primitives
switch (result) {
  case Verdict.Clean:     return 'safe';
  case Verdict.Malicious: return 'malicious';
  case Verdict.ScanError: return 'error';
}
```

Do not use `==`, `Object.is`, or any other comparison. `===` is sufficient and correct.

---

## Serialising verdicts

Symbols cannot be JSON-serialised directly — `JSON.stringify(Verdict.Clean)` returns `undefined`. Use `.description` to get the string representation:

```js
Verdict.Clean.description     // 'Clean'
Verdict.Malicious.description // 'Malicious'
Verdict.ScanError.description // 'ScanError'
```

For logging:

```js
logger.info({
  filePath,
  verdict: result.description,
});
```

For HTTP responses:

```js
return res.json({ verdict: result.description });
// { "verdict": "Clean" }
```

For database storage:

```js
await db.scans.insert({
  filePath,
  verdict: result.description,
  scannedAt: new Date(),
});
```

---

## The full decision tree

```js
const { scan, Verdict } = require('pompelmi');
const fs = require('fs');
const path = require('path');

async function handleUpload(filePath) {
  let result;

  try {
    result = await scan(path.resolve(filePath));
  } catch (err) {
    // Hard error — clamscan missing, file not found, killed process, etc.
    // The file may or may not still exist. Delete it defensively.
    try { fs.unlinkSync(filePath); } catch {}
    throw new Error(`Scan failed: ${err.message}`);
  }

  if (result === Verdict.Malicious) {
    fs.unlinkSync(filePath);
    throw new Error('Malicious file rejected.');
  }

  if (result === Verdict.ScanError) {
    fs.unlinkSync(filePath);
    throw new Error('Scan incomplete — file rejected.');
  }

  // result === Verdict.Clean
  return filePath;
}
```

---

## Verdict Symbols are unique across instances

Each `Verdict` Symbol is created once when pompelmi loads. As long as you use the same `require('pompelmi')` call (or the same `import`), the reference is the same object. You can safely compare verdicts across modules.

```js
// module-a.js
const { Verdict: V1 } = require('pompelmi');

// module-b.js
const { Verdict: V2 } = require('pompelmi');

V1.Clean === V2.Clean // true — Node.js module cache returns the same object
```
