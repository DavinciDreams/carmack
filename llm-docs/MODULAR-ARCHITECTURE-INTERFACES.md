# Modular Architecture: Public TypeScript Interfaces

## API
- `AIProcessor`, `QueryEngine`, `SessionManager`, `GraphWalker`, `QueryProcessingPipeline`
- Public interfaces:
  ```typescript
  export interface IAIProcessor {
    classifyIntent(query: string): Promise<IntentResult>;
    assessComplexity(query: string, intent: QueryIntent): Promise<ComplexityResult>;
    extractFacts(input: FactInput): Promise<FactExtraction>;
    synthesizeResponse(input: SynthesisInput): Promise<SynthesisResult>;
  }
  export interface IQueryEngine {
    processQuery(request: QueryRequest): Promise<QueryResponse>;
  }
  export interface ISessionManager {
    createSession(options: SessionOptions): Promise<SessionInfo>;
    getSession(sessionId: string): Promise<SessionInfo>;
    updateSessionWithQuery(sessionId: string, query: QueryRequest): Promise<void>;
  }
  ```

## Ingestion
- `ContentProcessor`, `GitHubClient`, `IngestionOrchestrator`, `RepositoryManager`, `SemanticIndexer`
- Public interfaces:
  ```typescript
  export interface IContentProcessor {
    processFileContent(file: FileContent): Promise<ProcessedContent>;
    processFiles(files: FileContent[]): Promise<ProcessedContent[]>;
  }
  export interface IGitHubClient {
    getAllPullRequests(options: PullRequestOptions): Promise<PullRequest[]>;
    getPullRequestDetails(prNumber: number): Promise<PullRequest>;
    getAllIssues(options: IssueOptions): Promise<Issue[]>;
  }
  export interface IIngestionOrchestrator {
    runIngestion(): Promise<IngestionResult>;
  }
  ```

## Learning
- `KMeansClusterer`, `PatternEffectivenessScorer`, `NLPAnalyzer`, `PatternRecommendationEngine`, `ReinforcementLearningManager`, `PatternSimilarityDetector`, `StatisticalAnalyzer`
- Public interfaces:
  ```typescript
  export interface IClusterer {
    cluster(patterns: PatternFeatureVector[]): ClusterResult[];
  }
  export interface IEffectivenessScorer {
    recordUsage(usage: PatternUsageRecord): void;
    calculateEffectiveness(patternId: string): EffectivenessScore;
  }
  export interface INLPAnalyzer {
    analyzeText(patternId: string, description: string): Promise<NLPAnalysis>;
  }
  export interface IRecommendationEngine {
    getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse>;
  }
  ```

## Annotation
- `LLMAnnotationAnalyzer`, `LLMAnnotationSystem`
- Public interfaces:
  ```typescript
  export interface ILLMAnnotationAnalyzer {
    generateAnnotations(request: AnnotationRequest): Promise<AnnotationResult>;
  }
  export interface ILLMAnnotationSystem {
    annotateDirectory(dir: string): Promise<AnnotationResult[]>;
    generateReport(annotation: LLMAnnotation): string;
  }
  ```

## Docs
- `OracleQueryProcessor`
- Public interfaces:
  ```typescript
  export interface IOracleQueryProcessor {
    processQuery(query: string): Promise<OracleQuery>;
    generateResponse(oracleQuery: OracleQuery): Promise<string>;
  }
  ```

## DB
- `DatabaseConnectionManager`, `MigrationManager`, `ArtifactOperations`, `GraphEdgeOperations`, `QuerySessionOperations`, `DatabaseSeeder`
- Public interfaces:
  ```typescript
  export interface IDatabaseConnectionManager {
    initialize(): Promise<void>;
    query<T>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
    transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
    close(): Promise<void>;
  }
  export interface IMigrationManager {
    migrate(): Promise<MigrationResult[]>;
    rollback(targetVersion: string): Promise<MigrationResult[]>;
    validateSchema(): Promise<{ isValid: boolean; errors: string[] }>;
  }
  export interface IArtifactOperations {
    create(input: CreateArtifactInput): Promise<Artifact>;
    getById(id: string): Promise<Artifact | null>;
    update(id: string, input: UpdateArtifactInput): Promise<Artifact>;
    delete(id: string): Promise<boolean>;
    search(filters: SearchFilters, limit?: number, offset?: number): Promise<Artifact[]>;
  }
  ```

