# Dependency Update Automation

Dependabot version updates are intentionally simple:

- `npm` and `github-actions` both belong to a single top-level multi-ecosystem group named `all-dependencies`.
- That group checks daily at `06:00 UTC`.
- `npm` remains limited to development dependencies only.
- This creates one consolidated dependency PR flow for version updates.
- `open-pull-requests-limit: 1` keeps version-update PRs to one open PR at a time.

## Auto-merge behavior

- Only pull requests opened by `dependabot[bot]` are queued with `gh pr merge --auto --squash`.
- There is no major, minor, or patch distinction for auto-merge eligibility anymore.
- There is no separate low-risk filter by dependency type or ecosystem.
- GitHub required checks, approvals, and branch protection rules remain the real merge gate.
- If required CI/CD checks fail, the PR stays open and does not merge.

## What to expect

- A daily `npm` development dependency major update is treated the same as any other Dependabot version update: it can be grouped into the shared dependency PR and auto-merge is enabled immediately.
- A daily `github-actions` major update is treated the same way.
- If multiple matching updates are available when the daily run happens, Dependabot can place them into the same consolidated PR.
- Release, publish, and maintenance release workflows are unchanged.

## Required GitHub settings

1. Repository-level auto-merge must be enabled.
2. `main` must keep the required CI/CD checks you want to enforce.
3. If reviews are required for Dependabot PRs, GitHub will wait for those too before merging.
