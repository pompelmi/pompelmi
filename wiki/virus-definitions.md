# Virus Definitions

ClamAV's detection quality depends entirely on keeping its virus definition database current. Stale definitions miss recent malware. This page covers how to update definitions, automate updates, and verify the database is fresh.

---

## What the database is

ClamAV uses three main database files:

| File | Purpose |
|------|---------|
| `main.cvd` | Main virus database (stable, infrequently updated) |
| `daily.cvd` or `daily.cld` | Daily incremental updates |
| `bytecode.cvd` | Bytecode signatures for advanced detection |

On Linux the default path is `/var/lib/clamav/`. On macOS (Homebrew) it is typically `/usr/local/var/lib/clamav/` or `/opt/homebrew/var/lib/clamav/`.

---

## Manual update

Run `freshclam` to download or update the database:

```bash
# Linux
sudo freshclam

# macOS (Homebrew)
freshclam

# With verbose output
freshclam --verbose
```

`freshclam` connects to ClamAV's mirror network, checks the current version, and downloads only the delta if an update is available.

---

## Automating updates with cron

Update definitions daily:

```bash
# Edit crontab
crontab -e

# Add — runs freshclam at 2:30 AM every day
30 2 * * * /usr/bin/freshclam --quiet 2>&1 | logger -t freshclam
```

Verify the path to `freshclam`:

```bash
which freshclam
# /usr/bin/freshclam  or  /opt/homebrew/bin/freshclam
```

On Linux with `clamav-daemon`:

```bash
# freshclam daemon (separate from clamd) — manages updates automatically
sudo systemctl enable clamav-freshclam
sudo systemctl start clamav-freshclam
```

---

## Verifying the database is current

```bash
# Check version and signature date
clamscan --version
# ClamAV 1.3.0/27330/Sun Apr 28 06:25:00 2024

# freshclam shows what is installed vs available
freshclam --verbose
```

The number after the slash (e.g. `27330`) is the database version. Compare it to the ClamAV website to see if you are up to date.

---

## Docker: automatic updates

The official `clamav/clamav:stable` image runs `freshclam` on startup and periodically in the background. No extra configuration is needed.

To verify inside the running container:

```bash
docker compose exec clamav freshclam --verbose
```

To force an immediate update:

```bash
docker compose exec clamav freshclam
```

---

## Docker: persisting the database across restarts

Without a named volume, Docker re-downloads the full database (~300 MB) every time the container restarts. Use a named volume:

```yaml
services:
  clamav:
    image: clamav/clamav:stable
    volumes:
      - clamav_db:/var/lib/clamav

volumes:
  clamav_db:
```

With the volume in place, only incremental updates are downloaded after the first start. Restart time drops from 2–3 minutes to a few seconds.

---

## Programmatic update with pompelmi

pompelmi exports an internal `updateClamAVDatabase()` utility:

```js
const { updateClamAVDatabase } = require('./node_modules/pompelmi/src/ClamAVDatabaseUpdater');

await updateClamAVDatabase();
// Resolves: 'Database already up to date.' or 'Database updated successfully.'
```

This is intended for initial setup scripts, not ongoing updates. Prefer cron or the clamd-freshclam service for production.

---

## What happens when definitions are stale

If the database is very old (months or years out of date):

- Recent malware samples will not be detected — ClamAV will return `Verdict.Clean` for files that are actually malicious.
- `clamscan` may print warnings about outdated definitions to stderr.
- The clamd daemon may refuse to start if the database is too old (configurable via `DatabaseAge` in `clamd.conf`).

pompelmi itself does not check definition age — it calls ClamAV and maps the result. The responsibility for keeping definitions current is yours.

---

## Alerting on stale definitions

Parse the `clamscan --version` output to check the database date and alert if it is too old:

```js
const { execSync } = require('child_process');

function getDatabaseAge() {
  const output = execSync('clamscan --version').toString();
  // e.g. "ClamAV 1.3.0/27330/Sun Apr 28 06:25:00 2024"
  const match = output.match(/\/(\d+)\//);
  return match ? parseInt(match[1], 10) : null;
}

const version = getDatabaseAge();
const MINIMUM_VERSION = 27000; // update this periodically

if (version && version < MINIMUM_VERSION) {
  console.warn(`ClamAV database version ${version} is below minimum ${MINIMUM_VERSION}. Run freshclam.`);
}
```

Or check by date from `freshclam` logs:

```bash
grep 'up to date' /var/log/clamav/freshclam.log | tail -1
```

---

## Rate limits on ClamAV mirrors

ClamAV's public mirror network rate-limits `freshclam` requests. Do not run `freshclam` more than 4 times per hour — the mirrors will temporarily block your IP. The default `freshclam` cron interval of once per day is appropriate for most deployments.

For organisations with many servers, set up a local ClamAV mirror or use a private update proxy.

---

## Platform database paths

| Platform | Default database path |
|----------|----------------------|
| Linux (Debian/Ubuntu) | `/var/lib/clamav/` |
| macOS (Homebrew x86) | `/usr/local/var/lib/clamav/` |
| macOS (Homebrew Apple Silicon) | `/opt/homebrew/var/lib/clamav/` |
| Windows | `C:\ProgramData\ClamAV\` |
| Docker (`clamav/clamav`) | `/var/lib/clamav/` |
