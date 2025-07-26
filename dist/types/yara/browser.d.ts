import type { YaraEngine } from './index';
/**
 * Engine YARA lato browser — NO WASM.
 * È un no-op sicuro: non produce match e non richiede dipendenze native.
 * Se vuoi YARA in browser senza WASM, userai un adapter remoto (vedi step successivo).
 */
export declare function createBrowserEngine(): Promise<YaraEngine>;
