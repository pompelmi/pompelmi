# Document recommended handling for suspicious verdicts per framework

## Summary

Add framework-specific guidance for what to do when a scan returns `suspicious`, including when to reject, quarantine, or hold for review.

## Why it matters

Users usually understand `clean` and `malicious`, but `suspicious` needs policy guidance. Clear framework examples help teams avoid inconsistent behavior across Express, Fastify, Next.js, and NestJS routes.

## Scope

In scope: short guidance blocks or callouts in the framework docs plus one shared recommendation on quarantine-or-review handling.
Out of scope: a new quarantine package feature, broad API changes, or one-off enterprise workflow advice.

## Acceptance criteria

- Add framework-specific notes for handling `suspicious` verdicts in the public guides.
- Keep the guidance consistent about `failClosed`, logging, and quarantine/review options.
- Show one concise example response or control-flow branch in at least one framework guide.

## Suggested starting points

Files: `website/src/content/docs/how-to/express.md`, `website/src/content/docs/how-to/fastify.md`, `website/src/content/docs/how-to/nestjs.md`, `website/src/content/docs/how-to/nextjs.md`
Commands to run: `pnpm install`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`

## Definition of done

- PR passes: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`
- Clear screenshots/log output if applicable
