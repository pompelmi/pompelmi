# Examples

This directory contains runnable examples for evaluating Pompelmi in real upload flows.

## Start here

- `scan-one-file.ts`: Fastest local sanity check for `scanBytes()`.
- `demo/`: Tiny Express upload gate with a browser form and JSON verdict response.
- `express-minimal/`: Smallest server route you can adapt into a real application.

## Production-oriented examples

- `express/production.ts`: Express upload endpoint with fail-closed policy and production scanner composition.
- `quarantine-workflow.ts`: End-to-end quarantine and review flow using `pompelmi/quarantine` and `pompelmi/audit`.
- `stream-scan-example.ts`: Streaming-oriented scan usage pattern.
- `remote-yara-server.ts`: Remote YARA integration pattern.
- `cli-presets-demo.mjs`: Policy presets in CLI workflows.

## Framework examples

- `express-minimal/`
- `express-multer-presets/`
- `nestjs-app/`
- `next-app-router/`
- `next-demo/`
- `nextjs-presets-demo/`
- `nuxt-nitro/`

## Suggested evaluation order

1. Run `scan-one-file.ts` to verify local setup.
2. Run `demo/` or `express-minimal/` to see a real route-level verdict flow.
3. Run `express/production.ts` or `quarantine-workflow.ts` to evaluate rollout patterns.
4. Open the framework example closest to your stack.

## Running examples

Most TypeScript examples can be run with:

```bash
npx tsx examples/<example-file>.ts
```

For framework app folders, check each folder's own README for setup commands.
