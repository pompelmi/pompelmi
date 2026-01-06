import { describe, it, expect } from 'vitest';
import { createZipTraversalGuard } from '../src/scanners/zipTraversalGuard';

async function* entries(list:{nameCEN:string,nameLFH:string,isSymlink?:boolean,linkTarget?:string}[]) { for (const e of list) yield e; }

describe('zipTraversalGuard', () => {
  it('flags dot-dot and abs paths and LFH≠CEN', async () => {
    const guard = createZipTraversalGuard();
    const res = await guard.scan(entries([
      { nameCEN:'good/file.txt', nameLFH:'good/file.txt' },
      { nameCEN:'../../etc/passwd', nameLFH:'../../etc/passwd' },
      { nameCEN:'/root/secret', nameLFH:'/root/secret' },
      { nameCEN:'ok/a.txt', nameLFH:'ok\\a.txt' },
      { nameCEN:'mismatch.txt', nameLFH:'other.txt' },
      { nameCEN:'link', nameLFH:'link', isSymlink:true, linkTarget:'../escape' },
    ]));
    expect(res.length).toBeGreaterThanOrEqual(4);
  });
});
