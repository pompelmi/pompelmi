# pompelmi/scanner Docker Image

Official Docker image for pompelmi — ClamAV antivirus scanning for Node.js.

The image ships with:
- ClamAV + clamd pre-installed
- freshclam for automatic definition updates on startup
- A minimal HTTP API server on port 8080

## Quick start

```bash
docker pull pompelmi/scanner
docker run -p 8080:8080 pompelmi/scanner
```

## Scan a file

```bash
curl -F "file=@./document.pdf" http://localhost:8080/scan
```

Response:

```json
{ "verdict": "clean", "file": "document.pdf", "viruses": [] }
```

For an infected file the verdict is `"malicious"`.

## Endpoints

| Method | Path      | Description                                             |
|--------|-----------|---------------------------------------------------------|
| POST   | /scan     | Accepts `multipart/form-data` with a `file` field. Returns `{ verdict, file, viruses }` |
| GET    | /health   | Returns `{ status: "ok", clamd: "running" }` |
| GET    | /stats    | Returns scan statistics (total, clean, infected, errors, uptime) |

## Docker Compose

```yaml
services:
  pompelmi:
    image: pompelmi/scanner
    ports:
      - "8080:8080"
    volumes:
      - /uploads:/uploads
    restart: unless-stopped
```

## Environment

The container exposes two ports:
- **8080** — HTTP scan API
- **3310** — clamd TCP socket (for direct clamd connections from other containers)

## Building locally

```bash
docker build -f docker/Dockerfile -t pompelmi/scanner .
```
