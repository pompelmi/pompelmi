# Dependency Update Automation

Dependabot version updates now follow one consolidated daily maintenance stream:

- `npm` and `github-actions` both belong to a single top-level multi-ecosystem group named `daily-maintenance`.
- That group checks daily at `06:00 UTC`.
- `npm` remains limited to development dependencies only.
- This creates one consolidated dependency PR flow for version updates.
- `open-pull-requests-limit: 1` is enforced on the shared multi-ecosystem group, which keeps version-update PRs to one open PR at a time.
- A single grouped PR can still contain multiple dependency and workflow updates from the same daily run.

## Auto-merge behavior

- Only pull requests opened by `dependabot[bot]` are queued with `gh pr merge --auto --squash`.
- There is no major, minor, or patch distinction for auto-merge eligibility.
- There is no separate filter by dependency type or ecosystem.
- GitHub required checks, approvals, and branch protection rules remain the real merge gate.
- If required CI/CD checks fail, the PR stays open and does not merge.

## Maintenance releases

- After dependency or CI-related changes land on `main`, the maintenance release workflow creates a real GitHub Release for that day.
- Maintenance tags use the non-semver format `maintenance-YYYY-MM-DD`, with the release title `Maintenance release - YYYY-MM-DD`.
- These releases are GitHub-only maintenance releases. They do not publish anything to npm.
- The workflow keeps daily dedupe behavior, so at most one maintenance release is created per day.

## What to expect

- A daily `npm` development dependency update is treated the same as any other Dependabot version update: it can be grouped into the shared dependency PR and auto-merge is enabled immediately.
- A daily `github-actions` update is treated the same way.
- If multiple matching updates are available when the daily run happens, Dependabot can place them into the same consolidated PR.
- Once one of those dependency or CI updates lands on `main`, the repository creates at most one real GitHub maintenance release for that UTC day.
- Semver product releases and npm publishing remain on their existing release workflows.

## Required GitHub settings

1. Repository-level auto-merge must be enabled.
2. `main` must keep the required CI/CD checks you want to enforce.
3. If reviews are required for Dependabot PRs, GitHub will wait for those too before merging.
