# Add a minimal Fastify upload example (mirrors Express quick start)

## Summary

Add a small Fastify example that mirrors the existing Express quick-start flow with one upload route, one in-memory file, and one `scanBytes` call before storage.

## Why it matters

Fastify is already part of the repo story, but first-time contributors and evaluators do not have a minimal example folder they can run side-by-side with the Express path. A tiny example lowers the bar for both learning and contribution.

## Scope

In scope: a self-contained Fastify example folder, a short README, and a link from `examples/README.md`.
Out of scope: production deployment guidance, plugin publishing changes, or new scanning features.

## Acceptance criteria

- Add a runnable Fastify example that accepts one multipart file and scans it before allowing success.
- Return a clear JSON payload with `verdict`, `reasons`, and the expected HTTP status for blocked uploads.
- Document local setup and one quick `curl` test in the example README.

## Suggested starting points

Files: `examples/express-minimal/`, `examples/express-multer-presets/`, `website/src/content/docs/how-to/fastify.md`
Commands to run: `pnpm install`, `pnpm -C examples/<new-fastify-example> dev`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`

## Definition of done

- PR passes: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`
- Clear screenshots/log output if applicable
