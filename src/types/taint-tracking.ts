/**
 * Dynamic Taint Tracking Types
 * 
 * Comprehensive type definitions for advanced taint analysis and hybrid orchestration
 * supporting multi-engine malware analysis with data flow tracking capabilities.
 */

// ================================
// Core Taint Tracking Types
// ================================

/**
 * Taint source types indicating where tainted data originates
 */
export type TaintSource = 
  | 'user_input'      // User-controlled input (argv, stdin, network)
  | 'file_read'       // File system reads
  | 'network_recv'    // Network receive operations
  | 'registry_read'   // Windows registry reads
  | 'environment'     // Environment variables
  | 'crypto_weak'     // Weak cryptographic sources
  | 'external_api'    // External API responses
  | 'memory_leak'     // Memory disclosure vulnerabilities
  | 'time_source'     // Time-based information sources
  | 'custom';         // Custom user-defined sources

/**
 * Taint sink types indicating where tainted data should not flow
 */
export type TaintSink = 
  | 'exec_function'   // Code execution functions (system, exec, etc.)
  | 'file_write'      // File system writes
  | 'network_send'    // Network send operations
  | 'registry_write'  // Windows registry writes
  | 'sql_query'       // SQL query construction
  | 'format_string'   // Format string functions
  | 'memory_alloc'    // Memory allocation with size
  | 'crypto_key'      // Cryptographic key material
  | 'auth_check'      // Authentication/authorization checks
  | 'log_output'      // Logging and output functions
  | 'custom';         // Custom user-defined sinks

/**
 * Taint propagation operations that affect taint flow
 */
export type TaintOperation = 
  | 'copy'           // Direct copy (mov, assignment)
  | 'arithmetic'     // Arithmetic operations (+, -, *, /)
  | 'bitwise'        // Bitwise operations (&, |, ^, <<, >>)
  | 'comparison'     // Comparison operations (==, !=, <, >)
  | 'concatenation'  // String/buffer concatenation
  | 'substring'      // String/buffer substring operations
  | 'conversion'     // Type conversions and casts
  | 'encryption'     // Encryption operations (may remove taint)
  | 'hash'           // Hash operations (typically removes taint)
  | 'sanitization'   // Explicit sanitization functions
  | 'validation'     // Input validation functions
  | 'encoding'       // Encoding operations (base64, url, etc.)
  | 'custom';        // Custom user-defined operations

/**
 * Taint label with metadata for tracking
 */
export interface TaintLabel {
  /** Unique identifier for this taint */
  id: string;
  
  /** Source of the taint */
  source: TaintSource;
  
  /** Original location where taint was introduced */
  origin: {
    address: string;
    function?: string;
    instruction?: string;
    timestamp: number;
  };
  
  /** Confidence level of taint tracking (0.0 - 1.0) */
  confidence: number;
  
  /** Optional metadata for custom analysis */
  metadata?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

/**
 * Memory location with taint information
 */
export interface TaintedMemory {
  /** Memory address or symbolic location */
  address: string;
  
  /** Size of tainted region in bytes */
  size: number;
  
  /** Set of taint labels affecting this memory */
  taints: TaintLabel[];
  
  /** Last operation that affected this memory */
  lastOperation: {
    operation: TaintOperation;
    timestamp: number;
    instruction?: string;
  };
}

/**
 * Register state with taint information
 */
export interface TaintedRegister {
  /** Register name (e.g., 'eax', 'rdi', 'r0') */
  name: string;
  
  /** Set of taint labels affecting this register */
  taints: TaintLabel[];
  
  /** Bit-level taint mask for partial register tainting */
  taintMask?: string; // Hexadecimal bitmask
  
  /** Last operation that affected this register */
  lastOperation: {
    operation: TaintOperation;
    timestamp: number;
    instruction?: string;
  };
}

/**
 * Taint propagation rule for specific operations
 */
export interface TaintPropagationRule {
  /** Unique rule identifier */
  id: string;
  
  /** Rule name for debugging */
  name: string;
  
  /** Pattern to match instructions/operations */
  pattern: {
    /** Instruction mnemonic pattern (regex) */
    instruction?: string;
    
    /** Function name pattern (regex) */
    function?: string;
    
    /** API call pattern (regex) */
    api?: string;
  };
  
