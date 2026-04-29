## What's new

### `scanDirectory(dirPath, [options])`

Recursively scan every file in a directory in a single call.

Returns `{ clean: string[], malicious: string[], errors: string[] }` — three arrays of absolute file paths. Per-file scan failures are caught and collected into `errors`; the function never throws because of an individual file. Useful for batch processing an uploads folder, auditing a directory before serving its contents, or building a scheduled scan job.

```js
const fs = require('fs');
const { scanDirectory } = require('pompelmi');

const results = await scanDirectory('/uploads', {
  host: '127.0.0.1',
  port: 3310,
});

console.log('Clean:', results.clean);
console.log('Malicious:', results.malicious);
console.log('Errors:', results.errors);

// Auto-delete infected files
results.malicious.forEach((filePath) => {
  fs.unlinkSync(filePath);
  console.warn('Deleted malicious file:', filePath);
});
```

Passing a non-string throws `dirPath must be a string`; a path that does not exist throws `Directory not found: <path>`.

---

### Badge redesign

The README badge row now includes framework badges (Express, Fastify, NestJS, Next.js, Koa) alongside the existing npm, license, CI, and zero-dependencies badges. This makes it immediately clear which Node.js frameworks pompelmi integrates with.

**Full changelog:** https://github.com/pompelmi/pompelmi/blob/main/CHANGELOG.md
