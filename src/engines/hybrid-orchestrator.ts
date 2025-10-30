/**
 * Hybrid Analysis Orchestrator
 * 
 * Advanced orchestration framework for coordinating multiple analysis engines
 * including Binary Ninja, Ghidra, dynamic taint tracking, and custom engines.
 */

import type {
  AnalysisEngine,
  AnalysisPhase,
  EngineCapability,
  AnalysisTask,
  TaskResult,
  OrchestrationStrategy,
  HybridConfig,
  HybridAnalysisResult,
  HybridOrchestrator,
  TaintAnalysisResult
} from '../types/taint-tracking';

import type {
  DecompilationResult,
  DecompilationScanner
} from '../types/decompilation';

import { DynamicTaintEngine } from './dynamic-taint';

// Simple crypto utilities
function generateRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < bytes; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Task execution queue with priority scheduling
 */
class TaskQueue {
  private tasks: AnalysisTask[] = [];
  private running: Map<string, Promise<TaskResult>> = new Map();
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 4) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Add a task to the queue
   */
  enqueue(task: AnalysisTask): void {
    this.tasks.push(task);
    // Sort by priority (higher priority first)
    this.tasks.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get the next available task that has all dependencies satisfied
   */
  getNextTask(completedTasks: Set<string>): AnalysisTask | null {
    const availableIndex = this.tasks.findIndex(task => {
      // Check if all dependencies are completed
      return task.dependencies.every(dep => completedTasks.has(dep));
    });

    if (availableIndex === -1) {
      return null;
    }

    return this.tasks.splice(availableIndex, 1)[0];
  }

  /**
   * Mark a task as running
   */
  markRunning(taskId: string, promise: Promise<TaskResult>): void {
    this.running.set(taskId, promise);
  }

  /**
   * Mark a task as completed
   */
  markCompleted(taskId: string): void {
    this.running.delete(taskId);
  }

  /**
   * Check if we can start more tasks
   */
  canStartTask(): boolean {
    return this.running.size < this.maxConcurrency;
  }

  /**
   * Get number of pending tasks
   */
  getPendingCount(): number {
    return this.tasks.length;
  }

  /**
   * Get number of running tasks
   */
  getRunningCount(): number {
    return this.running.size;
  }

  /**
   * Wait for any running task to complete
   */
  async waitForAnyCompletion(): Promise<TaskResult | null> {
    if (this.running.size === 0) {
      return null;
    }

    const promises = Array.from(this.running.values());
    return Promise.race(promises);
  }
}

/**
 * Result correlation engine for combining multi-engine analysis results
 */
class ResultCorrelator {
  /**
   * Correlate findings from multiple engines
   */
  correlateResults(
    results: Map<AnalysisEngine, TaskResult[]>,
    strategy: OrchestrationStrategy
  ): Array<{
    engines: AnalysisEngine[];
    finding: any;
    confidence: number;
    consensus: number;
  }> {
    const correlations: Array<{
      engines: AnalysisEngine[];
      finding: any;
      confidence: number;
      consensus: number;
    }> = [];

    if (!strategy.correlation.enabled) {
      return correlations;
    }

    // Extract all findings from all engines
    const allFindings = new Map<AnalysisEngine, any[]>();
    
    for (const [engine, taskResults] of results) {
      const findings: any[] = [];
      
      for (const result of taskResults) {
        if (result.status === 'success' && result.result) {
          if (engine === 'dynamic-taint') {
            const taintResult = result.result as TaintAnalysisResult;
            findings.push(...taintResult.flows);
          } else if (engine === 'binaryninja-hlil' || engine === 'ghidra-pcode') {
            const decompResult = result.result as DecompilationResult;
            findings.push(...decompResult.matches);
            findings.push(...decompResult.functions);
          } else {
            findings.push(result.result);
          }
        }
      }
      
      allFindings.set(engine, findings);
    }

    // Apply correlation algorithms
    for (const algorithm of strategy.correlation.algorithms) {
      const algorithmCorrelations = this.applyCorrelationAlgorithm(
        algorithm,
        allFindings,
        strategy.correlation.engineWeights || {}
      );
      correlations.push(...algorithmCorrelations);
    }

    return correlations;
  }

