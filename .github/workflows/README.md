# GitHub Actions Workflows

This directory contains simplified, memory-optimized GitHub Actions workflows that replace the previous complex monolithic workflow.

## Workflow Files

### Core Workflows

- **`ci.yml`** - Continuous Integration (tests, linting, security scans)
- **`build.yml`** - Build packages and prepare artifacts
- **`renovate.yml`** - Daily dependency update sweep that creates Renovate PRs
- **`dependency-pr-guard.yml`** - Keeps oversized Renovate PRs out of automerge and falls back to manual review
- **`dependency-version-bump.yml`** - Patch-bumps the root package after a merged Renovate dependency PR
- **`release.yml`** - Create GitHub releases when version changes
- **`publish.yml`** - Publish packages to npm and GitHub Packages

### Specialized Workflows

- **`deploy-pages.yml`** - Deploy website to GitHub Pages
- **`scorecard.yml`** - OpenSSF Security Scorecard analysis
- **`sbom.yml`** - Generate Software Bill of Materials

## Key Improvements

### Memory Optimization

- Disabled Vitest coverage collection in CI to prevent OOM errors
- Set aggressive concurrency limits (`maxConcurrency: 1`)
- Enabled single fork mode for tests in CI environment
- Increased Node.js memory limit to 6GB

### Simplified Architecture

- Separated concerns into focused, independent workflows
- Removed complex retry logic that could cause race conditions
- Updated all actions to latest stable versions
- Added proper error handling with `|| true` for non-critical failures

### Enhanced Reliability

- Added frozen lockfile installation (`--frozen-lockfile`)
- Improved caching strategies with `cache: 'pnpm'`
- Simplified conditional logic for releases and publishing
- Better environment variable handling

## Workflow Triggers

- **CI**: Runs on pushes and PRs to `main`, with docs-only and most `site/**` changes filtered out
- **Renovate**: Runs daily at `03:17 UTC` and on manual dispatch
- **Dependency PR Guard**: Runs on Renovate pull request updates to keep oversized PRs out of automerge
- **Build**: Runs on pushes and PRs to `main`, plus manual dispatch
- **Dependency Version Bump**: Runs after merged Renovate dependency PRs into `main`
- **Release**: Runs on pushes to `main` when root or package manifest versions change, plus manual dispatch
- **Publish**: Runs on version tag pushes and manual dispatch
- **Deploy Pages**: Runs on pushes to `main` that touch the website/site/package paths, plus manual dispatch
- **Security**: CI includes a CodeQL-based security job on pushes/PRs; the repo also has dedicated `scorecard.yml` and `sbom.yml` workflows

## Release Flow

Dependency automation now follows the existing release path instead of replacing
it:

1. Renovate opens dependency PRs against `main`.
2. The existing CI/build workflows run on those PRs.
3. Only low-risk patch/minor PRs marked safe by `.github/renovate.json5` may
   automerge after checks pass, and oversized dependency PRs are forced back to
   manual review by `dependency-pr-guard.yml`.
4. A merged Renovate dependency PR triggers `dependency-version-bump.yml`,
   which bumps the root `package.json` patch version with
   `chore(release): vX.Y.Z`.
5. The existing `release.yml` workflow creates the tag/release from that version
   bump, and `publish.yml` continues to publish from the tag.

`RENOVATE_TOKEN` or `GH_TOKEN` is also reused by the post-merge bump and
tag-push steps so the resulting pushes can fan out into downstream workflows.

## Migration Notes

The original `ci-release-publish.yml` has been backed up as `ci-release-publish.yml.backup` and replaced with these focused workflows to resolve the Vitest memory issues and improve maintainability.
