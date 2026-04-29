# Docker Compose — Production Setup

Production-grade docker-compose configuration for running pompelmi with a ClamAV sidecar. This setup includes health checks, restart policy, persistent virus definition storage, and environment variable configuration.

---

## Complete `docker-compose.yml`

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      CLAMAV_HOST: clamav
      CLAMAV_PORT: "3310"
      CLAMAV_TIMEOUT: "30000"
    depends_on:
      clamav:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - uploads:/app/uploads

  clamav:
    image: clamav/clamav:stable
    ports:
      - "3310:3310"
    restart: unless-stopped
    volumes:
      - clamav_db:/var/lib/clamav    # persist virus definitions across restarts
    healthcheck:
      test: ["CMD", "clamdcheck"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s             # first start downloads ~300 MB of definitions

volumes:
  clamav_db:
  uploads:
```

---

## Application code

Read options from environment variables so the same image works in all environments:

```js
const { scan, scanBuffer, scanStream, Verdict } = require('pompelmi');

const SCAN_OPTS = {
  host:    process.env.CLAMAV_HOST    || '127.0.0.1',
  port:    Number(process.env.CLAMAV_PORT)    || 3310,
  timeout: Number(process.env.CLAMAV_TIMEOUT) || 15_000,
};

const result = await scan('/uploads/file.pdf', SCAN_OPTS);
```

---

## Dockerfile example

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads

EXPOSE 3000
CMD ["node", "src/server.js"]
```

Note: `clamscan` does **not** need to be installed in the application container when using TCP mode. The ClamAV sidecar handles all scanning.

---

## Health check explanation

`clamdcheck` is a shell script bundled inside the `clamav/clamav:stable` image. It sends a `PING` to the local clamd socket and checks the response. The `start_period: 120s` gives clamd time to download virus definitions on first start before health checks begin counting failures.

If you need to check from outside the container, you can also use TCP:

```bash
echo -n "PING" | nc -q1 localhost 3310
# expected response: PONG
```

---

## `depends_on` with health check

```yaml
depends_on:
  clamav:
    condition: service_healthy
```

This prevents the application container from starting until clamd passes its health check. Without this, your app may start and immediately fail its first scan with "connection refused."

---

## Scaling considerations

### Vertical scaling

ClamAV is single-threaded per scan. For high-throughput use cases, run multiple clamd containers behind a load balancer rather than trying to parallelise within one instance.

### Horizontal scaling

```yaml
services:
  clamav:
    image: clamav/clamav:stable
    deploy:
      replicas: 3
    volumes:
      - clamav_db:/var/lib/clamav
```

Point your application at a load balancer in front of the clamd replicas. Note: each clamd replica downloads its own virus database on startup unless you share the volume (which requires care with concurrent freshclam writes).

### Alternative: one clamd per app instance

For simpler setups, co-deploy one clamd container with each app container. Each pair shares a clamd_db volume scoped to the pair.

---

## Resource limits

ClamAV can use significant memory when unpacking large archives:

```yaml
clamav:
  image: clamav/clamav:stable
  deploy:
    resources:
      limits:
        memory: 1g
        cpus: '1.0'
```

Tune based on your expected file sizes. Scanning uncompressed archives >100 MB may require more.

---

## Keeping virus definitions fresh

The `clamav/clamav:stable` image runs `freshclam` on a schedule automatically. Verify definitions are up to date:

```bash
docker compose exec clamav freshclam --verbose
```

Or trigger a manual update:

```bash
docker compose exec clamav freshclam
```

For zero-downtime definition updates, restart the clamav container (freshclam updates on startup) without restarting the app container:

```bash
docker compose restart clamav
```

The named volume preserves the downloaded definitions across restarts, so only incremental updates are downloaded after the first start.

---

## Production checklist

- [ ] `restart: unless-stopped` on both services
- [ ] `healthcheck` configured on clamav with `start_period` ≥ 90s
- [ ] `depends_on: condition: service_healthy` on app
- [ ] `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_TIMEOUT` via environment variables
- [ ] Named volume for `clamav_db` (not anonymous)
- [ ] File size limits in your HTTP server (before the scan is reached)
- [ ] Upload directory in a named volume (survives container restarts)
- [ ] Log aggregation: capture `app` and `clamav` container logs
