# Express + pompelmi

Full Express app using multer (memory storage) and the pompelmi middleware.

## Setup

```bash
npm install express multer pompelmi
```

Run a ClamAV daemon (Docker is the easiest way):

```bash
docker run -d -p 3310:3310 clamav/clamav:stable
```

## Run

```bash
CLAMD_HOST=127.0.0.1 CLAMD_PORT=3310 node index.js
```

## Try it

Upload a clean file:

```bash
curl -F "file=@/path/to/document.pdf" http://localhost:3000/upload
# → {"ok":true,"filename":"document.pdf","size":...}
```

Upload the EICAR test virus:

```bash
curl -F "file=@eicar.com" http://localhost:3000/upload
# → HTTP 403  {"error":"Malicious file detected"}
```

Upload multiple files:

```bash
curl -F "files=@a.pdf" -F "files=@b.pdf" http://localhost:3000/upload-many
```
