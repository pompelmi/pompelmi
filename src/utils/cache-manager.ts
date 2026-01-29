/**
 * Cache management system for scan results
 * @module utils/cache-manager
 */

import { createHash } from 'crypto';
import type { ScanReport } from '../types';

export interface CacheEntry {
  /** Scan report */
  report: ScanReport;
  /** Timestamp when cached */
  timestamp: number;
  /** Number of times this entry was accessed */
  accessCount: number;
}

export interface CacheOptions {
  /** Maximum cache size in number of entries (default: 1000) */
  maxSize?: number;
  /** Time-to-live in milliseconds (default: 3600000 = 1 hour) */
  ttl?: number;
  /** Enable LRU eviction (default: true) */
  enableLRU?: boolean;
  /** Enable cache statistics (default: false) */
  enableStats?: boolean;
}

export interface CacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Current cache size */
  size: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Total evictions */
  evictions: number;
}

/**
 * LRU cache for scan results with TTL support
 */
export class ScanCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly enableLRU: boolean;
  private readonly enableStats: boolean;
  
  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.ttl = options.ttl ?? 3600000; // 1 hour default
    this.enableLRU = options.enableLRU ?? true;
    this.enableStats = options.enableStats ?? false;
  }

  /**
   * Generate cache key from file content
   */
  private generateKey(content: Uint8Array, preset?: string): string {
    const hash = createHash('sha256')
      .update(content)
      .update(preset || 'default')
      .digest('hex');
    return hash;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.ttl;
  }

  /**
   * Evict oldest or least-used entry when cache is full
   */
  private evict(): void {
    if (this.cache.size === 0) return;

    let targetKey: string | null = null;
    let oldestTime = Infinity;
    let lowestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (this.enableLRU) {
        // LRU: evict least recently used
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          targetKey = key;
        }
      } else {
        // LFU: evict least frequently used
        if (entry.accessCount < lowestAccess) {
          lowestAccess = entry.accessCount;
          targetKey = key;
        }
      }
    }

    if (targetKey) {
      this.cache.delete(targetKey);
      if (this.enableStats) this.stats.evictions++;
    }
  }

  /**
   * Store scan result in cache
   */
  set(content: Uint8Array, report: ScanReport, preset?: string): void {
    const key = this.generateKey(content, preset);

    // Evict if necessary
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      report,
      timestamp: Date.now(),
      accessCount: 0,
    });
  }

  /**
   * Retrieve scan result from cache
   */
  get(content: Uint8Array, preset?: string): ScanReport | null {
    const key = this.generateKey(content, preset);
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.enableStats) this.stats.misses++;
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      if (this.enableStats) this.stats.misses++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.timestamp = Date.now(); // Update for LRU

    if (this.enableStats) this.stats.hits++;
    return entry.report;
  }

  /**
   * Check if result exists in cache
   */
  has(content: Uint8Array, preset?: string): boolean {
    const key = this.generateKey(content, preset);
    const entry = this.cache.get(key);
    return entry !== undefined && this.isValid(entry);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    if (this.enableStats) {
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.evictions = 0;
    }
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate,
      evictions: this.stats.evictions,
    };
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

// Export singleton instance for convenience
let defaultCache: ScanCacheManager | null = null;

/**
 * Get or create the default cache instance
 */
export function getDefaultCache(options?: CacheOptions): ScanCacheManager {
  if (!defaultCache) {
    defaultCache = new ScanCacheManager(options);
  }
  return defaultCache;
}

/**
 * Reset the default cache instance
 */
export function resetDefaultCache(): void {
  defaultCache = null;
}
