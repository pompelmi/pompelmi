# Good First Issue Ideas

This file is a queue of small, high-value tasks maintainers can turn into issues. Each item should fit in a modest PR with clear acceptance criteria.

## Docs and onboarding

- Add a short "how to handle `suspicious` verdicts" section to each framework guide.
- Add a comparison table showing when to use the core package versus each adapter.
- Add a short "what bytes are inspected first" note to the quick-start docs.
- Tighten docs around archive limits, nesting depth, and common ZIP-bomb tuning questions.

## Examples

- Add a minimal Fastify example that mirrors the Express quick start.
- Add a Next.js App Router example that shows a quarantine path instead of immediate reject-only handling.
- Add sample output blocks to `examples/README.md` so visitors know what to expect before running anything.
- Add a small example showing custom reason-code handling in logs or metrics.

## Website and repo surface

- Add a repo screenshot or diagram showing the protected upload flow.
- Improve the landing-page comparison copy for MIME checks, cloud APIs, and daemon-based scanners.
- Add a lightweight docs or site link checker to prevent stale links in the public surfaces.

## Tooling and quality

- Add tests around tricky polyglot or double-extension cases.
- Add regression tests for archive traversal edge cases.
- Add snippet validation for the README and quick-start docs where practical.

## What makes a good first issue here

- One package or one docs surface.
- Clear acceptance criteria.
- No broad API redesign.
- Easy local verification.
- Useful even if the contributor is new to the codebase.
