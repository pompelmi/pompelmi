import * as tar from 'tar-stream';

export async function scanTar(buf: Uint8Array) {
  const findings: { rule: string; severity: 'suspicious'; msg: string }[] = [];
  await new Promise<void>((resolve, reject) => {
    const extract = tar.extract();
    extract.on('entry', (header: tar.Headers, stream: NodeJS.ReadableStream, next: () => void) => {
      const name = header.name || '';
      const unsafe = /(^|\/)\.\.(\/|$)|^\//.test(name) || name.includes('\\');
      if (unsafe) findings.push({ rule: 'tar.traversal', severity: 'suspicious', msg: name });
      if (header.type === 'symlink' && typeof header.linkname === 'string') {
        const t = header.linkname;
        if (/^\//.test(t) || /(^|\/)\.\.(\/|$)/.test(t)) {
          findings.push({ rule: 'tar.symlink', severity: 'suspicious', msg: t });
        }
      }
      stream.on('end', next);
      stream.resume();
    });
    extract.on('finish', resolve);
    extract.on('error', reject);
    extract.end(buf);
  });
  return findings;
}