  /** How taint flows through this operation */
  propagation: {
    /** Source operands (0-based indices) */
    sources: number[];
    
    /** Destination operands (0-based indices) */
    destinations: number[];
    
    /** Operation type affecting taint */
    operation: TaintOperation;
    
    /** Whether operation removes taint */
    sanitizes?: boolean;
    
    /** Confidence adjustment factor */
    confidenceMultiplier?: number;
  };
  
  /** Whether this rule creates a taint sink */
  isSink?: boolean;
  
  /** Priority for rule matching (higher = more priority) */
  priority: number;
}

/**
 * Taint analysis configuration
 */
export interface TaintConfig {
  /** Maximum number of instructions to analyze */
  maxInstructions?: number;
  
  /** Maximum analysis time in milliseconds */
  timeout?: number;
  
  /** Minimum confidence threshold for reporting */
  confidenceThreshold?: number;
  
  /** Sources to track */
  enabledSources: TaintSource[];
  
  /** Sinks to detect */
  enabledSinks: TaintSink[];
  
  /** Custom propagation rules */
  customRules?: TaintPropagationRule[];
  
  /** Whether to track implicit flows (control flow taint) */
  trackImplicitFlows?: boolean;
  
  /** Whether to perform path-sensitive analysis */
  pathSensitive?: boolean;
  
  /** Maximum call depth for interprocedural analysis */
  maxCallDepth?: number;
  
  /** HIPAA compliance settings */
  hipaaCompliance?: {
    enabled: boolean;
    sanitizeAddresses?: boolean;
    auditLevel?: 'minimal' | 'standard' | 'comprehensive';
  };
}

/**
 * Taint flow path representing data flow from source to sink
 */
export interface TaintFlow {
  /** Unique flow identifier */
  id: string;
  
  /** Source where taint originated */
  source: {
    label: TaintLabel;
    location: string;
    instruction?: string;
  };
  
  /** Sink where taint reaches */
  sink: {
    type: TaintSink;
    location: string;
    instruction?: string;
    function?: string;
  };
  
  /** Path through the program */
  path: Array<{
    address: string;
    instruction?: string;
    operation: TaintOperation;
    confidence: number;
    timestamp: number;
  }>;
  
  /** Overall confidence of this flow */
  confidence: number;
  
  /** Severity assessment */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Whether this represents a security vulnerability */
  isVulnerability: boolean;
  
  /** Additional metadata */
  metadata?: {
    cwe?: string; // Common Weakness Enumeration ID
    description?: string;
    mitigations?: string[];
    [key: string]: unknown;
  };
}

/**
 * Taint analysis result
 */
export interface TaintAnalysisResult {
  /** Analysis engine identifier */
  engine: 'dynamic-taint' | 'hybrid-taint';
  
  /** Analysis success status */
  success: boolean;
  
  /** Total analysis time in milliseconds */
  analysisTime: number;
  
  /** Number of instructions analyzed */
  instructionsAnalyzed: number;
  
  /** Detected taint flows */
  flows: TaintFlow[];
  
  /** Current memory taint state */
  memoryState: TaintedMemory[];
  
  /** Current register taint state */
  registerState: TaintedRegister[];
  
  /** Analysis statistics */
  statistics: {
    totalSources: number;
    totalSinks: number;
    vulnerableFlows: number;
    sanitizedFlows: number;
    highConfidenceFlows: number;
    uniqueTaints: number;
  };
  
  /** Any analysis errors or warnings */
  errors?: string[];
  warnings?: string[];
  
  /** Additional metadata */
  meta?: {
    configUsed?: TaintConfig;
    analysisMode?: string;
    [key: string]: unknown;
  };
}

// ================================
// Hybrid Orchestration Types
// ================================

/**
 * Analysis engine types supported by the orchestrator
 */
export type AnalysisEngine = 
  | 'binaryninja-hlil'
  | 'ghidra-pcode'
  | 'dynamic-taint'
  | 'static-analysis'
  | 'symbolic-execution'
  | 'fuzzing'
  | 'custom';

/**
 * Analysis phase in the hybrid orchestration pipeline
 */
export type AnalysisPhase = 
  | 'preprocessing'   // Initial binary preparation
  | 'static'          // Static analysis phase
  | 'dynamic'         // Dynamic analysis phase
  | 'taint'           // Taint tracking phase
  | 'correlation'     // Cross-engine correlation
  | 'postprocessing'  // Final result processing
  | 'reporting';      // Report generation

/**
 * Engine capability descriptor
 */
export interface EngineCapability {
  /** Engine identifier */
  engine: AnalysisEngine;
  
