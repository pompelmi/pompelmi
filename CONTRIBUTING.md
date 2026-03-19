# Contributing to Pompelmi

Pompelmi is an OSS-first project for secure file uploads in Node.js. Contributions that improve clarity, correctness, examples, tests, and real-world adoption are all welcome.

## Good ways to help

- Fix a reproducible bug in the core package or a framework adapter.
- Improve docs or examples that reduce first-use friction.
- Add tests around risky file types, archive handling, or adapter behavior.
- Tighten developer ergonomics without expanding the API surface unnecessarily.
- Share real adoption feedback in Discussions, especially where the docs were unclear.

## Before you start

- Read the [README](./README.md), [Roadmap](./ROADMAP.md), and [Good first issue ideas](./docs/good-first-issues.md).
- For non-trivial features or API changes, start with a GitHub Discussion or issue before opening a large PR.
- For security vulnerabilities, use the process in [SECURITY.md](./SECURITY.md). Do not open a public issue.

## Local setup

Prerequisites:

- Node.js 18+
- `pnpm`
- Git

Setup:

```bash
git clone https://github.com/YOUR_USERNAME/pompelmi.git
cd pompelmi
pnpm install
pnpm build
pnpm test
```

For a broader verification pass, run:

```bash
pnpm repo:doctor
```

## Working on a change

1. Pick a small, testable scope.
2. Make the change in the relevant package, docs page, or example.
3. Add or update tests when behavior changes.
4. Update docs or examples when the public surface changes.
5. Keep copy technical, specific, and easy to verify.

## Pull requests

Strong PRs usually include:

- A clear problem statement.
- The smallest change that solves it.
- Validation notes or commands run locally.
- Docs updates when the user-facing behavior changed.
- Breaking-change notes when relevant.

Maintainers may ask to split broad PRs into smaller pieces if review risk is high.

## Automated dependency updates

Dependency maintenance is automated with Renovate and the existing GitHub
Actions release flow.

- Renovate runs once per day at `03:17 UTC` and can also be started manually
  from the `Renovate` workflow in GitHub Actions.
- The repo automation expects a `RENOVATE_TOKEN` secret with enough scope to
  open PRs and push the post-merge version bump / release tag commits that fan
  out into the existing release workflows.
- Safe patch/minor `devDependencies` may automerge after all required checks are
  green.
- If a dependency PR grows beyond the repo guardrails, GitHub Actions removes it
  from automerge and leaves it for manual review instead of posting noisy
  comments.
- Major updates, toolchain/framework updates, package-manager changes, and
  security-sensitive upload/runtime dependencies always require manual review.
- When a Renovate dependency PR is merged into `main`, GitHub Actions bumps the
  root package patch version and the existing release/tag workflows handle the
  GitHub Release and npm publish path.
- Maintainers should keep branch protection enabled on `main` so dependency PRs
  cannot merge with failing or missing checks.

## Copy and docs guidelines

- Prefer precise, minimal language over marketing language.
- Do not claim compliance, adoption, or performance numbers that the repo cannot prove.
- Do not present Pompelmi as a full antivirus replacement.
- Keep the open-source path front and center.

## Community surfaces

- [GitHub Discussions](https://github.com/pompelmi/pompelmi/discussions)
- [GitHub Issues](https://github.com/pompelmi/pompelmi/issues)
- [Discussion prompts](./docs/community-prompts.md)
- [Good first issue ideas](./docs/good-first-issues.md)

## Code of conduct

Please follow the expectations in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
