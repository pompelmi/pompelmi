/**
 * Hybrid Taint Analysis Integration
 * 
 * Complete integration package for dynamic taint tracking and hybrid orchestration
 * with existing Pompelmi decompilation engines and HIPAA compliance.
 */

import { DynamicTaintEngine } from './dynamic-taint';
import { HybridAnalysisOrchestrator } from './hybrid-orchestrator';
import { TaintPolicyManager } from './taint-policies';

import type {
  TaintConfig,
  TaintAnalysisResult,
  HybridConfig,
  HybridAnalysisResult,
  AnalysisEngine,
  EngineCapability
} from '../types/taint-tracking';

import type { TaintPolicy } from './taint-policies';

import type {
  DecompilationScanner,
  DecompilationResult
} from '../types/decompilation';

/**
 * Enhanced analysis result combining all engines
 */
export interface EnhancedAnalysisResult {
  /** Analysis session ID */
  sessionId: string;
  
  /** Overall success status */
  success: boolean;
  
  /** Total analysis time */
  totalTime: number;
  
  /** Static analysis results */
  static?: {
    binaryNinja?: DecompilationResult;
    ghidra?: DecompilationResult;
  };
  
  /** Dynamic taint analysis results */
  taint?: TaintAnalysisResult;
  
  /** Hybrid orchestration results */
  hybrid?: HybridAnalysisResult;
  
  /** Policy used for analysis */
  policy?: TaintPolicy;
  
  /** Security assessment */
  security: {
    riskScore: number; // 0-100
    vulnerabilities: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      confidence: number;
      description: string;
      evidence: any;
      mitigations: string[];
    }>;
    recommendations: string[];
  };
  
  /** Compliance assessment */
  compliance?: {
    hipaaCompliant: boolean;
    issues: Array<{
      type: string;
      severity: 'info' | 'warning' | 'critical';
      description: string;
      remediation: string;
    }>;
    auditTrail: any[];
  };
  
  /** Performance metrics */
  performance: {
    enginesUsed: AnalysisEngine[];
    totalInstructions: number;
    memoryPeak: number;
    cpuTime: number;
  };
}

/**
 * Main integration class for hybrid taint analysis
 */
export class HybridTaintAnalyzer {
  private orchestrator: HybridAnalysisOrchestrator;
  private policyManager: TaintPolicyManager;
  private taintEngine: DynamicTaintEngine;
  private registeredEngines: Map<AnalysisEngine, any> = new Map();

  constructor() {
    this.orchestrator = new HybridAnalysisOrchestrator();
    this.policyManager = new TaintPolicyManager();
    this.taintEngine = new DynamicTaintEngine();
  }

  /**
   * Initialize the analyzer with registered engines
   */
  async initialize(engines: {
    binaryNinja?: DecompilationScanner;
    ghidra?: DecompilationScanner;
  }): Promise<void> {
    // Register engines with orchestrator
    if (engines.binaryNinja) {
      await this.registerEngine('binaryninja-hlil', engines.binaryNinja);
      this.registeredEngines.set('binaryninja-hlil', engines.binaryNinja);
    }

    if (engines.ghidra) {
      await this.registerEngine('ghidra-pcode', engines.ghidra);
      this.registeredEngines.set('ghidra-pcode', engines.ghidra);
    }

    // Register taint engine
    await this.registerEngine('dynamic-taint', this.taintEngine);
    this.registeredEngines.set('dynamic-taint', this.taintEngine);

    console.debug('[HYBRID-TAINT-ANALYZER] Initialized with engines:', {
      engines: Array.from(this.registeredEngines.keys())
    });
  }

  /**
   * Perform comprehensive analysis using specified policy
   */
  async analyze(
    data: Uint8Array,
    policyName: string = 'malware-analysis',
    options?: {
      enabledEngines?: AnalysisEngine[];
      customConfig?: Partial<HybridConfig>;
      includeCompliance?: boolean;
    }
  ): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();
    const sessionId = this.generateSessionId();

    console.debug('[HYBRID-TAINT-ANALYZER] Starting comprehensive analysis', {
      sessionId,
      policyName,
      dataSize: data.length,
      options
    });

