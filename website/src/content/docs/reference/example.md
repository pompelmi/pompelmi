---
title: Scan report and verdicts
description: Reference for Pompelmi scan results, verdict meanings, and the fields adapters typically expose to application code.
---

Use this reference when you need the stable concepts behind Pompelmi's upload gate rather than a framework-specific example.

## Core verdicts

| Verdict | Meaning | Typical action |
| --- | --- | --- |
| `clean` | No blocking indicators from the configured checks | Continue to storage or downstream processing |
| `suspicious` | Risky characteristics were found, but not necessarily a confirmed malicious match | Quarantine, review, or reject |
| `malicious` | High-confidence match or a condition you treat as explicitly blocked | Reject immediately |

## Core scan shape

`scanBytes()` and `scanFile()` return a `ScanReport`:

```ts
type ScanReport = {
  ok: boolean;
  verdict: 'clean' | 'suspicious' | 'malicious';
  matches: Array<{ rule: string; tags?: string[]; meta?: Record<string, unknown> }>;
  reasons: string[];
  durationMs: number;
  file?: {
    name?: string;
    mimeType?: string;
    size?: number;
    sha256?: string;
  };
};
```

## Adapter behavior

Different adapters expose the verdict in slightly different shapes, but the same concepts still apply:

- Express middleware attaches `req.pompelmi`.
- Koa middleware attaches `ctx.state.pompelmi`.
- Fastify attaches `request.pompelmi`.
- Next.js route handlers return JSON with the verdict and any matches the route decides to expose.
- NestJS can use `PompelmiInterceptor` for blocking and `PompelmiService` for direct `ScanReport` access.

## Recommended handling

- `clean`: move into the live storage path.
- `suspicious`: quarantine or review if the business flow needs a softer decision.
- `malicious`: block and log the event.

## See also

- [Getting started](../getting-started/)
- [Framework guides](../how-to/express/)
- [Quarantine / inspect-first-store-later workflows](../use-cases/quarantine-inspect-first-store-later/)
