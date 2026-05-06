# pompelmi GitHub App

## GitHub Action vs GitHub App

| | GitHub Action | GitHub App |
|---|---|---|
| **Setup** | Add a workflow file to `.github/workflows/` | One-click install from GitHub Marketplace |
| **Granularity** | Runs the full `pompelmi` CLI on the changed files | Scans only changed files per PR; posts check runs + inline annotations |
| **Check runs** | Optional (via `comment-on-pr`) | Native — shows pass/fail directly on the PR |
| **Annotations** | Not supported | Infected files appear inline on the diff |
| **Maintenance** | You own the workflow | Managed by the pompelmi team |
| **Best for** | Individual repos, custom pipelines | Organizations wanting zero-config scanning on every PR |

## Installing the App

1. Go to the pompelmi GitHub App page on GitHub Marketplace.
2. Click **Install** and select the organization or repositories to protect.
3. Accept the requested permissions (see below).
4. The App immediately begins scanning new and updated pull requests.

No workflow file is needed. No secrets to configure. Scanning starts on the next PR event.

## Required permissions

The App requests the minimum permissions needed to operate:

| Permission | Access | Reason |
|---|---|---|
| **Contents** | Read | Fetch the changed files in a PR |
| **Pull requests** | Read | Discover which files changed |
| **Checks** | Write | Post check run results and diff annotations |

The App never reads files outside the pull request diff, never stores file contents, and never transmits data outside your network (you run your own clamd instance).

## How check runs work

When a pull request is opened or updated:

1. The App creates a check run with status **In progress**.
2. Changed files are downloaded and streamed to clamd for scanning.
3. The check run is marked **Completed** with:
   - `conclusion: success` — all files clean (green checkmark on the PR).
   - `conclusion: failure` — one or more infected files found (red ✗ on the PR).
4. Each infected file receives a **diff annotation** showing the virus name on the exact file in the PR diff.

## Self-hosting the App server

The App backend is an open-source [Probot](https://probot.github.io/) application.

```bash
git clone https://github.com/pompelmi/pompelmi-github-app
cd pompelmi-github-app
npm install
```

Set the following environment variables (or create a `.env` file):

```
APP_ID=<your GitHub App ID>
PRIVATE_KEY=<RSA private key PEM>
WEBHOOK_SECRET=<webhook secret>
CLAMD_HOST=localhost
CLAMD_PORT=3310
```

Then start the server:

```bash
npm start
```

The server listens for `pull_request` webhook events, scans changed files, and posts check runs back to GitHub.

## Configuration reference (`.github/app.yml`)

The `.github/app.yml` file in the pompelmi repository documents the App's metadata, permission requirements, and webhook trigger configuration. It is used to register and update the App on GitHub but is not required in consumer repositories.
