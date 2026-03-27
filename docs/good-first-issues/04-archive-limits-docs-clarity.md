# Clarify archive limits, nesting depth, and ZIP-bomb tuning in docs

## Summary

Improve the docs around archive scanning limits so users can understand the tradeoffs behind nesting depth, total expansion size, and conservative ZIP-bomb defaults.

## Why it matters

Archive protections are one of the most security-sensitive parts of upload scanning, but the tuning guidance is easy to misunderstand. Better docs reduce risky copy-paste configs and repeated support questions.

## Scope

In scope: targeted wording updates, examples, and practical guidance in the existing docs pages that already talk about ZIP inspection or production defaults.
Out of scope: new archive engine features, benchmark work, or changes to the core defaults.

## Acceptance criteria

- Explain what each relevant archive limit controls in plain language.
- Add one concrete tuning example for stricter public uploads and one for more trusted internal workflows.
- Cross-link the updated guidance from the most relevant getting-started or production-readiness page.

## Suggested starting points

Files: `website/src/content/docs/getting-started.md`, `website/src/content/docs/production-readiness.md`, `docs/advanced/zip-deep-inspection.md`, `website/src/content/blog/preventing-zip-bombs.md`
Commands to run: `pnpm install`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`

## Definition of done

- PR passes: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`
- Clear screenshots/log output if applicable
