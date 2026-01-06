import type { Readable } from "node:stream";

function isPDF(b: Buffer) { return b.length >= 5 && b.slice(0,5).toString("ascii") === "%PDF-"; }
function isPNG(b: Buffer) { return b.length >= 8 && b[0]===0x89 && b[1]===0x50 && b[2]===0x4E && b[3]===0x47 && b[4]===0x0D && b[5]===0x0A && b[6]===0x1A && b[7]===0x0A; }
function isJPEG(b: Buffer){ return b.length >= 3 && b[0]===0xFF && b[1]===0xD8 && b[2]===0xFF; }
function isGIF(b: Buffer) { return b.length >= 6 && (b.slice(0,6).toString("ascii")==="GIF87a" || b.slice(0,6).toString("ascii")==="GIF89a"); }
function isZIP(b: Buffer) { return b.length >= 4 && b[0]===0x50 && b[1]===0x4B && ((b[2]===0x03&&b[3]===0x04)||(b[2]===0x05&&b[3]===0x06)||(b[2]===0x07&&b[3]===0x08)); }

function looksText(b: Buffer) {
  const n = Math.min(b.length, 1024);
  if (n === 0) return false;
  let printable = 0;
  for (let i=0;i<n;i++) {
    const c = b[i];
    if (c === 0x00) return false;
    if ((c >= 0x20 && c <= 0x7E) || c === 0x09 || c === 0x0A || c === 0x0D) printable++;
  }
  return (printable / n) > 0.9;
}

export async function sniffMimeFromStream(stream: Readable): Promise<string> {
  const chunk: Buffer = await new Promise((resolve, reject) => {
    const onData = (c: Buffer) => { cleanup(); resolve(c); };
    const onEnd  = () => { cleanup(); resolve(Buffer.alloc(0)); };
    const onErr  = (e: any) => { cleanup(); reject(e); };
    const cleanup = () => {
      stream.off("data", onData);
      stream.off("end", onEnd);
      stream.off("error", onErr);
    };
    stream.once("data", onData);
    stream.once("end", onEnd);
    stream.once("error", onErr);
  });

  if (chunk.length) {
    (stream as any).pause?.();
    (stream as any).unshift?.(chunk);
    (stream as any).resume?.();

    const b = chunk;
    if (isPNG(b))  return "image/png";
    if (isJPEG(b)) return "image/jpeg";
    if (isGIF(b))  return "image/gif";
    if (isPDF(b))  return "application/pdf";
    if (isZIP(b))  return "application/zip";
    if (looksText(b)) return "text/plain";
  }
  return "application/octet-stream";
}
