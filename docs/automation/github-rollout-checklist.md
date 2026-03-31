# GitHub Rollout Checklist

- Enable repository auto-merge.
- Create labels: `dependencies`, `dev-deps`, `github-actions`.
- Configure a branch protection rule or ruleset for `main`.
- Temporarily require `Test`, `Typecheck`, and `Security Scan`.
- Do not mark `Lint` as required yet.
- Revisit the rules after the lint baseline cleanup.
- Test one real Dependabot pull request after setup.
