# Docker Setup

Run ClamAV as a Docker sidecar so your application host requires no local ClamAV installation. pompelmi's TCP mode streams files directly to the clamd daemon — the API is identical to local mode.

---

## Why a Docker sidecar?

- **No local install** — the application container stays lean; ClamAV and its virus definitions live in a dedicated sidecar.
- **Always up-to-date definitions** — the official `clamav/clamav:stable` image runs `freshclam` on startup and periodically refreshes the database.
- **Isolation** — ClamAV runs in its own process/container; a crash or restart does not affect your application.
- **Consistent environments** — same image in development, staging, and production.

---

## docker-compose.yml

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      CLAMAV_HOST: clamav
      CLAMAV_PORT: 3310
    depends_on:
      clamav:
        condition: service_healthy

  clamav:
    image: clamav/clamav:stable
    ports:
      - "3310:3310"
    restart: unless-stopped
    volumes:
      - clamav_db:/var/lib/clamav   # persist virus definitions across restarts
    healthcheck:
      test: ["CMD", "clamdcheck"]   # bundled check script in clamav/clamav image
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s            # freshclam download takes time on first boot

volumes:
  clamav_db:
```

> **First boot:** The image downloads the full virus database (~300 MB) before clamd starts accepting connections. `start_period: 120s` gives it time. On subsequent restarts the volume cache means startup is near-instant.

---

## Pointing pompelmi at clamd

Pass `host` and `port` to any pompelmi function. No other code changes are needed.

```js
const { scan, scanBuffer, scanStream, scanDirectory, Verdict } = require('pompelmi');

const CLAMAV_OPTS = {
  host: process.env.CLAMAV_HOST || '127.0.0.1',
  port: Number(process.env.CLAMAV_PORT) || 3310,
  timeout: 30_000,  // ms — increase for large files
};

// scan a file by path
const result = await scan('/uploads/report.pdf', CLAMAV_OPTS);

// scan an in-memory Buffer (multer memoryStorage)
const result = await scanBuffer(req.file.buffer, CLAMAV_OPTS);

// scan a Readable stream (S3, HTTP, pipes)
const stream = s3.getObject({ Bucket, Key }).createReadStream();
const result = await scanStream(stream, CLAMAV_OPTS);

// recursively scan a directory
const results = await scanDirectory('/uploads', CLAMAV_OPTS);
```

All four functions return the same `Verdict.Clean`, `Verdict.Malicious`, or `Verdict.ScanError` Symbols. No code changes are required when switching between local and TCP mode.

---

## Configuring timeout for large files

The `timeout` option sets the socket idle timeout in milliseconds (default: 15 000 ms). Increase it when scanning large archives or slow network links.

```js
const result = await scan('/uploads/large-archive.zip', {
  host: 'clamav',
  port: 3310,
  timeout: 120_000,  // 2 minutes
});
```

If clamd takes longer than `timeout` ms without sending data, pompelmi rejects with:

```
clamd connection timed out after 120000ms
```

---

## Production tips

### Health checks

The `healthcheck` in the example above uses the `clamdcheck` script bundled in the official image. Your application container uses `depends_on: condition: service_healthy` so it only starts once clamd is ready.

### Restart policy

```yaml
restart: unless-stopped
```

This ensures clamd comes back up after host reboots or OOM kills without manual intervention.

### Persisting virus definitions

The named volume `clamav_db` mounts to `/var/lib/clamav` inside the container. This means:

- First start downloads definitions once (~300 MB).
- Subsequent restarts reuse the cache; `freshclam` only downloads incremental updates.
- The volume survives `docker compose down` (use `docker compose down -v` to wipe it).

### Resource limits (optional)

ClamAV can be memory-hungry when scanning large ZIP archives. Set a limit if needed:

```yaml
clamav:
  image: clamav/clamav:stable
  deploy:
    resources:
      limits:
        memory: 1g
```

---

## Troubleshooting

### clamd not ready on startup

**Symptom:** Application starts before clamd is accepting connections; first scan fails with connection refused.

**Fix:** Add `depends_on` with `condition: service_healthy` (see example above) and ensure the `healthcheck` is configured on the clamav service. The `start_period` must be long enough for the initial database download.

### Connection refused

**Symptom:** `ECONNREFUSED 127.0.0.1:3310`

**Causes and fixes:**

1. clamd container is not running — `docker compose ps` to check.
2. Wrong host — if the app is inside Docker, use the service name (`clamav`), not `127.0.0.1`.
3. Port not exposed — verify the `ports` mapping in `docker-compose.yml`.
4. clamd is still loading the virus database — add the `healthcheck` and `depends_on` described above.

### Timeout errors

**Symptom:** `clamd connection timed out after 15000ms`

**Fixes:**

1. Increase `timeout` in the options object (e.g. `timeout: 60_000`).
2. Check clamd resource limits — if it is CPU- or memory-constrained it will scan slowly.
3. Check network latency between app and clamav containers.

### Virus definitions out of date

The official image runs `freshclam` periodically. If you see scan errors mentioning outdated definitions, exec into the container and run it manually:

```bash
docker compose exec clamav freshclam
```

Or restart the container; `freshclam` runs at startup.