    try {
      // Get analysis policy
      const policy = this.policyManager.getPolicy(policyName);
      if (!policy) {
        throw new Error(`Policy '${policyName}' not found`);
      }

      // Create hybrid configuration
      const hybridConfig = this.createHybridConfig(policy, options);
      await this.orchestrator.configure(hybridConfig);

      // Execute hybrid analysis
      const hybridResult = await this.orchestrator.analyze(data);

      // Process results and generate enhanced analysis
      const enhancedResult = await this.processResults(
        sessionId,
        startTime,
        hybridResult,
        policy,
        options?.includeCompliance || false
      );

      console.debug('[HYBRID-TAINT-ANALYZER] Analysis completed', {
        sessionId,
        totalTime: enhancedResult.totalTime,
        riskScore: enhancedResult.security.riskScore,
        vulnerabilities: enhancedResult.security.vulnerabilities.length
      });

      return enhancedResult;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      console.error('[HYBRID-TAINT-ANALYZER] Analysis failed', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        totalTime
      });

      return this.createFailureResult(sessionId, totalTime, error);
    }
  }

  /**
   * Get available analysis policies
   */
  getAvailablePolicies(): TaintPolicy[] {
    return this.policyManager.getAllPolicies();
  }

  /**
   * Get policies by use case
   */
  getPoliciesByUseCase(useCase: 'malware' | 'vulnerability' | 'compliance' | 'forensics' | 'general'): TaintPolicy[] {
    return this.policyManager.getPoliciesByUseCase(useCase);
  }

  /**
   * Register a custom analysis policy
   */
  registerPolicy(policy: TaintPolicy): void {
    this.policyManager.registerPolicy(policy);
  }

  /**
   * Perform quick taint analysis without full orchestration
   */
  async quickTaintAnalysis(
    data: Uint8Array,
    config?: Partial<TaintConfig>
  ): Promise<TaintAnalysisResult> {
    if (config) {
      await this.taintEngine.configureTaint({
        ...this.getDefaultTaintConfig(),
        ...config
      });
    }

    return this.taintEngine.performTaintAnalysis(data);
  }

  /**
   * Check if data contains taint at specific location
   */
  async checkTaint(address: string): Promise<boolean> {
    return this.taintEngine.isTainted(address);
  }

  /**
   * Add custom taint source for analysis
   */
  async addTaintSource(
    address: string,
    source: string,
    metadata?: any
  ): Promise<void> {
    await this.taintEngine.addTaintSource(
      address,
      source as any,
      { metadata }
    );
  }

  // Private methods

  private async registerEngine(
    engine: AnalysisEngine,
    instance: any
  ): Promise<void> {
    const capabilities = this.createEngineCapabilities(engine);
    await this.orchestrator.registerEngine(engine, instance, capabilities);
  }

  private createEngineCapabilities(engine: AnalysisEngine): EngineCapability {
    const baseCapabilities = {
      engine,
      supportedFormats: ['PE', 'ELF', 'Mach-O', 'raw'],
      supportedArchitectures: ['x86', 'x64', 'ARM', 'ARM64'],
      requirements: {
        minMemoryMB: 512,
        maxTimeoutMS: 300000
      }
    };

    switch (engine) {
      case 'binaryninja-hlil':
        return {
          ...baseCapabilities,
          capabilities: [
            'decompilation',
            'disassembly',
            'control_flow',
            'data_flow',
            'api_analysis'
          ],
          performance: {
            speed: 'medium',
            accuracy: 'high',
            memoryUsage: 'medium'
          }
        };

      case 'ghidra-pcode':
        return {
          ...baseCapabilities,
          capabilities: [
            'decompilation',
            'disassembly',
            'control_flow',
            'data_flow',
            'obfuscation_analysis'
          ],
          performance: {
            speed: 'slow',
            accuracy: 'high',
            memoryUsage: 'high'
          }
        };

      case 'dynamic-taint':
        return {
          ...baseCapabilities,
          capabilities: [
            'taint_tracking',
            'data_flow',
            'vulnerability_detection'
          ],
          performance: {
            speed: 'medium',
            accuracy: 'high',
            memoryUsage: 'medium'
          }
        };

      default:
        return {
          ...baseCapabilities,
          capabilities: [],
          performance: {
            speed: 'medium',
            accuracy: 'medium',
            memoryUsage: 'medium'
          }
        };
    }
  }

  private createHybridConfig(
    policy: TaintPolicy,
    options?: {
      enabledEngines?: AnalysisEngine[];
      customConfig?: Partial<HybridConfig>;
    }
  ): HybridConfig {
    const baseConfig = this.policyManager.createHybridConfig(policy.name);
    
    // Apply engine filtering if specified
    if (options?.enabledEngines) {
      for (const engine of Object.keys(baseConfig.engines) as AnalysisEngine[]) {
        if (baseConfig.engines[engine]) {
          baseConfig.engines[engine]!.enabled = options.enabledEngines.includes(engine);
        }
      }
    }

    // Apply custom configuration overrides
    if (options?.customConfig) {
      return this.mergeConfigs(baseConfig, options.customConfig);
    }

    return baseConfig;
  }

  private mergeConfigs(base: HybridConfig, override: Partial<HybridConfig>): HybridConfig {
    return {
      ...base,
      ...override,
      engines: { ...base.engines, ...override.engines },
      global: { ...base.global, ...override.global },
      aggregation: { ...base.aggregation, ...override.aggregation }
    };
  }

  private async processResults(
    sessionId: string,
    startTime: number,
    hybridResult: HybridAnalysisResult,
    policy: TaintPolicy,
    includeCompliance: boolean
  ): Promise<EnhancedAnalysisResult> {
    const totalTime = Date.now() - startTime;

    // Extract static analysis results
    const staticResults = this.extractStaticResults(hybridResult);
    
    // Extract taint analysis results
    const taintResults = hybridResult.findings.taint;

    // Calculate security assessment
    const security = this.calculateSecurityAssessment(hybridResult, taintResults);

    // Calculate compliance assessment if requested
    const compliance = includeCompliance ? 
      this.calculateComplianceAssessment(hybridResult, taintResults) : undefined;

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(hybridResult);

    return {
      sessionId,
      success: hybridResult.success,
      totalTime,
      static: staticResults,
      taint: taintResults,
      hybrid: hybridResult,
      policy,
      security,
      compliance,
      performance
    };
  }

  private extractStaticResults(hybridResult: HybridAnalysisResult): {
    binaryNinja?: DecompilationResult;
    ghidra?: DecompilationResult;
  } {
    const results: { binaryNinja?: DecompilationResult; ghidra?: DecompilationResult } = {};

    const binjaResults = hybridResult.engineResults['binaryninja-hlil'];
    if (binjaResults && binjaResults.length > 0) {
      const successResult = binjaResults.find(r => r.status === 'success');
      if (successResult) {
        results.binaryNinja = successResult.result as DecompilationResult;
      }
    }

    const ghidraResults = hybridResult.engineResults['ghidra-pcode'];
    if (ghidraResults && ghidraResults.length > 0) {
      const successResult = ghidraResults.find(r => r.status === 'success');
      if (successResult) {
        results.ghidra = successResult.result as DecompilationResult;
      }
    }

    return results;
  }

  private calculateSecurityAssessment(
    hybridResult: HybridAnalysisResult,
    taintResults?: TaintAnalysisResult
  ): EnhancedAnalysisResult['security'] {
    const vulnerabilities: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      confidence: number;
      description: string;
      evidence: any;
      mitigations: string[];
    }> = [];

    let riskScore = 0;

    // Process taint flows as vulnerabilities
    if (taintResults?.flows) {
      for (const flow of taintResults.flows) {
        if (flow.isVulnerability) {
          vulnerabilities.push({
            type: `taint_${flow.sink.type}`,
            severity: flow.severity,
            confidence: flow.confidence,
            description: flow.metadata?.description || `Tainted data reaches ${flow.sink.type}`,
            evidence: flow,
            mitigations: flow.metadata?.mitigations || []
          });

          // Add to risk score
          const severityWeight = {
            'low': 10,
            'medium': 25,
            'high': 50,
            'critical': 75
          }[flow.severity];
          
          riskScore += severityWeight * flow.confidence;
        }
      }
    }

    // Process static analysis matches
    if (hybridResult.findings.static?.matches) {
      for (const match of hybridResult.findings.static.matches) {
        const severity = match.severity || 'medium';
        vulnerabilities.push({
          type: `static_${match.rule}`,
          severity,
          confidence: match.confidence || 0.5,
          description: `Static analysis detected: ${match.rule}`,
          evidence: match,
          mitigations: ['Review and validate finding', 'Apply appropriate security controls']
        });

        // Add to risk score
        const severityWeight: Record<string, number> = {
          'low': 5,
          'medium': 15,
          'high': 30,
          'critical': 50
        };
        
        riskScore += (severityWeight[severity] || 10) * (match.confidence || 0.5);
      }
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    // Generate recommendations
    const recommendations = this.generateSecurityRecommendations(vulnerabilities, riskScore);

    return {
      riskScore,
      vulnerabilities,
      recommendations
    };
  }

  private calculateComplianceAssessment(
    hybridResult: HybridAnalysisResult,
    taintResults?: TaintAnalysisResult
  ): EnhancedAnalysisResult['compliance'] {
    const issues: Array<{
      type: string;
      severity: 'info' | 'warning' | 'critical';
      description: string;
      remediation: string;
    }> = [];

    let hipaaCompliant = true;

    // Check for PHI exposure risks
    if (taintResults?.flows) {
      for (const flow of taintResults.flows) {
        if (flow.sink.type === 'log_output' || flow.sink.type === 'network_send') {
          hipaaCompliant = false;
          issues.push({
            type: 'phi_exposure_risk',
            severity: 'critical',
            description: `Potential PHI exposure through ${flow.sink.type}`,
            remediation: 'Implement data sanitization and encryption controls'
          });
        }
      }
    }

    // Generate audit trail
    const auditTrail = this.generateAuditTrail(hybridResult);

    return {
      hipaaCompliant,
      issues,
      auditTrail
    };
  }

  private calculatePerformanceMetrics(
    hybridResult: HybridAnalysisResult
  ): EnhancedAnalysisResult['performance'] {
    return {
      enginesUsed: hybridResult.statistics.enginesUsed,
      totalInstructions: hybridResult.findings.taint?.instructionsAnalyzed || 0,
      memoryPeak: hybridResult.statistics.memoryPeak,
      cpuTime: hybridResult.statistics.averageTaskTime * hybridResult.statistics.tasksExecuted
    };
  }

  private generateSecurityRecommendations(
    vulnerabilities: Array<any>,
    riskScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore > 80) {
      recommendations.push('CRITICAL: Immediate security review required');
      recommendations.push('Consider quarantining or blocking this binary');
    } else if (riskScore > 50) {
      recommendations.push('HIGH: Comprehensive security assessment recommended');
      recommendations.push('Implement additional monitoring controls');
    } else if (riskScore > 25) {
      recommendations.push('MEDIUM: Standard security review recommended');
    }

    if (vulnerabilities.some(v => v.type.includes('taint_exec'))) {
      recommendations.push('Code injection vulnerabilities detected - review input validation');
    }

    if (vulnerabilities.some(v => v.type.includes('network'))) {
      recommendations.push('Network-related risks identified - review network controls');
    }

    return recommendations;
  }

  private generateAuditTrail(hybridResult: HybridAnalysisResult): any[] {
    // In a real implementation, this would compile comprehensive audit information
    return [
      {
        timestamp: Date.now(),
        event: 'hybrid_analysis_completed',
        details: {
          sessionId: hybridResult.sessionId,
          engines: hybridResult.statistics.enginesUsed,
          duration: hybridResult.totalTime
        }
      }
    ];
  }

  private getDefaultTaintConfig(): TaintConfig {
    return {
      maxInstructions: 100000,
      timeout: 60000,
      confidenceThreshold: 0.5,
      enabledSources: ['user_input', 'file_read'],
      enabledSinks: ['exec_function', 'file_write'],
      trackImplicitFlows: false,
      pathSensitive: false,
      maxCallDepth: 5,
      hipaaCompliance: {
        enabled: true,
        sanitizeAddresses: true,
        auditLevel: 'standard'
      }
    };
  }

  private generateSessionId(): string {
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 16; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private createFailureResult(
    sessionId: string,
    totalTime: number,
    error: unknown
  ): EnhancedAnalysisResult {
    return {
      sessionId,
      success: false,
      totalTime,
      security: {
        riskScore: 0,
        vulnerabilities: [],
        recommendations: ['Analysis failed - manual review required']
      },
      performance: {
        enginesUsed: [],
        totalInstructions: 0,
        memoryPeak: 0,
        cpuTime: totalTime
      }
    };
  }
}

// Export convenience function for quick analysis
export async function analyzeWithTaint(
  data: Uint8Array,
  engines: {
    binaryNinja?: DecompilationScanner;
    ghidra?: DecompilationScanner;
  },
  policy: string = 'malware-analysis'
): Promise<EnhancedAnalysisResult> {
  const analyzer = new HybridTaintAnalyzer();
  await analyzer.initialize(engines);
  return analyzer.analyze(data, policy);
}