import type { ScanOptions } from 'pompelmi';

export interface UploadHandlerArgs {
  name: string;
  filename: string | undefined;
  contentType: string;
  data: AsyncIterable<Uint8Array>;
}

export type RemixUploadHandler = (args: UploadHandlerArgs) => Promise<File | string | undefined>;

export interface PompelmiRemixOptions extends ScanOptions {
  /**
   * Only scan this form field name; other file fields are passed straight to `inner`.
   * When omitted, all file fields are scanned.
   */
  field?: string;
  /**
   * Inner UploadHandler to call for clean files (e.g. unstable_createMemoryUploadHandler).
   * When omitted, clean files are returned as Web API `File` objects.
   */
  inner?: RemixUploadHandler;
  /**
   * Called with `{ name, filename }` when a malicious file is detected.
   * Must throw a Response (or return one that will be thrown by the caller).
   * If omitted, throws an HTTP 422 Response automatically.
   */
  onInfected?: (args: { name: string; filename: string }) => never | Promise<never>;
}

/**
 * Creates a Remix-compatible UploadHandler that scans each uploaded file with
 * pompelmi before forwarding it to an optional inner handler.
 *
 * @example
 * import { unstable_parseMultipartFormData } from '@remix-run/node'
 * import { pompelmiUploadHandler } from '@pompelmi/remix'
 *
 * export async function action({ request }: ActionFunctionArgs) {
 *   const formData = await unstable_parseMultipartFormData(
 *     request,
 *     pompelmiUploadHandler({ host: 'localhost', port: 3310 })
 *   )
 *   const file = formData.get('file') as File
 *   return json({ name: file.name, size: file.size })
 * }
 */
export function pompelmiUploadHandler(options?: PompelmiRemixOptions): RemixUploadHandler;

export { Verdict } from 'pompelmi';
