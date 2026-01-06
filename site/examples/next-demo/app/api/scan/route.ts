export const runtime = 'nodejs';

const MAX = Number(process.env.POMPELMI_MAX_SIZE ?? 50 * 1024 * 1024);
const TIMEOUT = Number(process.env.POMPELMI_TIMEOUT_MS ?? 15_000);
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return Response.json({ ok: false, error: 'No file' }, { status: 400 });
    }
    if (file.size > MAX) {
      return Response.json({ ok: false, error: `File too large (>${MAX} bytes)` }, { status: 413 });
    }

    const engineUrl = process.env.POMPELMI_ENGINE_URL?.replace(/\/$/, '');
    if (engineUrl) {
      try {
        const fd = new FormData();
        fd.append('file', file, (file as any).name ?? 'upload.bin');

        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), TIMEOUT);
        const res = await fetch(`${engineUrl}/scan`, { method: 'POST', body: fd, signal: ac.signal });
        clearTimeout(t);

        if (res.ok) {
          const verdict = await res.json();
          return Response.json({ ok: true, result: verdict }, { status: 200 });
        } else {
          const txt = await res.text().catch(() => '');
          throw new Error(`Engine HTTP ${res.status} ${txt}`.trim());
        }
      } catch (e: any) {
        // log server-side per capire cosa succede
        console.error('Engine error:', e?.message ?? e);
        // fallback demo sotto
      }
    }

    // Fallback DEMO: EICAR
    const ab = await (file as Blob).arrayBuffer();
    const buf = Buffer.from(ab);
    const malicious = buf.toString('latin1').includes(EICAR);
    return Response.json({
      ok: true,
      result: { malicious, engine: malicious ? 'EICAR (demo)' : 'none', size: buf.length }
    });

  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message ?? 'Scan error' }, { status: 500 });
  }
}