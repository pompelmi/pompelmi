---
title: Node.js file upload security checklist
description: A practical checklist for hardening Node.js upload routes with parser limits, content inspection, quarantine, storage isolation, and developer-friendly defaults.
---

Use this checklist before you ship or review a file upload endpoint.

If you want the broader implementation model behind these checklist items, read [Secure file uploads in Node.js: Beyond Extension and MIME Checks](/pompelmi/blog/secure-file-uploads-nodejs/).

## Checklist

### 1. Limit what the parser accepts

- Set request and file-size limits in Multer, Fastify multipart, or your equivalent parser.
- Limit file counts and field sizes as well as bytes.

### 2. Keep bytes out of durable storage until you have a verdict

- Prefer memory-backed uploads for synchronous routes.
- If files must hit storage first, use an isolated quarantine location.

### 3. Use allowlists, not denylists

- Allow only the extensions and MIME types your product really needs.
- Split high-risk types like SVG and ZIP into their own routes or policies.

### 4. Inspect content, not just metadata

- Check magic bytes and structural signals.
- Treat client-provided MIME values as hints, not truth.

### 5. Handle archives explicitly

- Limit nesting depth, total expansion, entry counts, and path traversal.
- Do not treat ZIPs like ordinary single-file uploads.

### 6. Decide what `suspicious` means in your product

- Public uploads often block on `suspicious`.
- Document-heavy or business-critical flows often quarantine instead.

### 7. Keep storage non-executable and non-public by default

- Separate upload buckets from your app bundle and static assets.
- Serve files through controlled endpoints or signed URLs when possible.

### 8. Log the verdict without logging raw payloads

- Track verdict, reasons, file size, route, and user context.
- Avoid storing sensitive file contents in logs.

### 9. Test with representative files

- Clean files from your real product flows.
- Safe AV test strings like EICAR.
- Borderline cases like archives, SVG, macro-enabled documents, and oversized files.

### 10. Review the route after feature changes

- New accepted file types change the threat model.
- New storage paths or parsing steps can invalidate older assumptions.

## Continue

- [Secure file uploads in Node.js: Beyond extension and MIME checks](/pompelmi/blog/secure-file-uploads-nodejs/)
- [Defense in depth for file uploads](../use-cases/defense-in-depth-for-file-uploads/)
- [Do you need antivirus for file uploads?](../comparisons/do-you-need-antivirus-for-file-uploads/)
- [Examples on GitHub](https://github.com/pompelmi/pompelmi/tree/main/examples)