  private applyCorrelationAlgorithm(
    algorithm: 'similarity' | 'overlap' | 'consensus' | 'weighted',
    findings: Map<AnalysisEngine, any[]>,
    weights: { [engine in AnalysisEngine]?: number }
  ): Array<{
    engines: AnalysisEngine[];
    finding: any;
    confidence: number;
    consensus: number;
  }> {
    const correlations: Array<{
      engines: AnalysisEngine[];
      finding: any;
      confidence: number;
      consensus: number;
    }> = [];

    switch (algorithm) {
      case 'similarity':
        return this.applySimilarityCorrelation(findings, weights);
      
      case 'overlap':
        return this.applyOverlapCorrelation(findings, weights);
      
      case 'consensus':
        return this.applyConsensusCorrelation(findings, weights);
      
      case 'weighted':
        return this.applyWeightedCorrelation(findings, weights);
      
      default:
        return correlations;
    }
  }

  private applySimilarityCorrelation(
    findings: Map<AnalysisEngine, any[]>,
    weights: { [engine in AnalysisEngine]?: number }
  ): Array<{
    engines: AnalysisEngine[];
    finding: any;
    confidence: number;
    consensus: number;
  }> {
    const correlations: Array<{
      engines: AnalysisEngine[];
      finding: any;
      confidence: number;
      consensus: number;
    }> = [];

    // Group similar findings across engines
    const findingGroups = new Map<string, {
      engines: AnalysisEngine[];
      findings: any[];
      similarity: number;
    }>();

    for (const [engine, engineFindings] of findings) {
      for (const finding of engineFindings) {
        const signature = this.generateFindingSignature(finding);
        
        if (!findingGroups.has(signature)) {
          findingGroups.set(signature, {
            engines: [],
            findings: [],
            similarity: 1.0
          });
        }

        const group = findingGroups.get(signature)!;
        group.engines.push(engine);
        group.findings.push(finding);
      }
    }

    // Convert groups to correlations
    for (const [signature, group] of findingGroups) {
      if (group.engines.length > 1) { // Only include multi-engine findings
        const totalWeight = group.engines.reduce((sum, engine) => 
          sum + (weights[engine] || 1.0), 0);
        
        const avgConfidence = group.findings.reduce((sum, finding) => {
          const confidence = finding.confidence || 0.5;
          return sum + confidence;
        }, 0) / group.findings.length;

        correlations.push({
          engines: group.engines,
          finding: group.findings[0], // Use first finding as representative
          confidence: avgConfidence * (totalWeight / group.engines.length),
          consensus: group.engines.length / findings.size
        });
      }
    }

    return correlations;
  }

  private applyOverlapCorrelation(
    findings: Map<AnalysisEngine, any[]>,
    weights: { [engine in AnalysisEngine]?: number }
  ): Array<{
    engines: AnalysisEngine[];
    finding: any;
    confidence: number;
    consensus: number;
  }> {
    // Similar to similarity but focuses on overlapping detection regions
    return this.applySimilarityCorrelation(findings, weights);
  }

  private applyConsensusCorrelation(
    findings: Map<AnalysisEngine, any[]>,
    weights: { [engine in AnalysisEngine]?: number }
  ): Array<{
    engines: AnalysisEngine[];
    finding: any;
    confidence: number;
    consensus: number;
  }> {
    // Focus on findings that appear in majority of engines
    const similarityResults = this.applySimilarityCorrelation(findings, weights);
    const consensusThreshold = 0.5; // Majority consensus
    
    return similarityResults.filter(correlation => 
      correlation.consensus >= consensusThreshold
    );
  }

  private applyWeightedCorrelation(
    findings: Map<AnalysisEngine, any[]>,
    weights: { [engine in AnalysisEngine]?: number }
  ): Array<{
    engines: AnalysisEngine[];
    finding: any;
    confidence: number;
    consensus: number;
  }> {
    // Apply engine-specific weights to correlation confidence
    return this.applySimilarityCorrelation(findings, weights);
  }

