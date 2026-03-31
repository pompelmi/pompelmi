# Dependency Update Automation

This dependency automation system is active. It uses Dependabot plus GitHub Actions to keep development tooling current without turning routine maintenance into noisy npm releases.

## What is auto-merged

- Only pull requests opened by `dependabot[bot]`.
- `npm` updates in `/` when Dependabot identifies them as direct development dependencies.
- `github-actions` updates in `/`.
- Patch and minor updates only.
- Eligible bot PRs are queued with `gh pr merge --auto --squash`, so branch protection and required checks still decide when the merge actually happens.
- Auto-merge is intended to operate with branch protection rather than bypass it.

## What is intentionally not auto-merged

- Major dependency updates.
- Production or runtime dependency updates.
- Non-Dependabot pull requests.
- Any pull request with failing required checks.
- Any pull request blocked by repository review or branch protection rules.

## Why maintenance GitHub releases exist

- They make dependency and CI upkeep visible in the Releases page, which helps show that the project is actively maintained.
- They produce professional release notes for maintenance work without pretending that each tooling refresh is a user-facing package release.
- They use tags in the `maintenance-YYYY-MM-DD` format, which keeps them separate from semver tags and the npm publish flow.
- The workflow only creates a maintenance release when dependency-management or CI-related files changed since the last maintenance release, or since the last semver release if no maintenance release exists yet.

## Why npm is not published for devDependency-only updates

- npm publishing remains reserved for real semver releases.
- `.github/workflows/publish.yml` only reacts to semver tags such as `v0.35.0`, so maintenance tags do not publish packages.
- `.github/workflows/maintenance-release.yml` never edits package versions.

## Manual GitHub settings required

1. Enable repository-level auto-merge.
2. Add a branch protection rule or ruleset for `main`.
3. During the temporary rollout phase, require these status checks on `main`:
   - `Test`
   - `Typecheck`
   - `Security Scan`
4. Do not mark `Lint` as required yet. It should stay advisory temporarily because the repository still has a pre-existing lint baseline to clean up.
5. Once the lint baseline is cleaned up, add `Lint` as a required check as well. This temporary policy is intentional and is not the final target state.
6. Decide how approvals should work for Dependabot PRs. If approvals are mandatory on `main`, fully hands-free merging usually needs either an exception for bot PRs or a different review policy.

## Labels to have in the repository

Dependabot ignores custom labels that do not already exist, so create these labels if the repository does not already have them:

- `dependencies`
- `dev-deps`
- `github-actions`
- `security`
- `ci`
- `workflows`
- `docs`
- `documentation`
- `feature`
- `enhancement`
- `maintenance`

If some of the release note labels are missing, GitHub will still generate notes, but more pull requests will fall into the catch-all maintenance category.
