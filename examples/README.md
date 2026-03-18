# Examples

This directory contains runnable examples for evaluating Pompelmi in real application flows.

## High-signal examples for production evaluation

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
2. Run `express/production.ts` to validate endpoint behavior.
3. Run `quarantine-workflow.ts` to evaluate review/approval operations.
4. Adapt policy values to your real upload profile.

## Running examples

Most TypeScript examples can be run with:

```bash
npx tsx examples/<example-file>.ts
```

For framework app folders, check each folder's own README for setup commands.
