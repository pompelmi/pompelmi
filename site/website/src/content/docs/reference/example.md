---
title: Example Reference
description: A reference page in my new Starlight docs site.
---

Reference pages are ideal for outlining how things work in terse and clear terms.
Less concerned with telling a story or addressing a specific use case, they should give a comprehensive outline of what you're documenting.

## Further reading

- Read [about reference](https://diataxis.fr/reference/) in the Diátaxis framework

---
title: Scan Engine HTTP API
description: The minimal HTTP contract between your app and the scan engine. Request, response schema, and error codes.
---

Use this reference when wiring your backend (Express/Koa/Next) to the **scan engine**. The contract is intentionally small: send one file, get back a verdict.

## Endpoint

```
POST {ENGINE_URL}/scan
```

- **Content-Type:** `multipart/form-data`
- **Field:** `file` (single file)
- **Auth:** optional (e.g., `Authorization: Bearer <token>`) depending on your engine

## Request

```http
POST /scan HTTP/1.1
Host: engine.example
Content-Type: multipart/form-data; boundary=----X

------X
Content-Disposition: form-data; name="file"; filename="sample.jpg"
Content-Type: image/jpeg

<binary>
------X--
```

### Notes
- Keep the field name **exactly** `file` (the UI components already use this name).
- Enforce **size/MIME** guards on your server before forwarding.
- Add headers your engine requires (API key, tenant, etc.).

## Response

### TypeScript shape
```ts
export type ScanResult = {
  result: {
    malicious: boolean;
    engine?: string;         // e.g. "clamav", "yara"
    signature?: string;      // detection name if malicious
    score?: number;          // optional numeric risk score
  };
  meta?: {
    filename?: string;
    mime?: string;
    size?: number;           // bytes
    durationMs?: number;     // engine time
  };
  errors?: string[];         // engine or validation messages
};
```

### JSON examples
**Clean file**
```json
{
  "result": { "malicious": false, "engine": "clamav" },
  "meta": { "filename": "sample.jpg", "mime": "image/jpeg", "size": 123456, "durationMs": 42 }
}
```

**Malicious (EICAR)**
```json
{
  "result": { "malicious": true, "engine": "clamav", "signature": "Win.Test.EICAR_HDB-1" },
  "meta": { "filename": "eicar.com", "mime": "application/octet-stream", "size": 68, "durationMs": 37 }
}
```

## cURL

Clean JPG:
```bash
curl -sS -X POST "$ENGINE_URL/scan" \
  -H "Authorization: Bearer $ENGINE_TOKEN" \
  -F "file=@./sample.jpg" | jq
```

EICAR test:
```bash
curl -sS -X POST "$ENGINE_URL/scan" \
  -H "Authorization: Bearer $ENGINE_TOKEN" \
  -F "file=@./eicar.com" | jq
```

## Error codes

- **400 Bad Request** — missing `file` field or invalid multipart
- **413 Payload Too Large** — file too big
- **415 Unsupported Media Type** — MIME not allowed by the engine
- **429 Too Many Requests** — throttled/rate‑limited
- **5xx** — engine failure; inspect `errors` array for details

## Security

- Use HTTPS and **auth** between your app and the engine.
- Apply server‑side **allowlists** (MIME/extension) and size limits before forwarding.
- Consider proxy/WAF rate‑limits and sanitation of filenames.

## See also
- UI components: [`@pompelmi/ui-react`](/pompelmi/docs/reference/ui-react/)
- How‑to (server):
  - [Next.js](/pompelmi/docs/how-to/nextjs/)
  - [Express](/pompelmi/docs/how-to/express/)
  - [Koa](/pompelmi/docs/how-to/koa/)