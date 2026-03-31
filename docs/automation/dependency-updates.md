# Dependency Update Automation

This dependency automation system is active. It uses Dependabot plus GitHub Actions to keep development tooling current without turning routine maintenance into noisy npm releases.

## How updates are paced

- Dependabot checks both `npm` and `github-actions` version updates daily.
- Patch and minor updates are the preferred fast lane. They are intended to appear quickly and stay eligible for the existing safe auto-merge flow.
- `npm` major updates remain manual and are intentionally delayed by about 7 days with Dependabot `cooldown`.
- Some noisy `github-actions` major updates are intentionally ignored at the semver-major level to keep more room for grouped patch and minor PRs.
- `github-actions` major updates are reduced, not eliminated. More important majors can still appear and remain manual.
- The configuration avoids overlapping schedule blocks for the same ecosystem and directory.
- For `npm`, cooldown delays major updates after a release appears; it does not guarantee that major PRs arrive on a specific weekday.

## What is auto-merged

- Only pull requests opened by `dependabot[bot]`.
- `npm` updates in `/` when Dependabot identifies them as direct development dependencies.
- Grouped `github-actions` patch and minor updates in `/`.
- Only patch and minor updates.
- Eligible bot PRs are queued with `gh pr merge --auto --squash`, and GitHub completes the merge only after all required checks pass.
- Auto-merge is intended to operate with branch protection rather than bypass it.

## What is intentionally not auto-merged

- Major dependency updates.
- Major `github-actions` updates that are still allowed to open. These stay manual and outside the grouped auto-merge lane even though Dependabot now checks daily.
- Production or runtime dependency updates.
- Non-Dependabot pull requests.
- Any pull request with failing required checks.
- Any pull request blocked by repository review or branch protection rules.

## Why npm devDependency updates are split

- npm development dependency updates are intentionally split into smaller buckets to reduce CI blast radius.
- Smaller patch and minor PRs are more likely to go fully green and auto-merge reliably after required checks pass.
- Major npm development dependency updates remain outside the grouped auto-merge lane and are delayed by cooldown before PRs appear.
- `Lint` remains temporarily non-required until the existing baseline cleanup is finished. After that cleanup, `Lint` should become required too.

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
