# Next.js + pompelmi

Next.js API route that scans raw upload bytes before accepting them.

## Setup

```bash
npm install pompelmi
```

Run a ClamAV daemon:

```bash
docker run -d -p 3310:3310 clamav/clamav:stable
```

## Use

Copy `pages/api/upload.js` into your Next.js project.

Set environment variables in `.env.local`:

```
CLAMD_HOST=127.0.0.1
CLAMD_PORT=3310
```

## Try it

```bash
curl -X POST --data-binary @/path/to/file.pdf http://localhost:3000/api/upload
# → {"ok":true}

curl -X POST --data-binary @eicar.com http://localhost:3000/api/upload
# → HTTP 422  {"error":"Malicious file rejected."}
```

## Notes

- `bodyParser: false` is required — the route reads the raw stream itself.
- For multipart uploads (FormData), use a library like `formidable` to extract the file buffer before passing it to `scanBuffer`.