  private generateFindingSignature(finding: any): string {
    // Generate a signature for finding similarity matching
    if (finding.rule) {
      // Decompilation match
      return `decomp_${finding.rule}_${finding.severity || 'medium'}`;
    } else if (finding.name && finding.address) {
      // Function analysis
      return `func_${finding.name}_${finding.address}`;
    } else if (finding.source && finding.sink) {
      // Taint flow
      return `taint_${finding.source.label.source}_${finding.sink.type}`;
    } else {
      // Generic finding
      return `generic_${JSON.stringify(finding).substring(0, 50)}`;
    }
  }
}

/**
 * Main hybrid orchestration engine
 */
export class HybridAnalysisOrchestrator implements HybridOrchestrator {
  private config: HybridConfig | null = null;
  private engines: Map<AnalysisEngine, {
    instance: any;
    capabilities: EngineCapability;
  }> = new Map();
  private correlator: ResultCorrelator = new ResultCorrelator();
  private activeSessions: Map<string, {
    tasks: TaskQueue;
    results: Map<AnalysisEngine, TaskResult[]>;
    startTime: number;
    config: HybridConfig;
  }> = new Map();

  /**
   * Configure the orchestrator
   */
  async configure(config: HybridConfig): Promise<void> {
    this.config = config;
    
    console.debug('[HYBRID-ORCHESTRATOR] Configuration updated', {
      strategy: config.strategy.name,
      enabledEngines: Object.keys(config.engines).filter(
        engine => config.engines[engine as AnalysisEngine]?.enabled
      ).length,
      maxConcurrency: config.strategy.scheduling.maxConcurrency
    });
  }

  /**
   * Register an analysis engine with the orchestrator
   */
  async registerEngine(
    engine: AnalysisEngine,
    instance: any,
    capabilities: EngineCapability
  ): Promise<void> {
    this.engines.set(engine, { instance, capabilities });
    
    console.debug('[HYBRID-ORCHESTRATOR] Engine registered', {
      engine,
      capabilities: capabilities.capabilities,
      supportedFormats: capabilities.supportedFormats,
      performance: capabilities.performance
    });
  }

