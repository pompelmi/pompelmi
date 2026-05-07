import type { ScanOptions } from 'pompelmi';

export interface PompelmiSvelteKitOptions extends ScanOptions {
  /**
   * Called with `{ filename }` when a malicious file is detected.
   * Must throw (e.g. throw error(422, { message: 'Malware detected' })).
   * If omitted, throws an HTTP 422 Response automatically.
   */
  onInfected?: (args: { filename: string }) => never | Promise<never>;
}

/**
 * Scans an uploaded file with pompelmi inside a SvelteKit server action or
 * API route (+page.server.ts / +server.ts). Throws HTTP 422 on malicious files.
 *
 * @example
 * // +page.server.ts
 * import { scanUpload } from '@pompelmi/sveltekit'
 * import type { Actions } from './$types'
 *
 * export const actions: Actions = {
 *   default: async ({ request }) => {
 *     const formData = await request.formData()
 *     await scanUpload(formData.get('file') as File, { host: 'localhost', port: 3310 })
 *     return { success: true }
 *   }
 * }
 *
 * @example
 * // +server.ts (API route)
 * import { scanUpload } from '@pompelmi/sveltekit'
 * import { json } from '@sveltejs/kit'
 * import type { RequestHandler } from './$types'
 *
 * export const POST: RequestHandler = async ({ request }) => {
 *   const formData = await request.formData()
 *   await scanUpload(formData.get('file') as File, { host: 'localhost', port: 3310 })
 *   return json({ ok: true })
 * }
 */
export function scanUpload(
  file: File | Blob | Buffer | null | undefined,
  options?: PompelmiSvelteKitOptions
): Promise<symbol>;

/**
 * Scans all File/Blob values in a FormData object.
 * Throws HTTP 422 on the first malicious file found.
 *
 * @example
 * const formData = await request.formData()
 * await scanFormData(formData, { host: 'localhost', port: 3310 })
 */
export function scanFormData(
  formData: FormData,
  options?: PompelmiSvelteKitOptions
): Promise<void>;

export { Verdict } from 'pompelmi';