  /** Supported analysis types */
  capabilities: Array<
    | 'decompilation'
    | 'disassembly'
    | 'taint_tracking'
    | 'control_flow'
    | 'data_flow'
    | 'symbolic_execution'
    | 'vulnerability_detection'
    | 'obfuscation_analysis'
    | 'crypto_analysis'
    | 'api_analysis'
  >;
  
  /** Supported file formats */
  supportedFormats: string[];
  
  /** Supported architectures */
  supportedArchitectures: string[];
  
  /** Performance characteristics */
  performance: {
    speed: 'fast' | 'medium' | 'slow';
    accuracy: 'low' | 'medium' | 'high';
    memoryUsage: 'low' | 'medium' | 'high';
  };
  
  /** Resource requirements */
  requirements: {
    minMemoryMB?: number;
    maxTimeoutMS?: number;
    externalDependencies?: string[];
  };
}

/**
 * Analysis task for orchestration
 */
export interface AnalysisTask {
  /** Unique task identifier */
  id: string;
  
  /** Target engine for this task */
  engine: AnalysisEngine;
  
  /** Analysis phase this task belongs to */
  phase: AnalysisPhase;
  
  /** Task priority (higher = more urgent) */
  priority: number;
  
  /** Dependencies on other tasks */
  dependencies: string[];
  
  /** Input data for the task */
  input: {
    /** Binary data to analyze */
    data: Uint8Array;
    
    /** Previous analysis results to build upon */
    previousResults?: any[];
    
    /** Task-specific configuration */
    config?: any;
  };
  
  /** Task metadata */
  metadata: {
    description?: string;
    estimatedDuration?: number;
    maxRetries?: number;
    timeout?: number;
  };
}

/**
 * Task execution result
 */
export interface TaskResult {
  /** Task identifier */
  taskId: string;
  
  /** Engine that executed the task */
  engine: AnalysisEngine;
  
  /** Execution status */
  status: 'success' | 'failed' | 'timeout' | 'cancelled';
  
  /** Result data */
  result?: any;
  
  /** Execution metrics */
  metrics: {
    startTime: number;
    endTime: number;
    memoryUsed?: number;
    cpuTime?: number;
  };
  
  /** Any errors that occurred */
  error?: string;
  
  /** Confidence in the result */
  confidence: number;
}

/**
 * Orchestration strategy for coordinating multiple engines
 */
export interface OrchestrationStrategy {
  /** Strategy name */
  name: string;
  
  /** Strategy description */
  description: string;
  
  /** Phase execution order */
  phaseOrder: AnalysisPhase[];
  
  /** Engine selection rules for each phase */
  engineRules: {
    [phase in AnalysisPhase]?: {
      /** Preferred engines in order */
      preferred: AnalysisEngine[];
      
      /** Engines to avoid */
      exclude?: AnalysisEngine[];
      
      /** Conditional engine selection */
      conditions?: Array<{
        condition: string; // JavaScript expression
        engine: AnalysisEngine;
        priority: number;
      }>;
    };
  };
  
  /** Task scheduling configuration */
  scheduling: {
    /** Maximum concurrent tasks */
    maxConcurrency: number;
    
    /** Task timeout in milliseconds */
    defaultTimeout: number;
    
    /** Retry policy */
    retryPolicy: {
      maxRetries: number;
      retryDelay: number;
      backoffMultiplier: number;
    };
  };
  
  /** Result correlation rules */
  correlation: {
    /** Enable cross-engine result correlation */
    enabled: boolean;
    
    /** Correlation algorithms to use */
    algorithms: Array<'similarity' | 'overlap' | 'consensus' | 'weighted'>;
    
    /** Confidence weighting by engine */
    engineWeights: { [engine in AnalysisEngine]?: number };
  };
}

/**
 * Hybrid orchestration configuration
 */
export interface HybridConfig {
  /** Selected orchestration strategy */
  strategy: OrchestrationStrategy;
  
