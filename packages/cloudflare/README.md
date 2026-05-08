# @pompelmi/cloudflare

Scan file uploads for malware inside **Cloudflare Workers** using a remote [ClamAV](https://www.clamav.net/) (clamd) instance.

Uses Web APIs only (`fetch`, `connect` from `cloudflare:sockets`) — no Node.js built-ins, fully compatible with the Workers Runtime.

## Requirements

Cloudflare Workers cannot run clamd locally. You need a **publicly reachable** clamd instance. Options:

- A VPS running clamd with port 3310 open (add appropriate firewall rules).
- A Cloudflare Tunnel ([cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)) pointing to a private clamd instance.

> **Security note:** Restrict clamd access to your Worker's outbound IPs or use a shared secret at the application layer. Never expose clamd directly to the public internet without access controls.

## Installation

```
npm i @pompelmi/cloudflare
```

## Usage

```js
import { scanBuffer, scanRequest } from '@pompelmi/cloudflare';

export default {
  async fetch(request, env) {
    // Option A: scan the whole multipart form at once
    const rejection = await scanRequest(request, {
      host: env.CLAMAV_HOST,
      port: parseInt(env.CLAMAV_PORT),
    });
    if (rejection) return rejection; // 422 or 500

    return new Response('File accepted');
  },
};
```

Or scan an `ArrayBuffer` directly:

```js
import { scanBuffer } from '@pompelmi/cloudflare';

export default {
  async fetch(request, env) {
    const formData = await request.formData();
    const file = formData.get('file');
    const buffer = await file.arrayBuffer();

    const result = await scanBuffer(buffer, {
      host: env.CLAMAV_HOST,
      port: parseInt(env.CLAMAV_PORT),
    });

    if (result !== 'clean') {
      return new Response('File rejected', { status: 422 });
    }

    return new Response('OK');
  },
};
```

## API

### `scanBuffer(buffer, options)`

| Parameter | Type | Description |
|---|---|---|
| `buffer` | `ArrayBuffer` | The file bytes to scan |
| `options.host` | `string` | clamd hostname or IP (required) |
| `options.port` | `number` | clamd port, typically `3310` (required) |
| `options.timeout` | `number` | Read timeout in ms (default: `15000`) |

Returns `Promise<'clean' | 'malicious' | 'error'>`.

### `scanRequest(request, options)`

Reads the multipart form field (default: `file`), scans it, and returns:
- `null` — file is clean, proceed normally.
- `Response(422)` — malicious file detected.
- `Response(500)` — scan error (clamd unreachable, timeout, etc.).

Additional option: `options.field` — form field name (default: `'file'`).

## Wrangler configuration

Copy [`wrangler.toml.example`](./wrangler.toml.example) to `wrangler.toml` and fill in your clamd host details.

## License

ISC
