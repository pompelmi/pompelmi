/**
 * Taint Analysis Policy Configuration
 * 
 * Predefined and configurable taint analysis policies for different
 * analysis scenarios including malware analysis, vulnerability assessment,
 * and compliance auditing.
 */

import type {
  TaintConfig,
  TaintSource,
  TaintSink,
  TaintPropagationRule,
  OrchestrationStrategy,
  HybridConfig,
  AnalysisEngine,
  AnalysisPhase
} from '../types/taint-tracking';

/**
 * Policy template for different analysis scenarios
 */
export interface TaintPolicy {
  /** Policy identifier */
  name: string;
  
  /** Policy description */
  description: string;
  
  /** Target use case */
  useCase: 'malware' | 'vulnerability' | 'compliance' | 'forensics' | 'general';
  
  /** Taint tracking configuration */
  taintConfig: TaintConfig;
  
  /** Hybrid orchestration strategy */
  orchestrationStrategy: OrchestrationStrategy;
  
  /** Additional metadata */
  metadata: {
    version: string;
    author: string;
    created: string;
    tags: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Predefined taint policies for common analysis scenarios
 */
export class TaintPolicyManager {
  private policies: Map<string, TaintPolicy> = new Map();
  private customRules: Map<string, TaintPropagationRule[]> = new Map();

  constructor() {
    this.initializePredefinedPolicies();
  }

  /**
   * Get a policy by name
   */
  getPolicy(name: string): TaintPolicy | null {
    return this.policies.get(name) || null;
  }

  /**
   * Get all available policies
   */
  getAllPolicies(): TaintPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policies by use case
   */
  getPoliciesByUseCase(useCase: TaintPolicy['useCase']): TaintPolicy[] {
    return Array.from(this.policies.values())
      .filter(policy => policy.useCase === useCase);
  }

  /**
   * Register a custom policy
   */
  registerPolicy(policy: TaintPolicy): void {
    this.policies.set(policy.name, policy);
  }

  /**
   * Create a hybrid configuration from a policy
   */
  createHybridConfig(
    policyName: string,
    engineOverrides?: { [engine in AnalysisEngine]?: { enabled: boolean; config?: any } }
  ): HybridConfig {
    const policy = this.getPolicy(policyName);
    if (!policy) {
      throw new Error(`Policy '${policyName}' not found`);
    }

    const defaultEngines: { [engine in AnalysisEngine]?: { enabled: boolean; config?: any } } = {
      'binaryninja-hlil': { enabled: true, config: { depth: 'basic' } },
      'ghidra-pcode': { enabled: true, config: { depth: 'basic' } },
      'dynamic-taint': { enabled: true, config: policy.taintConfig },
      'static-analysis': { enabled: false },
      'symbolic-execution': { enabled: false },
      'fuzzing': { enabled: false },
      'custom': { enabled: false }
    };

    // Apply engine overrides
    const engines = { ...defaultEngines, ...engineOverrides };

    return {
      strategy: policy.orchestrationStrategy,
      engines,
      global: {
        maxAnalysisTime: 600000, // 10 minutes
        resourceLimits: {
          maxMemoryMB: 2048,
          maxConcurrentEngines: 3,
          maxTotalTasks: 50
        },
        hipaaCompliance: {
          enabled: policy.taintConfig.hipaaCompliance?.enabled || false,
          auditAllTasks: true,
          sanitizeResults: policy.taintConfig.hipaaCompliance?.sanitizeAddresses || true
        }
      },
      aggregation: {
        method: 'weighted',
        confidenceThreshold: policy.taintConfig.confidenceThreshold || 0.3,
        includeIntermediateResults: false
      }
    };
  }

  /**
   * Initialize predefined policies
   */
  private initializePredefinedPolicies(): void {
    // Malware Analysis Policy
    this.policies.set('malware-analysis', {
      name: 'malware-analysis',
      description: 'Comprehensive taint analysis for malware detection and classification',
      useCase: 'malware',
      taintConfig: {
        maxInstructions: 1000000,
        timeout: 300000,
        confidenceThreshold: 0.4,
        enabledSources: [
          'user_input',
          'file_read',
          'network_recv',
          'registry_read',
          'environment',
          'crypto_weak',
          'external_api'
        ],
        enabledSinks: [
          'exec_function',
          'file_write',
          'network_send',
          'registry_write',
          'crypto_key',
          'memory_alloc'
        ],
        customRules: this.getMalwareAnalysisRules(),
        trackImplicitFlows: true,
        pathSensitive: true,
        maxCallDepth: 15,
        hipaaCompliance: {
          enabled: true,
          sanitizeAddresses: true,
          auditLevel: 'comprehensive'
        }
      },
      orchestrationStrategy: this.createMalwareStrategy(),
      metadata: {
        version: '1.0.0',
        author: 'Pompelmi Security Team',
        created: '2025-10-21',
        tags: ['malware', 'security', 'comprehensive'],
        riskLevel: 'high'
      }
    });

    // Vulnerability Assessment Policy
    this.policies.set('vulnerability-assessment', {
      name: 'vulnerability-assessment',
      description: 'Focused taint analysis for vulnerability discovery and assessment',
      useCase: 'vulnerability',
      taintConfig: {
        maxInstructions: 500000,
        timeout: 180000,
        confidenceThreshold: 0.6,
        enabledSources: [
          'user_input',
          'file_read',
          'network_recv',
          'environment'
        ],
        enabledSinks: [
          'exec_function',
          'sql_query',
          'format_string',
          'memory_alloc',
          'file_write'
        ],
        customRules: this.getVulnerabilityAssessmentRules(),
        trackImplicitFlows: false,
        pathSensitive: false,
        maxCallDepth: 8,
        hipaaCompliance: {
          enabled: true,
          sanitizeAddresses: true,
          auditLevel: 'standard'
        }
      },
      orchestrationStrategy: this.createVulnerabilityStrategy(),
      metadata: {
        version: '1.0.0',
        author: 'Pompelmi Security Team',
        created: '2025-10-21',
        tags: ['vulnerability', 'security', 'assessment'],
        riskLevel: 'medium'
      }
    });

    // Compliance Auditing Policy
    this.policies.set('compliance-audit', {
      name: 'compliance-audit',
      description: 'HIPAA-focused taint analysis for compliance auditing in healthcare',
      useCase: 'compliance',
      taintConfig: {
        maxInstructions: 2000000,
        timeout: 600000,
        confidenceThreshold: 0.3,
        enabledSources: [
          'user_input',
          'file_read',
          'network_recv',
          'registry_read',
          'environment',
          'external_api',
          'memory_leak'
        ],
        enabledSinks: [
          'file_write',
          'network_send',
          'log_output',
          'memory_alloc',
          'registry_write'
        ],
        customRules: this.getComplianceAuditRules(),
        trackImplicitFlows: true,
        pathSensitive: true,
        maxCallDepth: 20,
        hipaaCompliance: {
          enabled: true,
          sanitizeAddresses: true,
          auditLevel: 'comprehensive'
        }
      },
      orchestrationStrategy: this.createComplianceStrategy(),
      metadata: {
        version: '1.0.0',
        author: 'Pompelmi Compliance Team',
        created: '2025-10-21',
        tags: ['compliance', 'hipaa', 'audit', 'healthcare'],
        riskLevel: 'critical'
      }
    });

    // Forensics Analysis Policy
    this.policies.set('forensics-analysis', {
      name: 'forensics-analysis',
      description: 'Detailed taint analysis for digital forensics investigations',
      useCase: 'forensics',
      taintConfig: {
        maxInstructions: 5000000,
        timeout: 1800000, // 30 minutes
        confidenceThreshold: 0.2,
        enabledSources: [
          'user_input',
          'file_read',
          'network_recv',
          'registry_read',
          'environment',
          'crypto_weak',
          'external_api',
          'memory_leak',
          'time_source'
        ],
        enabledSinks: [
          'exec_function',
          'file_write',
          'network_send',
          'registry_write',
          'sql_query',
          'format_string',
          'memory_alloc',
          'crypto_key',
          'auth_check',
          'log_output'
        ],
        customRules: this.getForensicsAnalysisRules(),
        trackImplicitFlows: true,
        pathSensitive: true,
        maxCallDepth: 25,
        hipaaCompliance: {
          enabled: true,
          sanitizeAddresses: false, // Preserve addresses for forensics
          auditLevel: 'comprehensive'
        }
      },
      orchestrationStrategy: this.createForensicsStrategy(),
      metadata: {
        version: '1.0.0',
        author: 'Pompelmi Forensics Team',
        created: '2025-10-21',
        tags: ['forensics', 'investigation', 'detailed'],
        riskLevel: 'high'
      }
    });

    // Fast Screening Policy
    this.policies.set('fast-screening', {
      name: 'fast-screening',
      description: 'Quick taint analysis for initial threat screening',
      useCase: 'general',
      taintConfig: {
        maxInstructions: 100000,
        timeout: 30000,
        confidenceThreshold: 0.7,
        enabledSources: [
          'user_input',
          'network_recv'
        ],
        enabledSinks: [
          'exec_function',
          'network_send'
        ],
        customRules: this.getFastScreeningRules(),
        trackImplicitFlows: false,
        pathSensitive: false,
        maxCallDepth: 3,
        hipaaCompliance: {
          enabled: true,
          sanitizeAddresses: true,
          auditLevel: 'minimal'
        }
      },
      orchestrationStrategy: this.createFastScreeningStrategy(),
      metadata: {
        version: '1.0.0',
        author: 'Pompelmi Performance Team',
        created: '2025-10-21',
        tags: ['fast', 'screening', 'performance'],
        riskLevel: 'low'
      }
    });
  }

  /**
   * Create orchestration strategies for different policies
   */
  private createMalwareStrategy(): OrchestrationStrategy {
    return {
      name: 'malware-comprehensive',
      description: 'Comprehensive multi-engine analysis for malware detection',
      phaseOrder: ['preprocessing', 'static', 'dynamic', 'taint', 'correlation', 'postprocessing'],
      engineRules: {
        'static': {
          preferred: ['binaryninja-hlil', 'ghidra-pcode'],
          exclude: []
        },
        'dynamic': {
          preferred: ['dynamic-taint'],
          exclude: []
        },
        'taint': {
          preferred: ['dynamic-taint'],
          exclude: []
        },
        'correlation': {
          preferred: ['binaryninja-hlil', 'ghidra-pcode', 'dynamic-taint'],
          exclude: []
        }
      },
      scheduling: {
        maxConcurrency: 3,
        defaultTimeout: 300000,
        retryPolicy: {
          maxRetries: 2,
          retryDelay: 5000,
          backoffMultiplier: 2.0
        }
      },
      correlation: {
        enabled: true,
        algorithms: ['similarity', 'consensus', 'weighted'],
        engineWeights: {
          'binaryninja-hlil': 1.0,
          'ghidra-pcode': 1.0,
          'dynamic-taint': 1.2
        }
      }
    };
  }

  private createVulnerabilityStrategy(): OrchestrationStrategy {
    return {
      name: 'vulnerability-focused',
      description: 'Focused analysis for vulnerability discovery',
      phaseOrder: ['static', 'taint', 'correlation'],
      engineRules: {
        'static': {
          preferred: ['binaryninja-hlil'],
          exclude: []
        },
        'taint': {
          preferred: ['dynamic-taint'],
          exclude: []
        },
        'correlation': {
          preferred: ['binaryninja-hlil', 'dynamic-taint'],
          exclude: []
        }
      },
      scheduling: {
        maxConcurrency: 2,
        defaultTimeout: 180000,
        retryPolicy: {
          maxRetries: 1,
          retryDelay: 3000,
          backoffMultiplier: 1.5
        }
      },
      correlation: {
        enabled: true,
        algorithms: ['consensus'],
        engineWeights: {
          'binaryninja-hlil': 0.8,
          'dynamic-taint': 1.2
        }
      }
    };
  }

  private createComplianceStrategy(): OrchestrationStrategy {
    return {
      name: 'compliance-audit',
      description: 'Comprehensive audit strategy for compliance verification',
      phaseOrder: ['preprocessing', 'static', 'dynamic', 'taint', 'correlation', 'postprocessing', 'reporting'],
      engineRules: {
        'static': {
          preferred: ['binaryninja-hlil', 'ghidra-pcode'],
          exclude: []
        },
        'dynamic': {
          preferred: ['dynamic-taint'],
          exclude: []
        },
        'taint': {
          preferred: ['dynamic-taint'],
          exclude: []
        },
        'correlation': {
          preferred: ['binaryninja-hlil', 'ghidra-pcode', 'dynamic-taint'],
          exclude: []
        }
      },
      scheduling: {
        maxConcurrency: 4,
        defaultTimeout: 600000,
        retryPolicy: {
          maxRetries: 3,
          retryDelay: 10000,
          backoffMultiplier: 2.0
        }
      },
      correlation: {
        enabled: true,
        algorithms: ['similarity', 'overlap', 'consensus', 'weighted'],
        engineWeights: {
          'binaryninja-hlil': 1.0,
          'ghidra-pcode': 1.0,
          'dynamic-taint': 1.5
        }
      }
    };
  }

  private createForensicsStrategy(): OrchestrationStrategy {
    return {
      name: 'forensics-detailed',
      description: 'Detailed analysis strategy for forensics investigations',
      phaseOrder: ['preprocessing', 'static', 'dynamic', 'taint', 'correlation', 'postprocessing', 'reporting'],
      engineRules: {
        'static': {
          preferred: ['binaryninja-hlil', 'ghidra-pcode'],
          exclude: []
        },
        'dynamic': {
          preferred: ['dynamic-taint'],
          exclude: []
        },
        'taint': {
          preferred: ['dynamic-taint'],
          exclude: []
        },
        'correlation': {
          preferred: ['binaryninja-hlil', 'ghidra-pcode', 'dynamic-taint'],
          exclude: []
        }
      },
      scheduling: {
        maxConcurrency: 2, // Conservative for detailed analysis
        defaultTimeout: 1800000,
        retryPolicy: {
          maxRetries: 3,
          retryDelay: 15000,
          backoffMultiplier: 2.5
        }
      },
      correlation: {
        enabled: true,
        algorithms: ['similarity', 'overlap', 'consensus', 'weighted'],
        engineWeights: {
          'binaryninja-hlil': 1.2,
          'ghidra-pcode': 1.2,
          'dynamic-taint': 1.0
        }
      }
    };
  }

  private createFastScreeningStrategy(): OrchestrationStrategy {
    return {
      name: 'fast-screening',
      description: 'Fast screening strategy for initial threat assessment',
      phaseOrder: ['static', 'taint'],
      engineRules: {
        'static': {
          preferred: ['binaryninja-hlil'],
          exclude: ['ghidra-pcode']
        },
        'taint': {
          preferred: ['dynamic-taint'],
          exclude: []
        }
      },
      scheduling: {
        maxConcurrency: 1, // Sequential for speed
        defaultTimeout: 30000,
        retryPolicy: {
          maxRetries: 0, // No retries for fast screening
          retryDelay: 0,
          backoffMultiplier: 1.0
        }
      },
      correlation: {
        enabled: false, // Skip correlation for speed
        algorithms: [],
        engineWeights: {}
      }
    };
  }

  /**
   * Generate custom taint propagation rules for different use cases
   */
  private getMalwareAnalysisRules(): TaintPropagationRule[] {
    return [
      {
        id: 'malware_crypto_weak',
        name: 'Weak cryptographic function detection',
        pattern: { function: 'MD5|SHA1|DES|RC4' },
        propagation: {
          sources: [0],
          destinations: [0],
          operation: 'encryption',
          sanitizes: false,
          confidenceMultiplier: 0.8
        },
        isSink: true,
        priority: 200
      },
      {
        id: 'malware_persistence',
        name: 'Persistence mechanism detection',
        pattern: { function: 'RegSetValue|WriteFile.*startup|CreateService' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 190
      },
      {
        id: 'malware_network_beacon',
        name: 'Network beaconing detection',
        pattern: { function: 'InternetConnect|HttpSendRequest|send' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 180
      }
    ];
  }

  private getVulnerabilityAssessmentRules(): TaintPropagationRule[] {
    return [
      {
        id: 'vuln_buffer_overflow',
        name: 'Buffer overflow vulnerability',
        pattern: { function: 'strcpy|strcat|sprintf|gets' },
        propagation: {
          sources: [1],
          destinations: [0],
          operation: 'copy'
        },
        isSink: true,
        priority: 200
      },
      {
        id: 'vuln_sql_injection',
        name: 'SQL injection vulnerability',
        pattern: { function: 'mysql_query|sqlite3_exec|ExecuteSQL' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 195
      },
      {
        id: 'vuln_format_string',
        name: 'Format string vulnerability',
        pattern: { function: 'printf|fprintf|sprintf' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 190
      }
    ];
  }

  private getComplianceAuditRules(): TaintPropagationRule[] {
    return [
      {
        id: 'compliance_phi_exposure',
        name: 'PHI exposure through logging',
        pattern: { function: 'WriteFile.*log|fprintf.*log|syslog' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 200
      },
      {
        id: 'compliance_network_transmission',
        name: 'Unencrypted network transmission',
        pattern: { function: 'send|sendto|HttpSendRequest' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 190
      },
      {
        id: 'compliance_temp_file',
        name: 'Temporary file creation',
        pattern: { function: 'GetTempPath|tmpfile|mktemp' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 180
      }
    ];
  }

  private getForensicsAnalysisRules(): TaintPropagationRule[] {
    return [
      {
        id: 'forensics_timestamp_manipulation',
        name: 'Timestamp manipulation detection',
        pattern: { function: 'SetFileTime|SystemTimeToFileTime|touch' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 200
      },
      {
        id: 'forensics_evidence_deletion',
        name: 'Evidence deletion detection',
        pattern: { function: 'DeleteFile|RemoveDirectory|unlink|shred' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 195
      },
      {
        id: 'forensics_registry_manipulation',
        name: 'Registry manipulation detection',
        pattern: { function: 'RegDeleteKey|RegDeleteValue|RegSetValue' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 190
      }
    ];
  }

  private getFastScreeningRules(): TaintPropagationRule[] {
    return [
      {
        id: 'fast_system_call',
        name: 'System call execution',
        pattern: { function: 'system|exec|CreateProcess' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 200
      },
      {
        id: 'fast_network_activity',
        name: 'Network activity detection',
        pattern: { function: 'connect|send|recv|InternetOpen' },
        propagation: {
          sources: [0],
          destinations: [],
          operation: 'copy'
        },
        isSink: true,
        priority: 190
      }
    ];
  }
}