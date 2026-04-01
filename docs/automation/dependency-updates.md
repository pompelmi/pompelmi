# Dependency Update Maintenance

This repository no longer runs Dependabot.

Dependency refreshes now happen intentionally in regular pull requests when maintainers decide to update:

- npm dependencies
- GitHub Actions
- workspace and package manager configuration

## Maintenance releases

- After dependency or CI-related changes land on `main`, the maintenance release workflow can create a real GitHub Release for that day.
- Maintenance tags use the non-semver format `maintenance-YYYY-MM-DD`, with the release title `Maintenance release - YYYY-MM-DD`.
- These releases are GitHub-only maintenance releases. They do not publish anything to npm.
- The workflow keeps daily dedupe behavior, so at most one maintenance release is created per day.

## What to expect

- There are no scheduled dependency bot PRs.
- Dependency and CI upgrades are reviewed in normal pull requests with the same branch protection and CI requirements as any other change.
- Once one of those dependency or CI changes lands on `main`, the repository creates at most one real GitHub maintenance release for that UTC day.
- Semver product releases and npm publishing remain on their existing release workflows.
