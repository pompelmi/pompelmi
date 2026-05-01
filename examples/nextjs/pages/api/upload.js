import { scanBuffer, Verdict } from 'pompelmi';

// Disable Next.js default body parser so we can read raw bytes
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Collect raw request body into a Buffer
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  if (buffer.length === 0) return res.status(400).json({ error: 'No file data received.' });

  const verdict = await scanBuffer(buffer, {
    host: process.env.CLAMD_HOST,
    port: Number(process.env.CLAMD_PORT) || 3310,
  });

  if (verdict === Verdict.Malicious) {
    return res.status(422).json({ error: 'Malicious file rejected.' });
  }
  if (verdict === Verdict.ScanError) {
    return res.status(422).json({ error: 'Scan incomplete — file rejected as a precaution.' });
  }

  res.status(200).json({ ok: true });
}