  /**
   * Execute comprehensive hybrid analysis
   */
  async analyze(data: Uint8Array): Promise<HybridAnalysisResult> {
    if (!this.config) {
      throw new Error('Orchestrator not configured');
    }

    const sessionId = generateRandomHex(16);
    const startTime = Date.now();

    console.debug('[HYBRID-ORCHESTRATOR] Starting analysis', {
      sessionId,
      dataSize: data.length,
      strategy: this.config.strategy.name
    });

    // Initialize session
    const session = {
      tasks: new TaskQueue(this.config.strategy.scheduling.maxConcurrency),
      results: new Map<AnalysisEngine, TaskResult[]>(),
      startTime,
      config: this.config
    };
    this.activeSessions.set(sessionId, session);

    try {
      // Generate analysis tasks based on strategy
      const tasks = await this.generateAnalysisTasks(data, this.config.strategy);
      
      // Enqueue all tasks
      for (const task of tasks) {
        session.tasks.enqueue(task);
      }

      // Execute tasks in phases
      await this.executeTasks(sessionId);

      // Correlate results
      const correlations = this.correlator.correlateResults(
        session.results,
        this.config.strategy
      );

      // Generate final result
      const result = await this.generateHybridResult(
        sessionId,
        session,
        correlations
      );

      console.debug('[HYBRID-ORCHESTRATOR] Analysis completed', {
        sessionId,
        totalTime: result.totalTime,
        enginesUsed: result.statistics.enginesUsed,
        correlations: correlations.length
      });

      return result;

    } catch (error) {
      console.error('[HYBRID-ORCHESTRATOR] Analysis failed', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return partial results if available
      const partialResult = await this.generateHybridResult(
        sessionId,
        session,
        [],
        false
      );
      
      return partialResult;

    } finally {
      // Cleanup session
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Get available engines and their capabilities
   */
  async getAvailableEngines(): Promise<EngineCapability[]> {
    return Array.from(this.engines.values()).map(engine => engine.capabilities);
  }

  /**
   * Cancel ongoing analysis
   */
  async cancelAnalysis(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    // In a real implementation, this would cancel running tasks
    this.activeSessions.delete(sessionId);
    
    console.debug('[HYBRID-ORCHESTRATOR] Analysis cancelled', { sessionId });
    return true;
  }

  /**
   * Get analysis progress
   */
  async getProgress(sessionId: string): Promise<{
    phase: AnalysisPhase;
    completedTasks: number;
    totalTasks: number;
    estimatedTimeRemaining: number;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const completedCount = Array.from(session.results.values())
      .reduce((sum, results) => sum + results.length, 0);
    
    const totalTasks = completedCount + session.tasks.getPendingCount() + 
                     session.tasks.getRunningCount();

    const elapsedTime = Date.now() - session.startTime;
    const estimatedTotal = totalTasks > 0 ? 
      (elapsedTime / Math.max(completedCount, 1)) * totalTasks : 0;
    const estimatedRemaining = Math.max(0, estimatedTotal - elapsedTime);

    return {
      phase: this.determineCurrentPhase(session),
      completedTasks: completedCount,
      totalTasks,
      estimatedTimeRemaining: estimatedRemaining
    };
  }

  /**
   * Generate analysis tasks based on orchestration strategy
   */
  private async generateAnalysisTasks(
    data: Uint8Array,
    strategy: OrchestrationStrategy
  ): Promise<AnalysisTask[]> {
    const tasks: AnalysisTask[] = [];
    let taskIdCounter = 0;

    for (const phase of strategy.phaseOrder) {
      const phaseRules = strategy.engineRules[phase];
      if (!phaseRules) continue;

      for (const engine of phaseRules.preferred) {
        if (!this.engines.has(engine)) continue;
        if (!this.config?.engines[engine]?.enabled) continue;

        const taskId = `${phase}_${engine}_${taskIdCounter++}`;
        const dependencies = this.calculateTaskDependencies(phase, tasks);

        tasks.push({
          id: taskId,
          engine,
          phase,
          priority: this.calculateTaskPriority(engine, phase),
          dependencies,
          input: {
            data,
            previousResults: [],
            config: this.config?.engines[engine]?.config
          },
          metadata: {
            description: `${phase} analysis using ${engine}`,
            estimatedDuration: this.estimateTaskDuration(engine),
            maxRetries: strategy.scheduling.retryPolicy.maxRetries,
            timeout: strategy.scheduling.defaultTimeout
          }
        });
      }
    }

    return tasks;
  }

  /**
   * Execute tasks with proper scheduling and dependency management
   */
  private async executeTasks(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)!;
    const completedTasks = new Set<string>();

    while (session.tasks.getPendingCount() > 0 || session.tasks.getRunningCount() > 0) {
      // Start new tasks if possible
      while (session.tasks.canStartTask() && session.tasks.getPendingCount() > 0) {
        const task = session.tasks.getNextTask(completedTasks);
        if (!task) break; // No available tasks (waiting for dependencies)

        const promise = this.executeTask(task);
        session.tasks.markRunning(task.id, promise);
      }

      // Wait for at least one task to complete
      const result = await session.tasks.waitForAnyCompletion();
      if (result) {
        session.tasks.markCompleted(result.taskId);
        completedTasks.add(result.taskId);

        // Store result
        const engine = this.findTaskEngine(result.taskId);
        if (engine) {
          if (!session.results.has(engine)) {
            session.results.set(engine, []);
          }
          session.results.get(engine)!.push(result);
        }
      }
    }
  }

  /**
   * Execute a single analysis task
   */
  private async executeTask(task: AnalysisTask): Promise<TaskResult> {
    const startTime = Date.now();
    
    console.debug('[HYBRID-ORCHESTRATOR] Executing task', {
      taskId: task.id,
      engine: task.engine,
      phase: task.phase
    });

    try {
      const engineInfo = this.engines.get(task.engine);
      if (!engineInfo) {
        throw new Error(`Engine ${task.engine} not registered`);
      }

      let result: any;

      // Execute based on engine type
      switch (task.engine) {
        case 'dynamic-taint':
          const taintEngine = engineInfo.instance as DynamicTaintEngine;
          result = await taintEngine.performTaintAnalysis(task.input.data);
          break;

        case 'binaryninja-hlil':
        case 'ghidra-pcode':
          const decompEngine = engineInfo.instance as DecompilationScanner;
          if (typeof decompEngine.analyze === 'function') {
            result = await decompEngine.analyze(task.input.data);
          } else {
            throw new Error(`Engine ${task.engine} does not support analyze method`);
          }
          break;

        default:
          // Custom engine execution
          if (typeof engineInfo.instance.analyze === 'function') {
            result = await engineInfo.instance.analyze(task.input.data);
          } else {
            throw new Error(`Engine ${task.engine} does not support analysis`);
          }
      }

      const endTime = Date.now();
      const confidence = this.calculateResultConfidence(result, task.engine);

      return {
        taskId: task.id,
        engine: task.engine,
        status: 'success',
        result,
        metrics: {
          startTime,
          endTime,
          memoryUsed: 0, // Would be tracked in real implementation
          cpuTime: endTime - startTime
        },
        confidence
      };

    } catch (error) {
      const endTime = Date.now();
      
      console.error('[HYBRID-ORCHESTRATOR] Task failed', {
        taskId: task.id,
        engine: task.engine,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        taskId: task.id,
        engine: task.engine,
        status: 'failed',
        metrics: {
          startTime,
          endTime,
          memoryUsed: 0,
          cpuTime: endTime - startTime
        },
        error: error instanceof Error ? error.message : String(error),
        confidence: 0
      };
    }
  }

  // Helper methods

  private calculateTaskDependencies(phase: AnalysisPhase, existingTasks: AnalysisTask[]): string[] {
    // Tasks in later phases depend on earlier phases
    const phaseOrder: AnalysisPhase[] = [
      'preprocessing',
      'static',
      'dynamic',
      'taint',
      'correlation',
      'postprocessing',
      'reporting'
    ];

    const currentPhaseIndex = phaseOrder.indexOf(phase);
    if (currentPhaseIndex <= 0) return [];

    // Depend on all tasks from previous phases
    return existingTasks
      .filter(task => {
        const taskPhaseIndex = phaseOrder.indexOf(task.phase);
        return taskPhaseIndex < currentPhaseIndex;
      })
      .map(task => task.id);
  }

  private calculateTaskPriority(engine: AnalysisEngine, phase: AnalysisPhase): number {
    const basePriority = {
      'preprocessing': 100,
      'static': 80,
      'dynamic': 60,
      'taint': 60,
      'correlation': 40,
      'postprocessing': 20,
      'reporting': 10
    }[phase] || 50;

    const engineBonus = this.config?.engines[engine]?.priority || 0;
    
    return basePriority + engineBonus;
  }

  private estimateTaskDuration(engine: AnalysisEngine): number {
    const engineInfo = this.engines.get(engine);
    if (!engineInfo) return 30000; // Default 30 seconds

    const speedMultiplier = {
      'fast': 0.5,
      'medium': 1.0,
      'slow': 2.0
    }[engineInfo.capabilities.performance.speed];

    return 30000 * speedMultiplier; // Base 30 seconds * speed
  }

  private calculateResultConfidence(result: any, engine: AnalysisEngine): number {
    if (result && typeof result.confidence === 'number') {
      return result.confidence;
    }

    // Default confidence based on engine performance
    const engineInfo = this.engines.get(engine);
    if (!engineInfo) return 0.5;

    const accuracyMap = {
      'low': 0.3,
      'medium': 0.6,
      'high': 0.9
    };

    return accuracyMap[engineInfo.capabilities.performance.accuracy];
  }

  private findTaskEngine(taskId: string): AnalysisEngine | null {
    // Extract engine from task ID format: "phase_engine_counter"
    const parts = taskId.split('_');
    if (parts.length >= 2) {
      return parts[1] as AnalysisEngine;
    }
    return null;
  }

  private determineCurrentPhase(session: {
    tasks: TaskQueue;
    results: Map<AnalysisEngine, TaskResult[]>;
  }): AnalysisPhase {
    // Determine current phase based on completed tasks
    const completedEngines = Array.from(session.results.keys());
    
    if (completedEngines.some(e => e === 'binaryninja-hlil' || e === 'ghidra-pcode')) {
      if (completedEngines.includes('dynamic-taint')) {
        return 'correlation';
      }
      return 'dynamic';
    }
    
    return 'static';
  }

  private async generateHybridResult(
    sessionId: string,
    session: {
      tasks: TaskQueue;
      results: Map<AnalysisEngine, TaskResult[]>;
      startTime: number;
      config: HybridConfig;
    },
    correlations: Array<{
      engines: AnalysisEngine[];
      finding: any;
      confidence: number;
      consensus: number;
    }>,
    success: boolean = true
  ): Promise<HybridAnalysisResult> {
    const totalTime = Date.now() - session.startTime;
    const allResults = Array.from(session.results.values()).flat();
    
    // Aggregate findings by type
    const staticFindings: any = {
      functions: [],
      matches: [],
      metadata: {}
    };
    
    let taintFindings: TaintAnalysisResult | undefined;

    // Process engine results
    for (const [engine, results] of session.results) {
      for (const result of results) {
        if (result.status === 'success' && result.result) {
          if (engine === 'dynamic-taint') {
            taintFindings = result.result as TaintAnalysisResult;
          } else if (engine === 'binaryninja-hlil' || engine === 'ghidra-pcode') {
            const decompResult = result.result as DecompilationResult;
            staticFindings.functions.push(...decompResult.functions);
            staticFindings.matches.push(...decompResult.matches);
            Object.assign(staticFindings.metadata, decompResult.meta);
          }
        }
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      staticFindings,
      taintFindings,
      correlations
    );

    return {
      sessionId,
      success,
      totalTime,
      engineResults: Object.fromEntries(session.results),
      findings: {
        static: staticFindings,
        taint: taintFindings,
        correlations
      },
      statistics: {
        enginesUsed: Array.from(session.results.keys()),
        tasksExecuted: allResults.length,
        tasksSuccessful: allResults.filter(r => r.status === 'success').length,
        tasksFailed: allResults.filter(r => r.status === 'failed').length,
        averageTaskTime: allResults.reduce((sum, r) => 
          sum + (r.metrics.endTime - r.metrics.startTime), 0) / Math.max(allResults.length, 1),
        memoryPeak: Math.max(...allResults.map(r => r.metrics.memoryUsed || 0))
      },
      recommendations,
      meta: {
        configUsed: session.config,
        strategyUsed: session.config.strategy.name,
        timestamp: Date.now(),
        version: '1.0.0'
      }
    };
  }

  private generateRecommendations(
    staticFindings: any,
    taintFindings?: TaintAnalysisResult,
    correlations?: Array<any>
  ): Array<{
    type: 'security' | 'performance' | 'analysis';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    evidence?: any;
  }> {
    const recommendations: Array<{
      type: 'security' | 'performance' | 'analysis';
      severity: 'info' | 'warning' | 'critical';
      message: string;
      evidence?: any;
    }> = [];

    // Security recommendations based on taint analysis
    if (taintFindings) {
      const criticalFlows = taintFindings.flows.filter(f => f.severity === 'critical');
      if (criticalFlows.length > 0) {
        recommendations.push({
          type: 'security',
          severity: 'critical',
          message: `Found ${criticalFlows.length} critical taint flow(s) that may indicate security vulnerabilities`,
          evidence: criticalFlows
        });
      }

      const vulnFlows = taintFindings.flows.filter(f => f.isVulnerability);
      if (vulnFlows.length > 0) {
        recommendations.push({
          type: 'security',
          severity: 'warning',
          message: `Detected ${vulnFlows.length} potential vulnerability pattern(s)`,
          evidence: vulnFlows
        });
      }
    }

    // Analysis recommendations based on correlation
    if (correlations && correlations.length > 0) {
      const highConsensus = correlations.filter(c => c.consensus >= 0.8);
      if (highConsensus.length > 0) {
        recommendations.push({
          type: 'analysis',
          severity: 'info',
          message: `${highConsensus.length} finding(s) confirmed by multiple analysis engines`,
          evidence: highConsensus
        });
      }
    }

    // Performance recommendations
    if (staticFindings.functions?.length > 1000) {
      recommendations.push({
        type: 'performance',
        severity: 'info',
        message: 'Large number of functions detected - consider using focused analysis for better performance',
        evidence: { functionCount: staticFindings.functions.length }
      });
    }

    return recommendations;
  }
}