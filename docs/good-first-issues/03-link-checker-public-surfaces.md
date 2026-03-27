# Add a lightweight link checker for README + docs/site links

## Summary

Add a small link checker that covers the public repo surfaces most likely to be shared: the root README, examples index, and docs/site links.

## Why it matters

Broken links on the repo landing page or docs hurt credibility and make onboarding feel unfinished. A lightweight check helps catch that without introducing heavy infrastructure.

## Scope

In scope: checking local markdown links and key external docs/site links from the README and docs landing surfaces.
Out of scope: crawling the entire generated website, screenshot testing, or adding a hosted service.

## Acceptance criteria

- Validate links from the root README and at least one docs/examples index surface.
- Keep the check fast enough for contributor workflows and CI use.
- Document what is covered and any intentional exclusions for flaky external URLs.

## Suggested starting points

Files: `README.md`, `examples/README.md`, `website/src/content/docs/index.mdx`, `package.json`, `.github/workflows/ci.yml`
Commands to run: `pnpm install`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`

## Definition of done

- PR passes: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`
- Clear screenshots/log output if applicable
