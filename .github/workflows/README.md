# GitHub Actions Workflows

This directory contains simplified, memory-optimized GitHub Actions workflows that replace the previous complex monolithic workflow.

## Workflow Files

### Core Workflows

- **`ci.yml`** - Continuous Integration (tests, linting, security scans)
- **`build.yml`** - Build packages and prepare artifacts
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

- **CI**: Runs on all pushes and PRs to `main`
- **Build**: Runs on pushes and PRs to `main`
- **Release**: Runs on pushes to `main` when package.json version changes
- **Publish**: Runs on pushes to `main` and releases
- **Deploy Pages**: Runs on pushes to `main` with website changes
- **Security**: Runs weekly and on pushes to `main`

## Migration Notes

The original `ci-release-publish.yml` has been backed up as `ci-release-publish.yml.backup` and replaced with these focused workflows to resolve the Vitest memory issues and improve maintainability.
