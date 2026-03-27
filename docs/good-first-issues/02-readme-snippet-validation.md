# Add snippet validation for README + Getting Started code blocks

## Summary

Add a lightweight check that extracts or mirrors public code snippets from the root README and Getting Started docs so broken API examples are caught before release.

## Why it matters

The README and Getting Started guide are the highest-traffic surfaces in the repo. When those snippets drift from the real API, first-run trust drops quickly and maintainers spend time on avoidable fixes.

## Scope

In scope: validating the root README snippet and the primary Getting Started guide snippets against the current package exports or a small smoke harness.
Out of scope: full markdown parsing for every docs page, runtime network tests, or large docs rewrites.

## Acceptance criteria

- Add one repeatable validation path for the README and Getting Started code blocks.
- Fail clearly when a snippet references the wrong import, option shape, or command.
- Document how maintainers run the validation locally and in CI.

## Suggested starting points

Files: `README.md`, `website/src/content/docs/getting-started.md`, `package.json`, `scripts/`
Commands to run: `pnpm install`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`

## Definition of done

- PR passes: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`
- Clear screenshots/log output if applicable
