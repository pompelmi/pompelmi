import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import pompelmiFastifyPlugin, { createUploadGuard } from '../src';

function createMultipartRequest(file: { fieldname: string; filename: string; mimetype: string; content: string }) {
  const boundary = '----pompelmi-test-boundary';
  const body = Buffer.from(
    `--${boundary}\r\n`
      + `Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\n`
      + `Content-Type: ${file.mimetype}\r\n\r\n`
      + `${file.content}\r\n`
      + `--${boundary}--\r\n`,
    'utf8',
  );

  return {
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    body,
  };
}

describe('fastify upload guard', () => {
  it('scans multipart uploads and keeps existing behavior', async () => {
    const app = Fastify();
    await app.register(multipart);

    const scanner = vi.fn(async (_bytes: Uint8Array, meta: any) => ({
      severity: 'clean' as const,
      tags: [`scanned:${meta.originalname}`],
    }));

    app.post('/upload', { preHandler: createUploadGuard({ scanner }) }, async (req) => {
      return { scan: (req as any).pompelmi };
    });

    const { headers, body } = createMultipartRequest({
      fieldname: 'file',
      filename: 'hello.txt',
      mimetype: 'text/plain',
      content: 'hello world',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/upload',
      headers,
      payload: body,
    });

    expect(res.statusCode).toBe(200);
    expect(scanner).toHaveBeenCalledTimes(1);
    expect(scanner).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({
        fieldname: 'file',
        originalname: 'hello.txt',
        mimetype: 'text/plain',
      }),
    );

    const json = res.json();
    expect(json.scan.verdict).toBe('clean');
    expect(json.scan.files).toEqual(['hello.txt']);
    expect(json.scan.results[0].tags).toEqual(['scanned:hello.txt']);

    await app.close();
  });

  it('does not wrap scanner calls in Promise.resolve', () => {
    const src = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
    expect(src).toContain('await scan(buf, meta)');
    expect(src).not.toContain('Promise.resolve(scan(buf, meta))');
  });

  it('exposes fastify-plugin metadata with multipart dependency', () => {
    const meta = (pompelmiFastifyPlugin as any)[Symbol.for('plugin-meta')];

    expect(meta).toMatchObject({
      name: '@pompelmi/fastify-plugin',
      fastify: '5.x',
    });
    expect(meta.dependencies).toEqual(expect.arrayContaining(['@fastify/multipart']));
  });

  it('requires @fastify/multipart when registered as a plugin', async () => {
    const app = Fastify();
    app.register(pompelmiFastifyPlugin);

    await expect(app.ready()).rejects.toThrow(/@fastify\/multipart/);
    await app.close().catch(() => {});
  });

  it('registers successfully when @fastify/multipart is present', async () => {
    const app = Fastify();
    await app.register(multipart);
    await app.register(pompelmiFastifyPlugin);
    await app.ready();

    expect(typeof (app as any).createUploadGuard).toBe('function');

    await app.close();
  });
});
