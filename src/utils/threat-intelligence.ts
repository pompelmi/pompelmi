/**
 * Threat intelligence integration and enhanced detection
 * @module utils/threat-intelligence
 */

import { createHash } from 'crypto';
import type { ScanReport, Match } from '../types';

export interface ThreatIntelligenceSource {
  /** Source name */
  name: string;
  /** Check if hash is known malicious */
  checkHash: (hash: string) => Promise<ThreatInfo | null>;
}

export interface ThreatInfo {
  /** Threat level (0-100) */
  threatLevel: number;
  /** Threat category */
  category: string;
  /** Source of the intelligence */
  source: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Detection timestamp */
  detectedAt?: Date;
}

export interface EnhancedScanReport {
  /** Threat intelligence findings */
  threatIntel?: ThreatInfo[];
  /** File hash (SHA-256) */
  fileHash?: string;
  /** Risk score (0-100) */
  riskScore?: number;
  /** Include all properties from ScanReport */
  verdict: import('../types').Verdict;
  matches: import('../types').YaraMatch[];
  reasons?: string[];
  file?: import('../types').FileInfo;
  durationMs?: number;
  error?: string;
  ok: boolean;
  truncated?: boolean;
  timedOut?: boolean;
  engine?: string;
}

/**
 * Built-in threat intelligence - known malware hashes
 * In production, this would connect to real threat intel APIs
 */
export class LocalThreatIntelligence implements ThreatIntelligenceSource {
  name = 'Local Database';
  private knownThreats: Map<string, ThreatInfo> = new Map();

  constructor() {
    // Initialize with some example known threats (in production, load from database)
    this.initializeKnownThreats();
  }

  private initializeKnownThreats(): void {
    // Example: EICAR test file hash
    this.knownThreats.set(
      '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
      {
        threatLevel: 100,
        category: 'test-malware',
        source: 'local',
        metadata: { name: 'EICAR Test File' },
      }
    );
  }

  async checkHash(hash: string): Promise<ThreatInfo | null> {
    return this.knownThreats.get(hash.toLowerCase()) || null;
  }

  /**
   * Add a known threat to the local database
   */
  addThreat(hash: string, info: ThreatInfo): void {
    this.knownThreats.set(hash.toLowerCase(), info);
  }

  /**
   * Remove a threat from the local database
   */
  removeThreat(hash: string): boolean {
    return this.knownThreats.delete(hash.toLowerCase());
  }

  /**
   * Get all known threats
   */
  getAllThreats(): Map<string, ThreatInfo> {
    return new Map(this.knownThreats);
  }
}

/**
 * Threat intelligence aggregator
 */
export class ThreatIntelligenceAggregator {
  private sources: ThreatIntelligenceSource[] = [];

  constructor(sources?: ThreatIntelligenceSource[]) {
    if (sources) {
      this.sources = sources;
    } else {
      // Default to local intelligence
      this.sources = [new LocalThreatIntelligence()];
    }
  }

  /**
   * Add a threat intelligence source
   */
  addSource(source: ThreatIntelligenceSource): void {
    this.sources.push(source);
  }

  /**
   * Check file hash against all sources
   */
  async checkHash(hash: string): Promise<ThreatInfo[]> {
    const results = await Promise.allSettled(
      this.sources.map(source => source.checkHash(hash))
    );

    const threats: ThreatInfo[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        threats.push(result.value);
      }
    }

    return threats;
  }

  /**
   * Enhance scan report with threat intelligence
   */
  async enhanceScanReport(
    content: Uint8Array,
    report: ScanReport
  ): Promise<EnhancedScanReport> {
    // Calculate file hash
    const hash = createHash('sha256').update(content).digest('hex');

    // Check threat intelligence
    const threatIntel = await this.checkHash(hash);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(report, threatIntel);

    return {
      ...report,
      fileHash: hash,
      threatIntel: threatIntel.length > 0 ? threatIntel : undefined,
      riskScore,
    };
  }

  /**
   * Calculate overall risk score based on scan results and threat intel
   */
  private calculateRiskScore(report: ScanReport, threats: ThreatInfo[]): number {
    let score = 0;

    // Base score from verdict
    switch (report.verdict) {
      case 'malicious':
        score += 70;
        break;
      case 'suspicious':
        score += 40;
        break;
      case 'clean':
        score += 0;
        break;
    }

    // Add points for number of matches
    score += Math.min(report.matches.length * 5, 20);

    // Add points from threat intelligence
    if (threats.length > 0) {
      const maxThreat = Math.max(...threats.map(t => t.threatLevel));
      score = Math.max(score, maxThreat);
    }

    return Math.min(score, 100);
  }
}

/**
 * Create default threat intelligence aggregator
 */
export function createThreatIntelligence(): ThreatIntelligenceAggregator {
  return new ThreatIntelligenceAggregator();
}

/**
 * Helper to get file hash
 */
export function getFileHash(content: Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}
