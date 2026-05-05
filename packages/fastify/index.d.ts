import { FastifyPluginCallback } from 'fastify';
import { ScanOptions, VerdictValue } from 'pompelmi';
import { Readable } from 'stream';

export interface PompelmiPreHandlerOptions {
  /** Multer/Busboy field name to look for the uploaded file (default: 'file') */
  field?: string;
  /** Custom handler called instead of the default 400 response on malicious files */
  onMalicious?: (request: any, reply: any) => void | Promise<void>;
}

export interface PompelmiDecorator {
  Verdict: { readonly Clean: unique symbol; readonly Malicious: unique symbol; readonly ScanError: unique symbol };
  scan(filePath: string): Promise<VerdictValue>;
  scanBuffer(buffer: Buffer): Promise<VerdictValue>;
  scanStream(stream: Readable): Promise<VerdictValue>;
  preHandler(opts?: PompelmiPreHandlerOptions): (request: any, reply: any) => Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    pompelmi: PompelmiDecorator;
  }
}

declare const pompelmiPlugin: FastifyPluginCallback<ScanOptions>;
export = pompelmiPlugin;