  /** Available engines and their configurations */
  engines: {
    [engine in AnalysisEngine]?: {
      enabled: boolean;
      config?: any;
      priority?: number;
    };
  };
  
  /** Global analysis settings */
  global: {
    /** Maximum total analysis time */
    maxAnalysisTime: number;
    
    /** Resource limits */
    resourceLimits: {
      maxMemoryMB: number;
      maxConcurrentEngines: number;
      maxTotalTasks: number;
    };
    
    /** HIPAA compliance settings */
    hipaaCompliance?: {
      enabled: boolean;
      auditAllTasks: boolean;
      sanitizeResults: boolean;
    };
  };
  
  /** Result aggregation settings */
  aggregation: {
    /** How to combine results from multiple engines */
    method: 'union' | 'intersection' | 'weighted' | 'consensus';
    
    /** Minimum confidence threshold for final results */
    confidenceThreshold: number;
    
    /** Whether to include intermediate results */
    includeIntermediateResults: boolean;
  };
}

/**
 * Hybrid analysis result aggregating multiple engines
 */
export interface HybridAnalysisResult {
  /** Analysis session identifier */
  sessionId: string;
  
  /** Overall analysis success */
  success: boolean;
  
  /** Total analysis time */
  totalTime: number;
  
  /** Results from individual engines */
  engineResults: {
    [engine in AnalysisEngine]?: TaskResult[];
  };
  
  /** Aggregated findings */
  findings: {
    /** Static analysis results */
    static?: {
      functions: any[];
      matches: any[];
      metadata: any;
    };
    
    /** Dynamic taint analysis results */
    taint?: TaintAnalysisResult;
    
    /** Cross-engine correlations */
    correlations?: Array<{
      engines: AnalysisEngine[];
      finding: any;
      confidence: number;
      consensus: number;
    }>;
  };
  
  /** Analysis statistics */
  statistics: {
    enginesUsed: AnalysisEngine[];
    tasksExecuted: number;
    tasksSuccessful: number;
    tasksFailed: number;
    averageTaskTime: number;
    memoryPeak: number;
  };
  
  /** Recommendations based on analysis */
  recommendations?: Array<{
    type: 'security' | 'performance' | 'analysis';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    evidence?: any;
  }>;
  
  /** Analysis metadata */
  meta: {
    configUsed: HybridConfig;
    strategyUsed: string;
    timestamp: number;
    version: string;
  };
}

// ================================
// Integration Types
// ================================

/**
 * Interface for engines that support taint tracking
 */
export interface TaintCapableEngine {
  /** Configure taint tracking */
  configureTaint(config: TaintConfig): Promise<void>;
  
  /** Perform taint analysis */
  performTaintAnalysis(data: Uint8Array): Promise<TaintAnalysisResult>;
  
  /** Get current taint state */
  getTaintState(): Promise<{
    memory: TaintedMemory[];
    registers: TaintedRegister[];
  }>;
  
  /** Add custom taint source */
  addTaintSource(address: string, source: TaintSource, label?: Partial<TaintLabel>): Promise<void>;
  
  /** Check if location is tainted */
  isTainted(address: string): Promise<boolean>;
}

/**
 * Interface for the hybrid orchestrator
 */
export interface HybridOrchestrator {
  /** Configure the orchestrator */
  configure(config: HybridConfig): Promise<void>;
  
  /** Register an analysis engine */
  registerEngine(engine: AnalysisEngine, instance: any, capabilities: EngineCapability): Promise<void>;
  
  /** Execute hybrid analysis */
  analyze(data: Uint8Array): Promise<HybridAnalysisResult>;
  
  /** Get available engines and their capabilities */
  getAvailableEngines(): Promise<EngineCapability[]>;
  
  /** Cancel ongoing analysis */
  cancelAnalysis(sessionId: string): Promise<boolean>;
  
  /** Get analysis progress */
  getProgress(sessionId: string): Promise<{
    phase: AnalysisPhase;
    completedTasks: number;
    totalTasks: number;
    estimatedTimeRemaining: number;
  }>;
}

export {
  // Re-export from decompilation.ts for compatibility
  type DecompilationMatch,
  type FunctionAnalysis,
  type DecompilationResult,
  type DecompilationScanner,
  type BinaryNinjaOptions,
  type GhidraOptions
} from './decompilation';