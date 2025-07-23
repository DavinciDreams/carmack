# Usage Documentation

Generated on 2025-07-23T03:16:26.864Z

## Table of Contents

- [union](#union)
- [object](#object)
- [array](#array)
- [string](#string)
- [any](#any)
- [optional](#optional)
- [literal](#literal)
- [ fromPromise ](#-frompromise-)
- [ z ](#-z-)
- [enum](#enum)
- [RegExp](#regexp)
- [ readFile, writeFile ](#-readfile--writefile-)
- [ js, type SgNode, type SgRoot, ts ](#-js--type-sgnode--type-sgroot--ts-)
- [ readFile ](#-readfile-)
- [fromPromise](#frompromise)
- [Promise](#promise)
- [ rm ](#-rm-)
- [boolean](#boolean)
- [number](#number)
- [min](#min)
- [max](#max)
- [Error](#error)
- [Date](#date)
- [ simpleGit ](#-simplegit-)
- [record](#record)
- [ mkdir, writeFile ](#-mkdir--writefile-)
- [ join ](#-join-)
- [EnhancedLLMTransformer](#enhancedllmtransformer)
- [Map](#map)
- [Set](#set)
- [ getLLMProviderManager, type LLMRequest ](#-getllmprovidermanager--type-llmrequest-)
- [default](#default)
- [LLMTransformer](#llmtransformer)
- [ getLLMProviderManager ](#-getllmprovidermanager-)
- [fs](#fs)
- [int](#int)
- [PatternLearner](#patternlearner)
- [PatternClusterer](#patternclusterer)
- [PatternSimilarityDetector](#patternsimilaritydetector)
- [ PatternClusterer ](#-patternclusterer-)
- [ createNLPAnalyzer ](#-createnlpanalyzer-)
- [Function](#function)
- [ filterPatternsByLanguageAndMode, PRESET_FILTERS ](#-filterpatternsbylanguageandmode--preset-filters-)
- [ detectLanguageFromFile ](#-detectlanguagefromfile-)
- [ mkdir, readFile ](#-mkdir--readfile-)
- [ createActor, fromPromise ](#-createactor--frompromise-)
- [ astGrepTransformationActor ](#-astgreptransformationactor-)
- [ js, ts ](#-js--ts-)
- [ type EnhancedLLMTransformationInput, EnhancedLLMTransformer ](#-type-enhancedllmtransformationinput--enhancedllmtransformer-)
- [TypeScriptErrorResolver](#typescripterrorresolver)
- [ execSync ](#-execsync-)
- [ESLint](#eslint)
- [getBunExecutable](#getbunexecutable)
- [if](#if)
- [execSync](#execsync)
- [for](#for)
- [AbortController](#abortcontroller)
- [ ESLint ](#-eslint-)
- [url](#url)
- [function](#function)
- [returns](#returns)
- [ASTGrepAnalyzer](#astgrepanalyzer)
- [ $NAMES ](#--names-)
- [DocumentationGenerator](#documentationgenerator)
- [DocumentationCLI](#documentationcli)
- [ existsSync ](#-existssync-)
- [ parseArgs ](#-parseargs-)
- [chokidar](#chokidar)
- [ DocumentationGenerator ](#-documentationgenerator-)
- [ ASTGrepAnalyzer ](#-astgrepanalyzer-)
- [ validateDocumentationRequest, validateDocumentationResult ](#-validatedocumentationrequest--validatedocumentationresult-)
- [constructor](#constructor)
- [generateAPIDocumentation](#generateapidocumentation)
- [generateDocumentation](#generatedocumentation)
- [generateArchitectureDocumentation](#generatearchitecturedocumentation)
- [generatePatternDocumentation](#generatepatterndocumentation)
- [generateUsageDocumentation](#generateusagedocumentation)
- [DocumentationSystem](#documentationsystem)
- [cluster](#cluster)
- [map](#map)
- [initializeCentroidsKMeansPlusPlus](#initializecentroidskmeansplusplus)
- [Array](#array)
- [fill](#fill)
- [KMeansClusterer](#kmeansclusterer)
- [ VectorUtils ](#-vectorutils-)
- [weight](#weight)
- [PatternEffectivenessScorer](#patterneffectivenessscorer)
- [ StatisticalAnalyzer ](#-statisticalanalyzer-)
- [positive](#positive)
- [TextPreprocessor](#textpreprocessor)
- [PatternRecommendationEngine](#patternrecommendationengine)
- [calculateSimilarity](#calculatesimilarity)
- [padVector](#padvector)
- [cosineSimilarity](#cosinesimilarity)
- [calculateSimilarityMatrix](#calculatesimilaritymatrix)
- [ PatternSimilarityConfigSchema, VectorUtils ](#-patternsimilarityconfigschema--vectorutils-)
- [calculateSummary](#calculatesummary)
- [sort](#sort)
- [calculateMean](#calculatemean)
- [calculateMedian](#calculatemedian)
- [calculateMode](#calculatemode)
- [calculateVariance](#calculatevariance)
- [sqrt](#sqrt)
- [calculateQuartiles](#calculatequartiles)
- [initializeAnalyzer](#initializeanalyzer)
- [import](#import)
- [generateAnnotations](#generateannotations)
- [now](#now)
- [parse](#parse)
- [log](#log)
- [analyzeCodeContext](#analyzecodecontext)
- [ AnnotationRequestSchema, LLMAnnotationSchema ](#-annotationrequestschema--llmannotationschema-)
- [LLMAnnotationAnalyzer](#llmannotationanalyzer)
- [annotate](#annotate)
- [annotateDirectory](#annotatedirectory)
- [async](#async)
- [readdir](#readdir)
- [LLMAnnotationSystem](#llmannotationsystem)
- [
  generateLLMAnnotations,
  LLMAnnotationAnalyzer,
  llmAnnotationActor,
  validateAnnotationRequest,
](#---generatellmannotations----llmannotationanalyzer----llmannotationactor----validateannotationrequest--)
- [ AnnotationRequestSchema ](#-annotationrequestschema-)
- [convertAstPatternToTemplatePattern](#convertastpatterntotemplatepattern)
- [setup](#setup)
- [assign](#assign)
- [randomUUID](#randomuuid)
- [ assign, setup ](#-assign--setup-)
- [ analysisActor ](#-analysisactor-)
- [ complexityActor ](#-complexityactor-)
- [ dafnyActor ](#-dafnyactor-)
- [createActor](#createactor)
- [start](#start)
- [subscribe](#subscribe)
- [unsubscribe](#unsubscribe)
- [stop](#stop)
- [clearTimeout](#cleartimeout)
- [resolve](#resolve)
- [ mkdir, readFile, writeFile ](#-mkdir--readfile--writefile-)
- [ dirname, join ](#-dirname--join-)
- [ type ActorLogic, createActor, fromPromise ](#-type-actorlogic--createactor--frompromise-)
- [RateLimiter](#ratelimiter)
- [ getEnvironmentConfig ](#-getenvironmentconfig-)
- [ gitActor ](#-gitactor-)
- [ type LearningResult, patternLearningActor ](#-type-learningresult--patternlearningactor-)
- [ carmackCoderMachine ](#-carmackcodermachine-)
- [ basename, extname ](#-basename--extname-)
- [organizeImports](#organizeimports)
- [readFile](#readfile)
- [split](#split)
- [trim](#trim)
- [startsWith](#startswith)
- [match](#match)
- [getStagedTypeScriptFiles](#getstagedtypescriptfiles)
- [filter](#filter)
- [endsWith](#endswith)
- [existsSync](#existssync)
- [ readdir, readFile ](#-readdir--readfile-)
- [ createActor ](#-createactor-)
- [add](#add)
- [push](#push)
- [flush](#flush)
- [PrivacyManager](#privacymanager)
- [PerformanceMonitor](#performancemonitor)
- [TelemetryBuffer](#telemetrybuffer)
- [TelemetryCollector](#telemetrycollector)
- [ createHash, randomUUID ](#-createhash--randomuuid-)
- [ EventEmitter ](#-eventemitter-)
- [ performance ](#-performance-)
- [ TelemetryConfigSchema, TelemetryMetricSchema ](#-telemetryconfigschema--telemetrymetricschema-)
- [set](#set)
- [end](#end)
- [get](#get)
- [delete](#delete)
- [getStages](#getstages)
- [PerformanceTimer](#performancetimer)
- [MemoryTracker](#memorytracker)
- [ createHash ](#-createhash-)
- [ getTelemetryCollector ](#-gettelemetrycollector-)
- [uuid](#uuid)
- [ID](#id)
- [endToEndTestFunction](#endtoendtestfunction)
- [regex](#regex)
- [ YAML ](#-yaml-)
- [ type AstPattern, AstPatternSchema ](#-type-astpattern--astpatternschema-)
- [EnhancedTransformationError](#enhancedtransformationerror)
- [ type AstPattern, AstPatternSchema, type TransformationMode, TransformationModeSchema ](#-type-astpattern--astpatternschema--type-transformationmode--transformationmodeschema-)
- [ detectLanguageFromFile, detectLanguagesFromFiles, getLanguageDistribution ](#-detectlanguagefromfile--detectlanguagesfromfiles--getlanguagedistribution-)
- [super](#super)
- [YamlParseError](#yamlparseerror)
- [YamlSerializationError](#yamlserializationerror)

## union

### Usage in `src\actors\analysis.ts`

Function call found at line 11

```typescript
const AnalysisInputSchema = z.union([
```

### Usage in `src\actors\complexity.ts`

Function call found at line 7

```typescript
const ComplexityInputSchema = z.union([
```

### Usage in `src\actors\git.ts`

Function call found at line 7

```typescript
const GitInputSchema = z.union([
```

### Usage in `src\actors\validation.ts`

Function call found at line 71

```typescript
const ValidationInputSchema = z.union([
```

### Usage in `src\utils\config-validators.ts`

Function call found at line 13

```typescript
tags: z.union([z.string(), z.array(z.string())]).optional(),
```

---

## object

### Usage in `src\actors\analysis.ts`

Function call found at line 12

```typescript
z.object({
```

### Usage in `src\actors\analysis.ts`

Function call found at line 17

```typescript
z.object({
```

### Usage in `src\actors\ast-grep-transformation.ts`

Function call found at line 22

```typescript
const AstGrepPatternSchema = z.object({
```

### Usage in `src\actors\ast-grep-transformation.ts`

Function call found at line 27

```typescript
pattern: z.object({
```

### Usage in `src\actors\ast-grep-transformation.ts`

Function call found at line 29

```typescript
rule: z.object({
```

### Usage in `src\actors\complexity.ts`

Function call found at line 8

```typescript
z.object({
```

### Usage in `src\actors\complexity.ts`

Function call found at line 12

```typescript
z.object({
```

### Usage in `src\actors\dafny.ts`

Function call found at line 7

```typescript
const DafnyInputSchema = z.object({
```

### Usage in `src\actors\feedback-loop.ts`

Function call found at line 17

```typescript
const FeedbackDataSchema = z.object({
```

### Usage in `src\actors\git.ts`

Function call found at line 8

```typescript
z.object({
```

### Usage in `src\actors\git.ts`

Function call found at line 12

```typescript
z.object({
```

### Usage in `src\actors\git.ts`

Function call found at line 17

```typescript
z.object({
```

### Usage in `src\actors\llm-testing-framework.ts`

Function call found at line 20

```typescript
const TestCaseSchema = z.object({
```

### Usage in `src\actors\llm-testing-framework.ts`

Function call found at line 26

```typescript
input: z.object({
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Function call found at line 32

```typescript
const FileContextAnalysisSchema = z.object({
```

### Usage in `src\actors\llm-transformation.ts`

Function call found at line 24

```typescript
.object({
```

### Usage in `src\actors\pattern-discovery.ts`

Function call found at line 17

```typescript
const PatternDiscoveryRequestSchema = z.object({
```

### Usage in `src\actors\pattern-discovery.ts`

Function call found at line 21

```typescript
sources: z.object({
```

### Usage in `src\actors\pattern-discovery.ts`

Function call found at line 25

```typescript
z.object({
```

### Usage in `src\actors\pattern-learning.ts`

Function call found at line 33

```typescript
const PatternLearningInputSchema = z.object({
```

### Usage in `src\actors\pattern-learning.ts`

Function call found at line 36

```typescript
.object({
```

### Usage in `src\actors\pattern-learning.ts`

Function call found at line 41

```typescript
.object({
```

### Usage in `src\actors\template-engine.ts`

Function call found at line 22

```typescript
const TemplatePatternSchema = z.object({
```

### Usage in `src\actors\template-engine.ts`

Function call found at line 27

```typescript
pattern: z.object({
```

### Usage in `src\actors\template-engine.ts`

Function call found at line 34

```typescript
.object({
```

### Usage in `src\actors\transformation-enhanced.ts`

Function call found at line 70

```typescript
const EnhancedOrchestratorRequestSchema = z.object({
```

### Usage in `src\actors\transformation.ts`

Function call found at line 15

```typescript
const TransformationInputSchema = z.object({
```

### Usage in `src\actors\transformation.ts`

Function call found at line 19

```typescript
z.object({
```

### Usage in `src\actors\typescript-error-resolver.ts`

Function call found at line 15

```typescript
export const TypeScriptErrorSchema = z.object({
```

### Usage in `src\actors\typescript-error-resolver.ts`

Function call found at line 25

```typescript
export const ErrorResolutionSchema = z.object({
```

### Usage in `src\actors\validation.ts`

Function call found at line 72

```typescript
z.object({
```

### Usage in `src\config\environment.ts`

Function call found at line 17

```typescript
const CoreEnvironmentSchema = z.object({
```

### Usage in `src\config\environment.ts`

Function call found at line 25

```typescript
const RepositoryEnvironmentSchema = z.object({
```

### Usage in `src\docs\ast-analyzer.ts`

Function call found at line 24

```typescript
export const ASTGrepMatchSchema = z.object({
```

### Usage in `src\docs\ast-analyzer.ts`

Function call found at line 27

```typescript
z.object({
```

### Usage in `src\docs\ast-analyzer.ts`

Function call found at line 28

```typescript
start: z.object({
```

### Usage in `src\docs\cli.ts`

Function call found at line 13

```typescript
export const DocCLIOptionsSchema = z.object({
```

### Usage in `src\docs\generator.ts`

Function call found at line 69

```typescript
export const GeneratorMetadataSchema = z.object({
```

### Usage in `src\docs\generator.ts`

Function call found at line 79

```typescript
export const GeneratorOptionsSchema = z.object({
```

### Usage in `src\docs\types.ts`

Function call found at line 15

```typescript
export const ASTNodeSchema = z.object({
```

### Usage in `src\learning\effectiveness-scorer.ts`

Function call found at line 55

```typescript
export const PatternUsageRecordSchema = z.object({
```

### Usage in `src\learning\nlp.ts`

Function call found at line 13

```typescript
.object({
```

### Usage in `src\learning\recommendation-engine.ts`

Function call found at line 11

```typescript
export const RecommendationRequestSchema = z.object({
```

### Usage in `src\learning\recommendation-engine.ts`

Function call found at line 12

```typescript
context: z.object({
```

### Usage in `src\learning\recommendation-engine.ts`

Function call found at line 20

```typescript
.object({
```

### Usage in `src\learning\reinforcement.ts`

Function call found at line 13

```typescript
.object({
```

### Usage in `src\learning\types.ts`

Function call found at line 12

```typescript
export const PatternFeatureVectorSchema = z.object({
```

### Usage in `src\learning\types.ts`

Function call found at line 15

```typescript
metadata: z.object({
```

### Usage in `src\llm-annotation\types.ts`

Function call found at line 4

```typescript
export const CodeContextSchema = z.object({
```

### Usage in `src\providers\llm-providers.ts`

Function call found at line 21

```typescript
export const LLMConfigSchema = z.object({
```

### Usage in `src\repository-manager.ts`

Function call found at line 10

```typescript
export const RepositoryConfigSchema = z.object({
```

### Usage in `src\scripts\enhance-commit-message.ts`

Function call found at line 19

```typescript
const FileChangeSchema = z.object({
```

### Usage in `src\scripts\enhance-commit-message.ts`

Function call found at line 28

```typescript
const CommitAnalysisSchema = z.object({
```

### Usage in `src\telemetry\types.ts`

Function call found at line 9

```typescript
export const TelemetryEventBaseSchema = z.object({
```

### Usage in `src\types.ts`

Function call found at line 21

```typescript
export const ComplexityMetricsSchema = z.object({
```

### Usage in `src\utils\config-validators.ts`

Function call found at line 12

```typescript
.object({
```

### Usage in `src\utils\index.ts`

Function call found at line 10

```typescript
const PatternsFileSchema = z.object({
```

### Usage in `src\utils\index.ts`

Function call found at line 15

```typescript
metadata: z.object({
```

### Usage in `src\utils\language-detection.ts`

Function call found at line 11

```typescript
export const LanguageMappingSchema = z.object({
```

### Usage in `src\utils\pattern-filtering.ts`

Function call found at line 13

```typescript
export const PatternFilterRequestSchema = z.object({
```

### Usage in `src\utils\yaml-handler.ts`

Function call found at line 39

```typescript
.object({
```

---

## array

### Usage in `src\actors\analysis.ts`

Function call found at line 13

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\analysis.ts`

Function call found at line 14

```typescript
patterns: z.array(z.any()), // AstPattern schema
```

### Usage in `src\actors\complexity.ts`

Function call found at line 9

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\complexity.ts`

Function call found at line 13

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\dafny.ts`

Function call found at line 8

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\git.ts`

Function call found at line 15

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\llm-testing-framework.ts`

Function call found at line 29

```typescript
patterns: z.array(z.string()), // Pattern IDs to apply
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Function call found at line 36

```typescript
patterns: z.array(z.string()),
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Function call found at line 37

```typescript
imports: z.array(z.string()),
```

### Usage in `src\actors\pattern-discovery.ts`

Function call found at line 22

```typescript
codeFiles: z.array(z.string()).optional(),
```

### Usage in `src\actors\pattern-discovery.ts`

Function call found at line 24

```typescript
.array(
```

### Usage in `src\actors\pattern-learning.ts`

Function call found at line 39

```typescript
filesModified: z.array(z.string()),
```

### Usage in `src\actors\template-engine.ts`

Function call found at line 37

```typescript
.array(z.enum(['function', 'class', 'method', 'arrow-function', 'block', 'module']))
```

### Usage in `src\actors\transformation-enhanced.ts`

Function call found at line 71

```typescript
targetFiles: z.array(z.string()),
```

### Usage in `src\actors\transformation-enhanced.ts`

Function call found at line 73

```typescript
patterns: z.array(z.any()).default([]), // Use existing AstPattern from types
```

### Usage in `src\actors\transformation.ts`

Function call found at line 17

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\transformation.ts`

Function call found at line 18

```typescript
patterns: z.array(
```

### Usage in `src\actors\validation.ts`

Function call found at line 74

```typescript
files: z.array(z.string()),
```

### Usage in `src\docs\cli.ts`

Function call found at line 16

```typescript
formats: z.array(DocumentationFormatSchema).optional(),
```

### Usage in `src\docs\cli.ts`

Function call found at line 17

```typescript
types: z.array(DocumentationTypeSchema).optional(),
```

### Usage in `src\docs\generator.ts`

Function call found at line 71

```typescript
sourceFiles: z.array(z.string()),
```

### Usage in `src\learning\nlp.ts`

Function call found at line 16

```typescript
languages: z.array(z.string()).default(['en']),
```

### Usage in `src\learning\types.ts`

Function call found at line 8

```typescript
export const VectorSchema = z.array(z.number());
```

### Usage in `src\llm-annotation\types.ts`

Function call found at line 10

```typescript
dependencies: z.array(z.string()),
```

### Usage in `src\llm-annotation\types.ts`

Function call found at line 11

```typescript
exports: z.array(z.string()),
```

### Usage in `src\repository-manager.ts`

Function call found at line 14

```typescript
includePatterns: z.array(z.string()).default(['**/*.ts', '**/*.js']),
```

### Usage in `src\scripts\enhance-commit-message.ts`

Function call found at line 29

```typescript
files: z.array(FileChangeSchema),
```

### Usage in `src\utils\config-validators.ts`

Function call found at line 13

```typescript
tags: z.union([z.string(), z.array(z.string())]).optional(),
```

### Usage in `src\utils\index.ts`

Function call found at line 13

```typescript
patterns: z.array(AstPatternSchema),
```

### Usage in `src\utils\index.ts`

Function call found at line 14

```typescript
categories: z.record(z.array(z.string())),
```

### Usage in `src\utils\language-detection.ts`

Function call found at line 14

```typescript
aliases: z.array(z.string()).default([]),
```

### Usage in `src\utils\pattern-filtering.ts`

Function call found at line 14

```typescript
patterns: z.array(AstPatternSchema),
```

### Usage in `src\utils\pattern-filtering.ts`

Function call found at line 15

```typescript
targetFiles: z.array(z.string().min(1)),
```

---

## string

### Usage in `src\actors\analysis.ts`

Function call found at line 13

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\ast-grep-transformation.ts`

Function call found at line 23

```typescript
id: z.string(),
```

### Usage in `src\actors\ast-grep-transformation.ts`

Function call found at line 30

```typescript
pattern: z.string().optional(),
```

### Usage in `src\actors\ast-grep-transformation.ts`

Function call found at line 31

```typescript
kind: z.string().optional(),
```

### Usage in `src\actors\ast-grep-transformation.ts`

Function call found at line 32

```typescript
regex: z.string().optional(),
```

### Usage in `src\actors\complexity.ts`

Function call found at line 9

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\complexity.ts`

Function call found at line 13

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\dafny.ts`

Function call found at line 8

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\dafny.ts`

Function call found at line 10

```typescript
originalCode: z.string().optional(),
```

### Usage in `src\actors\dafny.ts`

Function call found at line 11

```typescript
transformedCode: z.string().optional(),
```

### Usage in `src\actors\feedback-loop.ts`

Function call found at line 18

```typescript
patternId: z.string(),
```

### Usage in `src\actors\feedback-loop.ts`

Function call found at line 19

```typescript
transformationId: z.string(),
```

### Usage in `src\actors\git.ts`

Function call found at line 10

```typescript
description: z.string(),
```

### Usage in `src\actors\git.ts`

Function call found at line 14

```typescript
message: z.string(),
```

### Usage in `src\actors\git.ts`

Function call found at line 15

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\llm-testing-framework.ts`

Function call found at line 21

```typescript
id: z.string(),
```

### Usage in `src\actors\llm-testing-framework.ts`

Function call found at line 22

```typescript
name: z.string(),
```

### Usage in `src\actors\llm-testing-framework.ts`

Function call found at line 23

```typescript
description: z.string(),
```

### Usage in `src\actors\llm-testing-framework.ts`

Function call found at line 27

```typescript
code: z.string(),
```

### Usage in `src\actors\llm-testing-framework.ts`

Function call found at line 29

```typescript
patterns: z.array(z.string()), // Pattern IDs to apply
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Function call found at line 33

```typescript
language: z.string(),
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Function call found at line 34

```typescript
framework: z.string().optional(),
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Function call found at line 36

```typescript
patterns: z.array(z.string()),
```

### Usage in `src\actors\llm-transformation.ts`

Function call found at line 26

```typescript
apiKey: z.string().optional(),
```

### Usage in `src\actors\llm-transformation.ts`

Function call found at line 27

```typescript
model: z.string().default('gpt-4'),
```

### Usage in `src\actors\llm-transformation.ts`

Function call found at line 28

```typescript
baseURL: z.string().optional(), // For local models
```

### Usage in `src\actors\pattern-discovery.ts`

Function call found at line 22

```typescript
codeFiles: z.array(z.string()).optional(),
```

### Usage in `src\actors\pattern-discovery.ts`

Function call found at line 26

```typescript
path: z.string(),
```

### Usage in `src\actors\pattern-learning.ts`

Function call found at line 37

```typescript
id: z.string(),
```

### Usage in `src\actors\pattern-learning.ts`

Function call found at line 39

```typescript
filesModified: z.array(z.string()),
```

### Usage in `src\actors\template-engine.ts`

Function call found at line 23

```typescript
id: z.string(),
```

### Usage in `src\actors\template-engine.ts`

Function call found at line 29

```typescript
template: z.string(),
```

### Usage in `src\actors\template-engine.ts`

Function call found at line 31

```typescript
flags: z.string().optional().default('g'),
```

### Usage in `src\actors\transformation-enhanced.ts`

Function call found at line 71

```typescript
targetFiles: z.array(z.string()),
```

### Usage in `src\actors\transformation.ts`

Function call found at line 17

```typescript
files: z.array(z.string()),
```

### Usage in `src\actors\transformation.ts`

Function call found at line 20

```typescript
id: z.string(),
```

### Usage in `src\actors\transformation.ts`

Function call found at line 21

```typescript
language: z.string(),
```

### Usage in `src\actors\transformation.ts`

Function call found at line 22

```typescript
pattern: z.string(),
```

### Usage in `src\actors\transformation.ts`

Function call found at line 23

```typescript
replacement: z.string(),
```

### Usage in `src\actors\typescript-error-resolver.ts`

Function call found at line 16

```typescript
file: z.string(),
```

### Usage in `src\actors\typescript-error-resolver.ts`

Function call found at line 21

```typescript
messageText: z.string(),
```

### Usage in `src\actors\typescript-error-resolver.ts`

Function call found at line 22

```typescript
source: z.string().optional(),
```

### Usage in `src\config\environment.ts`

Function call found at line 19

```typescript
CARMACK_VERSION: z.string().default('1.0.0'),
```

### Usage in `src\config\environment.ts`

Function call found at line 26

```typescript
CARMACK_REPOSITORY_URL: z.string().url().optional(),
```

### Usage in `src\config\environment.ts`

Function call found at line 27

```typescript
REPOSITORY_URL: z.string().url().optional(),
```

### Usage in `src\docs\ast-analyzer.ts`

Function call found at line 25

```typescript
text: z.function().returns(z.string()),
```

### Usage in `src\docs\cli.ts`

Function call found at line 14

```typescript
sourceDir: z.string().optional(),
```

### Usage in `src\docs\cli.ts`

Function call found at line 15

```typescript
outputDir: z.string().optional(),
```

### Usage in `src\docs\generator.ts`

Function call found at line 70

```typescript
generatedAt: z.string(),
```

### Usage in `src\docs\generator.ts`

Function call found at line 71

```typescript
sourceFiles: z.array(z.string()),
```

### Usage in `src\docs\types.ts`

Function call found at line 16

```typescript
type: z.string(),
```

### Usage in `src\docs\types.ts`

Function call found at line 17

```typescript
name: z.string().optional(),
```

### Usage in `src\docs\types.ts`

Function call found at line 20

```typescript
filePath: z.string(),
```

### Usage in `src\docs\types.ts`

Function call found at line 21

```typescript
content: z.string(),
```

### Usage in `src\learning\effectiveness-scorer.ts`

Function call found at line 56

```typescript
patternId: z.string(),
```

### Usage in `src\learning\nlp.ts`

Function call found at line 14

```typescript
embeddingModel: z.string().default('sentence-transformers'),
```

### Usage in `src\learning\nlp.ts`

Function call found at line 16

```typescript
languages: z.array(z.string()).default(['en']),
```

### Usage in `src\learning\recommendation-engine.ts`

Function call found at line 13

```typescript
projectType: z.string(),
```

### Usage in `src\learning\types.ts`

Function call found at line 13

```typescript
patternId: z.string(),
```

### Usage in `src\learning\types.ts`

Function call found at line 16

```typescript
language: z.string(),
```

### Usage in `src\learning\types.ts`

Function call found at line 19

```typescript
category: z.string(),
```

### Usage in `src\llm-annotation\types.ts`

Function call found at line 5

```typescript
filePath: z.string(),
```

### Usage in `src\llm-annotation\types.ts`

Function call found at line 6

```typescript
language: z.string(),
```

### Usage in `src\llm-annotation\types.ts`

Function call found at line 7

```typescript
framework: z.string().optional(),
```

### Usage in `src\llm-annotation\types.ts`

Function call found at line 8

```typescript
purpose: z.string(),
```

### Usage in `src\llm-annotation\types.ts`

Function call found at line 10

```typescript
dependencies: z.array(z.string()),
```

### Usage in `src\providers\llm-providers.ts`

Function call found at line 23

```typescript
apiKey: z.string().optional(),
```

### Usage in `src\providers\llm-providers.ts`

Function call found at line 24

```typescript
model: z.string().default('gpt-4'),
```

### Usage in `src\providers\llm-providers.ts`

Function call found at line 25

```typescript
baseURL: z.string().optional(),
```

### Usage in `src\repository-manager.ts`

Function call found at line 11

```typescript
url: z.string().url(),
```

### Usage in `src\repository-manager.ts`

Function call found at line 12

```typescript
branch: z.string().default('main'),
```

### Usage in `src\repository-manager.ts`

Function call found at line 13

```typescript
targetDirectory: z.string().optional(),
```

### Usage in `src\repository-manager.ts`

Function call found at line 14

```typescript
includePatterns: z.array(z.string()).default(['**/*.ts', '**/*.js']),
```

### Usage in `src\scripts\enhance-commit-message.ts`

Function call found at line 20

```typescript
file: z.string(),
```

### Usage in `src\scripts\enhance-commit-message.ts`

Function call found at line 25

```typescript
language: z.string().optional(),
```

### Usage in `src\telemetry\types.ts`

Function call found at line 11

```typescript
eventId: z.string().uuid(),
```

### Usage in `src\telemetry\types.ts`

Function call found at line 15

```typescript
sessionId: z.string().uuid(),
```

### Usage in `src\telemetry\types.ts`

Function call found at line 17

```typescript
userId: z.string().optional(),
```

### Usage in `src\types.ts`

Function call found at line 4

```typescript
export const FilePathSchema = z.string().min(1);
```

### Usage in `src\types.ts`

Function call found at line 5

```typescript
export const GitHashSchema = z.string().regex(/^[a-f0-9]{40}$/);
```

### Usage in `src\utils\config-validators.ts`

Function call found at line 13

```typescript
tags: z.union([z.string(), z.array(z.string())]).optional(),
```

### Usage in `src\utils\config-validators.ts`

Function call found at line 13

```typescript
tags: z.union([z.string(), z.array(z.string())]).optional(),
```

### Usage in `src\utils\config-validators.ts`

Function call found at line 14

```typescript
run: z.string(),
```

### Usage in `src\utils\config-validators.ts`

Function call found at line 15

```typescript
glob: z.string().optional(),
```

### Usage in `src\utils\config-validators.ts`

Function call found at line 16

```typescript
fail_text: z.string().optional(),
```

### Usage in `src\utils\index.ts`

Function call found at line 11

```typescript
version: z.string(),
```

### Usage in `src\utils\index.ts`

Function call found at line 12

```typescript
description: z.string(),
```

### Usage in `src\utils\index.ts`

Function call found at line 14

```typescript
categories: z.record(z.array(z.string())),
```

### Usage in `src\utils\index.ts`

Function call found at line 16

```typescript
created: z.string(),
```

### Usage in `src\utils\index.ts`

Function call found at line 17

```typescript
author: z.string(),
```

### Usage in `src\utils\language-detection.ts`

Function call found at line 12

```typescript
extension: z.string(),
```

### Usage in `src\utils\language-detection.ts`

Function call found at line 13

```typescript
language: z.string(),
```

### Usage in `src\utils\language-detection.ts`

Function call found at line 14

```typescript
aliases: z.array(z.string()).default([]),
```

### Usage in `src\utils\language-detection.ts`

Function call found at line 15

```typescript
framework: z.string().optional(),
```

### Usage in `src\utils\pattern-filtering.ts`

Function call found at line 15

```typescript
targetFiles: z.array(z.string().min(1)),
```

---

## any

### Usage in `src\actors\analysis.ts`

Function call found at line 14

```typescript
patterns: z.array(z.any()), // AstPattern schema
```

### Usage in `src\actors\analysis.ts`

Function call found at line 15

```typescript
request: z.any().optional(), // TransformationRequest schema
```

### Usage in `src\actors\complexity.ts`

Function call found at line 10

```typescript
metrics: z.any().optional(), // ComplexityMetrics schema
```

### Usage in `src\actors\complexity.ts`

Function call found at line 14

```typescript
baseline: z.any().optional(), // ComplexityMetrics schema
```

### Usage in `src\actors\transformation-enhanced.ts`

Function call found at line 73

```typescript
patterns: z.array(z.any()).default([]), // Use existing AstPattern from types
```

---

## optional

### Usage in `src\actors\analysis.ts`

Function call found at line 15

```typescript
request: z.any().optional(), // TransformationRequest schema
```

### Usage in `src\actors\ast-grep-transformation.ts`

Function call found at line 30

```typescript
pattern: z.string().optional(),
```

### Usage in `src\actors\ast-grep-transformation.ts`

Function call found at line 31

```typescript
kind: z.string().optional(),
```

### Usage in `src\actors\complexity.ts`

Function call found at line 10

```typescript
metrics: z.any().optional(), // ComplexityMetrics schema
```

### Usage in `src\actors\dafny.ts`

Function call found at line 9

```typescript
transformationMode: z.enum(['template', 'ast', 'llm']).optional(),
```

### Usage in `src\actors\dafny.ts`

Function call found at line 10

```typescript
originalCode: z.string().optional(),
```

### Usage in `src\actors\dafny.ts`

Function call found at line 11

```typescript
transformedCode: z.string().optional(),
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Function call found at line 34

```typescript
framework: z.string().optional(),
```

### Usage in `src\actors\llm-transformation.ts`

Function call found at line 26

```typescript
apiKey: z.string().optional(),
```

### Usage in `src\actors\llm-transformation.ts`

Function call found at line 28

```typescript
baseURL: z.string().optional(), // For local models
```

### Usage in `src\actors\pattern-discovery.ts`

Function call found at line 22

```typescript
codeFiles: z.array(z.string()).optional(),
```

### Usage in `src\actors\template-engine.ts`

Function call found at line 31

```typescript
flags: z.string().optional().default('g'),
```

### Usage in `src\actors\typescript-error-resolver.ts`

Function call found at line 22

```typescript
source: z.string().optional(),
```

### Usage in `src\config\environment.ts`

Function call found at line 26

```typescript
CARMACK_REPOSITORY_URL: z.string().url().optional(),
```

### Usage in `src\docs\cli.ts`

Function call found at line 14

```typescript
sourceDir: z.string().optional(),
```

### Usage in `src\docs\cli.ts`

Function call found at line 15

```typescript
outputDir: z.string().optional(),
```

### Usage in `src\docs\cli.ts`

Function call found at line 16

```typescript
formats: z.array(DocumentationFormatSchema).optional(),
```

### Usage in `src\docs\cli.ts`

Function call found at line 17

```typescript
types: z.array(DocumentationTypeSchema).optional(),
```

### Usage in `src\docs\types.ts`

Function call found at line 17

```typescript
name: z.string().optional(),
```

### Usage in `src\llm-annotation\types.ts`

Function call found at line 7

```typescript
framework: z.string().optional(),
```

### Usage in `src\providers\llm-providers.ts`

Function call found at line 23

```typescript
apiKey: z.string().optional(),
```

### Usage in `src\providers\llm-providers.ts`

Function call found at line 25

```typescript
baseURL: z.string().optional(),
```

### Usage in `src\repository-manager.ts`

Function call found at line 13

```typescript
targetDirectory: z.string().optional(),
```

### Usage in `src\scripts\enhance-commit-message.ts`

Function call found at line 25

```typescript
language: z.string().optional(),
```

### Usage in `src\utils\config-validators.ts`

Function call found at line 13

```typescript
tags: z.union([z.string(), z.array(z.string())]).optional(),
```

### Usage in `src\utils\config-validators.ts`

Function call found at line 15

```typescript
glob: z.string().optional(),
```

### Usage in `src\utils\language-detection.ts`

Function call found at line 15

```typescript
framework: z.string().optional(),
```

---

## literal

### Usage in `src\actors\analysis.ts`

Function call found at line 18

```typescript
operation: z.literal('learn'),
```

### Usage in `src\actors\git.ts`

Function call found at line 9

```typescript
operation: z.literal('createCheckpoint'),
```

### Usage in `src\actors\git.ts`

Function call found at line 13

```typescript
operation: z.literal('commit'),
```

### Usage in `src\actors\validation.ts`

Function call found at line 73

```typescript
type: z.literal('format'),
```

---

##  fromPromise 

### Usage in `src\actors\analysis.ts`

Import statement found at line 1

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\ast-grep-transformation.ts`

Import statement found at line 3

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\complexity.ts`

Import statement found at line 2

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\dafny.ts`

Import statement found at line 2

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\feedback-loop.ts`

Import statement found at line 1

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\git.ts`

Import statement found at line 2

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\llm-testing-framework.ts`

Import statement found at line 3

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Import statement found at line 11

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\llm-transformation.ts`

Import statement found at line 2

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\pattern-discovery.ts`

Import statement found at line 2

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\pattern-learning.ts`

Import statement found at line 2

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\template-engine.ts`

Import statement found at line 2

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\transformation.ts`

Import statement found at line 4

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\typescript-error-resolver.ts`

Import statement found at line 11

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\actors\validation.ts`

Import statement found at line 3

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\docs\ast-analyzer.ts`

Import statement found at line 1

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\docs\generator.ts`

Import statement found at line 1

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\llm-annotation\analyzer.ts`

Import statement found at line 2

```typescript
import { fromPromise } from 'xstate'
```

### Usage in `src\llm-annotation\index.ts`

Import statement found at line 1

```typescript
import { fromPromise } from 'xstate'
```

---

##  z 

### Usage in `src\actors\analysis.ts`

Import statement found at line 2

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\ast-grep-transformation.ts`

Import statement found at line 4

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\complexity.ts`

Import statement found at line 3

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\dafny.ts`

Import statement found at line 3

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\feedback-loop.ts`

Import statement found at line 2

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\git.ts`

Import statement found at line 3

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\llm-testing-framework.ts`

Import statement found at line 4

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Import statement found at line 12

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\llm-transformation.ts`

Import statement found at line 3

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\pattern-discovery.ts`

Import statement found at line 3

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\pattern-learning.ts`

Import statement found at line 3

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\template-engine.ts`

Import statement found at line 3

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\transformation-enhanced.ts`

Import statement found at line 4

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\transformation.ts`

Import statement found at line 5

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\typescript-error-resolver.ts`

Import statement found at line 12

```typescript
import { z } from 'zod'
```

### Usage in `src\actors\validation.ts`

Import statement found at line 4

```typescript
import { z } from 'zod'
```

### Usage in `src\config\environment.ts`

Import statement found at line 8

```typescript
import { z } from 'zod'
```

### Usage in `src\docs\ast-analyzer.ts`

Import statement found at line 2

```typescript
import { z } from 'zod'
```

### Usage in `src\docs\cli.ts`

Import statement found at line 8

```typescript
import { z } from 'zod'
```

### Usage in `src\docs\generator.ts`

Import statement found at line 2

```typescript
import { z } from 'zod'
```

### Usage in `src\docs\types.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\learning\effectiveness-scorer.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\learning\nlp.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\learning\recommendation-engine.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\learning\reinforcement.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\learning\similarity.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\learning\types.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\llm-annotation\types.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\pipeline\production-pipeline.ts`

Import statement found at line 4

```typescript
import { z } from 'zod'
```

### Usage in `src\providers\llm-providers.ts`

Import statement found at line 12

```typescript
import { z } from 'zod'
```

### Usage in `src\repository-manager.ts`

Import statement found at line 2

```typescript
import { z } from 'zod'
```

### Usage in `src\scripts\enhance-commit-message.ts`

Import statement found at line 16

```typescript
import { z } from 'zod'
```

### Usage in `src\telemetry\types.ts`

Import statement found at line 6

```typescript
import { z } from 'zod'
```

### Usage in `src\types.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\utils\config-validators.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\utils\index.ts`

Import statement found at line 2

```typescript
import { z } from 'zod'
```

### Usage in `src\utils\language-detection.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\utils\pattern-filtering.ts`

Import statement found at line 1

```typescript
import { z } from 'zod'
```

### Usage in `src\utils\yaml-handler.ts`

Import statement found at line 3

```typescript
import { z } from 'zod'
```

---

## enum

### Usage in `src\actors\ast-grep-transformation.ts`

Function call found at line 24

```typescript
language: z.enum(['typescript', 'javascript']),
```

### Usage in `src\actors\dafny.ts`

Function call found at line 9

```typescript
transformationMode: z.enum(['template', 'ast', 'llm']).optional(),
```

### Usage in `src\actors\llm-testing-framework.ts`

Function call found at line 28

```typescript
language: z.enum(['typescript', 'javascript']),
```

### Usage in `src\actors\llm-transformation.ts`

Function call found at line 20

```typescript
const LLMProviderSchema = z.enum(['openai', 'anthropic', 'openrouter', 'local', 'mock']);
```

### Usage in `src\actors\pattern-discovery.ts`

Function call found at line 18

```typescript
operation: z.enum(['discover', 'analyze', 'generate', 'validate']),
```

### Usage in `src\actors\pattern-discovery.ts`

Function call found at line 27

```typescript
language: z.enum(['typescript', 'javascript']),
```

### Usage in `src\actors\pattern-learning.ts`

Function call found at line 34

```typescript
operation: z.enum(['learn', 'discover', 'optimize', 'evaluate']),
```

### Usage in `src\actors\pattern-learning.ts`

Function call found at line 38

```typescript
mode: z.enum(['template', 'ast', 'llm']),
```

### Usage in `src\actors\template-engine.ts`

Function call found at line 24

```typescript
language: z.enum(['typescript', 'javascript']),
```

### Usage in `src\actors\transformation-enhanced.ts`

Function call found at line 72

```typescript
transformationType: z.enum(['template', 'ast', 'llm', 'auto']).default('auto'),
```

### Usage in `src\actors\transformation.ts`

Function call found at line 16

```typescript
mode: z.enum(['template', 'ast', 'llm']),
```

### Usage in `src\actors\typescript-error-resolver.ts`

Function call found at line 20

```typescript
category: z.enum(['error', 'warning', 'suggestion']),
```

### Usage in `src\config\environment.ts`

Function call found at line 18

```typescript
NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
```

### Usage in `src\docs\types.ts`

Function call found at line 4

```typescript
export const DocumentationTypeSchema = z.enum([
```

### Usage in `src\docs\types.ts`

Function call found at line 12

```typescript
export const DocumentationFormatSchema = z.enum(['markdown', 'html', 'json', 'yaml']);
```

### Usage in `src\learning\recommendation-engine.ts`

Function call found at line 15

```typescript
teamExperience: z.enum(['junior', 'mid', 'senior', 'expert']),
```

### Usage in `src\learning\recommendation-engine.ts`

Function call found at line 16

```typescript
timeConstraints: z.enum(['tight', 'moderate', 'flexible']),
```

### Usage in `src\learning\recommendation-engine.ts`

Function call found at line 17

```typescript
qualityRequirements: z.enum(['high', 'medium', 'low', 'critical']),
```

### Usage in `src\learning\reinforcement.ts`

Function call found at line 14

```typescript
algorithm: z.enum(['q-learning', 'policy-gradient', 'actor-critic']).default('q-learning'),
```

### Usage in `src\learning\types.ts`

Function call found at line 18

```typescript
riskLevel: z.enum(['low', 'medium', 'high']),
```

### Usage in `src\learning\types.ts`

Function call found at line 20

```typescript
transformationType: z.enum(['template', 'ast', 'llm']),
```

### Usage in `src\providers\llm-providers.ts`

Function call found at line 19

```typescript
export const LLMProviderSchema = z.enum(['openai', 'anthropic', 'openrouter', 'local', 'mock']);
```

### Usage in `src\scripts\enhance-commit-message.ts`

Function call found at line 21

```typescript
status: z.enum(['A', 'M', 'D', 'R', 'C']), // Added, Modified, Deleted, Renamed, Copied
```

### Usage in `src\scripts\enhance-commit-message.ts`

Function call found at line 24

```typescript
type: z.enum(['source', 'test', 'config', 'docs', 'build']),
```

### Usage in `src\types.ts`

Function call found at line 9

```typescript
export const TransformationModeSchema = z.enum(['template', 'ast', 'llm']);
```

### Usage in `src\types.ts`

Function call found at line 10

```typescript
export const TransformationStatusSchema = z.enum([
```

### Usage in `src\utils\language-detection.ts`

Function call found at line 16

```typescript
category: z.enum(['programming', 'markup', 'config', 'data']).default('programming'),
```

---

## RegExp

### Usage in `src\actors\ast-grep-transformation.ts`

Class instantiation found at line 577

```typescript
const match = nodeText.match(new RegExp(regexPattern));
```

### Usage in `src\actors\ast-grep-transformation.ts`

Class instantiation found at line 715

```typescript
replacement = replacement.replace(new RegExp(`\\$\\$\\$${varName}`, 'g'), transformedValue);
```

### Usage in `src\actors\ast-grep-transformation.ts`

Class instantiation found at line 716

```typescript
replacement = replacement.replace(new RegExp(`\\$${varName}`, 'g'), transformedValue);
```

### Usage in `src\actors\llm-testing-framework.ts`

Class instantiation found at line 484

```typescript
const regex = new RegExp(assertion.value);
```

### Usage in `src\actors\template-engine.ts`

Class instantiation found at line 569

```typescript
regex: new RegExp(regexPattern, 'g'),
```

### Usage in `src\actors\template-engine.ts`

Class instantiation found at line 691

```typescript
const reassignmentPattern = new RegExp(`\\b${varName}\\s*=\\s*[^=]`, 'g');
```

### Usage in `src\actors\template-engine.ts`

Class instantiation found at line 1035

```typescript
replacement = replacement.replace(new RegExp(`\\$${variable.name}`, 'g'), value);
```

### Usage in `src\actors\template-engine.ts`

Class instantiation found at line 1051

```typescript
new RegExp(`\\b${varName}\\b`, 'g'),
```

### Usage in `src\actors\transformation.ts`

Class instantiation found at line 287

```typescript
.some((laterLine) => laterLine && new RegExp(`\\b${varName}\\s*=\\s*[^=]`).test(laterLine));
```

### Usage in `src\actors\transformation.ts`

Class instantiation found at line 702

```typescript
const regex = new RegExp(pattern.pattern, 'g');
```

### Usage in `src\actors\typescript-error-resolver.ts`

Class instantiation found at line 342

```typescript
const regex = new RegExp(resolution.pattern, 'g');
```

### Usage in `src\learning\similarity.ts`

Class instantiation found at line 149

```typescript
const count = (text.match(new RegExp(keyword, 'gi')) || []).length;
```

### Usage in `src\llm-annotation\analyzer.ts`

Class instantiation found at line 152

```typescript
const importMatches = content.match(new RegExp(importPattern, 'g'));
```

### Usage in `src\llm-annotation\analyzer.ts`

Class instantiation found at line 165

```typescript
const exportMatches = content.match(new RegExp(exportPattern, 'g'));
```

### Usage in `src\llm-annotation\analyzer.ts`

Class instantiation found at line 180

```typescript
const matches = content.match(new RegExp(pattern, 'g'));
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Class instantiation found at line 202

```typescript
const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
```

---

##  readFile, writeFile 

### Usage in `src\actors\ast-grep-transformation.ts`

Import statement found at line 1

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Import statement found at line 10

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

### Usage in `src\actors\llm-transformation.ts`

Import statement found at line 1

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

### Usage in `src\actors\pattern-learning.ts`

Import statement found at line 1

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

### Usage in `src\actors\template-engine.ts`

Import statement found at line 1

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

### Usage in `src\actors\transformation.ts`

Import statement found at line 1

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

### Usage in `src\actors\typescript-error-resolver.ts`

Import statement found at line 10

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

### Usage in `src\scripts\enhance-commit-message.ts`

Import statement found at line 14

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

### Usage in `src\scripts\pre-commit-imports.ts`

Import statement found at line 9

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

### Usage in `src\utils\index.ts`

Import statement found at line 1

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

### Usage in `src\utils\yaml-handler.ts`

Import statement found at line 1

```typescript
import { readFile, writeFile } from 'node:fs/promises'
```

---

##  js, type SgNode, type SgRoot, ts 

### Usage in `src\actors\ast-grep-transformation.ts`

Import statement found at line 2

```typescript
import { js, type SgNode, type SgRoot, ts } from '@ast-grep/napi'
```

---

##  readFile 

### Usage in `src\actors\complexity.ts`

Import statement found at line 1

```typescript
import { readFile } from 'node:fs/promises'
```

### Usage in `src\actors\pattern-discovery.ts`

Import statement found at line 1

```typescript
import { readFile } from 'node:fs/promises'
```

---

## fromPromise

### Usage in `src\actors\dafny.ts`

Function call found at line 23

```typescript
export const dafnyActor = fromPromise(async ({ input }: { input: DafnyInput }) => {
```

---

## Promise

### Usage in `src\actors\dafny.ts`

Class instantiation found at line 241

```typescript
await new Promise((resolve) => setTimeout(resolve, Math.min(conditions.length * 50, 2000)));
```

### Usage in `src\actors\llm-testing-framework.ts`

Class instantiation found at line 372

```typescript
await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 10));
```

### Usage in `src\actors\llm-transformation.ts`

Class instantiation found at line 447

```typescript
await new Promise((resolve) => setTimeout(resolve, delay));
```

### Usage in `src\actors\llm-transformation.ts`

Class instantiation found at line 506

```typescript
await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
```

### Usage in `src\actors\transformation.ts`

Class instantiation found at line 640

```typescript
return `function ${funcName}(): Promise<unknown> {${beforeCallback}return new Promise((resolve, reject) => {
```

### Usage in `src\providers\llm-providers.ts`

Class instantiation found at line 180

```typescript
await new Promise((resolve) => setTimeout(resolve, waitTime));
```

### Usage in `src\repository-manager.ts`

Class instantiation found at line 152

```typescript
await new Promise((resolve, reject) => {
```

### Usage in `src\utils\index.ts`

Class instantiation found at line 126

```typescript
await new Promise((resolve) => setTimeout(resolve, delay));
```

---

##  rm 

### Usage in `src\actors\dafny.ts`

Import statement found at line 1

```typescript
import { rm } from 'node:fs/promises'
```

---

## boolean

### Usage in `src\actors\feedback-loop.ts`

Function call found at line 20

```typescript
success: z.boolean(),
```

### Usage in `src\docs\cli.ts`

Function call found at line 18

```typescript
watch: z.boolean().optional(),
```

### Usage in `src\learning\effectiveness-scorer.ts`

Function call found at line 58

```typescript
success: z.boolean(),
```

### Usage in `src\utils\pattern-filtering.ts`

Function call found at line 17

```typescript
strictLanguageMatching: z.boolean().default(true),
```

---

## number

### Usage in `src\actors\feedback-loop.ts`

Function call found at line 21

```typescript
executionTime: z.number(), // milliseconds
```

### Usage in `src\actors\feedback-loop.ts`

Function call found at line 22

```typescript
codeQualityImprovement: z.number().min(-1).max(1), // -1 to 1 scale
```

### Usage in `src\actors\feedback-loop.ts`

Function call found at line 23

```typescript
userRating: z.number().min(1).max(5).optional(),
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Function call found at line 35

```typescript
complexity: z.number().min(0).max(25),
```

### Usage in `src\actors\llm-transformation.ts`

Function call found at line 29

```typescript
maxTokens: z.number().default(4000),
```

### Usage in `src\actors\pattern-learning.ts`

Function call found at line 42

```typescript
cyclomaticComplexity: z.number().int().min(0),
```

### Usage in `src\actors\transformation-enhanced.ts`

Function call found at line 74

```typescript
maxComplexity: z.number().default(15),
```

### Usage in `src\actors\typescript-error-resolver.ts`

Function call found at line 17

```typescript
line: z.number(),
```

### Usage in `src\actors\typescript-error-resolver.ts`

Function call found at line 18

```typescript
column: z.number(),
```

### Usage in `src\actors\typescript-error-resolver.ts`

Function call found at line 19

```typescript
code: z.number(),
```

### Usage in `src\docs\ast-analyzer.ts`

Function call found at line 29

```typescript
index: z.number(),
```

### Usage in `src\docs\ast-analyzer.ts`

Function call found at line 30

```typescript
line: z.number(),
```

### Usage in `src\docs\generator.ts`

Function call found at line 72

```typescript
totalFunctions: z.number(),
```

### Usage in `src\docs\generator.ts`

Function call found at line 73

```typescript
totalClasses: z.number(),
```

### Usage in `src\docs\generator.ts`

Function call found at line 74

```typescript
totalModules: z.number(),
```

### Usage in `src\docs\generator.ts`

Function call found at line 75

```typescript
totalPatterns: z.number(),
```

### Usage in `src\docs\generator.ts`

Function call found at line 76

```typescript
generationTime: z.number(),
```

### Usage in `src\docs\types.ts`

Function call found at line 18

```typescript
startLine: z.number(),
```

### Usage in `src\docs\types.ts`

Function call found at line 19

```typescript
endLine: z.number(),
```

### Usage in `src\learning\effectiveness-scorer.ts`

Function call found at line 57

```typescript
timestamp: z.number(),
```

### Usage in `src\learning\effectiveness-scorer.ts`

Function call found at line 59

```typescript
performanceMs: z.number().min(0),
```

### Usage in `src\learning\effectiveness-scorer.ts`

Function call found at line 60

```typescript
userRating: z.number().min(0).max(10).optional(),
```

### Usage in `src\learning\nlp.ts`

Function call found at line 15

```typescript
maxTokens: z.number().int().positive().default(512),
```

### Usage in `src\learning\recommendation-engine.ts`

Function call found at line 14

```typescript
codebaseComplexity: z.number().min(1).max(10),
```

### Usage in `src\learning\reinforcement.ts`

Function call found at line 15

```typescript
learningRate: z.number().min(0).max(1).default(0.1),
```

### Usage in `src\learning\reinforcement.ts`

Function call found at line 16

```typescript
discountFactor: z.number().min(0).max(1).default(0.9),
```

### Usage in `src\learning\types.ts`

Function call found at line 8

```typescript
export const VectorSchema = z.array(z.number());
```

### Usage in `src\learning\types.ts`

Function call found at line 17

```typescript
complexity: z.number(),
```

### Usage in `src\llm-annotation\types.ts`

Function call found at line 9

```typescript
complexity: z.number(),
```

### Usage in `src\providers\llm-providers.ts`

Function call found at line 26

```typescript
maxTokens: z.number().default(4000),
```

### Usage in `src\scripts\enhance-commit-message.ts`

Function call found at line 22

```typescript
insertions: z.number(),
```

### Usage in `src\scripts\enhance-commit-message.ts`

Function call found at line 23

```typescript
deletions: z.number(),
```

### Usage in `src\telemetry\types.ts`

Function call found at line 13

```typescript
timestamp: z.number().int().positive(),
```

### Usage in `src\types.ts`

Function call found at line 6

```typescript
export const TimestampSchema = z.number().int().positive();
```

### Usage in `src\utils\pattern-filtering.ts`

Function call found at line 18

```typescript
maxComplexity: z.number().int().min(1).max(10).default(10),
```

### Usage in `src\utils\yaml-handler.ts`

Function call found at line 40

```typescript
indent: z.number().int().min(1).max(8).default(2),
```

---

## min

### Usage in `src\actors\feedback-loop.ts`

Function call found at line 22

```typescript
codeQualityImprovement: z.number().min(-1).max(1), // -1 to 1 scale
```

### Usage in `src\actors\feedback-loop.ts`

Function call found at line 23

```typescript
userRating: z.number().min(1).max(5).optional(),
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Function call found at line 35

```typescript
complexity: z.number().min(0).max(25),
```

### Usage in `src\learning\effectiveness-scorer.ts`

Function call found at line 59

```typescript
performanceMs: z.number().min(0),
```

### Usage in `src\learning\effectiveness-scorer.ts`

Function call found at line 60

```typescript
userRating: z.number().min(0).max(10).optional(),
```

### Usage in `src\learning\recommendation-engine.ts`

Function call found at line 14

```typescript
codebaseComplexity: z.number().min(1).max(10),
```

### Usage in `src\learning\reinforcement.ts`

Function call found at line 15

```typescript
learningRate: z.number().min(0).max(1).default(0.1),
```

### Usage in `src\learning\reinforcement.ts`

Function call found at line 16

```typescript
discountFactor: z.number().min(0).max(1).default(0.9),
```

### Usage in `src\types.ts`

Function call found at line 4

```typescript
export const FilePathSchema = z.string().min(1);
```

### Usage in `src\utils\pattern-filtering.ts`

Function call found at line 15

```typescript
targetFiles: z.array(z.string().min(1)),
```

### Usage in `src\utils\pattern-filtering.ts`

Function call found at line 18

```typescript
maxComplexity: z.number().int().min(1).max(10).default(10),
```

### Usage in `src\utils\yaml-handler.ts`

Function call found at line 40

```typescript
indent: z.number().int().min(1).max(8).default(2),
```

---

## max

### Usage in `src\actors\feedback-loop.ts`

Function call found at line 22

```typescript
codeQualityImprovement: z.number().min(-1).max(1), // -1 to 1 scale
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Function call found at line 35

```typescript
complexity: z.number().min(0).max(25),
```

### Usage in `src\learning\effectiveness-scorer.ts`

Function call found at line 60

```typescript
userRating: z.number().min(0).max(10).optional(),
```

### Usage in `src\learning\recommendation-engine.ts`

Function call found at line 14

```typescript
codebaseComplexity: z.number().min(1).max(10),
```

### Usage in `src\learning\reinforcement.ts`

Function call found at line 15

```typescript
learningRate: z.number().min(0).max(1).default(0.1),
```

### Usage in `src\learning\reinforcement.ts`

Function call found at line 16

```typescript
discountFactor: z.number().min(0).max(1).default(0.9),
```

### Usage in `src\learning\similarity.ts`

Function call found at line 30

```typescript
const maxLength = Math.max(vector1.features.length, vector2.features.length);
```

### Usage in `src\utils\yaml-handler.ts`

Function call found at line 40

```typescript
indent: z.number().int().min(1).max(8).default(2),
```

---

## Error

### Usage in `src\actors\feedback-loop.ts`

Class instantiation found at line 180

```typescript
throw new Error(`Unknown operation: ${request.operation}`);
```

### Usage in `src\actors\git.ts`

Class instantiation found at line 46

```typescript
throw new Error('Unknown git operation');
```

### Usage in `src\actors\git.ts`

Class instantiation found at line 59

```typescript
throw new Error('Not a git repository');
```

### Usage in `src\actors\git.ts`

Class instantiation found at line 109

```typescript
throw new Error('Not a git repository');
```

### Usage in `src\actors\git.ts`

Class instantiation found at line 153

```typescript
throw new Error('Not a git repository');
```

### Usage in `src\actors\git.ts`

Class instantiation found at line 164

```typescript
throw new Error(
```

### Usage in `src\actors\llm-testing-framework.ts`

Class instantiation found at line 415

```typescript
throw new Error(`Transformation failed: ${error}`);
```

### Usage in `src\actors\llm-testing-framework.ts`

Class instantiation found at line 544

```typescript
throw new Error(`Unknown assertion type: ${assertion.type}`);
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Class instantiation found at line 780

```typescript
throw new Error(`Invalid transformation count: ${transformationCount}`);
```

### Usage in `src\actors\llm-transformation-enhanced.ts`

Class instantiation found at line 784

```typescript
throw new Error(`Invalid confidence value: ${confidence}`);
```

### Usage in `src\actors\llm-transformation.ts`

Class instantiation found at line 441

```typescript
lastError = error instanceof Error ? error : new Error(String(error));
```

### Usage in `src\actors\pattern-discovery.ts`

Class instantiation found at line 155

```typescript
throw new Error(`Unknown operation: ${request.operation}`);
```

### Usage in `src\actors\transformation-enhanced.ts`

Class instantiation found at line 125

```typescript
reject(state.error || new Error('Actor execution failed'));
```

### Usage in `src\actors\transformation-enhanced.ts`

Class instantiation found at line 134

```typescript
reject(new Error(`Actor execution timeout after ${timeoutMs}ms`));
```

### Usage in `src\actors\transformation-enhanced.ts`

Class instantiation found at line 307

```typescript
throw new Error(`Cannot access file: ${filePath}`);
```

### Usage in `src\actors\transformation-enhanced.ts`

Class instantiation found at line 536

```typescript
throw new Error(`Unknown transformation type: ${type}`);
```

### Usage in `src\actors\transformation.ts`

Class instantiation found at line 83

```typescript
throw new Error(`Unknown transformation mode: ${mode}`);
```

### Usage in `src\actors\typescript-error-resolver.ts`

Class instantiation found at line 160

```typescript
'function $1(): $2 {\n  // TODO: Implement return value\n  throw new Error("Not implemented");',
```

### Usage in `src\actors\validation.ts`

Class instantiation found at line 133

```typescript
throw new Error('Unknown validation type');
```

### Usage in `src\actors\validation.ts`

Class instantiation found at line 382

```typescript
throw new Error('TypeScript validation aborted due to timeout');
```

### Usage in `src\config\environment.ts`

Class instantiation found at line 281

```typescript
throw new Error('CARMACK_REPOSITORY_URL or REPOSITORY_URL is required in production');
```

### Usage in `src\config\environment.ts`

Class instantiation found at line 340

```typescript
throw new Error('OPENAI_API_KEY is required when using OpenAI provider in production');
```

### Usage in `src\config\environment.ts`

Class instantiation found at line 346

```typescript
throw new Error(
```

### Usage in `src\config\environment.ts`

Class instantiation found at line 354

```typescript
throw new Error(
```

### Usage in `src\docs\ast-analyzer.ts`

Class instantiation found at line 360

```typescript
throw new Error('AST-grep not available');
```

### Usage in `src\docs\ast-analyzer.ts`

Class instantiation found at line 443

```typescript
throw new Error('AST-grep not available');
```

### Usage in `src\docs\ast-analyzer.ts`

Class instantiation found at line 738

```typescript
throw new Error(`Unknown operation: ${input.operation}`);
```

### Usage in `src\docs\cli.ts`

Class instantiation found at line 48

```typescript
throw new Error(`Source directory does not exist: ${sourceDir}`);
```

### Usage in `src\docs\cli.ts`

Class instantiation found at line 84

```typescript
throw new Error(`Invalid format: ${format}. Must be one of: markdown, html, json, yaml`);
```

### Usage in `src\docs\generator.ts`

Class instantiation found at line 147

```typescript
throw new Error(`Unsupported documentation type: ${validatedRequest.type}`);
```

### Usage in `src\docs\index.ts`

Class instantiation found at line 146

```typescript
throw new Error('No output path specified');
```

### Usage in `src\learning\recommendation-engine.ts`

Class instantiation found at line 266

```typescript
throw new Error(
```

### Usage in `src\learning\statistics.ts`

Function call found at line 63

```typescript
throw new Error('Cannot calculate statistics for empty dataset');
```

### Usage in `src\learning\statistics.ts`

Class instantiation found at line 63

```typescript
throw new Error('Cannot calculate statistics for empty dataset');
```

### Usage in `src\learning\statistics.ts`

Class instantiation found at line 213

```typescript
throw new Error('Datasets must have the same length for correlation analysis');
```

### Usage in `src\learning\statistics.ts`

Class instantiation found at line 218

```typescript
throw new Error('Need at least 2 data points for correlation analysis');
```

### Usage in `src\learning\statistics.ts`

Class instantiation found at line 376

```typescript
throw new Error('Time points must match data length');
```

### Usage in `src\learning\types.ts`

Class instantiation found at line 300

```typescript
throw new Error('Vectors must have the same length');
```

### Usage in `src\learning\types.ts`

Class instantiation found at line 319

```typescript
throw new Error('Vectors must have the same length');
```

### Usage in `src\learning\types.ts`

Class instantiation found at line 361

```typescript
throw new Error('Vectors must have the same length');
```

### Usage in `src\learning\types.ts`

Class instantiation found at line 371

```typescript
throw new Error('Vectors must have the same length');
```

### Usage in `src\pipeline\production-pipeline.ts`

Class instantiation found at line 121

```typescript
reject(state.error || new Error('Actor execution failed'));
```

### Usage in `src\pipeline\production-pipeline.ts`

Class instantiation found at line 131

```typescript
reject(new Error('Actor execution timeout'));
```

### Usage in `src\pipeline\production-pipeline.ts`

Class instantiation found at line 707

```typescript
throw new Error(`Cannot read file: ${filePath}`);
```

### Usage in `src\providers\llm-providers.ts`

Class instantiation found at line 207

```typescript
throw new Error('OpenAI API key not configured');
```

### Usage in `src\providers\llm-providers.ts`

Class instantiation found at line 249

```typescript
throw new Error(
```

### Usage in `src\repository-manager.ts`

Class instantiation found at line 177

```typescript
throw new Error(
```

### Usage in `src\repository-manager.ts`

Class instantiation found at line 208

```typescript
throw new Error(
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Class instantiation found at line 230

```typescript
reject(new Error('No output from TypeScript error resolver'));
```

### Usage in `src\telemetry\integration.ts`

Class instantiation found at line 260

```typescript
throw new Error(`Stats not found for cache key: ${cacheKey}`);
```

### Usage in `src\utils\index.ts`

Class instantiation found at line 122

```typescript
lastError = error instanceof Error ? error : new Error(String(error));
```

### Usage in `src\utils\index.ts`

Class instantiation found at line 132

```typescript
throw lastError || new Error('Unknown error in retryWithBackoff');
```

### Usage in `src\utils\language-detection.ts`

Class instantiation found at line 335

```typescript
throw new Error(`Extension mismatch: ${extension} !== ${mapping.extension}`);
```

---

## Date

### Usage in `src\actors\feedback-loop.ts`

Class instantiation found at line 216

```typescript
timestamp: new Date().toISOString(),
```

### Usage in `src\actors\feedback-loop.ts`

Class instantiation found at line 228

```typescript
const cutoffDate = new Date();
```

### Usage in `src\actors\feedback-loop.ts`

Class instantiation found at line 231

```typescript
const recentFeedback = feedbackStore.filter((f) => new Date(f.timestamp) >= cutoffDate);
```

### Usage in `src\actors\feedback-loop.ts`

Class instantiation found at line 263

```typescript
timestamp: new Date().toISOString(),
```

### Usage in `src\actors\llm-testing-framework.ts`

Class instantiation found at line 258

```typescript
timestamp: new Date().toISOString(),
```

### Usage in `src\actors\pattern-discovery.ts`

Class instantiation found at line 186

```typescript
timestamp: new Date().toISOString(),
```

### Usage in `src\actors\pattern-discovery.ts`

Class instantiation found at line 242

```typescript
timestamp: new Date().toISOString(),
```

### Usage in `src\docs\generator.ts`

Class instantiation found at line 121

```typescript
generatedAt: new Date().toISOString(),
```

### Usage in `src\docs\generator.ts`

Class instantiation found at line 170

```typescript
generatedAt: new Date().toISOString(),
```

### Usage in `src\docs\generator.ts`

Class instantiation found at line 299

```typescript
markdown += `Generated on ${new Date().toISOString()}\n\n`;
```

### Usage in `src\llm-annotation\analyzer.ts`

Class instantiation found at line 71

```typescript
timestamp: new Date().toISOString(),
```

### Usage in `src\pipeline\production-pipeline.ts`

Class instantiation found at line 518

```typescript
timestamp: new Date().toISOString(),
```

### Usage in `src\pipeline\production-pipeline.ts`

Class instantiation found at line 613

```typescript
timestamp: new Date().toISOString(),
```

### Usage in `src\repository-manager.ts`

Class instantiation found at line 315

```typescript
lastUpdated: new Date().toISOString(),
```

### Usage in `src\utils\index.ts`

Class instantiation found at line 49

```typescript
created: new Date().toISOString().split('T')[0] || new Date().getFullYear().toString(),
```

### Usage in `src\utils\index.ts`

Class instantiation found at line 49

```typescript
created: new Date().toISOString().split('T')[0] || new Date().getFullYear().toString(),
```

### Usage in `src\utils\pattern-filtering.ts`

Class instantiation found at line 60

```typescript
timestamp: z.string().default(() => new Date().toISOString()),
```

---

##  simpleGit 

### Usage in `src\actors\git.ts`

Import statement found at line 1

```typescript
import { simpleGit } from 'simple-git'
```

---

## record

### Usage in `src\actors\llm-testing-framework.ts`

Function call found at line 30

```typescript
options: z.record(z.any()).optional(),
```

### Usage in `src\utils\index.ts`

Function call found at line 14

```typescript
categories: z.record(z.array(z.string())),
```

---

##  mkdir, writeFile 

### Usage in `src\actors\llm-testing-framework.ts`

Import statement found at line 1

```typescript
import { mkdir, writeFile } from 'node:fs/promises'
```

---

##  join 

### Usage in `src\actors\llm-testing-framework.ts`

Import statement found at line 2

```typescript
import { join } from 'node:path'
```

### Usage in `src\actors\transformation-enhanced.ts`

Import statement found at line 2

```typescript
import { join } from 'node:path'
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Import statement found at line 13

```typescript
import { join } from 'node:path'
```

---

## EnhancedLLMTransformer

### Usage in `src\actors\llm-transformation-enhanced.ts`

Class instantiation found at line 197

```typescript
const transformer = new EnhancedLLMTransformer(validatedInput.config);
```

### Usage in `src\actors\transformation.ts`

Class instantiation found at line 800

```typescript
const transformer = new EnhancedLLMTransformer(llmInput.config);
```

### Usage in `src\actors\validation.ts`

Class instantiation found at line 529

```typescript
const llmTransformer = new EnhancedLLMTransformer({
```

---

## Map

### Usage in `src\actors\llm-transformation-enhanced.ts`

Class instantiation found at line 209

```typescript
private cache: Map<string, TransformationCacheEntry> = new Map();
```

### Usage in `src\actors\llm-transformation.ts`

Class instantiation found at line 97

```typescript
private cache: Map<string, LLMTransformationResponse> = new Map();
```

### Usage in `src\actors\pattern-learning.ts`

Class instantiation found at line 228

```typescript
private effectivenessCache: Map<string, PatternEffectiveness> = new Map();
```

### Usage in `src\actors\pattern-learning.ts`

Class instantiation found at line 229

```typescript
private discoveredPatterns: Map<string, DiscoveredPattern> = new Map();
```

### Usage in `src\learning\effectiveness-scorer.ts`

Class instantiation found at line 140

```typescript
private usageHistory: Map<string, PatternUsageRecord[]> = new Map();
```

### Usage in `src\learning\reinforcement.ts`

Class instantiation found at line 88

```typescript
this.qTable.set(stateKey, new Map());
```

### Usage in `src\learning\reinforcement.ts`

Class instantiation found at line 136

```typescript
return this.qTable.get(stateKey) || new Map();
```

### Usage in `src\learning\reinforcement.ts`

Class instantiation found at line 210

```typescript
this.qTable = new Map(
```

### Usage in `src\learning\reinforcement.ts`

Class instantiation found at line 213

```typescript
new Map(actions),
```

### Usage in `src\learning\reinforcement.ts`

Class instantiation found at line 313

```typescript
this.policy.set(stateKey, new Map());
```

### Usage in `src\providers\llm-providers.ts`

Class instantiation found at line 93

```typescript
private state: Map<string, RateLimitState> = new Map();
```

### Usage in `src\repository-manager.ts`

Class instantiation found at line 96

```typescript
private activeRepositories: Map<string, RepositoryState> = new Map();
```

### Usage in `src\telemetry\integration.ts`

Function call found at line 20

```typescript
private startTimes: Map<string, number> = new Map();
```

### Usage in `src\telemetry\integration.ts`

Class instantiation found at line 20

```typescript
private startTimes: Map<string, number> = new Map();
```

### Usage in `src\telemetry\integration.ts`

Class instantiation found at line 179

```typescript
> = new Map();
```

---

## Set

### Usage in `src\actors\llm-transformation-enhanced.ts`

Class instantiation found at line 952

```typescript
const set1 = new Set(str1.split(/\s+/));
```

### Usage in `src\actors\pattern-discovery.ts`

Class instantiation found at line 240

```typescript
categories: [...new Set(filteredPatterns.map((p: DiscoveredPattern) => p.metadata.category))],
```

### Usage in `src\actors\typescript-error-resolver.ts`

Class instantiation found at line 391

```typescript
return [...new Set(suggestions)]; // Remove duplicates
```

### Usage in `src\actors\typescript-error-resolver.ts`

Class instantiation found at line 450

```typescript
return [...new Set(types)];
```

### Usage in `src\docs\ast-analyzer.ts`

Class instantiation found at line 278

```typescript
return [...new Set(exports)]; // Remove duplicates
```

### Usage in `src\learning\effectiveness-scorer.ts`

Class instantiation found at line 400

```typescript
const uniqueFileTypes = new Set(contexts.map((c) => c.fileType).filter(Boolean)).size;
```

### Usage in `src\learning\effectiveness-scorer.ts`

Class instantiation found at line 401

```typescript
const uniqueProjectSizes = new Set(contexts.map((c) => c.projectSize).filter(Boolean)).size;
```

### Usage in `src\learning\effectiveness-scorer.ts`

Class instantiation found at line 402

```typescript
const uniqueEnvironments = new Set(contexts.map((c) => c.environment).filter(Boolean)).size;
```

### Usage in `src\learning\nlp.ts`

Class instantiation found at line 112

```typescript
private stopWords = new Set([
```

### Usage in `src\learning\nlp.ts`

Class instantiation found at line 177

```typescript
private codeKeywords = new Set([
```

### Usage in `src\learning\nlp.ts`

Class instantiation found at line 369

```typescript
private positiveWords = new Set([
```

### Usage in `src\learning\nlp.ts`

Class instantiation found at line 396

```typescript
private negativeWords = new Set([
```

### Usage in `src\learning\similarity.ts`

Class instantiation found at line 226

```typescript
const contexts1 = new Set(pattern1Usage.contexts);
```

### Usage in `src\learning\similarity.ts`

Class instantiation found at line 227

```typescript
const contexts2 = new Set(pattern2Usage.contexts);
```

### Usage in `src\learning\similarity.ts`

Class instantiation found at line 228

```typescript
const intersection = new Set([...contexts1].filter((x) => contexts2.has(x)));
```

### Usage in `src\learning\similarity.ts`

Class instantiation found at line 229

```typescript
const union = new Set([...contexts1, ...contexts2]);
```

### Usage in `src\utils\pattern-filtering.ts`

Class instantiation found at line 106

```typescript
const targetLanguages = new Set(Array.from(languageMap.values()));
```

### Usage in `src\utils\pattern-filtering.ts`

Class instantiation found at line 175

```typescript
const availableLanguages = new Set(request.patterns.map(p => p.language));
```

---

##  getLLMProviderManager, type LLMRequest 

### Usage in `src\actors\llm-transformation-enhanced.ts`

Import statement found at line 13

```typescript
import { getLLMProviderManager, type LLMRequest } from '../providers/llm-providers.js'
```

---

## default

### Usage in `src\actors\llm-transformation.ts`

Function call found at line 25

```typescript
provider: LLMProviderSchema.default('mock'),
```

### Usage in `src\actors\llm-transformation.ts`

Function call found at line 27

```typescript
model: z.string().default('gpt-4'),
```

### Usage in `src\actors\template-engine.ts`

Function call found at line 31

```typescript
flags: z.string().optional().default('g'),
```

### Usage in `src\actors\transformation-enhanced.ts`

Function call found at line 72

```typescript
transformationType: z.enum(['template', 'ast', 'llm', 'auto']).default('auto'),
```

### Usage in `src\actors\transformation-enhanced.ts`

Function call found at line 73

```typescript
patterns: z.array(z.any()).default([]), // Use existing AstPattern from types
```

### Usage in `src\actors\transformation-enhanced.ts`

Function call found at line 74

```typescript
maxComplexity: z.number().default(15),
```

### Usage in `src\config\environment.ts`

Function call found at line 18

```typescript
NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
```

### Usage in `src\config\environment.ts`

Function call found at line 19

```typescript
CARMACK_VERSION: z.string().default('1.0.0'),
```

### Usage in `src\learning\nlp.ts`

Function call found at line 14

```typescript
embeddingModel: z.string().default('sentence-transformers'),
```

### Usage in `src\learning\nlp.ts`

Function call found at line 15

```typescript
maxTokens: z.number().int().positive().default(512),
```

### Usage in `src\learning\nlp.ts`

Function call found at line 16

```typescript
languages: z.array(z.string()).default(['en']),
```

### Usage in `src\learning\reinforcement.ts`

Function call found at line 14

```typescript
algorithm: z.enum(['q-learning', 'policy-gradient', 'actor-critic']).default('q-learning'),
```

### Usage in `src\learning\reinforcement.ts`

Function call found at line 15

```typescript
learningRate: z.number().min(0).max(1).default(0.1),
```

### Usage in `src\providers\llm-providers.ts`

Function call found at line 22

```typescript
provider: LLMProviderSchema.default('openai'),
```

### Usage in `src\providers\llm-providers.ts`

Function call found at line 24

```typescript
model: z.string().default('gpt-4'),
```

### Usage in `src\repository-manager.ts`

Function call found at line 12

```typescript
branch: z.string().default('main'),
```

### Usage in `src\repository-manager.ts`

Function call found at line 14

```typescript
includePatterns: z.array(z.string()).default(['**/*.ts', '**/*.js']),
```

### Usage in `src\utils\language-detection.ts`

Function call found at line 14

```typescript
aliases: z.array(z.string()).default([]),
```

### Usage in `src\utils\language-detection.ts`

Function call found at line 16

```typescript
category: z.enum(['programming', 'markup', 'config', 'data']).default('programming'),
```

### Usage in `src\utils\pattern-filtering.ts`

Function call found at line 17

```typescript
strictLanguageMatching: z.boolean().default(true),
```

### Usage in `src\utils\yaml-handler.ts`

Function call found at line 40

```typescript
indent: z.number().int().min(1).max(8).default(2),
```

---

## LLMTransformer

### Usage in `src\actors\llm-transformation.ts`

Class instantiation found at line 87

```typescript
const transformer = new LLMTransformer(validatedInput.config);
```

---

##  getLLMProviderManager 

### Usage in `src\actors\llm-transformation.ts`

Import statement found at line 5

```typescript
import { getLLMProviderManager } from '../providers/llm-providers.js'
```

---

## fs

### Usage in `src\actors\pattern-discovery.ts`

Import statement found at line 709

```typescript
import fs from "fs"
```

---

## int

### Usage in `src\actors\pattern-learning.ts`

Function call found at line 42

```typescript
cyclomaticComplexity: z.number().int().min(0),
```

### Usage in `src\learning\nlp.ts`

Function call found at line 15

```typescript
maxTokens: z.number().int().positive().default(512),
```

### Usage in `src\telemetry\types.ts`

Function call found at line 13

```typescript
timestamp: z.number().int().positive(),
```

### Usage in `src\types.ts`

Function call found at line 6

```typescript
export const TimestampSchema = z.number().int().positive();
```

### Usage in `src\utils\pattern-filtering.ts`

Function call found at line 18

```typescript
maxComplexity: z.number().int().min(1).max(10).default(10),
```

### Usage in `src\utils\yaml-handler.ts`

Function call found at line 40

```typescript
indent: z.number().int().min(1).max(8).default(2),
```

---

## PatternLearner

### Usage in `src\actors\pattern-learning.ts`

Class instantiation found at line 219

```typescript
const learner = new PatternLearner();
```

---

## PatternClusterer

### Usage in `src\actors\pattern-learning.ts`

Class instantiation found at line 249

```typescript
this.clusterer = new PatternClusterer();
```

---

## PatternSimilarityDetector

### Usage in `src\actors\pattern-learning.ts`

Class instantiation found at line 250

```typescript
this.similarityDetector = new PatternSimilarityDetector();
```

---

##  PatternClusterer 

### Usage in `src\actors\pattern-learning.ts`

Import statement found at line 4

```typescript
import { PatternClusterer } from '../learning/clustering.ts'
```

---

##  createNLPAnalyzer 

### Usage in `src\actors\pattern-learning.ts`

Import statement found at line 5

```typescript
import { createNLPAnalyzer } from '../learning/nlp.ts'
```

---

## Function

### Usage in `src\actors\template-engine.ts`

Class instantiation found at line 1062

```typescript
return new Function(`return ${evaluableCondition}`)();
```

---

##  filterPatternsByLanguageAndMode, PRESET_FILTERS 

### Usage in `src\actors\template-engine.ts`

Import statement found at line 4

```typescript
import { filterPatternsByLanguageAndMode, PRESET_FILTERS } from '../utils/pattern-filtering.js'
```

---

##  detectLanguageFromFile 

### Usage in `src\actors\template-engine.ts`

Import statement found at line 5

```typescript
import { detectLanguageFromFile } from '../utils/language-detection.js'
```

---

##  mkdir, readFile 

### Usage in `src\actors\transformation-enhanced.ts`

Import statement found at line 1

```typescript
import { mkdir, readFile } from 'node:fs/promises'
```

---

##  createActor, fromPromise 

### Usage in `src\actors\transformation-enhanced.ts`

Import statement found at line 3

```typescript
import { createActor, fromPromise } from 'xstate'
```

### Usage in `src\repository-manager.ts`

Import statement found at line 1

```typescript
import { createActor, fromPromise } from 'xstate'
```

---

##  astGrepTransformationActor 

### Usage in `src\actors\transformation-enhanced.ts`

Import statement found at line 13

```typescript
import { astGrepTransformationActor } from './ast-grep-transformation.ts'
```

### Usage in `src\machine.ts`

Import statement found at line 5

```typescript
import { astGrepTransformationActor } from './actors/ast-grep-transformation.ts'
```

### Usage in `src\pipeline\production-pipeline.ts`

Import statement found at line 5

```typescript
import { astGrepTransformationActor } from '../actors/ast-grep-transformation.ts'
```

---

##  js, ts 

### Usage in `src\actors\transformation.ts`

Import statement found at line 3

```typescript
import { js, ts } from '@ast-grep/napi'
```

---

##  type EnhancedLLMTransformationInput, EnhancedLLMTransformer 

### Usage in `src\actors\transformation.ts`

Import statement found at line 7

```typescript
import { type EnhancedLLMTransformationInput, EnhancedLLMTransformer } from './llm-transformation-enhanced.js'
```

---

## TypeScriptErrorResolver

### Usage in `src\actors\typescript-error-resolver.ts`

Class instantiation found at line 460

```typescript
const resolver = new TypeScriptErrorResolver();
```

---

##  execSync 

### Usage in `src\actors\typescript-error-resolver.ts`

Import statement found at line 9

```typescript
import { execSync } from 'node:child_process'
```

### Usage in `src\actors\validation.ts`

Import statement found at line 1

```typescript
import { execSync } from 'node:child_process'
```

### Usage in `src\scripts\enhance-commit-message.ts`

Import statement found at line 13

```typescript
import { execSync } from 'node:child_process'
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Import statement found at line 10

```typescript
import { execSync } from 'node:child_process'
```

---

## ESLint

### Usage in `src\actors\validation.ts`

Function call found at line 7

```typescript
const eslint = new ESLint({
```

### Usage in `src\actors\validation.ts`

Class instantiation found at line 7

```typescript
const eslint = new ESLint({
```

---

## getBunExecutable

### Usage in `src\actors\validation.ts`

Function call found at line 34

```typescript
function getBunExecutable(): string {
```

---

## if

### Usage in `src\actors\validation.ts`

Function call found at line 36

```typescript
if (process.env.NODE_ENV === 'test' || process.env.BUN_TEST === 'true') {
```

### Usage in `src\learning\clustering.ts`

Function call found at line 42

```typescript
if (patterns.length === 0) {
```

### Usage in `src\learning\clustering.ts`

Function call found at line 46

```typescript
if (patterns.length < this.config.k) {
```

### Usage in `src\learning\statistics.ts`

Function call found at line 62

```typescript
if (data.length === 0) {
```

### Usage in `src\machine.ts`

Function call found at line 91

```typescript
if (!context.startTime) return false;
```

### Usage in `src\machine.ts`

Function call found at line 96

```typescript
if (!complexity) return false;
```

### Usage in `src\machine.ts`

Function call found at line 120

```typescript
if (event.type !== 'START_TRANSFORMATION') return context;
```

### Usage in `src\pipeline\production-pipeline.ts`

Function call found at line 108

```typescript
if (isResolved) return;
```

### Usage in `src\pipeline\production-pipeline.ts`

Function call found at line 110

```typescript
if (state.status === 'done') {
```

### Usage in `src\pipeline\production-pipeline.ts`

Function call found at line 116

```typescript
} else if (state.status === 'error') {
```

### Usage in `src\scripts\pre-commit-imports.ts`

Function call found at line 36

```typescript
if (!line) continue; // Skip undefined lines
```

### Usage in `src\scripts\pre-commit-imports.ts`

Function call found at line 40

```typescript
if (trimmed.startsWith('import ')) {
```

### Usage in `src\telemetry\collector.ts`

Function call found at line 50

```typescript
if (shouldFlush) {
```

### Usage in `src\telemetry\collector.ts`

Function call found at line 59

```typescript
if (this.events.length === 0) return;
```

### Usage in `src\telemetry\integration.ts`

Function call found at line 37

```typescript
if (startTime !== undefined) {
```

---

## execSync

### Usage in `src\actors\validation.ts`

Function call found at line 42

```typescript
execSync('bunx --version', {
```

### Usage in `src\actors\validation.ts`

Function call found at line 54

```typescript
execSync(`${path} --version`, {
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Function call found at line 33

```typescript
const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
```

---

## for

### Usage in `src\actors\validation.ts`

Function call found at line 52

```typescript
for (const path of possiblePaths) {
```

### Usage in `src\llm-annotation\index.ts`

Function call found at line 49

```typescript
for (const entry of entries) {
```

### Usage in `src\scripts\pre-commit-imports.ts`

Function call found at line 34

```typescript
for (let i = 0; i < lines.length; i++) {
```

---

## AbortController

### Usage in `src\actors\validation.ts`

Class instantiation found at line 328

```typescript
const controller = new AbortController();
```

---

##  ESLint 

### Usage in `src\actors\validation.ts`

Import statement found at line 2

```typescript
import { ESLint } from 'eslint'
```

---

## url

### Usage in `src\config\environment.ts`

Function call found at line 26

```typescript
CARMACK_REPOSITORY_URL: z.string().url().optional(),
```

### Usage in `src\repository-manager.ts`

Function call found at line 11

```typescript
url: z.string().url(),
```

---

## function

### Usage in `src\docs\ast-analyzer.ts`

Function call found at line 25

```typescript
text: z.function().returns(z.string()),
```

### Usage in `src\docs\ast-analyzer.ts`

Function call found at line 26

```typescript
range: z.function().returns(
```

---

## returns

### Usage in `src\docs\ast-analyzer.ts`

Function call found at line 25

```typescript
text: z.function().returns(z.string()),
```

### Usage in `src\docs\ast-analyzer.ts`

Function call found at line 26

```typescript
range: z.function().returns(
```

---

## ASTGrepAnalyzer

### Usage in `src\docs\ast-analyzer.ts`

Class instantiation found at line 724

```typescript
const analyzer = new ASTGrepAnalyzer();
```

### Usage in `src\docs\generator.ts`

Class instantiation found at line 101

```typescript
this.analyzer = new ASTGrepAnalyzer();
```

### Usage in `src\llm-annotation\analyzer.ts`

Function call found at line 31

```typescript
this.astAnalyzer = new ASTGrepAnalyzer();
```

### Usage in `src\llm-annotation\analyzer.ts`

Class instantiation found at line 31

```typescript
this.astAnalyzer = new ASTGrepAnalyzer();
```

---

##  $NAMES 

### Usage in `src\docs\ast-analyzer.ts`

Import statement found at line 164

```typescript
import { $NAMES } from "$MODULE"
```

---

## DocumentationGenerator

### Usage in `src\docs\cli.ts`

Class instantiation found at line 51

```typescript
const generator = new DocumentationGenerator();
```

### Usage in `src\docs\index.ts`

Function call found at line 22

```typescript
this.generator = new DocumentationGenerator();
```

### Usage in `src\docs\index.ts`

Class instantiation found at line 22

```typescript
this.generator = new DocumentationGenerator();
```

---

## DocumentationCLI

### Usage in `src\docs\cli.ts`

Class instantiation found at line 248

```typescript
const cli = new DocumentationCLI();
```

---

##  existsSync 

### Usage in `src\docs\cli.ts`

Import statement found at line 5

```typescript
import { existsSync } from 'node:fs'
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Import statement found at line 11

```typescript
import { existsSync } from 'node:fs'
```

---

##  parseArgs 

### Usage in `src\docs\cli.ts`

Import statement found at line 6

```typescript
import { parseArgs } from 'node:util'
```

---

## chokidar

### Usage in `src\docs\cli.ts`

Import statement found at line 7

```typescript
import chokidar from 'chokidar'
```

---

##  DocumentationGenerator 

### Usage in `src\docs\cli.ts`

Import statement found at line 9

```typescript
import { DocumentationGenerator } from './generator.js'
```

### Usage in `src\docs\index.ts`

Import statement found at line 12

```typescript
import { DocumentationGenerator } from './generator.js'
```

---

##  ASTGrepAnalyzer 

### Usage in `src\docs\generator.ts`

Import statement found at line 3

```typescript
import { ASTGrepAnalyzer } from './ast-analyzer.js'
```

---

##  validateDocumentationRequest, validateDocumentationResult 

### Usage in `src\docs\generator.ts`

Import statement found at line 13

```typescript
import { validateDocumentationRequest, validateDocumentationResult } from './types.js'
```

---

## constructor

### Usage in `src\docs\index.ts`

Function call found at line 21

```typescript
constructor() {
```

### Usage in `src\learning\clustering.ts`

Function call found at line 30

```typescript
constructor(config: Pick<ClusteringConfig, 'k' | 'maxIterations' | 'tolerance'>) {
```

### Usage in `src\llm-annotation\analyzer.ts`

Function call found at line 25

```typescript
constructor() {
```

### Usage in `src\llm-annotation\index.ts`

Function call found at line 21

```typescript
constructor() {
```

### Usage in `src\telemetry\collector.ts`

Function call found at line 30

```typescript
constructor(
```

### Usage in `src\utils\yaml-handler.ts`

Function call found at line 16

```typescript
constructor(
```

### Usage in `src\utils\yaml-handler.ts`

Function call found at line 27

```typescript
constructor(
```

---

## generateAPIDocumentation

### Usage in `src\docs\index.ts`

Function call found at line 28

```typescript
async generateAPIDocumentation(
```

---

## generateDocumentation

### Usage in `src\docs\index.ts`

Function call found at line 45

```typescript
return await this.generator.generateDocumentation(request);
```

### Usage in `src\docs\index.ts`

Function call found at line 63

```typescript
return await this.generator.generateDocumentation(request);
```

### Usage in `src\docs\index.ts`

Function call found at line 81

```typescript
return await this.generator.generateDocumentation(request);
```

### Usage in `src\docs\index.ts`

Function call found at line 99

```typescript
return await this.generator.generateDocumentation(request);
```

---

## generateArchitectureDocumentation

### Usage in `src\docs\index.ts`

Function call found at line 51

```typescript
async generateArchitectureDocumentation(
```

---

## generatePatternDocumentation

### Usage in `src\docs\index.ts`

Function call found at line 69

```typescript
async generatePatternDocumentation(
```

---

## generateUsageDocumentation

### Usage in `src\docs\index.ts`

Function call found at line 87

```typescript
async generateUsageDocumentation(
```

---

## DocumentationSystem

### Usage in `src\docs\index.ts`

Class instantiation found at line 211

```typescript
export const documentationSystem = new DocumentationSystem();
```

---

## cluster

### Usage in `src\learning\clustering.ts`

Function call found at line 41

```typescript
cluster(patterns: PatternFeatureVector[]): ClusterResult[] {
```

---

## map

### Usage in `src\learning\clustering.ts`

Function call found at line 48

```typescript
return patterns.map((pattern, index) => ({
```

### Usage in `src\learning\clustering.ts`

Function call found at line 58

```typescript
const vectors = patterns.map((p) => p.features);
```

### Usage in `src\learning\clustering.ts`

Function call found at line 59

```typescript
const patternIds = patterns.map((p) => p.patternId);
```

### Usage in `src\learning\similarity.ts`

Function call found at line 44

```typescript
.map(() => Array(n).fill(0));
```

---

## initializeCentroidsKMeansPlusPlus

### Usage in `src\learning\clustering.ts`

Function call found at line 62

```typescript
const centroids = this.initializeCentroidsKMeansPlusPlus(vectors);
```

---

## Array

### Usage in `src\learning\clustering.ts`

Function call found at line 63

```typescript
let assignments = new Array(vectors.length).fill(0);
```

### Usage in `src\learning\clustering.ts`

Class instantiation found at line 63

```typescript
let assignments = new Array(vectors.length).fill(0);
```

### Usage in `src\learning\clustering.ts`

Class instantiation found at line 178

```typescript
const clusterSums: Vector[] = centroids.map(() => new Array(vectors[0]?.length ?? 0).fill(0));
```

### Usage in `src\learning\clustering.ts`

Class instantiation found at line 179

```typescript
const clusterCounts = new Array(centroids.length).fill(0);
```

### Usage in `src\learning\clustering.ts`

Class instantiation found at line 298

```typescript
const labels = new Array(vectors.length).fill(-1); // -1 = unvisited, -2 = noise
```

### Usage in `src\learning\recommendation-engine.ts`

Class instantiation found at line 286

```typescript
embedding: new Array(128).fill(0),
```

### Usage in `src\learning\similarity.ts`

Function call found at line 42

```typescript
const matrix: number[][] = Array(n)
```

### Usage in `src\learning\similarity.ts`

Function call found at line 44

```typescript
.map(() => Array(n).fill(0));
```

### Usage in `src\learning\statistics.ts`

Class instantiation found at line 292

```typescript
const ranks = new Array(data.length);
```

### Usage in `src\learning\types.ts`

Class instantiation found at line 345

```typescript
const centroid = new Array(dimensions).fill(0);
```

---

## fill

### Usage in `src\learning\clustering.ts`

Function call found at line 63

```typescript
let assignments = new Array(vectors.length).fill(0);
```

### Usage in `src\learning\similarity.ts`

Function call found at line 43

```typescript
.fill(null)
```

---

## KMeansClusterer

### Usage in `src\learning\clustering.ts`

Class instantiation found at line 634

```typescript
const clusterer = new KMeansClusterer({
```

---

##  VectorUtils 

### Usage in `src\learning\clustering.ts`

Import statement found at line 2

```typescript
import { VectorUtils } from './types.js'
```

---

## weight

### Usage in `src\learning\effectiveness-scorer.ts`

Function call found at line 50

```typescript
halfLife: 30, // Older data has less weight (30 days)
```

---

## PatternEffectivenessScorer

### Usage in `src\learning\effectiveness-scorer.ts`

Class instantiation found at line 726

```typescript
return new PatternEffectivenessScorer(config);
```

---

##  StatisticalAnalyzer 

### Usage in `src\learning\effectiveness-scorer.ts`

Import statement found at line 2

```typescript
import { StatisticalAnalyzer } from './statistics.js'
```

---

## positive

### Usage in `src\learning\nlp.ts`

Function call found at line 15

```typescript
maxTokens: z.number().int().positive().default(512),
```

### Usage in `src\telemetry\types.ts`

Function call found at line 13

```typescript
timestamp: z.number().int().positive(),
```

### Usage in `src\types.ts`

Function call found at line 6

```typescript
export const TimestampSchema = z.number().int().positive();
```

---

## TextPreprocessor

### Usage in `src\learning\nlp.ts`

Class instantiation found at line 280

```typescript
private preprocessor = new TextPreprocessor();
```

---

## PatternRecommendationEngine

### Usage in `src\learning\recommendation-engine.ts`

Class instantiation found at line 826

```typescript
return new PatternRecommendationEngine(
```

---

## calculateSimilarity

### Usage in `src\learning\similarity.ts`

Function call found at line 28

```typescript
calculateSimilarity(vector1: PatternFeatureVector, vector2: PatternFeatureVector): number {
```

---

## padVector

### Usage in `src\learning\similarity.ts`

Function call found at line 31

```typescript
const v1 = this.padVector(vector1.features, maxLength);
```

### Usage in `src\learning\similarity.ts`

Function call found at line 32

```typescript
const v2 = this.padVector(vector2.features, maxLength);
```

---

## cosineSimilarity

### Usage in `src\learning\similarity.ts`

Function call found at line 34

```typescript
return VectorUtils.cosineSimilarity(v1, v2);
```

---

## calculateSimilarityMatrix

### Usage in `src\learning\similarity.ts`

Function call found at line 40

```typescript
calculateSimilarityMatrix(vectors: PatternFeatureVector[]): number[][] {
```

---

##  PatternSimilarityConfigSchema, VectorUtils 

### Usage in `src\learning\similarity.ts`

Import statement found at line 8

```typescript
import { PatternSimilarityConfigSchema, VectorUtils } from './types.ts'
```

---

## calculateSummary

### Usage in `src\learning\statistics.ts`

Function call found at line 61

```typescript
static calculateSummary(data: number[]): StatisticalSummary {
```

---

## sort

### Usage in `src\learning\statistics.ts`

Function call found at line 66

```typescript
const sorted = [...data].sort((a, b) => a - b);
```

---

## calculateMean

### Usage in `src\learning\statistics.ts`

Function call found at line 70

```typescript
const mean = StatisticalAnalyzer.calculateMean(data);
```

---

## calculateMedian

### Usage in `src\learning\statistics.ts`

Function call found at line 71

```typescript
const median = StatisticalAnalyzer.calculateMedian(sorted);
```

---

## calculateMode

### Usage in `src\learning\statistics.ts`

Function call found at line 72

```typescript
const mode = StatisticalAnalyzer.calculateMode(data);
```

---

## calculateVariance

### Usage in `src\learning\statistics.ts`

Function call found at line 73

```typescript
const variance = StatisticalAnalyzer.calculateVariance(data, mean);
```

---

## sqrt

### Usage in `src\learning\statistics.ts`

Function call found at line 74

```typescript
const standardDeviation = Math.sqrt(variance);
```

---

## calculateQuartiles

### Usage in `src\learning\statistics.ts`

Function call found at line 80

```typescript
const quartiles = StatisticalAnalyzer.calculateQuartiles(sorted);
```

---

## initializeAnalyzer

### Usage in `src\llm-annotation\analyzer.ts`

Function call found at line 26

```typescript
this.initializeAnalyzer();
```

### Usage in `src\llm-annotation\analyzer.ts`

Function call found at line 29

```typescript
private async initializeAnalyzer() {
```

---

## import

### Usage in `src\llm-annotation\analyzer.ts`

Function call found at line 30

```typescript
const { ASTGrepAnalyzer } = await import('../docs/ast-analyzer.js');
```

### Usage in `src\llm-annotation\index.ts`

Function call found at line 39

```typescript
const { readdir, stat } = await import('node:fs/promises');
```

### Usage in `src\llm-annotation\index.ts`

Function call found at line 40

```typescript
const { join, extname } = await import('node:path');
```

---

## generateAnnotations

### Usage in `src\llm-annotation\analyzer.ts`

Function call found at line 37

```typescript
async generateAnnotations(request: AnnotationRequest): Promise<AnnotationResult> {
```

### Usage in `src\llm-annotation\index.ts`

Function call found at line 29

```typescript
return await this.analyzer.generateAnnotations(request);
```

---

## now

### Usage in `src\llm-annotation\analyzer.ts`

Function call found at line 38

```typescript
const startTime = Date.now();
```

### Usage in `src\machine.ts`

Function call found at line 92

```typescript
return Date.now() - context.startTime > context.timeoutMs;
```

### Usage in `src\machine.ts`

Function call found at line 117

```typescript
startTime: Date.now(),
```

### Usage in `src\telemetry\collector.ts`

Function call found at line 28

```typescript
private lastFlush = performance.now();
```

### Usage in `src\telemetry\collector.ts`

Function call found at line 48

```typescript
performance.now() - this.lastFlush >= this.config.flushInterval;
```

### Usage in `src\telemetry\integration.ts`

Function call found at line 28

```typescript
this.startTimes.set(stage, performance.now());
```

### Usage in `src\telemetry\integration.ts`

Function call found at line 38

```typescript
this.stages[stage] = performance.now() - startTime;
```

---

## parse

### Usage in `src\llm-annotation\analyzer.ts`

Function call found at line 39

```typescript
const validatedRequest = AnnotationRequestSchema.parse(request);
```

### Usage in `src\telemetry\collector.ts`

Function call found at line 41

```typescript
const validated = TelemetryMetricSchema.parse(event);
```

---

## log

### Usage in `src\llm-annotation\analyzer.ts`

Function call found at line 42

```typescript
console.log('🔍 Starting LLM annotation analysis...');
```

---

## analyzeCodeContext

### Usage in `src\llm-annotation\analyzer.ts`

Function call found at line 45

```typescript
const context = await this.analyzeCodeContext(validatedRequest);
```

---

##  AnnotationRequestSchema, LLMAnnotationSchema 

### Usage in `src\llm-annotation\analyzer.ts`

Import statement found at line 14

```typescript
import { AnnotationRequestSchema, LLMAnnotationSchema } from './types.js'
```

---

## LLMAnnotationAnalyzer

### Usage in `src\llm-annotation\index.ts`

Function call found at line 22

```typescript
this.analyzer = new LLMAnnotationAnalyzer();
```

### Usage in `src\llm-annotation\index.ts`

Class instantiation found at line 22

```typescript
this.analyzer = new LLMAnnotationAnalyzer();
```

---

## annotate

### Usage in `src\llm-annotation\index.ts`

Function call found at line 28

```typescript
async annotate(request: AnnotationRequest): Promise<AnnotationResult> {
```

---

## annotateDirectory

### Usage in `src\llm-annotation\index.ts`

Function call found at line 35

```typescript
async annotateDirectory(
```

---

## async

### Usage in `src\llm-annotation\index.ts`

Function call found at line 45

```typescript
const scanDirectory = async (dirPath: string): Promise<void> => {
```

---

## readdir

### Usage in `src\llm-annotation\index.ts`

Function call found at line 47

```typescript
const entries = await readdir(dirPath);
```

---

## LLMAnnotationSystem

### Usage in `src\llm-annotation\index.ts`

Class instantiation found at line 234

```typescript
const system = new LLMAnnotationSystem();
```

### Usage in `src\llm-annotation\index.ts`

Class instantiation found at line 243

```typescript
const system = new LLMAnnotationSystem();
```

### Usage in `src\llm-annotation\index.ts`

Class instantiation found at line 251

```typescript
const system = new LLMAnnotationSystem();
```

### Usage in `src\llm-annotation\index.ts`

Class instantiation found at line 258

```typescript
const system = new LLMAnnotationSystem();
```

---

## 
  generateLLMAnnotations,
  LLMAnnotationAnalyzer,
  llmAnnotationActor,
  validateAnnotationRequest,


### Usage in `src\llm-annotation\index.ts`

Import statement found at line 2

```typescript
import {
  generateLLMAnnotations,
  LLMAnnotationAnalyzer,
  llmAnnotationActor,
  validateAnnotationRequest,
} from './analyzer.js'
```

---

##  AnnotationRequestSchema 

### Usage in `src\llm-annotation\index.ts`

Import statement found at line 9

```typescript
import { AnnotationRequestSchema } from './types.js'
```

---

## convertAstPatternToTemplatePattern

### Usage in `src\machine.ts`

Function call found at line 24

```typescript
function convertAstPatternToTemplatePattern(astPattern: AstPattern): TemplatePattern {
```

---

## setup

### Usage in `src\machine.ts`

Function call found at line 65

```typescript
const _carmackCoderMachine = setup({
```

---

## assign

### Usage in `src\machine.ts`

Function call found at line 115

```typescript
setStartTime: assign(({ context }) => ({
```

### Usage in `src\machine.ts`

Function call found at line 119

```typescript
assignTransformationRequest: assign(({ context, event }) => {
```

---

## randomUUID

### Usage in `src\machine.ts`

Function call found at line 123

```typescript
id: crypto.randomUUID(),
```

---

##  assign, setup 

### Usage in `src\machine.ts`

Import statement found at line 1

```typescript
import { assign, setup } from 'xstate'
```

---

##  analysisActor 

### Usage in `src\machine.ts`

Import statement found at line 4

```typescript
import { analysisActor } from './actors/analysis.ts'
```

---

##  complexityActor 

### Usage in `src\machine.ts`

Import statement found at line 6

```typescript
import { complexityActor } from './actors/complexity.ts'
```

---

##  dafnyActor 

### Usage in `src\machine.ts`

Import statement found at line 7

```typescript
import { dafnyActor } from './actors/dafny.ts'
```

---

## createActor

### Usage in `src\pipeline\production-pipeline.ts`

Function call found at line 101

```typescript
const actor = createActor(actorLogic, { input });
```

---

## start

### Usage in `src\pipeline\production-pipeline.ts`

Function call found at line 102

```typescript
actor.start();
```

### Usage in `src\telemetry\integration.ts`

Function call found at line 27

```typescript
start(stage: keyof PipelineStages): void {
```

---

## subscribe

### Usage in `src\pipeline\production-pipeline.ts`

Function call found at line 107

```typescript
const subscription = actor.subscribe((state) => {
```

---

## unsubscribe

### Usage in `src\pipeline\production-pipeline.ts`

Function call found at line 112

```typescript
subscription.unsubscribe();
```

---

## stop

### Usage in `src\pipeline\production-pipeline.ts`

Function call found at line 113

```typescript
actor.stop();
```

---

## clearTimeout

### Usage in `src\pipeline\production-pipeline.ts`

Function call found at line 114

```typescript
clearTimeout(timeout);
```

---

## resolve

### Usage in `src\pipeline\production-pipeline.ts`

Function call found at line 115

```typescript
resolve(state.output as T);
```

---

##  mkdir, readFile, writeFile 

### Usage in `src\pipeline\production-pipeline.ts`

Import statement found at line 1

```typescript
import { mkdir, readFile, writeFile } from 'node:fs/promises'
```

---

##  dirname, join 

### Usage in `src\pipeline\production-pipeline.ts`

Import statement found at line 2

```typescript
import { dirname, join } from 'node:path'
```

---

##  type ActorLogic, createActor, fromPromise 

### Usage in `src\pipeline\production-pipeline.ts`

Import statement found at line 3

```typescript
import { type ActorLogic, createActor, fromPromise } from 'xstate'
```

---

## RateLimiter

### Usage in `src\providers\llm-providers.ts`

Class instantiation found at line 152

```typescript
const globalRateLimiter = new RateLimiter();
```

---

##  getEnvironmentConfig 

### Usage in `src\providers\llm-providers.ts`

Import statement found at line 13

```typescript
import { getEnvironmentConfig } from '../config/environment.js'
```

---

##  gitActor 

### Usage in `src\repository-manager.ts`

Import statement found at line 3

```typescript
import { gitActor } from './actors/git.js'
```

---

##  type LearningResult, patternLearningActor 

### Usage in `src\repository-manager.ts`

Import statement found at line 4

```typescript
import { type LearningResult, patternLearningActor } from './actors/pattern-learning.js'
```

---

##  carmackCoderMachine 

### Usage in `src\repository-manager.ts`

Import statement found at line 5

```typescript
import { carmackCoderMachine } from './machine.js'
```

---

##  basename, extname 

### Usage in `src\scripts\enhance-commit-message.ts`

Import statement found at line 15

```typescript
import { basename, extname } from 'node:path'
```

---

## organizeImports

### Usage in `src\scripts\pre-commit-imports.ts`

Function call found at line 17

```typescript
async function organizeImports(filePath: string): Promise<boolean> {
```

---

## readFile

### Usage in `src\scripts\pre-commit-imports.ts`

Function call found at line 19

```typescript
const content = await readFile(filePath, 'utf-8');
```

---

## split

### Usage in `src\scripts\pre-commit-imports.ts`

Function call found at line 20

```typescript
const lines = content.split('\n');
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Function call found at line 39

```typescript
.split('\n')
```

---

## trim

### Usage in `src\scripts\pre-commit-imports.ts`

Function call found at line 38

```typescript
const trimmed = line.trim();
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Function call found at line 40

```typescript
.filter((file) => file.trim())
```

---

## startsWith

### Usage in `src\scripts\pre-commit-imports.ts`

Function call found at line 40

```typescript
if (trimmed.startsWith('import ')) {
```

### Usage in `src\scripts\pre-commit-imports.ts`

Function call found at line 43

```typescript
const isNodeModule = module ? !module.startsWith('.') && !module.startsWith('/') : false;
```

---

## match

### Usage in `src\scripts\pre-commit-imports.ts`

Function call found at line 41

```typescript
const moduleMatch = line.match(/from ['"]([^'"]+)['"]/);
```

---

## getStagedTypeScriptFiles

### Usage in `src\scripts\pre-commit-typescript.ts`

Function call found at line 31

```typescript
async function getStagedTypeScriptFiles(): Promise<string[]> {
```

---

## filter

### Usage in `src\scripts\pre-commit-typescript.ts`

Function call found at line 40

```typescript
.filter((file) => file.trim())
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Function call found at line 41

```typescript
.filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Function call found at line 42

```typescript
.filter((file) => existsSync(file))
```

---

## endsWith

### Usage in `src\scripts\pre-commit-typescript.ts`

Function call found at line 41

```typescript
.filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
```

### Usage in `src\scripts\pre-commit-typescript.ts`

Function call found at line 41

```typescript
.filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
```

---

## existsSync

### Usage in `src\scripts\pre-commit-typescript.ts`

Function call found at line 42

```typescript
.filter((file) => existsSync(file))
```

---

##  readdir, readFile 

### Usage in `src\scripts\pre-commit-typescript.ts`

Import statement found at line 12

```typescript
import { readdir, readFile } from 'node:fs/promises'
```

---

##  createActor 

### Usage in `src\scripts\pre-commit-typescript.ts`

Import statement found at line 14

```typescript
import { createActor } from 'xstate'
```

---

## add

### Usage in `src\telemetry\collector.ts`

Function call found at line 39

```typescript
add(event: TelemetryMetric): void {
```

---

## push

### Usage in `src\telemetry\collector.ts`

Function call found at line 42

```typescript
this.events.push(validated);
```

---

## flush

### Usage in `src\telemetry\collector.ts`

Function call found at line 51

```typescript
this.flush();
```

### Usage in `src\telemetry\collector.ts`

Function call found at line 58

```typescript
async flush(): Promise<void> {
```

---

## PrivacyManager

### Usage in `src\telemetry\collector.ts`

Class instantiation found at line 200

```typescript
this.privacyManager = new PrivacyManager(this.config);
```

---

## PerformanceMonitor

### Usage in `src\telemetry\collector.ts`

Class instantiation found at line 201

```typescript
this.performanceMonitor = new PerformanceMonitor();
```

---

## TelemetryBuffer

### Usage in `src\telemetry\collector.ts`

Class instantiation found at line 202

```typescript
this.buffer = new TelemetryBuffer(this.config, this.handleFlush.bind(this));
```

---

## TelemetryCollector

### Usage in `src\telemetry\collector.ts`

Class instantiation found at line 673

```typescript
globalCollector = new TelemetryCollector(config);
```

### Usage in `src\telemetry\collector.ts`

Class instantiation found at line 686

```typescript
globalCollector = new TelemetryCollector(config);
```

---

##  createHash, randomUUID 

### Usage in `src\telemetry\collector.ts`

Import statement found at line 6

```typescript
import { createHash, randomUUID } from 'node:crypto'
```

---

##  EventEmitter 

### Usage in `src\telemetry\collector.ts`

Import statement found at line 7

```typescript
import { EventEmitter } from 'node:events'
```

---

##  performance 

### Usage in `src\telemetry\collector.ts`

Import statement found at line 8

```typescript
import { performance } from 'node:perf_hooks'
```

### Usage in `src\telemetry\integration.ts`

Import statement found at line 7

```typescript
import { performance } from 'node:perf_hooks'
```

---

##  TelemetryConfigSchema, TelemetryMetricSchema 

### Usage in `src\telemetry\collector.ts`

Import statement found at line 21

```typescript
import { TelemetryConfigSchema, TelemetryMetricSchema } from './types.js'
```

---

## set

### Usage in `src\telemetry\integration.ts`

Function call found at line 28

```typescript
this.startTimes.set(stage, performance.now());
```

---

## end

### Usage in `src\telemetry\integration.ts`

Function call found at line 35

```typescript
end(stage: keyof PipelineStages): void {
```

---

## get

### Usage in `src\telemetry\integration.ts`

Function call found at line 36

```typescript
const startTime = this.startTimes.get(stage);
```

---

## delete

### Usage in `src\telemetry\integration.ts`

Function call found at line 39

```typescript
this.startTimes.delete(stage);
```

---

## getStages

### Usage in `src\telemetry\integration.ts`

Function call found at line 46

```typescript
getStages(): PipelineStages {
```

---

## PerformanceTimer

### Usage in `src\telemetry\integration.ts`

Class instantiation found at line 449

```typescript
private timer = new PerformanceTimer();
```

---

## MemoryTracker

### Usage in `src\telemetry\integration.ts`

Class instantiation found at line 450

```typescript
private memoryTracker = new MemoryTracker();
```

---

##  createHash 

### Usage in `src\telemetry\integration.ts`

Import statement found at line 6

```typescript
import { createHash } from 'node:crypto'
```

---

##  getTelemetryCollector 

### Usage in `src\telemetry\integration.ts`

Import statement found at line 8

```typescript
import { getTelemetryCollector } from './collector.js'
```

---

## uuid

### Usage in `src\telemetry\types.ts`

Function call found at line 11

```typescript
eventId: z.string().uuid(),
```

### Usage in `src\telemetry\types.ts`

Function call found at line 15

```typescript
sessionId: z.string().uuid(),
```

---

## ID

### Usage in `src\telemetry\types.ts`

Function call found at line 16

```typescript
/** Optional user ID (anonymized hash) */
```

---

## endToEndTestFunction

### Usage in `src\test-e2e-function.ts`

Function call found at line 6

```typescript
export function endToEndTestFunction(testId: string): string {
```

---

## regex

### Usage in `src\types.ts`

Function call found at line 5

```typescript
export const GitHashSchema = z.string().regex(/^[a-f0-9]{40}$/);
```

---

##  YAML 

### Usage in `src\utils\config-validators.ts`

Import statement found at line 2

```typescript
import { YAML } from './yaml-handler.js'
```

---

##  type AstPattern, AstPatternSchema 

### Usage in `src\utils\index.ts`

Import statement found at line 3

```typescript
import { type AstPattern, AstPatternSchema } from '../types.js'
```

---

## EnhancedTransformationError

### Usage in `src\utils\pattern-filtering.ts`

Class instantiation found at line 118

```typescript
throw new EnhancedTransformationError({
```

### Usage in `src\utils\pattern-filtering.ts`

Class instantiation found at line 213

```typescript
throw new EnhancedTransformationError({
```

---

##  type AstPattern, AstPatternSchema, type TransformationMode, TransformationModeSchema 

### Usage in `src\utils\pattern-filtering.ts`

Import statement found at line 2

```typescript
import { type AstPattern, AstPatternSchema, type TransformationMode, TransformationModeSchema } from '../types.js'
```

---

##  detectLanguageFromFile, detectLanguagesFromFiles, getLanguageDistribution 

### Usage in `src\utils\pattern-filtering.ts`

Import statement found at line 3

```typescript
import { detectLanguageFromFile, detectLanguagesFromFiles, getLanguageDistribution } from './language-detection.js'
```

---

## super

### Usage in `src\utils\yaml-handler.ts`

Function call found at line 21

```typescript
super(message);
```

### Usage in `src\utils\yaml-handler.ts`

Function call found at line 32

```typescript
super(message);
```

---

## YamlParseError

### Usage in `src\utils\yaml-handler.ts`

Class instantiation found at line 68

```typescript
throw new YamlParseError(`YAML validation failed: ${error.message}`, undefined, error);
```

### Usage in `src\utils\yaml-handler.ts`

Class instantiation found at line 71

```typescript
throw new YamlParseError(
```

### Usage in `src\utils\yaml-handler.ts`

Class instantiation found at line 91

```typescript
throw new YamlParseError(error.message, filePath, error.originalError);
```

### Usage in `src\utils\yaml-handler.ts`

Class instantiation found at line 94

```typescript
throw new YamlParseError(
```

---

## YamlSerializationError

### Usage in `src\utils\yaml-handler.ts`

Class instantiation found at line 121

```typescript
throw new YamlSerializationError(
```

---

