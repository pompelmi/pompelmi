---
title: Policy
outline: deep
---

# Policy

A **policy** defines what your backend accepts **before** the file is stored or processed. It is your first line of defense.

## Common guards

- **Extension allowlist**: only accept known‑good extensions (e.g. `.zip`, `.png`, `.jpg`, `.pdf`).  
- **Max size**: cap individual file size (e.g. 25 MB).  
- **MIME sniff**: prefer server‑side magic‑byte detection over client‑provided MIME.  
- **(Optional) ZIP inspection**: limit total entries, total uncompressed size, depth, and reject suspicious paths.

## Minimal example (pseudo‑API)

```ts
// policy.ts — example structure; adapt to your real helpers
export const basicPolicy = {
  rules: [
    ['allowExtensions', ['.zip', '.png', '.jpg', '.jpeg', '.pdf']],
    ['maxBytes', 25 * 1024 * 1024],
    ['sniffMime', true]
  ]
}
```

You then pass this policy into your adapter/middleware (Express/Koa/Fastify/Next.js).  
See the Express example: [/docs/quickstart-express](/docs/quickstart-express).

## Best practices

- **Allowlist, not blocklist**: attackers constantly invent new bad types; it’s safer to only allow what you truly need.
- **Constrain archives**: cap number of entries, total uncompressed bytes, nesting depth; reject paths with `..` or absolute paths.
- **Verify MIME** via magic bytes when possible; treat `application/octet-stream` with caution.
- **Stream when feasible**: avoid buffering very large files in memory without limits.
- **Log** decisions (allow/deny + reason) for auditability; return clear 4xx errors to clients.

## Error handling

Return a **400** with a short reason when a policy fails. Keep internals (filenames, paths) out of public messages, but include enough context in your server logs.

```ts
// express error handler example
app.use((err, req, res, next) => {
  if (err && err.name === 'PompelmiError') {
    return res.status(400).json({ ok: false, reason: err.message })
  }
  next(err)
})
```