## Patterns
- Pattern datasets (JSON)
- Public interface: Data access functions
  ```typescript
  export function loadPatterns(): Promise<Pattern[]>;
  export function getPatternById(id: string): Pattern | undefined;
  ```

## Telemetry
- `TelemetryCollector`, `PerformanceTimer`, `MemoryTracker`, `CacheMonitor`, `QualityAnalyzer`, `TransformationTelemetry`
- Public interfaces:
  ```typescript
  export interface ITelemetryCollector {
    emitUnifiedEvent(event: TelemetryEvent): void;
    recordPatternSuccess(...args: any[]): void;
    recordLatency(...args: any[]): void;
    getHealthMetrics(): TelemetryHealthMetrics;
    shutdown(): Promise<void>;
  }
  ```

## Testing
- `EpicTestingSystem`, `EpicTestingIntegrationTest`
- Public interfaces:
  ```typescript
  export interface ITestingSystem {
    runCompleteValidation(): Promise<TestSuiteResult>;
    runBenchmarkValidation(): Promise<any>;
    runPerformanceValidation(): Promise<any[]>;
    generateReport(): Promise<ReportGenerationResult>;
  }
  ```

## Types
- Shared types and schemas
- Public interface: Type exports
  ```typescript
  export type ApiResponse<T> = { data: T; error?: string };
  ```

## Utils
- Utility functions and classes
- Public interface: Utility exports
  ```typescript
  export function runAstGrep(args: string[]): Promise<AstGrepResult>;
  export function validateConfigFiles(): Promise<void>;
  export function detectLanguageFromFile(filePath: string): string;
  export function parseYamlString<T>(yamlString: string, schema: any): T;
  ```

## Verification
- (No public interfaces found; may be empty or data-driven.)

## Config
- Environment/config loading and validation
- Public interfaces:
  ```typescript
  export function loadEnvironmentConfig(): EnvironmentConfig;
  export function validateLLMConfig(env: EnvironmentConfig): void;
  export function getEnvironmentConfig(): EnvironmentConfig;
  ```

## Providers
- LLM provider classes and manager
- Public interfaces:
  ```typescript
  export interface ILLMProvider {
    makeRequest(request: LLMRequest): Promise<LLMResponse>;
  }
  export interface ILLMProviderManager {
    getProvider(provider: LLMProvider, config?: Partial<LLMConfig>): ILLMProvider;
    makeRequestWithFallback(request: LLMRequest): Promise<LLMResponse>;
  }
  ```

## Pipeline
- `productionPipelineActor`, pipeline stage functions
- Public interfaces:
  ```typescript
  export interface IPipeline {
    run(input: PipelineRequest): Promise<PipelineResult>;
  }
  ```

## Transformation
- `LLMTransformer`, `llmTransformationActor`
- Public interfaces:
  ```typescript
  export interface ILLMTransformer {
    transformFiles(input: LLMTransformationInput): Promise<LLMTransformationResult>;
  }
  ```

## Production
- `CarmackPipelineOrchestrator`, production config
- Public interfaces:
  ```typescript
  export interface IPipelineOrchestrator {
    executeFullPipeline(args: EnhancedCLIArgs): Promise<void>;
    shutdown(): Promise<void>;
  }
  export function loadProductionConfig(configPath?: string): ProductionConfig;
  ```

## CLI
- `DocumentationCLI`, `IngestionCLI`, annotation CLI
- Public interfaces:
  ```typescript
  export interface IDocumentationCLI {
    run(args?: string[]): Promise<void>;
  }
  export interface IIngestionCLI {
    run(): Promise<void>;
  }
  ```

---
All interfaces are designed for loose coupling and extensibility. Next: map module dependencies and interactions.