/**
 * Magic bytes signature for file type detection
 */
export interface MagicBytesSignature {
  /** Human-readable name of the file format */
  name: string;
  
  /** MIME type of the file format */
  mimeType: string;
  
  /** File extensions commonly associated with this format */
  extensions: string[];
  
  /** Magic bytes pattern to match (can be hex string or Buffer) */
  pattern: Buffer | string;
  
  /** Offset from start of file where pattern should match (default: 0) */
  offset?: number;
  
  /** Whether this format is considered suspicious by default */
  suspicious?: boolean;
  
  /** Custom detection function for complex patterns */
  detect?: (buffer: Buffer) => boolean;
}

/**
 * Result of magic bytes detection
 */
export interface MagicBytesResult {
  /** Whether a known format was detected */
  detected: boolean;
  
  /** Name of the detected format */
  format?: string;
  
  /** MIME type of the detected format */
  mimeType?: string;
  
  /** File extension of the detected format */
  extension?: string;
  
  /** Whether the format is considered suspicious */
  suspicious?: boolean;
  
  /** All matching signatures (for polyglot detection) */
  matches?: MagicBytesSignature[];
}

/**
 * Polyglot detection result
 */
export interface PolyglotResult {
  /** Whether multiple file formats were detected */
  isPolyglot: boolean;
  
  /** All detected formats */
  formats: string[];
  
  /** MIME types of all detected formats */
  mimeTypes: string[];
  
  /** Whether any of the formats are suspicious */
  suspicious: boolean;
  
  /** Detailed information about the polyglot */
  reason?: string;
}
