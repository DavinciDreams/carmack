# API Documentation

Generated on 2025-07-23T03:16:28.678Z

## Table of Contents

- [src\actors\analysis](#src\actors\analysis)
- [src\actors\ast-grep-transformation](#src\actors\ast-grep-transformation)
- [src\actors\complexity](#src\actors\complexity)
- [src\actors\dafny](#src\actors\dafny)
- [src\actors\feedback-loop](#src\actors\feedback-loop)
- [src\actors\git](#src\actors\git)
- [src\actors\llm-testing-framework](#src\actors\llm-testing-framework)
- [src\actors\llm-transformation-enhanced](#src\actors\llm-transformation-enhanced)
- [src\actors\llm-transformation](#src\actors\llm-transformation)
- [src\actors\pattern-discovery](#src\actors\pattern-discovery)
- [src\actors\pattern-learning](#src\actors\pattern-learning)
- [src\actors\template-engine](#src\actors\template-engine)
- [src\actors\transformation-enhanced](#src\actors\transformation-enhanced)
- [src\actors\transformation](#src\actors\transformation)
- [src\actors\typescript-error-resolver](#src\actors\typescript-error-resolver)
- [src\actors\validation](#src\actors\validation)
- [src\config\environment](#src\config\environment)
- [src\docs\ast-analyzer](#src\docs\ast-analyzer)
- [src\docs\cli](#src\docs\cli)
- [src\docs\generator](#src\docs\generator)
- [src\docs\index](#src\docs\index)
- [src\docs\types](#src\docs\types)
- [src\example](#src\example)
- [src\learning\clustering](#src\learning\clustering)
- [src\learning\effectiveness-scorer](#src\learning\effectiveness-scorer)
- [src\learning\index](#src\learning\index)
- [src\learning\nlp](#src\learning\nlp)
- [src\learning\recommendation-engine](#src\learning\recommendation-engine)
- [src\learning\reinforcement](#src\learning\reinforcement)
- [src\learning\similarity](#src\learning\similarity)
- [src\learning\statistics](#src\learning\statistics)
- [src\learning\types](#src\learning\types)
- [src\llm-annotation\analyzer](#src\llm-annotation\analyzer)
- [src\llm-annotation\index](#src\llm-annotation\index)
- [src\llm-annotation\types](#src\llm-annotation\types)
- [src\machine](#src\machine)
- [src\pipeline\production-pipeline](#src\pipeline\production-pipeline)
- [src\providers\llm-providers](#src\providers\llm-providers)
- [src\repository-manager](#src\repository-manager)
- [src\scripts\enhance-commit-message](#src\scripts\enhance-commit-message)
- [src\scripts\pre-commit-imports](#src\scripts\pre-commit-imports)
- [src\scripts\pre-commit-typescript](#src\scripts\pre-commit-typescript)
- [src\telemetry\collector](#src\telemetry\collector)
- [src\telemetry\index](#src\telemetry\index)
- [src\telemetry\integration](#src\telemetry\integration)
- [src\telemetry\types](#src\telemetry\types)
- [src\test-e2e-function](#src\test-e2e-function)
- [src\types](#src\types)
- [src\utils\config-validators](#src\utils\config-validators)
- [src\utils\index](#src\utils\index)
- [src\utils\language-detection](#src\utils\language-detection)
- [src\utils\pattern-filtering](#src\utils\pattern-filtering)
- [src\utils\yaml-handler](#src\utils\yaml-handler)

## src\actors\analysis

**File:** `src\actors\analysis.ts`

### Functions

### Types

- `AnalysisInput`
- `of`

### Constants

#### `AnalysisInputSchema`

**Type:** `unknown`

**Value:** `z.union([`

#### `analysisActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `validatedInput`

**Type:** `unknown`

**Value:** `AnalysisInputSchema.parse(input)`

#### `learningInput`

**Type:** `unknown`

**Value:** `validatedInput as Extract<AnalysisInput`

#### `summaryInput`

**Type:** `unknown`

**Value:** `validatedInput as Extract<AnalysisInput`

#### `complexity`

**Type:** `unknown`

**Value:** `await analyzeComplexity(files)`

#### `recommendedMode`

**Type:** `unknown`

**Value:** `await determineTransformationMode(files`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `metrics`

**Type:** `unknown`

**Value:** `analyzeFileComplexity(content)`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `trimmed`

**Type:** `unknown`

**Value:** `line.trim()`

#### `openBraces`

**Type:** `unknown`

**Value:** `(trimmed.match(/\{/g) || []).length`

#### `closeBraces`

**Type:** `unknown`

**Value:** `(trimmed.match(/\}/g) || []).length`

#### `complexityPatterns`

**Type:** `unknown`

**Value:** `[`

#### `transformation`

**Type:** `unknown`

**Value:** `input.transformation as`

#### `newPatterns`

**Type:** `AstPattern[]`

**Value:** `[]`

#### `insights`

**Type:** `string[]`

**Value:** `[]`

#### `learnedPattern`

**Type:** `AstPattern`

**Value:** `{`

#### `transformation`

**Type:** `unknown`

**Value:** `input.transformation as { id?: string`

### Dependencies

- `xstate`
- `zod`

---

## src\actors\ast-grep-transformation

Enhanced AST-grep Transformation Engine

This engine provides the second tier in our speed hierarchy:
Template → **AST** → LLM

Features:
- True syntax tree-based pattern matching using AST-grep
- Semantic-aware transformations that understand code structure
- Context-sensitive replacements with scope analysis
- Multi-language support (TypeScript/JavaScript)
- Advanced pattern composition and chaining
- Performance-optimized batch processing

**File:** `src\actors\ast-grep-transformation.ts`

### Functions

#### `astGrepTransformationActor()`

Enhanced AST-grep transformation actor

**Tags:** `exported`

### Types

- `SgNode`
- `SgRoot`
- `AstGrepPattern`
- `AstGrepTransformationRequest`

### Constants

#### `AstGrepPatternSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `AstGrepTransformationRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `astGrepTransformationActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `validatedInput`

**Type:** `unknown`

**Value:** `AstGrepTransformationRequestSchema.parse(input)`

#### `results`

**Type:** `unknown`

**Value:** `await applyAstGrepTransformations(validatedInput)`

#### `filesModified`

**Type:** `string[]`

**Value:** `[]`

#### `appliedPatterns`

**Type:** `Array<{ file: string; pattern: string; count: number }>`

**Value:** `[]`

#### `activePatterns`

**Type:** `unknown`

**Value:** `prepareAstPatterns(request.patterns`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `transformResult`

**Type:** `unknown`

**Value:** `await transformFileWithAstGrep(`

#### `aPriority`

**Type:** `unknown`

**Value:** `a.performance?.priority ?? 5`

#### `bPriority`

**Type:** `unknown`

**Value:** `b.performance?.priority ?? 5`

#### `transformations`

**Type:** `Array<{ patternId: string; count: number }>`

**Value:** `[]`

#### `isTypeScript`

**Type:** `unknown`

**Value:** `filePath.endsWith('.ts') || filePath.endsWith('.tsx')`

#### `lang`

**Type:** `unknown`

**Value:** `isTypeScript ? ts : js`

#### `appliedPatterns`

**Type:** `unknown`

**Value:** `new Set<string>()`

#### `hasConflict`

**Type:** `unknown`

**Value:** `pattern.performance.conflicts.some((id) => appliedPatterns.has(id))`

#### `patternResult`

**Type:** `unknown`

**Value:** `await applyAstGrepPattern(root`

#### `matches`

**Type:** `unknown`

**Value:** `findAstGrepMatches(root`

#### `maxMatches`

**Type:** `unknown`

**Value:** `pattern.performance?.maxMatches || options.maxMatchesPerPattern || 1000`

#### `limitedMatches`

**Type:** `unknown`

**Value:** `matches.slice(0`

#### `sortedMatches`

**Type:** `unknown`

**Value:** `limitedMatches.sort((a`

#### `replacement`

**Type:** `unknown`

**Value:** `generateAstReplacement(match`

#### `before`

**Type:** `unknown`

**Value:** `modifiedContent.substring(0`

#### `after`

**Type:** `unknown`

**Value:** `modifiedContent.substring(match.range.end)`

#### `preservedReplacement`

**Type:** `unknown`

**Value:** `preserveAstFormatting(replacement`

#### `matches`

**Type:** `AstMatch[]`

**Value:** `[]`

#### `query`

**Type:** `unknown`

**Value:** `buildAstGrepQuery(pattern)`

#### `nodes`

**Type:** `unknown`

**Value:** `root.root().findAll(query)`

#### `variables`

**Type:** `unknown`

**Value:** `extractVariables(node`

#### `context`

**Type:** `unknown`

**Value:** `analyzeNodeContext(node)`

#### `nodeRange`

**Type:** `unknown`

**Value:** `node.range()`

#### `match`

**Type:** `AstMatch`

**Value:** `{`

#### `rule`

**Type:** `unknown`

**Value:** `pattern.pattern.rule`

#### `variables`

**Type:** `Record<string, string>`

**Value:** `{}`

#### `patternText`

**Type:** `unknown`

**Value:** `pattern.pattern.rule.pattern || ''`

#### `nodeText`

**Type:** `unknown`

**Value:** `node.text()`

#### `variableNames`

**Type:** `unknown`

**Value:** `extractVariableNames(patternText)`

#### `matchResult`

**Type:** `unknown`

**Value:** `(`

#### `value`

**Type:** `unknown`

**Value:** `matchResult.text()`

#### `manualValue`

**Type:** `unknown`

**Value:** `extractVariableFromText(nodeText`

#### `manualValue`

**Type:** `unknown`

**Value:** `extractVariableFromText(nodeText`

#### `variableMatches`

**Type:** `unknown`

**Value:** `extractVariablesFromPattern(nodeText`

#### `matches`

**Type:** `unknown`

**Value:** `patternText.match(/\$\$\$(\w+)|\$(\w+)/g) || []`

#### `regexPattern`

**Type:** `unknown`

**Value:** `patternText`

#### `match`

**Type:** `unknown`

**Value:** `nodeText.match(new RegExp(regexPattern))`

#### `variableNames`

**Type:** `unknown`

**Value:** `extractVariableNames(patternText)`

#### `varIndex`

**Type:** `unknown`

**Value:** `variableNames.indexOf(varName)`

#### `matchValue`

**Type:** `unknown`

**Value:** `match[varIndex + 1]`

#### `variables`

**Type:** `Record<string, string>`

**Value:** `{}`

#### `patterns`

**Type:** `unknown`

**Value:** `[`

#### `NAME`

**Type:** `unknown`

**Value:** `VALUE`

#### `match`

**Type:** `unknown`

**Value:** `nodeText.match(regex)`

#### `value`

**Type:** `unknown`

**Value:** `match[index + 1]`

#### `ancestors`

**Type:** `SgNode[]`

**Value:** `[]`

#### `kind`

**Type:** `unknown`

**Value:** `ancestor.kind()`

#### `parent`

**Type:** `unknown`

**Value:** `node.parent()`

#### `siblings`

**Type:** `unknown`

**Value:** `parent ? parent.children() : []`

#### `transformer`

**Type:** `unknown`

**Value:** `pattern.replacement.transformers?.[varName]`

#### `expectedKind`

**Type:** `unknown`

**Value:** `condition.match(/kind\s*==\s*['"]([^'"]+)['"]/)?.[1]`

#### `expectedScope`

**Type:** `unknown`

**Value:** `condition.match(/scope\s*==\s*['"]([^'"]+)['"]/)?.[1]`

#### `expectedText`

**Type:** `unknown`

**Value:** `condition.match(/text\s*includes\s*['"]([^'"]+)['"]/)?.[1]`

#### `lines`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `lastLine`

**Type:** `unknown`

**Value:** `lines[lines.length - 1] || ''`

#### `indentation`

**Type:** `unknown`

**Value:** `lastLine.match(/^\s*/)?.[0] || ''`

#### `replacementLines`

**Type:** `unknown`

**Value:** `replacement.split('\n')`

#### `indentedLines`

**Type:** `unknown`

**Value:** `replacementLines.map((line`

#### `BUILTIN_AST_PATTERNS`

**Type:** `AstGrepPattern[]`

**Value:** `[`

#### `result`

**Type:** `unknown`

**Value:** `await $PROMISE`

### Dependencies

- `node:fs/promises`
- `@ast-grep/napi`
- `xstate`
- `zod`

---

## src\actors\complexity

**File:** `src\actors\complexity.ts`

### Functions

#### `complexityActor()`

- Function/class counts
- Nesting depth
- Lines of code
- Cognitive complexity
- Cyclomatic complexity
Analyzes code complexity metrics:

Complexity Actor

**Tags:** `exported`

### Types

- `ComplexityInput`

### Constants

#### `ComplexityInputSchema`

**Type:** `unknown`

**Value:** `z.union([`

#### `complexityActor`

**Type:** `unknown`

**Value:** `fromPromise(async ({ input }: { input: ComplexityInput }) => {`

#### `validatedInput`

**Type:** `unknown`

**Value:** `ComplexityInputSchema.parse(input)`

#### `metrics`

**Type:** `unknown`

**Value:** `await calculateComplexityMetrics(files)`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `fileMetrics`

**Type:** `unknown`

**Value:** `analyzeFileComplexity(content)`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `linesOfCode`

**Type:** `unknown`

**Value:** `lines.filter((line) => {`

#### `trimmed`

**Type:** `unknown`

**Value:** `line.trim()`

#### `cyclomaticPatterns`

**Type:** `unknown`

**Value:** `[`

#### `matches`

**Type:** `unknown`

**Value:** `content.match(pattern)`

#### `cognitivePatterns`

**Type:** `unknown`

**Value:** `[`

#### `openBraces`

**Type:** `unknown`

**Value:** `(line.match(/\{/g) || []).length`

#### `closeBraces`

**Type:** `unknown`

**Value:** `(line.match(/\}/g) || []).length`

#### `matches`

**Type:** `unknown`

**Value:** `content.match(pattern)`

#### `functionPatterns`

**Type:** `unknown`

**Value:** `[`

#### `matches`

**Type:** `unknown`

**Value:** `content.match(pattern)`

#### `classMatches`

**Type:** `unknown`

**Value:** `content.match(/\bclass\s+\w+/g)`

#### `classCount`

**Type:** `unknown`

**Value:** `classMatches ? classMatches.length : 0`

#### `changes`

**Type:** `string[]`

**Value:** `[]`

### Dependencies

- `node:fs/promises`
- `xstate`
- `zod`

---

## src\actors\dafny

**File:** `src\actors\dafny.ts`

### Functions

#### `dafnyActor()`

maintain correctness properties.
Ensures that transformations preserve program semantics and
Provides formal verification of code transformations using Dafny.

Dafny Verification Actor

**Tags:** `exported`

### Types

- `DafnyInput`

### Constants

#### `DafnyInputSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `dafnyActor`

**Type:** `unknown`

**Value:** `fromPromise(async ({ input }: { input: DafnyInput }) => {`

#### `validatedInput`

**Type:** `unknown`

**Value:** `DafnyInputSchema.parse(input)`

#### `verificationConditions`

**Type:** `unknown`

**Value:** `await generateVerificationConditions(files`

#### `verificationResult`

**Type:** `unknown`

**Value:** `await runDafnyVerification(verificationConditions)`

#### `fallbackUsed`

**Type:** `unknown`

**Value:** `verificationResult.errors.some((e) => e.includes('fallback'))`

#### `conditions`

**Type:** `string[]`

**Value:** `[]`

#### `baseConditions`

**Type:** `unknown`

**Value:** `[`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `dafnyAvailable`

**Type:** `unknown`

**Value:** `await checkDafnyAvailable()`

#### `verificationFile`

**Type:** `unknown`

**Value:** `await createDafnyVerificationFile(conditions)`

#### `result`

**Type:** `unknown`

**Value:** `await executeDafnyVerification(verificationFile)`

#### `fallbackResult`

**Type:** `unknown`

**Value:** `await fallbackVerification(conditions`

#### `execFileAsync`

**Type:** `unknown`

**Value:** `promisify(execFile)`

#### `tempDir`

**Type:** `unknown`

**Value:** `await mkdtemp(join(tmpdir()`

#### `verificationFile`

**Type:** `unknown`

**Value:** `join(tempDir`

#### `workingTransformationsPath`

**Type:** `unknown`

**Value:** `resolve('src/verification/working-transformations.dfy')`

#### `dafnyCode`

**Type:** `unknown`

**Value:** ```

#### `execFileAsync`

**Type:** `unknown`

**Value:** `promisify(execFile)`

#### `output`

**Type:** `unknown`

**Value:** `stdout + stderr`

#### `success`

**Type:** `unknown`

**Value:** `!output.includes('Error:') && !output.includes('verification error')`

#### `errors`

**Type:** `string[]`

**Value:** `[]`

#### `errorLines`

**Type:** `unknown`

**Value:** `output`

#### `verified`

**Type:** `unknown`

**Value:** `true`

#### `errors`

**Type:** `string[]`

**Value:** `[]`

### Dependencies

- `node:fs/promises`
- `xstate`
- `zod`

---

## src\actors\feedback-loop

Feedback Loop System for Continuous Pattern Improvement

This system creates a continuous improvement cycle by:
- Collecting feedback from transformation results
- Analyzing pattern performance over time
- Automatically adjusting pattern confidence scores
- Identifying underperforming patterns for removal
- Discovering new patterns from successful transformations
- Optimizing pattern parameters based on usage data

**File:** `src\actors\feedback-loop.ts`

### Functions

#### `feedbackLoopActor()`

Feedback Loop Actor

**Tags:** `exported`

### Types

- `FeedbackData`
- `FeedbackLoopRequest`

### Constants

#### `FeedbackDataSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `FeedbackLoopRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `feedbackLoopActor`

**Type:** `unknown`

**Value:** `fromPromise(async ({ input }: { input: FeedbackLoopRequest }) => {`

#### `validatedInput`

**Type:** `unknown`

**Value:** `FeedbackLoopRequestSchema.parse(input)`

#### `result`

**Type:** `unknown`

**Value:** `await executeFeedbackLoop(validatedInput)`

#### `feedbackData`

**Type:** `unknown`

**Value:** `request.feedbackData || []`

#### `validatedFeedback`

**Type:** `unknown`

**Value:** `feedbackData.map((data) => FeedbackDataSchema.parse(data))`

#### `feedbackStore`

**Type:** `unknown`

**Value:** `await getFeedbackStore()`

#### `updatedMetrics`

**Type:** `unknown`

**Value:** `await updatePatternMetrics(validatedFeedback)`

#### `config`

**Type:** `unknown`

**Value:** `request.analysisConfig`

#### `feedbackStore`

**Type:** `unknown`

**Value:** `await getFeedbackStore()`

#### `cutoffDate`

**Type:** `unknown`

**Value:** `new Date()`

#### `recentFeedback`

**Type:** `unknown`

**Value:** `feedbackStore.filter((f) => new Date(f.timestamp) >= cutoffDate)`

#### `patternGroups`

**Type:** `unknown`

**Value:** `groupFeedbackByPattern(recentFeedback)`

#### `patternMetrics`

**Type:** `PatternMetrics[]`

**Value:** `[]`

#### `metrics`

**Type:** `unknown`

**Value:** `calculatePatternMetrics(patternId`

#### `analysis`

**Type:** `unknown`

**Value:** `{`

#### `config`

**Type:** `unknown`

**Value:** `request.optimizationConfig`

#### `analysisResult`

**Type:** `unknown`

**Value:** `await analyzeFeedback({`

#### `recommendations`

**Type:** `unknown`

**Value:** `analysisResult.recommendations`

#### `appliedOptimizations`

**Type:** `AppliedOptimization[]`

**Value:** `[]`

#### `optimization`

**Type:** `unknown`

**Value:** `await applyOptimization(recommendation`

#### `confidenceUpdates`

**Type:** `unknown`

**Value:** `await updateConfidenceScores(analysisResult.patternMetrics`

#### `analysisResult`

**Type:** `unknown`

**Value:** `await analyzeFeedback({`

#### `feedbackStore`

**Type:** `unknown`

**Value:** `await getFeedbackStore()`

#### `totalFeedback`

**Type:** `unknown`

**Value:** `feedbackStore.length`

#### `overallMetrics`

**Type:** `unknown`

**Value:** `{`

#### `performanceByLanguage`

**Type:** `unknown`

**Value:** `calculatePerformanceByCategory(feedbackStore`

#### `performanceByFileType`

**Type:** `unknown`

**Value:** `calculatePerformanceByCategory(feedbackStore`

#### `trendAnalysis`

**Type:** `unknown`

**Value:** `calculateTrendAnalysis(feedbackStore)`

#### `feedbackStore`

**Type:** `FeedbackData[]`

**Value:** `[]`

#### `groups`

**Type:** `Record<string, FeedbackData[]>`

**Value:** `{}`

#### `successful`

**Type:** `unknown`

**Value:** `feedback.filter((f) => f.success)`

#### `successRate`

**Type:** `unknown`

**Value:** `successful.length / feedback.length`

#### `averageExecutionTime`

**Type:** `unknown`

**Value:** `feedback.reduce((sum`

#### `averageQualityImprovement`

**Type:** `unknown`

**Value:** `feedback.reduce((sum`

#### `averageUserRating`

**Type:** `unknown`

**Value:** `calculateAverageUserRating(feedback)`

#### `recentFeedback`

**Type:** `unknown`

**Value:** `feedback.slice(-Math.min(10`

#### `recentSuccessRate`

**Type:** `unknown`

**Value:** `recentFeedback.filter((f) => f.success).length / recentFeedback.length`

#### `trendDirection`

**Type:** `unknown`

**Value:** `recentSuccessRate > successRate + 0.1`

#### `performance`

**Type:** `unknown`

**Value:** `{`

#### `breakdown`

**Type:** `Record<string, { success: number; total: number }>`

**Value:** `{}`

#### `key`

**Type:** `unknown`

**Value:** `keyExtractor(item)`

#### `ratingsOnly`

**Type:** `unknown`

**Value:** `feedback.filter((f) => f.userRating !== undefined)`

#### `weights`

**Type:** `unknown`

**Value:** `{ success: 0.5`

#### `normalizedRating`

**Type:** `unknown`

**Value:** `(userRating - 1) / 4`

#### `normalizedQuality`

**Type:** `unknown`

**Value:** `(qualityImprovement + 1) / 2`

#### `recommendations`

**Type:** `ImprovementRecommendation[]`

**Value:** `[]`

#### `priorityOrder`

**Type:** `unknown`

**Value:** `{ high: 3`

#### `patternGroups`

**Type:** `unknown`

**Value:** `groupFeedbackByPattern(feedback)`

#### `updatedMetrics`

**Type:** `PatternMetrics[]`

**Value:** `[]`

#### `metrics`

**Type:** `unknown`

**Value:** `calculatePatternMetrics(patternId`

#### `updates`

**Type:** `Array<{ patternId: string; oldScore: number; newScore: number }>`

**Value:** `[]`

#### `oldScore`

**Type:** `unknown`

**Value:** `metric.confidenceScore`

#### `targetScore`

**Type:** `unknown`

**Value:** `calculateConfidenceScore(`

#### `newScore`

**Type:** `unknown`

**Value:** `oldScore + config.learningRate * (targetScore - oldScore)`

#### `breakdown`

**Type:** `unknown`

**Value:** `calculateBreakdown(feedback`

#### `result`

**Type:** `Record<string, { successRate: number; count: number }>`

**Value:** `{}`

#### `sortedFeedback`

**Type:** `unknown`

**Value:** `feedback.sort(`

#### `quarterSize`

**Type:** `unknown`

**Value:** `Math.floor(sortedFeedback.length / 4)`

#### `firstQuarter`

**Type:** `unknown`

**Value:** `sortedFeedback.slice(0`

#### `lastQuarter`

**Type:** `unknown`

**Value:** `sortedFeedback.slice(-quarterSize)`

#### `firstQuarterSuccess`

**Type:** `unknown`

**Value:** `firstQuarter.filter((f) => f.success).length / firstQuarter.length`

#### `lastQuarterSuccess`

**Type:** `unknown`

**Value:** `lastQuarter.filter((f) => f.success).length / lastQuarter.length`

#### `change`

**Type:** `unknown`

**Value:** `lastQuarterSuccess - firstQuarterSuccess`

#### `strength`

**Type:** `unknown`

**Value:** `Math.abs(change)`

### Dependencies

- `xstate`
- `zod`

---

## src\actors\git

**File:** `src\actors\git.ts`

### Functions

#### `gitActor()`

- rollback: Restore to previous checkpoint on failure
- commit: Commit successful transformations
- createCheckpoint: Create a restore point before transformation
Handles git operations for safe code transformation:

Git Actor

**Tags:** `exported`

#### `git()`

**Tags:** `exported`

#### `git()`

**Tags:** `exported`

#### `git()`

**Tags:** `exported`

### Types

- `GitInput`

### Constants

#### `GitInputSchema`

**Type:** `unknown`

**Value:** `z.union([`

#### `gitActor`

**Type:** `unknown`

**Value:** `fromPromise(async ({ input }: { input: GitInput }) => {`

#### `validatedInput`

**Type:** `unknown`

**Value:** `GitInputSchema.parse(input)`

#### `git`

**Type:** `unknown`

**Value:** `simpleGit()`

#### `isRepo`

**Type:** `unknown`

**Value:** `await git.checkIsRepo()`

#### `status`

**Type:** `unknown`

**Value:** `await git.status()`

#### `currentBranch`

**Type:** `unknown`

**Value:** `status.current || 'main'`

#### `commitResult`

**Type:** `unknown`

**Value:** `await git.commit(description)`

#### `log`

**Type:** `unknown`

**Value:** `await git.log(['-1'])`

#### `git`

**Type:** `unknown`

**Value:** `simpleGit()`

#### `isRepo`

**Type:** `unknown`

**Value:** `await git.checkIsRepo()`

#### `status`

**Type:** `unknown`

**Value:** `await git.status()`

#### `currentBranch`

**Type:** `unknown`

**Value:** `status.current || 'main'`

#### `commitResult`

**Type:** `unknown`

**Value:** `await git.commit(message)`

#### `git`

**Type:** `unknown`

**Value:** `simpleGit()`

#### `isRepo`

**Type:** `unknown`

**Value:** `await git.checkIsRepo()`

#### `log`

**Type:** `unknown`

**Value:** `await git.log(['-1'])`

#### `currentHash`

**Type:** `unknown`

**Value:** `log.latest?.hash`

### Dependencies

- `simple-git`
- `xstate`
- `zod`

---

## src\actors\llm-testing-framework

Comprehensive LLM Testing Framework

This framework provides systematic testing capabilities for LLM transformations:
- Automated test case generation from patterns
- Property-based testing for transformation correctness
- Performance benchmarking and regression testing
- Integration testing across the entire pipeline
- Quality metrics and reporting

**File:** `src\actors\llm-testing-framework.ts`

### Functions

#### `llmTestingFrameworkActor()`

LLM Testing Framework Actor

**Tags:** `exported`

### Types

- `TestCase`
- `TestSuite`
- `TestExecutionRequest`
- `safety`
- `Assertion`
- `AssertionResult`
- `PerformanceMetrics`
- `TransformationOutput`
- `TestResult`
- `SuiteResult`
- `ExecutionResult`
- `safety`

### Constants

#### `TestCaseSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TestSuiteSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TestExecutionRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `AssertionSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `AssertionResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PerformanceMetricsSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TransformationOutputSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TestResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `SuiteResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ExecutionResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `llmTestingFrameworkActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `validatedInput`

**Type:** `unknown`

**Value:** `TestExecutionRequestSchema.parse(input)`

#### `results`

**Type:** `unknown`

**Value:** `await executeTestSuites(validatedInput)`

#### `suiteResults`

**Type:** `SuiteResult[]`

**Value:** `[]`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `suiteResult`

**Type:** `unknown`

**Value:** `await executeTestSuite(suite`

#### `totalDuration`

**Type:** `unknown`

**Value:** `Date.now() - startTime`

#### `summary`

**Type:** `unknown`

**Value:** `{`

#### `executionResult`

**Type:** `unknown`

**Value:** `{`

#### `results`

**Type:** `TestResult[]`

**Value:** `[]`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `chunks`

**Type:** `unknown`

**Value:** `chunkArray(suite.testCases`

#### `chunkResults`

**Type:** `unknown`

**Value:** `await Promise.all(`

#### `result`

**Type:** `unknown`

**Value:** `await executeTestCase(testCase`

#### `duration`

**Type:** `unknown`

**Value:** `Date.now() - startTime`

#### `summary`

**Type:** `unknown`

**Value:** `{`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `actualOutput`

**Type:** `unknown`

**Value:** `await executeTransformation(testCase.input)`

#### `assertions`

**Type:** `unknown`

**Value:** `await runAssertions(testCase`

#### `duration`

**Type:** `unknown`

**Value:** `Date.now() - startTime`

#### `allPassed`

**Type:** `unknown`

**Value:** `assertions.every((a) => a.passed)`

#### `duration`

**Type:** `unknown`

**Value:** `Date.now() - startTime`

#### `result`

**Type:** `unknown`

**Value:** `{`

#### `assertions`

**Type:** `unknown`

**Value:** `testCase.expected.assertions || []`

#### `results`

**Type:** `AssertionResult[]`

**Value:** `[]`

#### `result`

**Type:** `unknown`

**Value:** `await runSingleAssertion(assertion`

#### `validatedResult`

**Type:** `unknown`

**Value:** `AssertionResultSchema.parse(result)`

#### `errorResult`

**Type:** `unknown`

**Value:** `{`

#### `validatedErrorResult`

**Type:** `unknown`

**Value:** `AssertionResultSchema.parse(errorResult)`

#### `contains`

**Type:** `unknown`

**Value:** `actualOutput?.content?.includes(assertion.value) || false`

#### `notContains`

**Type:** `unknown`

**Value:** `!actualOutput?.content?.includes(assertion.value)`

#### `regex`

**Type:** `unknown`

**Value:** `new RegExp(assertion.value)`

#### `matches`

**Type:** `unknown`

**Value:** `regex.test(actualOutput?.content || '')`

#### `isValid`

**Type:** `unknown`

**Value:** `await validateSyntax(actualOutput?.content || ''`

#### `duration`

**Type:** `unknown`

**Value:** `actualOutput?.performance?.duration || 0`

#### `underLimit`

**Type:** `unknown`

**Value:** `duration < assertion.value`

#### `complexityReduced`

**Type:** `unknown`

**Value:** `await checkComplexityReduction(`

#### `typeSafe`

**Type:** `unknown`

**Value:** `await checkTypesSafety(actualOutput?.content`

#### `ts`

**Type:** `unknown`

**Value:** `await import('typescript')`

#### `sourceFile`

**Type:** `unknown`

**Value:** `ts.createSourceFile('test.ts'`

#### `originalComplexity`

**Type:** `unknown`

**Value:** `await new Promise<ComplexityMetrics>((resolve) => {`

#### `actor`

**Type:** `unknown`

**Value:** `createActor(complexityActor`

#### `transformedComplexity`

**Type:** `unknown`

**Value:** `await new Promise<ComplexityMetrics>((resolve) => {`

#### `actor`

**Type:** `unknown`

**Value:** `createActor(complexityActor`

#### `result`

**Type:** `unknown`

**Value:** `await new Promise<ValidationActorResult>((resolve) => {`

#### `actor`

**Type:** `unknown`

**Value:** `createActor(validationActor`

#### `output`

**Type:** `unknown`

**Value:** `actor.getSnapshot().output`

#### `reportPath`

**Type:** `unknown`

**Value:** `join(options.outputDir`

#### `htmlReportPath`

**Type:** `unknown`

**Value:** `join(options.outputDir`

#### `htmlContent`

**Type:** `unknown`

**Value:** `generateHtmlReport(executionResult)`

#### `chunks`

**Type:** `T[][]`

**Value:** `[]`

#### `BUILTIN_TEST_SUITES`

**Type:** `TestSuite[]`

**Value:** `[`

#### `name`

**Type:** `unknown`

**Value:** `"test"'`

#### `add`

**Type:** `unknown`

**Value:** `(a`

#### `codeLength`

**Type:** `unknown`

**Value:** `testCase.input.code.length || 1`

#### `transformationSpeed`

**Type:** `unknown`

**Value:** `duration > 0 ? codeLength / duration : 0`

### Dependencies

- `node:fs/promises`
- `node:path`
- `xstate`
- `zod`

---

## src\actors\llm-transformation-enhanced

Enhanced LLM Transformation Actor

This module provides production-ready LLM-based code transformations using
the new provider system with real API integrations, fallback mechanisms,
context-aware transformations, advanced prompt engineering, and comprehensive
error handling with rollback capabilities.

**File:** `src\actors\llm-transformation-enhanced.ts`

### Functions

#### `enhancedLLMTransformationActor()`

**Tags:** `exported`

### Types

- `LLMRequest`
- `safety`
- `safety`
- `LLMTransformationResponse`
- `FileContextAnalysis`
- `TransformationCacheEntry`
- `EnhancedLLMConfig`
- `EnhancedLLMTransformationInput`
- `EnhancedLLMTransformationResult`
- `inference`
- `inference`
- `issues`
- `safety`
- `safety`
- `safety`
- `safety`
- `issues`
- `inference`

### Constants

#### `FileContextAnalysisSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TransformationCacheEntrySchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LLMTransformationResponseSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `EnhancedLLMConfigSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `EnhancedLLMTransformationInputSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `EnhancedLLMTransformationResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `enhancedLLMTransformationActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `validatedInput`

**Type:** `unknown`

**Value:** `EnhancedLLMTransformationInputSchema.parse(input)`

#### `transformer`

**Type:** `unknown`

**Value:** `new EnhancedLLMTransformer(validatedInput.config)`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `filesModified`

**Type:** `string[]`

**Value:** `[]`

#### `errors`

**Type:** `string[]`

**Value:** `[]`

#### `warnings`

**Type:** `string[]`

**Value:** `[]`

#### `result`

**Type:** `unknown`

**Value:** `await this.transformSingleFile(filePath`

#### `errorMsg`

**Type:** `unknown`

**Value:** ``Failed to transform ${filePath}: ${result.error}``

#### `errorMsg`

**Type:** `unknown`

**Value:** `error instanceof Error ? error.message : String(error)`

#### `totalTime`

**Type:** `unknown`

**Value:** `Date.now() - startTime`

#### `averageConfidence`

**Type:** `unknown`

**Value:** `confidenceCount > 0 ? totalConfidence / confidenceCount : 0`

#### `successRate`

**Type:** `unknown`

**Value:** `input.files.length > 0 ? successCount / input.files.length : 0`

#### `originalContent`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `fileContext`

**Type:** `unknown`

**Value:** `await this.analyzeFileContext(originalContent`

#### `prompt`

**Type:** `unknown`

**Value:** `this.generateEnhancedTransformationPrompt(`

#### `cacheKey`

**Type:** `unknown`

**Value:** `this.generateCacheKey(originalContent`

#### `cachedResult`

**Type:** `unknown`

**Value:** `this.cache.get(cacheKey)`

#### `llmRequest`

**Type:** `LLMRequest`

**Value:** `{`

#### `llmResponse`

**Type:** `unknown`

**Value:** `await this.providerManager.makeRequestWithFallback(`

#### `transformationResult`

**Type:** `unknown`

**Value:** `this.parseTransformationResponse(`

#### `validationResult`

**Type:** `unknown`

**Value:** `await this.validateTransformation(`

#### `finalTransformedCode`

**Type:** `unknown`

**Value:** `transformationResult.transformedCode || originalContent`

#### `result`

**Type:** `unknown`

**Value:** `{`

#### `cacheEntry`

**Type:** `TransformationCacheEntry`

**Value:** `{`

#### `result`

**Type:** `unknown`

**Value:** `{`

#### `cacheEntry`

**Type:** `TransformationCacheEntry`

**Value:** `{`

#### `language`

**Type:** `unknown`

**Value:** `this.detectLanguage(filePath)`

#### `imports`

**Type:** `unknown`

**Value:** `this.extractImports(content)`

#### `exports`

**Type:** `unknown`

**Value:** `this.extractExports(content)`

#### `functions`

**Type:** `unknown`

**Value:** `(content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length`

#### `classes`

**Type:** `unknown`

**Value:** `(content.match(/class\s+\w+/g) || []).length`

#### `complexity`

**Type:** `unknown`

**Value:** `this.calculateEnhancedComplexity(content)`

#### `patterns`

**Type:** `unknown`

**Value:** `this.detectCodePatterns(content)`

#### `issues`

**Type:** `unknown`

**Value:** `this.detectCodeIssues(content)`

#### `detectedFramework`

**Type:** `unknown`

**Value:** `context?.framework || this.detectFramework(imports)`

#### `result`

**Type:** `{
      language: string;
      framework?: string;
      complexity: number;
      patterns: string[];
      imports: string[];
      exports: string[];
      functions: number;
      classes: number;
      issues: string[];
    }`

**Value:** `{`

#### `customPrompt`

**Type:** `unknown`

**Value:** `request?.prompt || this.getDefaultLLMTransformationGoals(context)`

#### `rawParsed`

**Type:** `unknown`

**Value:** `JSON.parse(response)`

#### `validatedResponse`

**Type:** `unknown`

**Value:** `LLMTransformationResponseSchema.parse({`

#### `codeMatch`

**Type:** `unknown`

**Value:** `response.match(/```[\w]*\n([\s\S]*?)\n```/)`

#### `extractedCode`

**Type:** `unknown`

**Value:** `codeMatch?.[1]?.trim() || null`

#### `fallbackResponse`

**Type:** `unknown`

**Value:** `LLMTransformationResponseSchema.parse({`

#### `complexityPatterns`

**Type:** `unknown`

**Value:** `[`

#### `matches`

**Type:** `unknown`

**Value:** `content.match(pattern)`

#### `issues`

**Type:** `string[]`

**Value:** `[]`

#### `errors`

**Type:** `string[]`

**Value:** `[]`

#### `openBraces`

**Type:** `unknown`

**Value:** `(transformedCode.match(/\{/g) || []).length`

#### `closeBraces`

**Type:** `unknown`

**Value:** `(transformedCode.match(/\}/g) || []).length`

#### `openParens`

**Type:** `unknown`

**Value:** `(transformedCode.match(/\(/g) || []).length`

#### `closeParens`

**Type:** `unknown`

**Value:** `(transformedCode.match(/\)/g) || []).length`

#### `originalImports`

**Type:** `unknown`

**Value:** `this.extractImports(originalCode)`

#### `transformedImports`

**Type:** `unknown`

**Value:** `this.extractImports(transformedCode)`

#### `similarity`

**Type:** `unknown`

**Value:** `this.calculateSimilarity(originalCode`

#### `validatedCache`

**Type:** `unknown`

**Value:** `TransformationCacheEntrySchema.parse(cachedResult)`

#### `cacheAge`

**Type:** `unknown`

**Value:** `Date.now() - validatedCache.timestamp`

#### `maxCacheAge`

**Type:** `unknown`

**Value:** `24 * 60 * 60 * 1000`

#### `result`

**Type:** `TransformationMethodResult`

**Value:** `{`

#### `errorMessage`

**Type:** `unknown`

**Value:** `validationError instanceof Error`

#### `fallbackResult`

**Type:** `TransformationMethodResult`

**Value:** `{`

#### `ext`

**Type:** `unknown`

**Value:** `filePath.split('.').pop()?.toLowerCase()`

#### `imports`

**Type:** `unknown`

**Value:** `content.match(/import\s+.*?from\s+['"][^'"]+['"]/g) || []`

#### `exports`

**Type:** `unknown`

**Value:** `content.match(`

#### `importText`

**Type:** `unknown`

**Value:** `imports.join(' ').toLowerCase()`

#### `patterns`

**Type:** `string[]`

**Value:** `[]`

#### `goals`

**Type:** `string[]`

**Value:** `[]`

#### `combined`

**Type:** `unknown`

**Value:** ``${content}|${prompt}``

#### `char`

**Type:** `unknown`

**Value:** `combined.charCodeAt(i)`

#### `set1`

**Type:** `unknown`

**Value:** `new Set(str1.split(/\s+/))`

#### `set2`

**Type:** `unknown`

**Value:** `new Set(str2.split(/\s+/))`

#### `intersection`

**Type:** `unknown`

**Value:** `new Set([...set1].filter((x) => set2.has(x)))`

#### `union`

**Type:** `unknown`

**Value:** `new Set([...set1`

### Dependencies

- `node:fs/promises`
- `xstate`
- `zod`
- `../providers/llm-providers.js`

---

## src\actors\llm-transformation

Comprehensive LLM Transformation System

This module implements production-ready LLM-based code transformations with:
- Multiple LLM provider support (OpenAI, Anthropic, Local models)
- Intelligent prompt engineering for code transformation
- Context-aware code analysis and transformation
- Safety mechanisms with validation and rollback
- Performance optimization with caching and batching

**File:** `src\actors\llm-transformation.ts`

### Functions

#### `llmTransformationActor()`

LLM Transformation Actor

**Tags:** `exported`

### Types

- `LLMProvider`
- `LLMConfig`
- `LLMTransformationInput`
- `LLMTransformationResponse`
- `LLMTransformationResult`
- `safety`
- `annotations`
- `it`

### Constants

#### `LLMProviderSchema`

**Type:** `unknown`

**Value:** `z.enum(['openai'`

#### `LLMConfigSchema`

**Type:** `unknown`

**Value:** `z`

#### `LLMTransformationInputSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LLMTransformationResponseSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LLMTransformationResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `llmTransformationActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `validatedInput`

**Type:** `unknown`

**Value:** `LLMTransformationInputSchema.parse(input)`

#### `transformer`

**Type:** `unknown`

**Value:** `new LLMTransformer(validatedInput.config)`

#### `filesModified`

**Type:** `string[]`

**Value:** `[]`

#### `errors`

**Type:** `string[]`

**Value:** `[]`

#### `warnings`

**Type:** `string[]`

**Value:** `[]`

#### `result`

**Type:** `unknown`

**Value:** `await this.transformSingleFile(filePath`

#### `errorMsg`

**Type:** `unknown`

**Value:** ``Failed to transform ${filePath}: ${result.error}``

#### `errorMsg`

**Type:** `unknown`

**Value:** `error instanceof Error ? error.message : String(error)`

#### `averageConfidence`

**Type:** `unknown`

**Value:** `confidenceCount > 0 ? totalConfidence / confidenceCount : 0`

#### `originalContent`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `fileContext`

**Type:** `unknown`

**Value:** `await this.analyzeFileContext(originalContent`

#### `prompt`

**Type:** `unknown`

**Value:** `this.generateTransformationPrompt(originalContent`

#### `cacheKey`

**Type:** `unknown`

**Value:** `this.generateCacheKey(originalContent`

#### `validationResult`

**Type:** `unknown`

**Value:** `await this.validateTransformation(`

#### `warnings`

**Type:** `unknown`

**Value:** `llmResponse.confidence === 0 &&`

#### `language`

**Type:** `unknown`

**Value:** `this.detectLanguage(filePath)`

#### `imports`

**Type:** `unknown`

**Value:** `this.extractImports(content)`

#### `exports`

**Type:** `unknown`

**Value:** `this.extractExports(content)`

#### `functions`

**Type:** `unknown`

**Value:** `(content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length`

#### `classes`

**Type:** `unknown`

**Value:** `(content.match(/class\s+\w+/g) || []).length`

#### `complexity`

**Type:** `unknown`

**Value:** `this.calculateSimpleComplexity(content)`

#### `patterns`

**Type:** `unknown`

**Value:** `this.detectCodePatterns(content)`

#### `detectedFramework`

**Type:** `unknown`

**Value:** `context?.framework || this.detectFramework(imports)`

#### `result`

**Type:** `{
      language: string;
      framework?: string;
      complexity: number;
      patterns: string[];
      imports: string[];
      exports: string[];
      functions: number;
      classes: number;
    }`

**Value:** `{`

#### `basePrompt`

**Type:** `unknown`

**Value:** ``You are an expert code transformation assistant. Transform the following ${context.language} code to improve it using modern best practices.`

#### `goals`

**Type:** `unknown`

**Value:** `[`

#### `response`

**Type:** `unknown`

**Value:** `await this.makeAPICall(prompt)`

#### `parsedResponse`

**Type:** `unknown`

**Value:** `this.parseAPIResponse(response)`

#### `validatedResponse`

**Type:** `unknown`

**Value:** `LLMTransformationResponseSchema.parse(parsedResponse)`

#### `delay`

**Type:** `unknown`

**Value:** `2 ** attempt * 1000`

#### `providerManager`

**Type:** `unknown`

**Value:** `getLLMProviderManager()`

#### `request`

**Type:** `unknown`

**Value:** `{`

#### `response`

**Type:** `unknown`

**Value:** `await providerManager.makeRequestWithFallback(`

#### `codeMatch`

**Type:** `unknown`

**Value:** `prompt.match(/```[\w]*\n([\s\S]*?)\n```/)`

#### `originalCode`

**Type:** `unknown`

**Value:** `codeMatch ? codeMatch[1] : ''`

#### `appliedTransformations`

**Type:** `string[]`

**Value:** `[]`

#### `parsed`

**Type:** `unknown`

**Value:** `JSON.parse(response)`

#### `codeValue`

**Type:** `unknown`

**Value:** `parsed.transformedCode`

#### `trimmed`

**Type:** `unknown`

**Value:** `codeValue.trim()`

#### `innerParsed`

**Type:** `unknown`

**Value:** `JSON.parse(codeValue)`

#### `correctedResponse`

**Type:** `unknown`

**Value:** `{`

#### `jsonMatch`

**Type:** `unknown`

**Value:** `response.match(/```json\n([\s\S]*?)\n```/)`

#### `codeMatch`

**Type:** `unknown`

**Value:** `response.match(/```[\w]*\n([\s\S]*?)\n```/)`

#### `errors`

**Type:** `string[]`

**Value:** `[]`

#### `openBraces`

**Type:** `unknown`

**Value:** `(transformedCode.match(/\{/g) || []).length`

#### `closeBraces`

**Type:** `unknown`

**Value:** `(transformedCode.match(/\}/g) || []).length`

#### `openParens`

**Type:** `unknown`

**Value:** `(transformedCode.match(/\(/g) || []).length`

#### `closeParens`

**Type:** `unknown`

**Value:** `(transformedCode.match(/\)/g) || []).length`

#### `originalImports`

**Type:** `unknown`

**Value:** `this.extractImports(originalCode)`

#### `transformedImports`

**Type:** `unknown`

**Value:** `this.extractImports(transformedCode)`

#### `similarity`

**Type:** `unknown`

**Value:** `this.calculateSimilarity(originalCode`

#### `ext`

**Type:** `unknown`

**Value:** `filePath.split('.').pop()?.toLowerCase()`

#### `imports`

**Type:** `unknown`

**Value:** `content.match(/import\s+.*?from\s+['"][^'"]+['"]/g) || []`

#### `exports`

**Type:** `unknown`

**Value:** `content.match(`

#### `importText`

**Type:** `unknown`

**Value:** `imports.join(' ').toLowerCase()`

#### `complexityPatterns`

**Type:** `unknown`

**Value:** `[`

#### `matches`

**Type:** `unknown`

**Value:** `content.match(pattern)`

#### `patterns`

**Type:** `string[]`

**Value:** `[]`

#### `combined`

**Type:** `unknown`

**Value:** ``${content}|${prompt}``

#### `char`

**Type:** `unknown`

**Value:** `combined.charCodeAt(i)`

#### `set1`

**Type:** `unknown`

**Value:** `new Set(str1.split(/\s+/))`

#### `set2`

**Type:** `unknown`

**Value:** `new Set(str2.split(/\s+/))`

#### `intersection`

**Type:** `unknown`

**Value:** `new Set([...set1].filter((x) => set2.has(x)))`

#### `union`

**Type:** `unknown`

**Value:** `new Set([...set1`

### Dependencies

- `node:fs/promises`
- `xstate`
- `zod`
- `../providers/llm-providers.js`

---

## src\actors\pattern-discovery

Pattern Discovery and Automatic Pattern Generation Engine

This engine automatically discovers new transformation patterns by:
- Analyzing code repositories for common patterns
- Learning from successful transformations
- Extracting patterns from user feedback
- Generating new transformation rules
- Validating pattern effectiveness

**File:** `src\actors\pattern-discovery.ts`

### Functions

#### `patternDiscoveryActor()`

Pattern Discovery Actor

**Tags:** `exported`

#### `pattern()`

**Tags:** `exported`

### Types

- `PatternDiscoveryRequest`

### Constants

#### `PatternDiscoveryRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `patternDiscoveryActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `validatedInput`

**Type:** `unknown`

**Value:** `PatternDiscoveryRequestSchema.parse(input)`

#### `result`

**Type:** `unknown`

**Value:** `await executePatternDiscovery(validatedInput)`

#### `discoveredPatterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `codePatterns`

**Type:** `unknown`

**Value:** `await analyzeCodeFiles(request.sources.codeFiles`

#### `repoPatterns`

**Type:** `unknown`

**Value:** `await analyzeRepositories(`

#### `historyPatterns`

**Type:** `unknown`

**Value:** `await learnFromHistory(`

#### `filteredPatterns`

**Type:** `unknown`

**Value:** `filterAndRankPatterns(discoveredPatterns`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `filePatterns`

**Type:** `unknown`

**Value:** `await extractPatternsFromCode(content`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `ts`

**Type:** `unknown`

**Value:** `await import('typescript')`

#### `sourceFile`

**Type:** `unknown`

**Value:** `ts.createSourceFile(source`

#### `detectors`

**Type:** `unknown`

**Value:** `[`

#### `detectedPatterns`

**Type:** `unknown`

**Value:** `detector(sourceFile`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `varMatches`

**Type:** `unknown`

**Value:** `content.match(/var\s+(\w+)\s*=\s*([^`

#### `message`

**Type:** `unknown`

**Value:** `"hello"`

#### `count`

**Type:** `unknown`

**Value:** `42`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `functionMatches`

**Type:** `unknown`

**Value:** `content.match(`

#### `add`

**Type:** `unknown`

**Value:** `(a`

#### `square`

**Type:** `unknown`

**Value:** `(x) => x * x`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `shorthandMatches`

**Type:** `unknown`

**Value:** `content.match(/\{\s*(\w+):\s*\1\s*\}/g)`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `indexOfMatches`

**Type:** `unknown`

**Value:** `content.match(/(\w+)\.indexOf\(([^)]+)\)\s*!==\s*-1/g)`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `promiseMatches`

**Type:** `unknown`

**Value:** `content.match(/(\w+)\.then\(([^)]+)\)/g)`

#### `result`

**Type:** `unknown`

**Value:** `await $PROMISE`

#### `result`

**Type:** `unknown`

**Value:** `await ${match.split('.then')[0]}`

#### `data`

**Type:** `unknown`

**Value:** `await fetchData()`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `requireMatches`

**Type:** `unknown`

**Value:** `content.match(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g)`

#### `fs`

**Type:** `unknown`

**Value:** `require("fs")'`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `constructorMatches`

**Type:** `unknown`

**Value:** `content.match(`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `repoPatterns`

**Type:** `unknown`

**Value:** `await simulateRepositoryAnalysis(repo`

#### `patterns`

**Type:** `DiscoveredPattern[]`

**Value:** `[]`

#### `transformationGroups`

**Type:** `unknown`

**Value:** `groupSimilarTransformations(history)`

#### `pattern`

**Type:** `unknown`

**Value:** `generatePatternFromGroup(group`

#### `groups`

**Type:** `Array<Array<(typeof history)[0]>>`

**Value:** `[]`

#### `firstInGroup`

**Type:** `unknown`

**Value:** `group[0]`

#### `beforeSimilarity`

**Type:** `unknown`

**Value:** `calculateStringSimilarity(a.before`

#### `afterSimilarity`

**Type:** `unknown`

**Value:** `calculateStringSimilarity(a.after`

#### `maxLength`

**Type:** `unknown`

**Value:** `Math.max(a.length`

#### `distance`

**Type:** `unknown`

**Value:** `levenshteinDistance(a`

#### `matrix`

**Type:** `number[][]`

**Value:** `Array(b.length + 1)`

#### `row`

**Type:** `unknown`

**Value:** `matrix[0]`

#### `row`

**Type:** `unknown`

**Value:** `matrix[j]`

#### `indicator`

**Type:** `unknown`

**Value:** `a[i - 1] === b[j - 1] ? 0 : 1`

#### `currentRow`

**Type:** `unknown`

**Value:** `matrix[j]`

#### `prevRow`

**Type:** `unknown`

**Value:** `matrix[j - 1]`

#### `lastRow`

**Type:** `unknown`

**Value:** `matrix[b.length]`

#### `successfulTransformations`

**Type:** `unknown`

**Value:** `group.filter((t) => t.success)`

#### `successRate`

**Type:** `unknown`

**Value:** `successfulTransformations.length / group.length`

#### `representative`

**Type:** `unknown`

**Value:** `group[0]`

#### `variables`

**Type:** `unknown`

**Value:** `extractVariablesFromTransformation(representative.before`

#### `successfulCount`

**Type:** `unknown`

**Value:** `group.filter((t) => t.success).length`

#### `variables`

**Type:** `string[]`

**Value:** `[]`

#### `beforeTokens`

**Type:** `unknown`

**Value:** `before.split(/\W+/).filter((t) => t.length > 0)`

#### `afterTokens`

**Type:** `unknown`

**Value:** `after.split(/\W+/).filter((t) => t.length > 0)`

### Dependencies

- `node:fs/promises`
- `xstate`
- `zod`
- `fs`

---

## src\actors\pattern-learning

**File:** `src\actors\pattern-learning.ts`

### Functions

#### `patternLearningActor()`

Pattern Learning Actor

**Tags:** `exported`

### Types

- `for`
- `LearnedPattern`
- `PatternLearningInput`
- `PatternEffectiveness`
- `DiscoveredPattern`
- `LearningResult`

### Constants

#### `PatternLearningInputSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternEffectivenessSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `DiscoveredPatternSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LearningResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `patternLearningActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `validatedInput`

**Type:** `unknown`

**Value:** `PatternLearningInputSchema.parse(input)`

#### `learner`

**Type:** `unknown`

**Value:** `new PatternLearner()`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `isTestEnvironment`

**Type:** `unknown`

**Value:** `process.env.NODE_ENV === 'test' ||`

#### `newPatterns`

**Type:** `LearnedPattern[]`

**Value:** `[]`

#### `optimizedPatterns`

**Type:** `LearnedPattern[]`

**Value:** `[]`

#### `insights`

**Type:** `string[]`

**Value:** `[]`

#### `recommendations`

**Type:** `string[]`

**Value:** `[]`

#### `wasSuccessful`

**Type:** `unknown`

**Value:** `transformation.errors.length === 0 && transformation.endTime`

#### `transformationTime`

**Type:** `unknown`

**Value:** `transformation.endTime`

#### `discovered`

**Type:** `unknown`

**Value:** `await this.analyzeTransformationForPatterns(transformation)`

#### `errorReason`

**Type:** `unknown`

**Value:** `transformation.errors.length > 0 ? transformation.errors[0] : undefined`

#### `contextInsights`

**Type:** `unknown`

**Value:** `this.analyzeCodebaseContext(context.codebase)`

#### `insights`

**Type:** `string[]`

**Value:** `[]`

#### `newPatterns`

**Type:** `LearnedPattern[]`

**Value:** `[]`

#### `commonPatterns`

**Type:** `unknown`

**Value:** `await this.findCommonTransformationPatterns()`

#### `newPattern`

**Type:** `unknown`

**Value:** `await this.convertDiscoveredPatternToAstPattern(discovered)`

#### `optimizedPatterns`

**Type:** `LearnedPattern[]`

**Value:** `[]`

#### `deprecatedPatterns`

**Type:** `string[]`

**Value:** `[]`

#### `insights`

**Type:** `string[]`

**Value:** `[]`

#### `recommendations`

**Type:** `string[]`

**Value:** `[]`

#### `effectiveness`

**Type:** `unknown`

**Value:** `this.effectivenessCache.get(pattern.id)`

#### `optimized`

**Type:** `LearnedPattern`

**Value:** `{`

#### `insights`

**Type:** `string[]`

**Value:** `[]`

#### `recommendations`

**Type:** `string[]`

**Value:** `[]`

#### `effectiveness`

**Type:** `unknown`

**Value:** `this.effectivenessCache.get(pattern.id)`

#### `averageEffectiveness`

**Type:** `unknown`

**Value:** `evaluatedCount > 0 ? totalConfidence / evaluatedCount : 0`

#### `alpha`

**Type:** `unknown`

**Value:** `0.1`

#### `patterns`

**Type:** `LearnedPattern[]`

**Value:** `[]`

#### `featureVectors`

**Type:** `PatternFeatureVector[]`

**Value:** `[]`

#### `fileContent`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `nlpAnalysis`

**Type:** `unknown`

**Value:** `await this.nlpAnalyzer.analyzeText(`

#### `featureVector`

**Type:** `PatternFeatureVector`

**Value:** `{`

#### `discoveredPattern`

**Type:** `LearnedPattern`

**Value:** `{`

#### `clusterResults`

**Type:** `unknown`

**Value:** `PatternClusterer.cluster(featureVectors`

#### `clusterPatterns`

**Type:** `unknown`

**Value:** `patterns.filter((p) =>`

#### `intent`

**Type:** `unknown`

**Value:** `nlpAnalysis.extractedFeatures.intent`

#### `keywords`

**Type:** `unknown`

**Value:** `nlpAnalysis.extractedFeatures.keywords`

#### `intent`

**Type:** `unknown`

**Value:** `nlpAnalysis.extractedFeatures.intent`

#### `keywords`

**Type:** `unknown`

**Value:** `nlpAnalysis.extractedFeatures.keywords`

#### `intentConfidenceMap`

**Type:** `unknown`

**Value:** `{`

#### `commonPatterns`

**Type:** `unknown`

**Value:** `['var '`

#### `hasCommonPattern`

**Type:** `unknown`

**Value:** `commonPatterns.some((pattern) => fileContent.includes(pattern))`

#### `insights`

**Type:** `string[]`

**Value:** `[]`

#### `effectiveness`

**Type:** `unknown`

**Value:** `this.effectivenessCache.get(patternId)`

#### `effectivenessData`

**Type:** `unknown`

**Value:** `await readFile(`

#### `effectiveness`

**Type:** `unknown`

**Value:** `JSON.parse(effectivenessData)`

#### `discoveredData`

**Type:** `unknown`

**Value:** `await readFile(`${this.dataPath}/discovered-patterns.json``

#### `discovered`

**Type:** `unknown`

**Value:** `JSON.parse(discoveredData)`

#### `effectivenessObj`

**Type:** `unknown`

**Value:** `Object.fromEntries(this.effectivenessCache)`

#### `discoveredObj`

**Type:** `unknown`

**Value:** `Object.fromEntries(this.discoveredPatterns)`

### Dependencies

- `node:fs/promises`
- `xstate`
- `zod`
- `../learning/clustering.ts`
- `../learning/nlp.ts`
- `../learning/reinforcement.ts`
- `../learning/similarity.ts`
- `../learning/statistics.ts`

---

## src\actors\template-engine

Enhanced Template Engine for Ultra-Fast Code Transformations

This engine implements the first tier of the speed hierarchy:
Template (fastest) → AST → LLM

Features:
- Multi-pattern template matching with variable capture
- Context-aware transformations with scoping analysis
- Batch processing for optimal performance
- Smart conflict resolution between patterns
- Semantic pattern recognition beyond simple regex

**File:** `src\actors\template-engine.ts`

### Functions

#### `templateEngineActor()`

Ultra-fast template transformation engine actor

**Tags:** `exported`

### Types

- `TemplatePattern`
- `TemplateTransformationRequest`
- `of`

### Constants

#### `TemplatePatternSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TemplateTransformationRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `templateEngineActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `validatedInput`

**Type:** `unknown`

**Value:** `TemplateTransformationRequestSchema.parse(input)`

#### `results`

**Type:** `unknown`

**Value:** `await applyTemplateTransformations(validatedInput)`

#### `filesModified`

**Type:** `string[]`

**Value:** `[]`

#### `appliedPatterns`

**Type:** `Array<{ file: string; pattern: string; count: number }>`

**Value:** `[]`

#### `astPatterns`

**Type:** `unknown`

**Value:** `request.patterns.map(templatePattern => ({`

#### `filterResult`

**Type:** `unknown`

**Value:** `filterPatternsByLanguageAndMode(`

#### `activePatterns`

**Type:** `unknown`

**Value:** `filterResult.filteredPatterns.map(astPattern => {`

#### `originalPattern`

**Type:** `unknown`

**Value:** `request.patterns.find(p => p.id === astPattern.id)`

#### `sortedPatterns`

**Type:** `unknown`

**Value:** `preparePatterns(activePatterns`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `transformResult`

**Type:** `unknown`

**Value:** `await transformFileWithTemplates(`

#### `aPriority`

**Type:** `unknown`

**Value:** `a.performance?.priority ?? 5`

#### `bPriority`

**Type:** `unknown`

**Value:** `b.performance?.priority ?? 5`

#### `transformations`

**Type:** `Array<{ patternId: string; count: number }>`

**Value:** `[]`

#### `appliedPatterns`

**Type:** `unknown`

**Value:** `new Set<string>()`

#### `hasConflict`

**Type:** `unknown`

**Value:** `pattern.performance.conflicts.some((id) => appliedPatterns.has(id))`

#### `patternResult`

**Type:** `unknown`

**Value:** `await applyTemplatePattern(modifiedContent`

#### `matches`

**Type:** `unknown`

**Value:** `findTemplateMatches(content`

#### `sortedMatches`

**Type:** `unknown`

**Value:** `matches.sort((a`

#### `replacement`

**Type:** `unknown`

**Value:** `generateReplacement(match`

#### `before`

**Type:** `unknown`

**Value:** `modifiedContent.substring(0`

#### `after`

**Type:** `unknown`

**Value:** `modifiedContent.substring(match.endIndex)`

#### `preservedReplacement`

**Type:** `unknown`

**Value:** `preserveFormatting(replacement`

#### `matches`

**Type:** `TemplateMatch[]`

**Value:** `[]`

#### `beforeMatch`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `lineNumber`

**Type:** `unknown`

**Value:** `(beforeMatch.match(/\n/g) || []).length + 1`

#### `variables`

**Type:** `TemplateVariable[]`

**Value:** `[]`

#### `varName`

**Type:** `unknown`

**Value:** `variableNames[i]`

#### `varValue`

**Type:** `unknown`

**Value:** `match[i + 1]`

#### `context`

**Type:** `unknown`

**Value:** `extractVariableContext(`

#### `contextRadius`

**Type:** `unknown`

**Value:** `50`

#### `startCtx`

**Type:** `unknown`

**Value:** `Math.max(0`

#### `endCtx`

**Type:** `unknown`

**Value:** `Math.min(content.length`

#### `matchObj`

**Type:** `TemplateMatch`

**Value:** `{`

#### `variableNames`

**Type:** `string[]`

**Value:** `[]`

#### `matches`

**Type:** `TemplateMatch[]`

**Value:** `[]`

#### `standardMatches`

**Type:** `unknown`

**Value:** `findBasicTemplateMatches(content`

#### `semanticMatches`

**Type:** `unknown`

**Value:** `findSemanticPatterns(content`

#### `uniqueMatches`

**Type:** `unknown`

**Value:** `matches.filter(`

#### `matches`

**Type:** `TemplateMatch[]`

**Value:** `[]`

#### `matches`

**Type:** `TemplateMatch[]`

**Value:** `[]`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `line`

**Type:** `unknown`

**Value:** `lines[i]`

#### `varMatch`

**Type:** `unknown`

**Value:** `line.match(/^(\s*)var\s+(\w+)\s*=\s*(.+)`

#### `startIndex`

**Type:** `unknown`

**Value:** `content.indexOf(fullMatch)`

#### `isReassigned`

**Type:** `unknown`

**Value:** `analyzeVariableReassignment(content`

#### `recommendedKeyword`

**Type:** `unknown`

**Value:** `isReassigned ? 'let' : 'const'`

#### `afterDeclaration`

**Type:** `unknown`

**Value:** `content.substring(declarationIndex)`

#### `reassignmentPattern`

**Type:** `unknown`

**Value:** `new RegExp(`\\b${varName}\\s*=\\s*[^=]``

#### `matches`

**Type:** `unknown`

**Value:** `afterDeclaration.match(reassignmentPattern)`

#### `matches`

**Type:** `TemplateMatch[]`

**Value:** `[]`

#### `callbackRegex`

**Type:** `unknown`

**Value:** `/(\w+)\s*\(\s*([^)]*?)`

#### `matches`

**Type:** `TemplateMatch[]`

**Value:** `[]`

#### `simpleFunctionRegex`

**Type:** `unknown`

**Value:** `/function\s+(\w+)\s*\(([^)]*)\)\s*\{\s*return\s+([^`

#### `matches`

**Type:** `TemplateMatch[]`

**Value:** `[]`

#### `x`

**Type:** `unknown`

**Value:** `obj.x`

#### `y`

**Type:** `unknown`

**Value:** `obj.y`

#### `propertyAccessRegex`

**Type:** `unknown`

**Value:** `/const\s+(\w+)\s*=\s*(\w+)\.(\w+)`

#### `propertyAccesses`

**Type:** `Array<{
    varName: string;
    objName: string;
    propName: string;
    match: RegExpExecArray;
  }>`

**Value:** `[]`

#### `groupedByObject`

**Type:** `unknown`

**Value:** `propertyAccesses.reduce(`

#### `firstAccess`

**Type:** `unknown`

**Value:** `accesses[0]`

#### `lastAccess`

**Type:** `unknown`

**Value:** `accesses[accesses.length - 1]`

#### `startIndex`

**Type:** `unknown`

**Value:** `firstAccess.match.index`

#### `endIndex`

**Type:** `unknown`

**Value:** `lastAccess.match.index + lastAccess.match[0].length`

#### `fullMatch`

**Type:** `unknown`

**Value:** `content.substring(startIndex`

#### `matches`

**Type:** `TemplateMatch[]`

**Value:** `[]`

#### `concatenationRegex`

**Type:** `unknown`

**Value:** `/(['"`])([^'"`]*?)\1\s*\+\s*(\w+)\s*\+\s*(['"`])([^'"`]*?)\4/g`

#### `trimmed`

**Type:** `unknown`

**Value:** `value.trim()`

#### `lineStart`

**Type:** `unknown`

**Value:** `content.lastIndexOf('\n'`

#### `precedingLine`

**Type:** `unknown`

**Value:** `content.substring(lineStart + 1`

#### `lineStart`

**Type:** `unknown`

**Value:** `content.lastIndexOf('\n'`

#### `lineContent`

**Type:** `unknown`

**Value:** `content.substring(lineStart + 1`

#### `quotes`

**Type:** `unknown`

**Value:** `['"'`

#### `context`

**Type:** `unknown`

**Value:** `match.variables.reduce(`

#### `transformer`

**Type:** `unknown`

**Value:** `pattern.replacement.transformers?.[variable.name]`

#### `escapedValue`

**Type:** `unknown`

**Value:** `JSON.stringify(value)`

#### `lines`

**Type:** `unknown`

**Value:** `replacement.split('\n')`

#### `indentedLines`

**Type:** `unknown`

**Value:** `lines.map((line`

### Dependencies

- `node:fs/promises`
- `xstate`
- `zod`
- `../utils/pattern-filtering.js`
- `../utils/language-detection.js`

---

## src\actors\transformation-enhanced

**File:** `src\actors\transformation-enhanced.ts`

### Functions

### Types

- `for`
- `EnhancedOrchestratorRequest`
- `errors`

### Constants

#### `EnhancedOrchestratorRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `actor`

**Type:** `unknown`

**Value:** `createActor(actorLogic`

#### `subscription`

**Type:** `unknown`

**Value:** `actor.subscribe((state) => {`

#### `timeout`

**Type:** `unknown`

**Value:** `setTimeout(() => {`

#### `enhancedTransformationOrchestratorActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `transformationId`

**Type:** `unknown`

**Value:** ``enhanced_transform_${Date.now()}_${Math.random().toString(36).substr(2`

#### `validated`

**Type:** `unknown`

**Value:** `EnhancedOrchestratorRequestSchema.parse(input)`

#### `orchestratorState`

**Type:** `unknown`

**Value:** `{`

#### `result`

**Type:** `unknown`

**Value:** `await executeEnhancedOrchestrationStages(validated`

#### `stages`

**Type:** `unknown`

**Value:** `[`

#### `stageStart`

**Type:** `unknown`

**Value:** `Date.now()`

#### `elapsed`

**Type:** `unknown`

**Value:** `Date.now() - stageStart`

#### `elapsed`

**Type:** `unknown`

**Value:** `Date.now() - stageStart`

#### `errorInfo`

**Type:** `unknown`

**Value:** `{`

#### `complexityMetrics`

**Type:** `unknown`

**Value:** `await invokeActorWithTimeout<ComplexityMetrics>(complexityActor`

#### `dependencyGraph`

**Type:** `Record<string, string[]>`

**Value:** `{}`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `imports`

**Type:** `unknown`

**Value:** `content.match(/import.*from\s+['"]([^'"]+)['"]/g) || []`

#### `relatedFiles`

**Type:** `unknown`

**Value:** `imports`

#### `transformationOrder`

**Type:** `unknown`

**Value:** `request.transformationType === 'auto'`

#### `result`

**Type:** `unknown`

**Value:** `await executeEnhancedTransformation(transformationType`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `templateResult`

**Type:** `unknown`

**Value:** `await invokeActorWithTimeout<TemplateEngineResult>(`

#### `astResult`

**Type:** `unknown`

**Value:** `await invokeActorWithTimeout<AstGrepResult>(astGrepTransformationActor`

#### `enhancedLLMTransformer`

**Type:** `unknown`

**Value:** `createEnhancedLLMTransformer({`

#### `llmResult`

**Type:** `unknown`

**Value:** `await invokeActorWithTimeout<LLMTransformationResult>(`

#### `modifiedFiles`

**Type:** `unknown`

**Value:** `Array.from(state.filesModified)`

#### `validationResult`

**Type:** `unknown`

**Value:** `await invokeActorWithTimeout<ValidationActorResult>(validationActor`

#### `finalComplexity`

**Type:** `unknown`

**Value:** `await invokeActorWithTimeout<ComplexityMetrics>(complexityActor`

#### `backupDir`

**Type:** `unknown`

**Value:** `join(process.cwd()`

#### `qualityImprovement`

**Type:** `unknown`

**Value:** `calculateQualityImprovement(state)`

#### `recommendations`

**Type:** `unknown`

**Value:** `generateEnhancedRecommendations(state)`

#### `complexityImprovement`

**Type:** `unknown`

**Value:** `state.complexityBefore > 0`

#### `errorReduction`

**Type:** `unknown`

**Value:** `(state.typeErrors || 0) === 0 ? 0.2 : -0.1`

#### `transformationSuccess`

**Type:** `unknown`

**Value:** `state.transformationsApplied.length > 0 ? 0.3 : -0.2`

#### `recommendations`

**Type:** `string[]`

**Value:** `[]`

#### `enhancedTransformationActor`

**Type:** `unknown`

**Value:** `enhancedTransformationOrchestratorActor`

### Dependencies

- `node:fs/promises`
- `node:path`
- `xstate`
- `zod`
- `./ast-grep-transformation.ts`
- `./complexity.ts`
- `./llm-transformation-enhanced.ts`
- `./template-engine.ts`
- `./validation.ts`

---

## src\actors\transformation

**File:** `src\actors\transformation.ts`

### Functions

#### `transformationActor()`

- llm: LLM-based intelligent code generation
- ast: AST-grep powered syntax tree transformations
- template: Fast template-based replacements
Applies code transformations using the specified mode:

Transformation Actor

**Tags:** `exported`

### Types

- `EnhancedLLMTransformationInput`
- `TransformationInput`
- `let`

### Constants

#### `TransformationInputSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `transformationActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `validatedInput`

**Type:** `unknown`

**Value:** `TransformationInputSchema.parse(input)`

#### `filesModified`

**Type:** `string[]`

**Value:** `[]`

#### `filterResult`

**Type:** `unknown`

**Value:** `filterPatternsByLanguageAndMode(patterns`

#### `templatePatterns`

**Type:** `unknown`

**Value:** `filterResult.filteredPatterns`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `beforeContent`

**Type:** `unknown`

**Value:** `modifiedContent`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `result`

**Type:** `string[]`

**Value:** `[]`

#### `line`

**Type:** `unknown`

**Value:** `lines[i]`

#### `varMatch`

**Type:** `unknown`

**Value:** `line.match(/^(\s*)var\s+(\w+)\s*=\s*(.+)`

#### `isReassigned`

**Type:** `unknown`

**Value:** `lines`

#### `isInForLoop`

**Type:** `unknown`

**Value:** `line.includes('for (') || line.includes('for(')`

#### `filesModified`

**Type:** `string[]`

**Value:** `[]`

#### `astPatterns`

**Type:** `unknown`

**Value:** `patterns.filter(`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `isTypeScript`

**Type:** `unknown`

**Value:** `filePath.endsWith('.ts') || filePath.endsWith('.tsx')`

#### `lang`

**Type:** `unknown`

**Value:** `isTypeScript ? ts : js`

#### `root`

**Type:** `unknown`

**Value:** `lang.parse(content)`

#### `beforeContent`

**Type:** `unknown`

**Value:** `modifiedContent`

#### `newRoot`

**Type:** `unknown`

**Value:** `lang.parse(modifiedContent)`

#### `varRegex`

**Type:** `unknown`

**Value:** `/^(\s*)var\s+(\w+)\s*=\s*([^`

#### `trimmedValue`

**Type:** `unknown`

**Value:** `value.trim()`

#### `trimmed`

**Type:** `unknown`

**Value:** `value.trim()`

#### `thenRegex`

**Type:** `unknown`

**Value:** `/(\w+)\.then\(\s*\((\w+)\)\s*=>\s*\{([^}]+)\}\s*\)/g`

#### `arrowReturnPattern`

**Type:** `unknown`

**Value:** `/\(([^)]*)\)\s*=>\s*{\s*return\s+([^`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `result`

**Type:** `string[]`

**Value:** `[]`

#### `line`

**Type:** `unknown`

**Value:** `lines[i]`

#### `declarations`

**Type:** `unknown`

**Value:** `[line]`

#### `declType`

**Type:** `unknown`

**Value:** `line.trim().startsWith('const ') ? 'const' : 'let'`

#### `nextLine`

**Type:** `unknown`

**Value:** `lines[j]`

#### `combined`

**Type:** `unknown`

**Value:** `declarations`

#### `callbackPattern`

**Type:** `unknown`

**Value:** `/function\s+(\w+)\s*\(\s*callback\s*\)\s*{([^}]+)callback\(([^)]+)\)`

#### `args`

**Type:** `unknown`

**Value:** `callbackArgs.split('`

#### `simpleFunctionPattern`

**Type:** `unknown`

**Value:** `/function\s+(\w+)\s*\(([^)]*)\)\s*{\s*return\s+([^`

#### `regex`

**Type:** `unknown`

**Value:** `new RegExp(pattern.pattern`

#### `llmInput`

**Type:** `EnhancedLLMTransformationInput`

**Value:** `{`

#### `x`

**Type:** `unknown`

**Value:** `1`

#### `transformer`

**Type:** `unknown`

**Value:** `new EnhancedLLMTransformer(llmInput.config)`

#### `result`

**Type:** `unknown`

**Value:** `await transformer.transformFiles(llmInput)`

#### `transformedFiles`

**Type:** `string[]`

**Value:** `[]`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `fileNames`

**Type:** `unknown`

**Value:** `files.join(' ').toLowerCase()`

#### `varDeclarations`

**Type:** `unknown`

**Value:** `content.match(/var\s+(\w+)\s*=\s*[^`

#### `varMatch`

**Type:** `unknown`

**Value:** `declaration.match(/var\s+(\w+)\s*=\s*(.+)`

#### `reassignPattern`

**Type:** `unknown`

**Value:** `new RegExp(`\\b${varName}\\s*=\\s*[^=]``

#### `reassignments`

**Type:** `unknown`

**Value:** `content.match(reassignPattern) || []`

#### `replacement`

**Type:** `unknown`

**Value:** `reassignments.length > 1`

#### `callbackPattern`

**Type:** `unknown`

**Value:** `/(\w+)\(\s*\(([^)]*err[^)]*)\)\s*=>\s*\{([^}]+)\}\s*\)/g`

#### `result`

**Type:** `unknown`

**Value:** `await ${funcName}()`

#### `constructorPattern`

**Type:** `unknown`

**Value:** `/function\s+(\w+)\s*\([^)]*\)\s*\{([^}]*this\.[^}]+)\}/g`

#### `properties`

**Type:** `unknown`

**Value:** `body.match(/this\.(\w+)\s*=\s*([^`

#### `constructorBody`

**Type:** `string`

**Value:** `(properties as string[])`

#### `i`

**Type:** `unknown`

**Value:** `0`

### Dependencies

- `node:fs/promises`
- `@ast-grep/napi`
- `xstate`
- `zod`
- `./llm-transformation-enhanced.js`
- `../utils/pattern-filtering.js`
- `../utils/language-detection.js`

---

## src\actors\typescript-error-resolver

TypeScript Error Detection and Resolution Actor

Automatically detects and fixes TypeScript errors using AST transformations
and intelligent pattern matching. Integrates with the existing Carmack Coder
architecture for seamless error resolution.

**File:** `src\actors\typescript-error-resolver.ts`

### Functions

#### `TypeScriptErrorSchema()`

**Tags:** `exported`

#### `ErrorResolutionSchema()`

**Tags:** `exported`

#### `TypeScriptFixResultSchema()`

**Tags:** `exported`

#### `TypeScriptErrorResolverInputSchema()`

**Tags:** `exported`

#### `typeScriptErrorResolverActor()`

TypeScript Error Resolver Actor

**Tags:** `exported`

#### `validateTypeScriptError()`

**Tags:** `exported`

#### `validateErrorResolution()`

**Tags:** `exported`

#### `validateTypeScriptFixResult()`

**Tags:** `exported`

### Classes

#### `TypeScriptErrorResolver`

TypeScript Error Resolver Actor

### Types

- `TypeScriptError`
- `ErrorResolution`
- `TypeScriptFixResult`
- `TypeScriptErrorResolverInput`
- `safety`
- `assertion`
- `assertion`
- `assertion`
- `to`
- `to`
- `is`
- `suggestions`
- `inference`

### Constants

#### `TypeScriptErrorSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ErrorResolutionSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TypeScriptFixResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TypeScriptErrorResolverInputSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ERROR_RESOLUTION_PATTERNS`

**Type:** `ErrorResolution[]`

**Value:** `[`

#### `fileArgs`

**Type:** `unknown`

**Value:** `files.length > 0 ? files.join(' ') : ''`

#### `command`

**Type:** `unknown`

**Value:** ``${this.tscPath} --noEmit --pretty false ${fileArgs}``

#### `output`

**Type:** `unknown`

**Value:** `execSync(command`

#### `output`

**Type:** `unknown`

**Value:** `error.stdout || error.stderr || ''`

#### `errors`

**Type:** `TypeScriptError[]`

**Value:** `[]`

#### `lines`

**Type:** `unknown`

**Value:** `output.split('\n')`

#### `match`

**Type:** `unknown`

**Value:** `line.match(`

#### `result`

**Type:** `TypeScriptFixResult`

**Value:** `{`

#### `riskLevels`

**Type:** `unknown`

**Value:** `{ low: 1`

#### `maxRisk`

**Type:** `unknown`

**Value:** `riskLevels[maxRiskLevel]`

#### `errorsByFile`

**Type:** `unknown`

**Value:** `new Map<string`

#### `originalContent`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `sortedErrors`

**Type:** `unknown`

**Value:** `fileErrors.sort((a`

#### `resolution`

**Type:** `unknown`

**Value:** `this.findResolution(error)`

#### `fix`

**Type:** `unknown`

**Value:** `await this.applyErrorFix(modifiedContent`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `errorLine`

**Type:** `unknown`

**Value:** `lines[error.line - 1]`

#### `regex`

**Type:** `unknown`

**Value:** `new RegExp(resolution.pattern`

#### `fixedLine`

**Type:** `unknown`

**Value:** `errorLine.replace(regex`

#### `suggestions`

**Type:** `string[]`

**Value:** `[]`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `errorLine`

**Type:** `unknown`

**Value:** `lines[error.line - 1]`

#### `functionBody`

**Type:** `unknown`

**Value:** `this.extractFunctionBody(lines`

#### `returnTypes`

**Type:** `unknown`

**Value:** `this.inferReturnTypes(functionBody)`

#### `body`

**Type:** `string[]`

**Value:** `[]`

#### `line`

**Type:** `unknown`

**Value:** `lines[i]`

#### `types`

**Type:** `string[]`

**Value:** `[]`

#### `typeScriptErrorResolverActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `validatedInput`

**Type:** `unknown`

**Value:** `TypeScriptErrorResolverInputSchema.parse(input)`

#### `resolver`

**Type:** `unknown`

**Value:** `new TypeScriptErrorResolver()`

#### `errors`

**Type:** `unknown`

**Value:** `await resolver.getTypeScriptErrors(validatedInput.files)`

#### `result`

**Type:** `unknown`

**Value:** `await resolver.applyFixes(`

#### `validateTypeScriptError`

**Type:** `unknown`

**Value:** `(data: unknown): TypeScriptError => {`

#### `validateErrorResolution`

**Type:** `unknown`

**Value:** `(data: unknown): ErrorResolution => {`

#### `validateTypeScriptFixResult`

**Type:** `unknown`

**Value:** `(data: unknown): TypeScriptFixResult => {`

### Dependencies

- `node:child_process`
- `node:fs/promises`
- `xstate`
- `zod`

---

## src\actors\validation

**File:** `src\actors\validation.ts`

### Functions

#### `validationActor()`

- quality: ESLint code quality analysis
- typeFix: Attempt to fix type errors
- types: TypeScript type checking
- formatFix: Apply automatic formatting fixes
- format: Check code formatting with Biome
Handles various types of code validation and fixing:

Validation Actor

**Tags:** `exported`

### Types

- `ValidationInput`
- `checking`
- `errors`
- `validation`
- `validation`
- `validation`
- `validation`
- `annotation`
- `errors`
- `fixing`
- `errors`
- `fixing`
- `errors`
- `fixes`
- `checking`
- `errors`
- `fix`
- `errors`
- `fixing`
- `fixing`
- `error`
- `errors`
- `errors`
- `errors`
- `fixes`
- `LintResults`

### Constants

#### `eslint`

**Type:** `unknown`

**Value:** `new ESLint({`

#### `possiblePaths`

**Type:** `unknown`

**Value:** `['bun x'`

#### `ValidationInputSchema`

**Type:** `unknown`

**Value:** `z.union([`

#### `validationActor`

**Type:** `unknown`

**Value:** `fromPromise(async ({ input }: { input: ValidationInput }) => {`

#### `validatedInput`

**Type:** `unknown`

**Value:** `ValidationInputSchema.parse(input)`

#### `errors`

**Type:** `Array<{
      code: string;
      message: string;
      severity: 'error' | 'warning' | 'info';
      file?: string;
      line?: number;
      column?: number;
    }>`

**Value:** `[]`

#### `warnings`

**Type:** `Array<{
      code: string;
      message: string;
      severity: 'error' | 'warning' | 'info';
      file?: string;
      line?: number;
      column?: number;
    }>`

**Value:** `[]`

#### `bunCmd`

**Type:** `unknown`

**Value:** `getBunExecutable()`

#### `errorObj`

**Type:** `unknown`

**Value:** `error as { stdout?: string`

#### `output`

**Type:** `unknown`

**Value:** `errorObj.stdout || errorObj.stderr || errorObj.message || ''`

#### `errors`

**Type:** `Array<{
      code: string;
      message: string;
      severity: 'error' | 'warning' | 'info';
      file?: string;
      line?: number;
      column?: number;
    }>`

**Value:** `[]`

#### `warnings`

**Type:** `Array<{
      code: string;
      message: string;
      severity: 'error' | 'warning' | 'info';
      file?: string;
      line?: number;
      column?: number;
    }>`

**Value:** `[]`

#### `bunCmd`

**Type:** `unknown`

**Value:** `getBunExecutable()`

#### `execError`

**Type:** `unknown`

**Value:** `error as { stdout?: string`

#### `output`

**Type:** `unknown`

**Value:** `execError.stdout || execError.stderr || execError.message || ''`

#### `controller`

**Type:** `unknown`

**Value:** `new AbortController()`

#### `timeoutId`

**Type:** `unknown`

**Value:** `setTimeout(() => controller.abort()`

#### `result`

**Type:** `unknown`

**Value:** `await validateTypesWithExec(files`

#### `bunCmd`

**Type:** `unknown`

**Value:** `getBunExecutable()`

#### `errorObj`

**Type:** `unknown`

**Value:** `error as { signal?: { aborted: boolean } }`

#### `execError`

**Type:** `unknown`

**Value:** `error as { stderr?: string`

#### `errorOutput`

**Type:** `unknown`

**Value:** `execError.stderr || execError.stdout || execError.message || ''`

#### `errors`

**Type:** `Array<{
      code: string;
      message: string;
      severity: 'error' | 'warning' | 'info';
      file?: string;
      line?: number;
      column?: number;
    }>`

**Value:** `[]`

#### `errorLines`

**Type:** `unknown`

**Value:** `errorOutput`

#### `match`

**Type:** `unknown`

**Value:** `line.match(/^(.+?)\((\d+)`

#### `errors`

**Type:** `Array<{
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    file?: string;
    line?: number;
    column?: number;
  }>`

**Value:** `[]`

#### `warnings`

**Type:** `Array<{
    code: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    file?: string;
    line?: number;
    column?: number;
  }>`

**Value:** `[]`

#### `typePatterns`

**Type:** `unknown`

**Value:** `[`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `beforeMatch`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `lineNumber`

**Type:** `unknown`

**Value:** `beforeMatch.split('\n').length`

#### `lineStart`

**Type:** `unknown`

**Value:** `beforeMatch.lastIndexOf('\n') + 1`

#### `columnNumber`

**Type:** `unknown`

**Value:** `match.index - lineStart + 1`

#### `errorInfo`

**Type:** `unknown`

**Value:** `{`

#### `fixedErrors`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `remainingErrors`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `warnings`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `llmTransformer`

**Type:** `unknown`

**Value:** `new EnhancedLLMTransformer({`

#### `errorsByFile`

**Type:** `unknown`

**Value:** `new Map<string`

#### `filePathsArray`

**Type:** `unknown`

**Value:** `Array.from(errorsByFile.keys())`

#### `fileErrors`

**Type:** `unknown`

**Value:** `errorsByFile.get(filePath)`

#### `originalContent`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `typeFixPrompt`

**Type:** `unknown`

**Value:** `generateTypeFixPrompt(originalContent`

#### `transformationInput`

**Type:** `unknown`

**Value:** `{`

#### `result`

**Type:** `unknown`

**Value:** `await llmTransformer.transformFiles(transformationInput)`

#### `verificationResult`

**Type:** `unknown`

**Value:** `await verifyTypeFixes(filePath)`

#### `errorDescriptions`

**Type:** `unknown`

**Value:** `errors`

#### `hasGenericTypes`

**Type:** `unknown`

**Value:** `content.includes('<') && content.includes('>')`

#### `hasUnionTypes`

**Type:** `unknown`

**Value:** `content.includes('|')`

#### `hasInterfaceDefinitions`

**Type:** `unknown`

**Value:** `content.includes('interface ')`

#### `hasTypeDefinitions`

**Type:** `unknown`

**Value:** `content.includes('type ')`

#### `bunCmd`

**Type:** `unknown`

**Value:** `getBunExecutable()`

#### `execError`

**Type:** `unknown`

**Value:** `error as { stdout?: string`

#### `errorOutput`

**Type:** `unknown`

**Value:** `execError.stdout || execError.stderr || ''`

#### `errors`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `errorLines`

**Type:** `unknown`

**Value:** `errorOutput`

#### `match`

**Type:** `unknown`

**Value:** `line.match(/^(.+?)\((\d+)`

#### `results`

**Type:** `unknown`

**Value:** `await eslint.lintFiles([filePath])`

#### `errors`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `warnings`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `errorInfo`

**Type:** `ErrorInfo`

**Value:** `{`

#### `errors`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `warnings`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `result`

**Type:** `unknown`

**Value:** `await lint(filePath)`

#### `errors`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `warnings`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `qualityRules`

**Type:** `unknown`

**Value:** `[`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `beforeMatch`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `lineNumber`

**Type:** `unknown`

**Value:** `beforeMatch.split('\n').length`

#### `lineStart`

**Type:** `unknown`

**Value:** `beforeMatch.lastIndexOf('\n') + 1`

#### `columnNumber`

**Type:** `unknown`

**Value:** `match.index - lineStart + 1`

#### `errorInfo`

**Type:** `ErrorInfo`

**Value:** `{`

#### `complexityIssues`

**Type:** `unknown`

**Value:** `analyzeCodeComplexity(content`

#### `warnings`

**Type:** `ErrorInfo[]`

**Value:** `[]`

#### `functionRegex`

**Type:** `unknown`

**Value:** `/function\s+(\w+)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g`

#### `functionName`

**Type:** `unknown`

**Value:** `match[1] || match[2]`

#### `functionStart`

**Type:** `unknown`

**Value:** `match.index`

#### `afterFunction`

**Type:** `unknown`

**Value:** `content.substring(functionStart)`

#### `braceMatch`

**Type:** `unknown`

**Value:** `afterFunction.match(/\{/)`

#### `bodyStart`

**Type:** `unknown`

**Value:** `functionStart + (braceMatch.index || 0) + 1`

#### `functionBody`

**Type:** `unknown`

**Value:** `extractFunctionBody(content`

#### `complexity`

**Type:** `unknown`

**Value:** `calculateFunctionComplexity(functionBody)`

#### `lineNumber`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `char`

**Type:** `unknown`

**Value:** `content[pos]`

#### `complexityPatterns`

**Type:** `unknown`

**Value:** `[`

#### `matches`

**Type:** `unknown`

**Value:** `functionBody.match(pattern)`

### Dependencies

- `node:child_process`
- `eslint`
- `xstate`
- `zod`

---

## src\config\environment

Environment Configuration Module for Carmack Coder

Provides type-safe environment variable loading and validation using Zod schemas.
Follows the project's principles of runtime validation and formal correctness.

**File:** `src\config\environment.ts`

### Functions

#### `EnvironmentSchema()`

Complete environment configuration schema

**Tags:** `exported`

#### `env()`

Get LLM provider configuration

**Tags:** `exported`

### Types

- `EnvironmentConfig`

### Constants

#### `CoreEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `RepositoryEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LLMEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TransformationEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `QualityEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TelemetryEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LoggingEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PerformanceEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `BackupEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `CICDEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `SecurityEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `DevelopmentEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `FeatureFlagsEnvironmentSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `EnvironmentSchema`

**Type:** `unknown`

**Value:** `CoreEnvironmentSchema.merge(RepositoryEnvironmentSchema)`

#### `rawEnv`

**Type:** `unknown`

**Value:** `process.env`

#### `validatedEnv`

**Type:** `unknown`

**Value:** `EnvironmentSchema.parse(rawEnv)`

#### `processedEnv`

**Type:** `unknown`

**Value:** `processEnvironmentConfig(validatedEnv)`

#### `repositoryUrl`

**Type:** `unknown`

**Value:** `env.CARMACK_REPOSITORY_URL || env.REPOSITORY_URL`

#### `workspace`

**Type:** `unknown`

**Value:** `env.WORKSPACE_DIR || env.CARMACK_WORKSPACE`

#### `logLevel`

**Type:** `unknown`

**Value:** `env.LOG_LEVEL || env.CARMACK_LOG_LEVEL`

#### `transformationOrder`

**Type:** `unknown`

**Value:** `env.TRANSFORMATION_PREFERRED_ORDER.split('`

#### `allowedExtensions`

**Type:** `unknown`

**Value:** `env.ALLOWED_FILE_EXTENSIONS.split('`

#### `corsOrigins`

**Type:** `unknown`

**Value:** `env.CORS_ORIGINS.split('`

#### `allowedPaths`

**Type:** `unknown`

**Value:** `env.ALLOWED_WORKSPACE_PATHS.split('`

#### `restrictedPatterns`

**Type:** `unknown`

**Value:** `env.RESTRICTED_FILE_PATTERNS.split('`

#### `env`

**Type:** `unknown`

**Value:** `getEnvironmentConfig()`

#### `env`

**Type:** `unknown`

**Value:** `getEnvironmentConfig()`

### Dependencies

- `zod`

---

## src\docs\ast-analyzer

**File:** `src\docs\ast-analyzer.ts`

### Functions

#### `validateASTGrepConfig()`

**Tags:** `exported`

#### `validateASTGrepInstance()`

**Tags:** `exported`

#### `astAnalyzerActor()`

**Tags:** `exported`

### Types

- `safety`
- `ASTGrepMatch`
- `ASTGrepLanguage`
- `ASTGrepRule`
- `ASTGrepConfig`
- `ASTGrepInstance`

### Constants

#### `ASTGrepMatchSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ASTGrepLanguageSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ASTGrepRuleSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ASTGrepConfigSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ASTGrepInstanceSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `validateASTGrepMatch`

**Type:** `unknown`

**Value:** `(data: unknown): ASTGrepMatch => {`

#### `validateASTGrepConfig`

**Type:** `unknown`

**Value:** `(data: unknown): ASTGrepConfig => {`

#### `validateASTGrepInstance`

**Type:** `unknown`

**Value:** `(data: unknown): ASTGrepInstance => {`

#### `ASTPatternSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `AST_PATTERNS`

**Type:** `unknown`

**Value:** `ASTPatternSchema.parse({`

#### `moduleName`

**Type:** `unknown`

**Value:** `filePath`

#### `content`

**Type:** `unknown`

**Value:** `await this.readFile(filePath)`

#### `functions`

**Type:** `FunctionDoc[]`

**Value:** `[]`

#### `content`

**Type:** `unknown`

**Value:** `await this.readFile(filePath)`

#### `classes`

**Type:** `ClassDoc[]`

**Value:** `[]`

#### `content`

**Type:** `unknown`

**Value:** `await this.readFile(filePath)`

#### `exports`

**Type:** `string[]`

**Value:** `[]`

#### `exportPatterns`

**Type:** `unknown`

**Value:** `[`

#### `exportName`

**Type:** `unknown`

**Value:** `match[1]`

#### `content`

**Type:** `unknown`

**Value:** `await this.readFile(filePath)`

#### `imports`

**Type:** `Array<{ module: string; imports: string[] }>`

**Value:** `[]`

#### `importPattern`

**Type:** `unknown`

**Value:** `/import\s+(?:(?:\{([^}]+)\})|(?:(\w+))|(?:\*\s+as\s+(\w+)))\s+from\s+['"]([^'"]+)['"]/g`

#### `importNames`

**Type:** `string[]`

**Value:** `[]`

#### `content`

**Type:** `unknown`

**Value:** `await this.readFile(filePath)`

#### `nodes`

**Type:** `ASTNode[]`

**Value:** `[]`

#### `root`

**Type:** `unknown`

**Value:** `this.astGrep.parse(content)`

#### `matches`

**Type:** `unknown`

**Value:** `root.findAll(pattern)`

#### `functions`

**Type:** `FunctionDoc[]`

**Value:** `[]`

#### `root`

**Type:** `unknown`

**Value:** `this.astGrep.parse(content)`

#### `rootNode`

**Type:** `unknown`

**Value:** `root.root()`

#### `functionMatches`

**Type:** `unknown`

**Value:** `rootNode.findAll(AST_PATTERNS.functions.functionDeclaration)`

#### `arrowMatches`

**Type:** `unknown`

**Value:** `rootNode.findAll(AST_PATTERNS.functions.arrowFunction)`

#### `nameMatch`

**Type:** `unknown`

**Value:** `match.getMatch('NAME')?.text()`

#### `matchText`

**Type:** `unknown`

**Value:** `match.text()`

#### `params`

**Type:** `unknown`

**Value:** `this.extractParametersFromText(matchText`

#### `functions`

**Type:** `FunctionDoc[]`

**Value:** `[]`

#### `_lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `patterns`

**Type:** `unknown`

**Value:** `[`

#### `lineNumber`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `classes`

**Type:** `ClassDoc[]`

**Value:** `[]`

#### `root`

**Type:** `unknown`

**Value:** `this.astGrep.parse(content)`

#### `rootNode`

**Type:** `unknown`

**Value:** `root.root()`

#### `classMatches`

**Type:** `unknown`

**Value:** `rootNode.findAll(AST_PATTERNS.classes.classDeclaration)`

#### `name`

**Type:** `unknown`

**Value:** `match.getMatch('NAME')?.text() || 'anonymous'`

#### `body`

**Type:** `unknown`

**Value:** `match.getMatch('BODY')?.text() || ''`

#### `classes`

**Type:** `ClassDoc[]`

**Value:** `[]`

#### `classPattern`

**Type:** `unknown`

**Value:** `/(?:export\s+)?(?:class|interface)\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{([^}]+)\}/g`

#### `lineNumber`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `functionMatch`

**Type:** `unknown`

**Value:** `functionText.match(/function\s+\w+\s*\(([^)]*)\)/)`

#### `name`

**Type:** `unknown`

**Value:** `(params) => ...`

#### `arrowMatch`

**Type:** `unknown`

**Value:** `functionText.match(/const\s+\w+\s*=\s*\(([^)]*)\)\s*=>/)`

#### `name`

**Type:** `unknown`

**Value:** `param => ...`

#### `singleParamMatch`

**Type:** `unknown`

**Value:** `functionText.match(/const\s+\w+\s*=\s*(\w+)\s*=>/)`

#### `trimmed`

**Type:** `unknown`

**Value:** `param.trim()`

#### `optional`

**Type:** `unknown`

**Value:** `trimmed.includes('?')`

#### `properties`

**Type:** `Array<{ name: string; type: string; optional: boolean; readonly: boolean }>`

**Value:** `[]`

#### `propertyPattern`

**Type:** `unknown`

**Value:** `/(readonly\s+)?(\w+)(\?)?\s*:\s*([^`

#### `methods`

**Type:** `FunctionDoc[]`

**Value:** `[]`

#### `methodPattern`

**Type:** `unknown`

**Value:** `/(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/g`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `line`

**Type:** `unknown`

**Value:** `lines[i]?.trim()`

#### `docLine`

**Type:** `unknown`

**Value:** `lines[j]?.trim()`

#### `content`

**Type:** `unknown`

**Value:** `await this.readFile(filePath)`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `trimmed`

**Type:** `unknown`

**Value:** `line.trim()`

#### `content`

**Type:** `unknown`

**Value:** `await this.readFile(filePath)`

#### `types`

**Type:** `string[]`

**Value:** `[]`

#### `typePattern`

**Type:** `unknown`

**Value:** `/(?:export\s+)?type\s+(\w+)/g`

#### `content`

**Type:** `unknown`

**Value:** `await this.readFile(filePath)`

#### `constants`

**Type:** `Array<{ name: string; type: string; value?: string }>`

**Value:** `[]`

#### `constPattern`

**Type:** `unknown`

**Value:** `/(?:export\s+)?const\s+(\w+)(?:\s*:\s*([^=]+))?\s*=\s*([^`

#### `astAnalyzerActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `analyzer`

**Type:** `unknown`

**Value:** `new ASTGrepAnalyzer()`

### Dependencies

- `xstate`
- `zod`
- `$MODULE`

---

## src\docs\cli

CLI interface for the Documentation Generator

**File:** `src\docs\cli.ts`

### Functions

#### `DocCLIOptionsSchema()`

**Tags:** `exported`

#### `validateCLIOptions()`

**Tags:** `exported`

### Classes

#### `DocumentationCLI`

### Types

- `DocCLIOptions`
- `console`

### Constants

#### `DocCLIOptionsSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `validateCLIOptions`

**Type:** `unknown`

**Value:** `(data: unknown): DocCLIOptions => {`

#### `parsed`

**Type:** `unknown`

**Value:** `this.parseArguments(args)`

#### `sourceDir`

**Type:** `unknown`

**Value:** `parsed.sourceDir || './src'`

#### `outputDir`

**Type:** `unknown`

**Value:** `parsed.outputDir || './docs'`

#### `formats`

**Type:** `unknown`

**Value:** `(parsed.formats as string[]) || ['markdown']`

#### `generator`

**Type:** `unknown`

**Value:** `new DocumentationGenerator()`

#### `parsedFormats`

**Type:** `unknown`

**Value:** `values.formats?.map((format) => {`

#### `result`

**Type:** `unknown`

**Value:** `DocumentationFormatSchema.safeParse(format)`

#### `cliOptions`

**Type:** `unknown`

**Value:** `{`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `request`

**Type:** `unknown`

**Value:** `{`

#### `result`

**Type:** `unknown`

**Value:** `await generator.generateDocumentation(request)`

#### `duration`

**Type:** `unknown`

**Value:** `Date.now() - startTime`

#### `watcher`

**Type:** `unknown`

**Value:** `chokidar.watch(config.sourceDir`

#### `triggerRegeneration`

**Type:** `unknown`

**Value:** `() => {`

#### `cli`

**Type:** `unknown`

**Value:** `new DocumentationCLI()`

### Dependencies

- `node:fs`
- `node:util`
- `chokidar`
- `zod`
- `./generator.js`
- `./types.js`

---

## src\docs\generator

**File:** `src\docs\generator.ts`

### Functions

#### `GeneratorMetadataSchema()`

**Tags:** `exported`

#### `GeneratorOptionsSchema()`

**Tags:** `exported`

#### `documentationGeneratorActor()`

**Tags:** `exported`

### Classes

#### `DocumentationGenerator`

and pattern recognition. Supports multiple output formats and documentation types.
Generates comprehensive documentation from codebase analysis using AST-grep

Documentation Generator

### Types

- `GeneratorMetadata`
- `GeneratorOptions`
- `let`
- `of`
- `let`
- `h5`
- `from`
- `const`
- `const`

### Constants

#### `GeneratorMetadataSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `GeneratorOptionsSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `validatedRequest`

**Type:** `unknown`

**Value:** `validateDocumentationRequest(request)`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `sourceFiles`

**Type:** `unknown`

**Value:** `validatedRequest.sourceFiles || (await this.discoverSourceFiles())`

#### `metadata`

**Type:** `unknown`

**Value:** `GeneratorMetadataSchema.parse({`

#### `result`

**Type:** `DocumentationResult`

**Value:** `{`

#### `modules`

**Type:** `ModuleDoc[]`

**Value:** `[]`

#### `moduleDoc`

**Type:** `unknown`

**Value:** `await this.analyzer.analyzeFile(filePath)`

#### `architecture`

**Type:** `unknown`

**Value:** `await this.analyzeArchitecture(sourceFiles)`

#### `patterns`

**Type:** `unknown`

**Value:** `await this.loadPatterns()`

#### `examples`

**Type:** `unknown`

**Value:** `await this.extractUsageExamples(sourceFiles)`

#### `changes`

**Type:** `unknown`

**Value:** `await this.analyzeChanges(sourceFiles)`

#### `optional`

**Type:** `unknown`

**Value:** `param.optional ? ' (optional)' : ''`

#### `badges`

**Type:** `string[]`

**Value:** `[]`

#### `modifiers`

**Type:** `string[]`

**Value:** `[]`

#### `modifierStr`

**Type:** `unknown`

**Value:** `modifiers.length > 0 ? ` (${modifiers.join('`

#### `files`

**Type:** `string[]`

**Value:** `[]`

#### `entries`

**Type:** `unknown`

**Value:** `await readdir(dir)`

#### `fullPath`

**Type:** `unknown`

**Value:** `join(dir`

#### `stats`

**Type:** `unknown`

**Value:** `await stat(fullPath)`

#### `components`

**Type:** `ArchitectureDoc['components']`

**Value:** `[]`

#### `dataFlow`

**Type:** `ArchitectureDoc['dataFlow']`

**Value:** `[]`

#### `moduleDoc`

**Type:** `unknown`

**Value:** `await this.analyzer.analyzeFile(filePath)`

#### `layers`

**Type:** `unknown`

**Value:** `[`

#### `fromSafe`

**Type:** `unknown`

**Value:** `flow.from.replace(/[^a-zA-Z0-9]/g`

#### `toSafe`

**Type:** `unknown`

**Value:** `flow.to.replace(/[^a-zA-Z0-9]/g`

#### `content`

**Type:** `unknown`

**Value:** `await readFile('./src/patterns/enhanced-templates.json'`

#### `data`

**Type:** `unknown`

**Value:** `JSON.parse(content) as JsonPatternsFile`

#### `categories`

**Type:** `unknown`

**Value:** `[...new Set(patterns.map((p) => p.category))]`

#### `categoryPatterns`

**Type:** `unknown`

**Value:** `patterns.filter((p) => p.category === category)`

#### `css`

**Type:** `unknown`

**Value:** `this.generateDocumentationCSS()`

#### `searchScript`

**Type:** `unknown`

**Value:** `this.generateSearchScript()`

#### `moduleId`

**Type:** `unknown`

**Value:** `this.sanitizeId(module.name)`

#### `later`

**Type:** `unknown`

**Value:** `() => {`

#### `searchableElements`

**Type:** `unknown`

**Value:** `document.querySelectorAll('[data-searchable]')`

#### `lowerQuery`

**Type:** `unknown`

**Value:** `query.toLowerCase()`

#### `searchText`

**Type:** `unknown`

**Value:** `element.getAttribute('data-searchable')`

#### `isMatch`

**Type:** `unknown`

**Value:** `!query || searchText.includes(lowerQuery)`

#### `module`

**Type:** `unknown`

**Value:** `document.getElementById('module-' + moduleId)`

#### `searchInput`

**Type:** `unknown`

**Value:** `document.getElementById('searchInput')`

#### `debouncedSearch`

**Type:** `unknown`

**Value:** `debounce((e) => {`

#### `css`

**Type:** `unknown`

**Value:** `this.generateDocumentationCSS()`

#### `fromSafe`

**Type:** `unknown`

**Value:** `flow.from.replace(/[^a-zA-Z0-9]/g`

#### `toSafe`

**Type:** `unknown`

**Value:** `flow.to.replace(/[^a-zA-Z0-9]/g`

#### `css`

**Type:** `unknown`

**Value:** `this.generateDocumentationCSS()`

#### `searchScript`

**Type:** `unknown`

**Value:** `this.generateSearchScript()`

#### `categories`

**Type:** `unknown`

**Value:** `[...new Set(patterns.map((p) => p.category))]`

#### `categoryPatterns`

**Type:** `unknown`

**Value:** `patterns.filter((p) => p.category === category)`

#### `riskClass`

**Type:** `unknown`

**Value:** ``risk-${pattern.riskLevel}``

#### `examples`

**Type:** `UsageExample[]`

**Value:** `[]`

#### `content`

**Type:** `unknown`

**Value:** `await this.readFile(filePath)`

#### `functionCalls`

**Type:** `unknown`

**Value:** `await this.extractFunctionCalls(content`

#### `classUsages`

**Type:** `unknown`

**Value:** `await this.extractClassUsages(content`

#### `importUsages`

**Type:** `unknown`

**Value:** `await this.extractImportUsages(content`

#### `groupedExamples`

**Type:** `unknown`

**Value:** `new Map<string`

#### `key`

**Type:** `unknown`

**Value:** `example.functionName`

#### `css`

**Type:** `unknown`

**Value:** `this.generateDocumentationCSS()`

#### `searchScript`

**Type:** `unknown`

**Value:** `this.generateSearchScript()`

#### `groupedExamples`

**Type:** `unknown`

**Value:** `new Map<string`

#### `key`

**Type:** `unknown`

**Value:** `example.functionName`

#### `changes`

**Type:** `ChangeAnalysis[]`

**Value:** `[]`

#### `gitLog`

**Type:** `unknown`

**Value:** `execSync(`

#### `commits`

**Type:** `unknown`

**Value:** `gitLog`

#### `message`

**Type:** `unknown`

**Value:** `messageParts.join(' ')`

#### `commitDetails`

**Type:** `unknown`

**Value:** `execSync(`

#### `lines`

**Type:** `unknown`

**Value:** `commitDetails.split('\n')`

#### `timestamp`

**Type:** `unknown`

**Value:** `lines[0] || new Date().toISOString()`

#### `stats`

**Type:** `unknown`

**Value:** `await stat(filePath)`

#### `changesByDate`

**Type:** `unknown`

**Value:** `new Map<string`

#### `date`

**Type:** `unknown`

**Value:** `new Date(change.timestamp).toISOString().split('T')[0]`

#### `added`

**Type:** `unknown`

**Value:** `dayChanges.filter((c) => c.changeType === 'added')`

#### `modified`

**Type:** `unknown`

**Value:** `dayChanges.filter((c) => c.changeType === 'modified')`

#### `deleted`

**Type:** `unknown`

**Value:** `dayChanges.filter((c) => c.changeType === 'deleted')`

#### `css`

**Type:** `unknown`

**Value:** `this.generateDocumentationCSS()`

#### `changesByDate`

**Type:** `unknown`

**Value:** `new Map<string`

#### `date`

**Type:** `unknown`

**Value:** `new Date(change.timestamp).toISOString().split('T')[0]`

#### `added`

**Type:** `unknown`

**Value:** `dayChanges.filter((c) => c.changeType === 'added')`

#### `modified`

**Type:** `unknown`

**Value:** `dayChanges.filter((c) => c.changeType === 'modified')`

#### `deleted`

**Type:** `unknown`

**Value:** `dayChanges.filter((c) => c.changeType === 'deleted')`

#### `examples`

**Type:** `UsageExample[]`

**Value:** `[]`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `functionCallPattern`

**Type:** `unknown`

**Value:** `/(\w+)\s*\(/g`

#### `functionName`

**Type:** `unknown`

**Value:** `match[1]`

#### `lineIndex`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `line`

**Type:** `unknown`

**Value:** `lines[lineIndex]`

#### `examples`

**Type:** `UsageExample[]`

**Value:** `[]`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `classInstantiationPattern`

**Type:** `unknown`

**Value:** `/new\s+(\w+)\s*\(/g`

#### `className`

**Type:** `unknown`

**Value:** `match[1]`

#### `lineIndex`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `line`

**Type:** `unknown`

**Value:** `lines[lineIndex]`

#### `examples`

**Type:** `UsageExample[]`

**Value:** `[]`

#### `importPattern`

**Type:** `unknown`

**Value:** `/import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g`

#### `lineIndex`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `importName`

**Type:** `unknown`

**Value:** `namedImports || defaultImport || module`

#### `documentationGeneratorActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `generator`

**Type:** `unknown`

**Value:** `new DocumentationGenerator()`

### Dependencies

- `xstate`
- `zod`
- `./ast-analyzer.js`
- `./types.js`

---

## src\docs\index

Carmack Coder Documentation System

Comprehensive auto-documentation system with AST-grep integration
for generating API docs, architecture diagrams, pattern catalogs, and more.

**File:** `src\docs\index.ts`

### Constants

#### `request`

**Type:** `DocumentationRequest`

**Value:** `{`

#### `request`

**Type:** `DocumentationRequest`

**Value:** `{`

#### `request`

**Type:** `DocumentationRequest`

**Value:** `{`

#### `request`

**Type:** `DocumentationRequest`

**Value:** `{`

#### `outputDir`

**Type:** `unknown`

**Value:** `options.outputDir || './docs'`

#### `format`

**Type:** `unknown`

**Value:** `options.format || 'markdown'`

#### `ext`

**Type:** `unknown`

**Value:** `format === 'markdown' ? 'md' : format === 'html' ? 'html' : 'json'`

#### `results`

**Type:** `unknown`

**Value:** `await Promise.all([`

#### `results`

**Type:** `unknown`

**Value:** `await this.generateAllDocumentation(options)`

#### `totalFiles`

**Type:** `unknown`

**Value:** `results.length`

#### `successfulFiles`

**Type:** `unknown`

**Value:** `results.filter((r) => !r.errors || r.errors.length === 0).length`

#### `totalFunctions`

**Type:** `unknown`

**Value:** `results.reduce((sum`

#### `totalClasses`

**Type:** `unknown`

**Value:** `results.reduce((sum`

#### `totalModules`

**Type:** `unknown`

**Value:** `results.reduce((sum`

#### `totalTime`

**Type:** `unknown`

**Value:** `results.reduce((sum`

#### `documentationSystem`

**Type:** `unknown`

**Value:** `new DocumentationSystem()`

#### `generateAPIDocumentation`

**Type:** `unknown`

**Value:** `(`

#### `generateArchitectureDocumentation`

**Type:** `unknown`

**Value:** `(`

#### `generatePatternDocumentation`

**Type:** `unknown`

**Value:** `(`

#### `generateAllDocumentation`

**Type:** `unknown`

**Value:** `(`

#### `generateAndWriteAll`

**Type:** `unknown`

**Value:** `(`

### Dependencies

- `./generator.js`

---

## src\docs\types

**File:** `src\docs\types.ts`

### Functions

#### `DocumentationTypeSchema()`

**Tags:** `exported`

#### `DocumentationFormatSchema()`

**Tags:** `exported`

#### `ASTNodeSchema()`

**Tags:** `exported`

#### `FunctionDocSchema()`

**Tags:** `exported`

#### `ClassDocSchema()`

**Tags:** `exported`

#### `ModuleDocSchema()`

**Tags:** `exported`

#### `PatternDocSchema()`

**Tags:** `exported`

#### `ArchitectureDocSchema()`

**Tags:** `exported`

#### `DocumentationRequestSchema()`

**Tags:** `exported`

#### `DocumentationResultSchema()`

**Tags:** `exported`

#### `validateDocumentationRequest()`

**Tags:** `exported`

#### `validateDocumentationResult()`

**Tags:** `exported`

### Types

- `DocumentationType`
- `DocumentationFormat`
- `ASTNode`
- `FunctionDoc`
- `ClassDoc`
- `ModuleDoc`
- `PatternDoc`
- `ArchitectureDoc`
- `DocumentationRequest`
- `DocumentationResult`

### Constants

#### `DocumentationTypeSchema`

**Type:** `unknown`

**Value:** `z.enum([`

#### `DocumentationFormatSchema`

**Type:** `unknown`

**Value:** `z.enum(['markdown'`

#### `ASTNodeSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `FunctionDocSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ClassDocSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ModuleDocSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternDocSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ArchitectureDocSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `DocumentationRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `DocumentationResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `validateDocumentationRequest`

**Type:** `unknown`

**Value:** `(data: unknown): DocumentationRequest => {`

#### `validateDocumentationResult`

**Type:** `unknown`

**Value:** `(data: unknown): DocumentationResult => {`

### Dependencies

- `zod`

---

## src\example

**File:** `src\example.ts`

---

## src\learning\clustering

Clustering Algorithms for Pattern Categorization

This module implements real clustering algorithms for intelligent pattern grouping
and categorization in the Carmack Coder system.

**File:** `src\learning\clustering.ts`

### Functions

### Constants

#### `vectors`

**Type:** `unknown`

**Value:** `patterns.map((p) => p.features)`

#### `patternIds`

**Type:** `unknown`

**Value:** `patterns.map((p) => p.patternId)`

#### `centroids`

**Type:** `unknown`

**Value:** `this.initializeCentroidsKMeansPlusPlus(vectors)`

#### `newAssignments`

**Type:** `unknown`

**Value:** `vectors.map((vector) => this.findNearestCentroid(vector`

#### `centroids`

**Type:** `Vector[]`

**Value:** `[]`

#### `dimensions`

**Type:** `unknown`

**Value:** `vectors[0]?.length ?? 0`

#### `firstIndex`

**Type:** `unknown`

**Value:** `Math.floor(Math.random() * vectors.length)`

#### `firstVector`

**Type:** `unknown`

**Value:** `vectors[firstIndex]`

#### `distances`

**Type:** `unknown`

**Value:** `vectors.map((vector) => {`

#### `minDistance`

**Type:** `unknown`

**Value:** `Math.min(`

#### `totalDistance`

**Type:** `unknown`

**Value:** `distances.reduce((sum`

#### `threshold`

**Type:** `unknown`

**Value:** `Math.random() * totalDistance`

#### `selectedVector`

**Type:** `unknown`

**Value:** `vectors[selectedIndex]`

#### `centroid`

**Type:** `unknown`

**Value:** `centroids[i]`

#### `distance`

**Type:** `unknown`

**Value:** `VectorUtils.euclideanDistance(vector`

#### `clusterSums`

**Type:** `Vector[]`

**Value:** `centroids.map(() => new Array(vectors[0]?.length ?? 0).fill(0))`

#### `clusterCounts`

**Type:** `unknown`

**Value:** `new Array(centroids.length).fill(0)`

#### `clusterId`

**Type:** `unknown`

**Value:** `assignments[i]`

#### `vector`

**Type:** `unknown`

**Value:** `vectors[i]`

#### `clusterSum`

**Type:** `unknown`

**Value:** `clusterSums[clusterId]`

#### `centroid`

**Type:** `unknown`

**Value:** `centroids[i]`

#### `clusterSum`

**Type:** `unknown`

**Value:** `clusterSums[i]`

#### `clusters`

**Type:** `ClusterResult[]`

**Value:** `[]`

#### `clusterPatterns`

**Type:** `string[]`

**Value:** `[]`

#### `clusterVectors`

**Type:** `Vector[]`

**Value:** `[]`

#### `patternId`

**Type:** `unknown`

**Value:** `patternIds[j]`

#### `vector`

**Type:** `unknown`

**Value:** `vectors[j]`

#### `centroid`

**Type:** `unknown`

**Value:** `centroids[i]`

#### `cohesion`

**Type:** `unknown`

**Value:** `this.calculateCohesion(clusterVectors`

#### `distances`

**Type:** `unknown`

**Value:** `vectors.map((vector) => VectorUtils.euclideanDistance(vector`

#### `avgDistance`

**Type:** `unknown`

**Value:** `distances.reduce((sum`

#### `vectors`

**Type:** `unknown`

**Value:** `patterns.map((p) => p.features)`

#### `patternIds`

**Type:** `unknown`

**Value:** `patterns.map((p) => p.patternId)`

#### `labels`

**Type:** `unknown`

**Value:** `new Array(vectors.length).fill(-1)`

#### `neighbors`

**Type:** `unknown`

**Value:** `this.findNeighbors(i`

#### `neighbors`

**Type:** `number[]`

**Value:** `[]`

#### `point`

**Type:** `unknown`

**Value:** `vectors[pointIndex]`

#### `targetVector`

**Type:** `unknown`

**Value:** `vectors[i]`

#### `distance`

**Type:** `unknown`

**Value:** `VectorUtils.euclideanDistance(point`

#### `queue`

**Type:** `unknown`

**Value:** `[...neighbors]`

#### `currentIndex`

**Type:** `unknown`

**Value:** `queue.shift()!`

#### `currentNeighbors`

**Type:** `unknown`

**Value:** `this.findNeighbors(currentIndex`

#### `clusterMap`

**Type:** `unknown`

**Value:** `new Map<number`

#### `label`

**Type:** `unknown`

**Value:** `labels[i]`

#### `patternId`

**Type:** `unknown`

**Value:** `patternIds[i]`

#### `vector`

**Type:** `unknown`

**Value:** `vectors[i]`

#### `results`

**Type:** `ClusterResult[]`

**Value:** `[]`

#### `centroid`

**Type:** `unknown`

**Value:** `VectorUtils.centroid(data.vectors)`

#### `cohesion`

**Type:** `unknown`

**Value:** `this.calculateDBSCANCohesion(data.vectors`

#### `distances`

**Type:** `unknown`

**Value:** `vectors.map((vector) => VectorUtils.euclideanDistance(vector`

#### `maxDistance`

**Type:** `unknown`

**Value:** `Math.max(...distances)`

#### `avgDistance`

**Type:** `unknown`

**Value:** `distances.reduce((sum`

#### `vectors`

**Type:** `unknown`

**Value:** `patterns.map((p) => p.features)`

#### `patternIds`

**Type:** `unknown`

**Value:** `patterns.map((p) => p.patternId)`

#### `newCluster`

**Type:** `unknown`

**Value:** `this.mergeClusters(`

#### `distance`

**Type:** `unknown`

**Value:** `this.calculateClusterDistance(clusters[i]`

#### `distance`

**Type:** `unknown`

**Value:** `VectorUtils.euclideanDistance(v1`

#### `distance`

**Type:** `unknown`

**Value:** `VectorUtils.euclideanDistance(v1`

#### `mergedVectors`

**Type:** `unknown`

**Value:** `[...cluster1.vectors`

#### `mergedPatterns`

**Type:** `unknown`

**Value:** `[...cluster1.patterns`

#### `newCentroid`

**Type:** `unknown`

**Value:** `VectorUtils.centroid(mergedVectors)`

#### `distances`

**Type:** `unknown`

**Value:** `vectors.map((vector) => VectorUtils.euclideanDistance(vector`

#### `avgDistance`

**Type:** `unknown`

**Value:** `distances.reduce((sum`

#### `maxDistance`

**Type:** `unknown`

**Value:** `Math.max(...distances)`

#### `clusterer`

**Type:** `unknown`

**Value:** `new KMeansClusterer({`

#### `clusterer`

**Type:** `unknown`

**Value:** `new DBSCANClusterer({`

#### `clusterer`

**Type:** `unknown`

**Value:** `new HierarchicalClusterer({`

#### `k`

**Type:** `unknown`

**Value:** `Math.min(10`

### Dependencies

- `./types.js`

---

## src\learning\effectiveness-scorer

Pattern Effectiveness Scoring System

This module implements comprehensive effectiveness scoring for patterns
using real metrics, statistical analysis, and machine learning techniques.

**File:** `src\learning\effectiveness-scorer.ts`

### Functions

#### `PatternUsageRecordSchema()`

**Tags:** `exported`

#### `EffectivenessScoreSchema()`

**Tags:** `exported`

### Types

- `PatternUsageRecord`
- `EffectivenessScore`

### Constants

#### `defaultScoringConfig`

**Type:** `EffectivenessScoringConfig`

**Value:** `{`

#### `PatternUsageRecordSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `EffectivenessScoreSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `validated`

**Type:** `unknown`

**Value:** `PatternUsageRecordSchema.parse(usage)`

#### `history`

**Type:** `unknown`

**Value:** `this.usageHistory.get(validated.patternId)!`

#### `maxHistorySize`

**Type:** `unknown`

**Value:** `1000`

#### `history`

**Type:** `unknown`

**Value:** `this.usageHistory.get(patternId) || []`

#### `weightedHistory`

**Type:** `unknown`

**Value:** `this.config.timeDecay.enabled`

#### `successRate`

**Type:** `unknown`

**Value:** `this.calculateSuccessRate(weightedHistory)`

#### `performance`

**Type:** `unknown`

**Value:** `this.calculatePerformanceScore(weightedHistory)`

#### `userSatisfaction`

**Type:** `unknown`

**Value:** `this.calculateUserSatisfactionScore(weightedHistory)`

#### `complexity`

**Type:** `unknown`

**Value:** `this.calculateComplexityScore(weightedHistory)`

#### `reusability`

**Type:** `unknown`

**Value:** `this.calculateReusabilityScore(weightedHistory)`

#### `maintainability`

**Type:** `unknown`

**Value:** `this.calculateMaintainabilityScore(weightedHistory)`

#### `overallScore`

**Type:** `unknown`

**Value:** `successRate.score * this.config.weights.successRate +`

#### `confidence`

**Type:** `unknown`

**Value:** `this.calculateConfidence(history)`

#### `trends`

**Type:** `unknown`

**Value:** `this.analyzeTrends(history)`

#### `recommendedActions`

**Type:** `unknown`

**Value:** `this.generateRecommendations({`

#### `now`

**Type:** `unknown`

**Value:** `Date.now()`

#### `halfLifeMs`

**Type:** `unknown`

**Value:** `this.config.timeDecay.halfLife * 24 * 60 * 60 * 1000`

#### `age`

**Type:** `unknown`

**Value:** `now - record.timestamp`

#### `weight`

**Type:** `unknown`

**Value:** `0.5 ** (age / halfLifeMs)`

#### `totalWeight`

**Type:** `unknown`

**Value:** `weightedHistory.reduce((sum`

#### `successWeight`

**Type:** `unknown`

**Value:** `weightedHistory`

#### `rawValue`

**Type:** `unknown`

**Value:** `totalWeight > 0 ? successWeight / totalWeight : 0`

#### `performanceTimes`

**Type:** `unknown`

**Value:** `weightedHistory.map(({ record }) => record.performanceMs)`

#### `cleanedTimes`

**Type:** `unknown`

**Value:** `this.config.thresholds.outlierDetection`

#### `stats`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateSummary(cleanedTimes)`

#### `medianTime`

**Type:** `unknown`

**Value:** `stats.median`

#### `score`

**Type:** `unknown`

**Value:** `Math.max(0`

#### `sortedTimes`

**Type:** `unknown`

**Value:** `[...cleanedTimes].sort((a`

#### `percentile`

**Type:** `unknown`

**Value:** `this.calculatePercentile(medianTime`

#### `ratings`

**Type:** `unknown`

**Value:** `weightedHistory`

#### `stats`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateSummary(ratings)`

#### `avgRating`

**Type:** `unknown`

**Value:** `stats.mean`

#### `score`

**Type:** `unknown`

**Value:** `avgRating / 10`

#### `complexityChanges`

**Type:** `unknown`

**Value:** `weightedHistory`

#### `stats`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateSummary(complexityChanges)`

#### `avgReduction`

**Type:** `unknown`

**Value:** `stats.mean`

#### `consistency`

**Type:** `unknown`

**Value:** `1 - stats.standardDeviation / (Math.abs(avgReduction) + 1)`

#### `score`

**Type:** `unknown`

**Value:** `Math.max(0`

#### `usageFrequency`

**Type:** `unknown`

**Value:** `weightedHistory.length`

#### `contexts`

**Type:** `unknown`

**Value:** `weightedHistory`

#### `uniqueFileTypes`

**Type:** `unknown`

**Value:** `new Set(contexts.map((c) => c.fileType).filter(Boolean)).size`

#### `uniqueProjectSizes`

**Type:** `unknown`

**Value:** `new Set(contexts.map((c) => c.projectSize).filter(Boolean)).size`

#### `uniqueEnvironments`

**Type:** `unknown`

**Value:** `new Set(contexts.map((c) => c.environment).filter(Boolean)).size`

#### `diversityScore`

**Type:** `unknown`

**Value:** `contexts.length > 0`

#### `frequencyScore`

**Type:** `unknown`

**Value:** `Math.min(1`

#### `score`

**Type:** `unknown`

**Value:** `frequencyScore * 0.7 + diversityScore * 0.3`

#### `lastRecord`

**Type:** `unknown`

**Value:** `weightedHistory[weightedHistory.length - 1]`

#### `firstRecord`

**Type:** `unknown`

**Value:** `weightedHistory[0]`

#### `timeSpan`

**Type:** `unknown`

**Value:** `lastRecord.record.timestamp - firstRecord.record.timestamp`

#### `daySpan`

**Type:** `unknown`

**Value:** `timeSpan / (24 * 60 * 60 * 1000)`

#### `windowSize`

**Type:** `unknown`

**Value:** `Math.max(5`

#### `recentWindow`

**Type:** `unknown`

**Value:** `weightedHistory.slice(i - windowSize`

#### `olderWindow`

**Type:** `unknown`

**Value:** `weightedHistory.slice(Math.max(0`

#### `recentSuccessRate`

**Type:** `unknown`

**Value:** `recentWindow.filter(({ record }) => record.success).length / recentWindow.length`

#### `olderSuccessRate`

**Type:** `unknown`

**Value:** `olderWindow.filter(({ record }) => record.success).length / olderWindow.length`

#### `updateFrequency`

**Type:** `unknown`

**Value:** `daySpan > 0 ? changeCount / daySpan : 0`

#### `stabilityScore`

**Type:** `unknown`

**Value:** `Math.max(0`

#### `score`

**Type:** `unknown`

**Value:** `stabilityScore`

#### `sampleSize`

**Type:** `unknown`

**Value:** `history.length`

#### `now`

**Type:** `unknown`

**Value:** `Date.now()`

#### `recentData`

**Type:** `unknown`

**Value:** `history.filter(`

#### `recencyFactor`

**Type:** `unknown`

**Value:** `recentData.length / sampleSize`

#### `completeRecords`

**Type:** `unknown`

**Value:** `history.filter(`

#### `completenessFactor`

**Type:** `unknown`

**Value:** `completeRecords.length / sampleSize`

#### `splitPoint`

**Type:** `unknown`

**Value:** `Math.floor(history.length * 0.7)`

#### `olderPeriod`

**Type:** `unknown`

**Value:** `history.slice(0`

#### `recentPeriod`

**Type:** `unknown`

**Value:** `history.slice(splitPoint)`

#### `olderSuccessRate`

**Type:** `unknown`

**Value:** `olderPeriod.filter((r) => r.success).length / olderPeriod.length`

#### `recentSuccessRate`

**Type:** `unknown`

**Value:** `recentPeriod.filter((r) => r.success).length / recentPeriod.length`

#### `change`

**Type:** `unknown`

**Value:** `recentSuccessRate - olderSuccessRate`

#### `threshold`

**Type:** `unknown`

**Value:** `0.1`

#### `recommendations`

**Type:** `string[]`

**Value:** `[]`

#### `completeRecords`

**Type:** `unknown`

**Value:** `history.filter(`

#### `completenessRatio`

**Type:** `unknown`

**Value:** `completeRecords.length / history.length`

#### `sorted`

**Type:** `unknown`

**Value:** `[...data].sort((a`

#### `q1Index`

**Type:** `unknown`

**Value:** `Math.floor(sorted.length * 0.25)`

#### `q3Index`

**Type:** `unknown`

**Value:** `Math.floor(sorted.length * 0.75)`

#### `q1`

**Type:** `unknown`

**Value:** `sorted[q1Index]`

#### `q3`

**Type:** `unknown`

**Value:** `sorted[q3Index]`

#### `iqr`

**Type:** `unknown`

**Value:** `q3 - q1`

#### `lowerBound`

**Type:** `unknown`

**Value:** `q1 - 1.5 * iqr`

#### `upperBound`

**Type:** `unknown`

**Value:** `q3 + 1.5 * iqr`

#### `index`

**Type:** `unknown`

**Value:** `sortedData.findIndex((v) => v >= value)`

### Dependencies

- `zod`
- `./statistics.js`

---

## src\learning\index

Pattern Learning Machine Learning Algorithms

This module provides real machine learning algorithms for intelligent pattern discovery,
effectiveness scoring, and optimization in the Carmack Coder system.

Key Features:
- Clustering algorithms for pattern categorization
- Statistical analysis for pattern effectiveness
- Pattern similarity detection
- Reinforcement learning for optimization
- Natural language processing for pattern analysis

**File:** `src\learning\index.ts`

### Types

- `RecommendationEngineConfig`
- `RecommendationRequest`
- `RecommendationResponse`

---

## src\learning\nlp

Natural Language Processing System for Pattern Analysis

Implements text analysis, sentiment analysis, keyword extraction,
and semantic understanding for pattern descriptions and user feedback.

**File:** `src\learning\nlp.ts`

### Functions

### Classes

### Types

- `NLPConfig`
- `PreprocessedText`
- `Keyword`
- `Sentiment`
- `Intent`
- `Topic`

### Constants

#### `NLPConfigSchema`

**Type:** `unknown`

**Value:** `z`

#### `PreprocessedTextSchema`

**Type:** `unknown`

**Value:** `z`

#### `KeywordSchema`

**Type:** `unknown`

**Value:** `z`

#### `SentimentSchema`

**Type:** `unknown`

**Value:** `z`

#### `IntentSchema`

**Type:** `unknown`

**Value:** `z`

#### `TopicSchema`

**Type:** `unknown`

**Value:** `z`

#### `originalText`

**Type:** `unknown`

**Value:** `text`

#### `cleanedText`

**Type:** `unknown`

**Value:** `text`

#### `tokens`

**Type:** `unknown`

**Value:** `this.tokenize(cleanedText)`

#### `sentences`

**Type:** `unknown`

**Value:** `this.splitSentences(originalText)`

#### `language`

**Type:** `unknown`

**Value:** `this.detectLanguage(originalText)`

#### `englishWords`

**Type:** `unknown`

**Value:** `['the'`

#### `englishCount`

**Type:** `unknown`

**Value:** `englishWords.reduce((count`

#### `preprocessed`

**Type:** `unknown`

**Value:** `this.preprocessor.preprocess(text)`

#### `tokens`

**Type:** `unknown`

**Value:** `preprocessed.tokens`

#### `termFreq`

**Type:** `unknown`

**Value:** `new Map<string`

#### `keywords`

**Type:** `Keyword[]`

**Value:** `[]`

#### `score`

**Type:** `unknown`

**Value:** `this.calculateKeywordScore(`

#### `position`

**Type:** `unknown`

**Value:** `preprocessed.originalText.toLowerCase().indexOf(word.toLowerCase())`

#### `category`

**Type:** `unknown`

**Value:** `this.categorizeKeyword(word)`

#### `tf`

**Type:** `unknown`

**Value:** `frequency / totalTokens`

#### `lengthBonus`

**Type:** `unknown`

**Value:** `Math.min(word.length / 10`

#### `position`

**Type:** `unknown`

**Value:** `originalText.toLowerCase().indexOf(word.toLowerCase())`

#### `positionBonus`

**Type:** `unknown`

**Value:** `position === -1 ? 0 : Math.max(0`

#### `codeBonus`

**Type:** `unknown`

**Value:** `this.preprocessor.isCodeKeyword(word) ? 0.5 : 0`

#### `capBonus`

**Type:** `unknown`

**Value:** `/^[A-Z]/.test(word) ? 0.3 : 0`

#### `technical`

**Type:** `unknown`

**Value:** `['function'`

#### `domain`

**Type:** `unknown`

**Value:** `['typescript'`

#### `action`

**Type:** `unknown`

**Value:** `['refactor'`

#### `quality`

**Type:** `unknown`

**Value:** `['performance'`

#### `lowerWord`

**Type:** `unknown`

**Value:** `word.toLowerCase()`

#### `words`

**Type:** `unknown`

**Value:** `text.toLowerCase().split(/\s+/)`

#### `word`

**Type:** `unknown`

**Value:** `words[i]!.replace(/[^\w]/g`

#### `normalizedScore`

**Type:** `unknown`

**Value:** `wordCount > 0 ? Math.max(-1`

#### `confidence`

**Type:** `unknown`

**Value:** `Math.min(1`

#### `label`

**Type:** `unknown`

**Value:** `this.scoreToLabel(normalizedScore)`

#### `lowerText`

**Type:** `unknown`

**Value:** `text.toLowerCase()`

#### `scores`

**Type:** `unknown`

**Value:** `new Map<string`

#### `totalMatches`

**Type:** `unknown`

**Value:** `Array.from(scores.values()).reduce((sum`

#### `confidence`

**Type:** `unknown`

**Value:** `totalMatches > 0 ? bestScore / totalMatches : 0.1`

#### `preprocessor`

**Type:** `unknown`

**Value:** `new TextPreprocessor()`

#### `keywordExtractor`

**Type:** `unknown`

**Value:** `new KeywordExtractor()`

#### `preprocessed`

**Type:** `unknown`

**Value:** `preprocessor.preprocess(text)`

#### `keywords`

**Type:** `unknown`

**Value:** `keywordExtractor.extractKeywords(text`

#### `features`

**Type:** `number[]`

**Value:** `[]`

#### `categoryCount`

**Type:** `unknown`

**Value:** `{ technical: 0`

#### `topKeywords`

**Type:** `unknown`

**Value:** `keywords.slice(0`

#### `sentimentAnalyzer`

**Type:** `unknown`

**Value:** `new SentimentAnalyzer()`

#### `sentiment`

**Type:** `unknown`

**Value:** `sentimentAnalyzer.analyzeSentiment(text)`

#### `intentClassifier`

**Type:** `unknown`

**Value:** `new IntentClassifier()`

#### `intent`

**Type:** `unknown`

**Value:** `intentClassifier.classifyIntent(text)`

#### `preprocessed`

**Type:** `unknown`

**Value:** `this.preprocessor.preprocess(description)`

#### `keywords`

**Type:** `unknown`

**Value:** `this.config.enableKeywordExtraction`

#### `sentiment`

**Type:** `unknown`

**Value:** `this.config.enableSentimentAnalysis`

#### `intent`

**Type:** `unknown`

**Value:** `this.config.enableIntentClassification`

#### `semanticEmbedding`

**Type:** `unknown`

**Value:** `this.semanticEmbedding.generateEmbedding(description)`

#### `domain`

**Type:** `unknown`

**Value:** `this.extractDomain(keywords`

#### `complexity`

**Type:** `unknown`

**Value:** `this.calculateComplexity(preprocessed`

#### `sentiment`

**Type:** `unknown`

**Value:** `this.sentimentAnalyzer.analyzeSentiment(feedbackText)`

#### `intent`

**Type:** `unknown`

**Value:** `this.intentClassifier.classifyIntent(feedbackText)`

#### `keywords`

**Type:** `unknown`

**Value:** `this.keywordExtractor`

#### `suggestions`

**Type:** `unknown`

**Value:** `this.generateSuggestions(sentiment`

#### `embedding1`

**Type:** `unknown`

**Value:** `this.semanticEmbedding.generateEmbedding(text1)`

#### `embedding2`

**Type:** `unknown`

**Value:** `this.semanticEmbedding.generateEmbedding(text2)`

#### `dotProduct`

**Type:** `unknown`

**Value:** `embedding1.reduce((sum`

#### `magnitude1`

**Type:** `unknown`

**Value:** `Math.sqrt(embedding1.reduce((sum`

#### `magnitude2`

**Type:** `unknown`

**Value:** `Math.sqrt(embedding2.reduce((sum`

#### `domains`

**Type:** `unknown`

**Value:** `new Set<string>()`

#### `domainKeywords`

**Type:** `unknown`

**Value:** `{`

#### `lowerDescription`

**Type:** `unknown`

**Value:** `description.toLowerCase()`

#### `lowerKeywords`

**Type:** `unknown`

**Value:** `keywords.map((k) => k.toLowerCase())`

#### `hasMatch`

**Type:** `unknown`

**Value:** `domainWords.some(`

#### `lengthComplexity`

**Type:** `unknown`

**Value:** `Math.min(preprocessed.wordCount / 50`

#### `technicalKeywords`

**Type:** `unknown`

**Value:** `keywords.filter((keyword) =>`

#### `technicalComplexity`

**Type:** `unknown`

**Value:** `Math.min(technicalKeywords.length / 10`

#### `avgSentenceLength`

**Type:** `unknown`

**Value:** `preprocessed.wordCount / Math.max(preprocessed.sentences.length`

#### `sentenceComplexity`

**Type:** `unknown`

**Value:** `Math.min(avgSentenceLength / 20`

#### `concepts`

**Type:** `unknown`

**Value:** `new Map<string`

#### `relevance`

**Type:** `unknown`

**Value:** `Math.max(0.1`

#### `technicalConcepts`

**Type:** `unknown`

**Value:** `{`

#### `lowerDescription`

**Type:** `unknown`

**Value:** `description.toLowerCase()`

#### `suggestions`

**Type:** `string[]`

**Value:** `[]`

### Dependencies

- `zod`

---

## src\learning\recommendation-engine

Recommendation request schema

**File:** `src\learning\recommendation-engine.ts`

### Functions

#### `RecommendationRequestSchema()`

Recommendation request schema

**Tags:** `exported`

#### `PatternRecommendationSchema()`

Pattern recommendation schema

**Tags:** `exported`

#### `RecommendationResponseSchema()`

Recommendation response schema

**Tags:** `exported`

### Classes

#### `PatternRecommendationEngine`

using machine learning algorithms, similarity analysis, and effectiveness scoring
Pattern recommendation engine that provides intelligent pattern suggestions

### Types

- `RecommendationRequest`
- `PatternRecommendation`
- `RecommendationResponse`

### Constants

#### `RecommendationRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternRecommendationSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `RecommendationResponseSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `validatedRequest`

**Type:** `unknown`

**Value:** `RecommendationRequestSchema.parse(request)`

#### `cached`

**Type:** `unknown`

**Value:** `this.getCachedRecommendation(validatedRequest)`

#### `contextAnalysis`

**Type:** `unknown`

**Value:** `await this.analyzeContext(validatedRequest)`

#### `candidates`

**Type:** `unknown`

**Value:** `await this.getCandidatePatterns(validatedRequest`

#### `scoredPatterns`

**Type:** `unknown`

**Value:** `await this.scorePatterns(`

#### `optimizedPatterns`

**Type:** `unknown`

**Value:** `await this.applyRLOptimization(scoredPatterns`

#### `recommendations`

**Type:** `unknown`

**Value:** `this.generateRecommendations(`

#### `response`

**Type:** `RecommendationResponse`

**Value:** `{`

#### `analysis`

**Type:** `unknown`

**Value:** `await this.nlpAnalyzer.analyzeText(`

#### `candidates`

**Type:** `PatternFeatureVector[]`

**Value:** `[]`

#### `contextVector`

**Type:** `PatternFeatureVector`

**Value:** `{`

#### `similarity`

**Type:** `unknown`

**Value:** `await this.similarityDetector.calculateSimilarity(contextVector`

#### `complexityDiff`

**Type:** `unknown`

**Value:** `Math.abs(contextAnalysis.complexity - pattern.metadata.complexity)`

#### `scoredPatterns`

**Type:** `Array<{
      pattern: PatternFeatureVector;
      score: number;
      effectiveness: EffectivenessScore;
    }>`

**Value:** `[]`

#### `contextSimilarity`

**Type:** `unknown`

**Value:** `this.calculateContextSimilarity(contextAnalysis`

#### `riskMapping`

**Type:** `unknown`

**Value:** `{ low: 0.2`

#### `patternRisk`

**Type:** `unknown`

**Value:** `riskMapping[pattern.metadata.riskLevel]`

#### `preferenceRisk`

**Type:** `unknown`

**Value:** `riskMapping[preferences.riskTolerance]`

#### `state`

**Type:** `RLState`

**Value:** `{`

#### `rlAction`

**Type:** `unknown`

**Value:** `await this.rlManager.selectAction(state)`

#### `rlRecommendations`

**Type:** `unknown`

**Value:** `[rlAction]`

#### `metadata`

**Type:** `unknown`

**Value:** `this.patternMetadata.get(pattern.patternId) || {}`

#### `reasons`

**Type:** `string[]`

**Value:** `[]`

#### `benefits`

**Type:** `string[]`

**Value:** `[]`

#### `risks`

**Type:** `string[]`

**Value:** `[]`

#### `avgConfidence`

**Type:** `unknown`

**Value:** `recommendations.reduce((sum`

#### `topRec`

**Type:** `unknown`

**Value:** `recommendations[0]`

#### `algorithms`

**Type:** `unknown`

**Value:** `['similarity-detection']`

#### `key`

**Type:** `unknown`

**Value:** `this.generateCacheKey(request)`

#### `entry`

**Type:** `unknown`

**Value:** `this.cache.get(key)`

#### `now`

**Type:** `unknown`

**Value:** `Date.now()`

#### `key`

**Type:** `unknown`

**Value:** `this.generateCacheKey(request)`

#### `keyData`

**Type:** `unknown`

**Value:** `{`

#### `entries`

**Type:** `unknown`

**Value:** `Array.from(this.cache.entries())`

#### `toRemove`

**Type:** `unknown`

**Value:** `Math.floor(entries.length * 0.25)`

#### `entry`

**Type:** `unknown`

**Value:** `entries[i]`

#### `totalPatterns`

**Type:** `unknown`

**Value:** `this.patternDatabase.size`

#### `languageDistribution`

**Type:** `Record<string, number>`

**Value:** `{}`

#### `categoryDistribution`

**Type:** `Record<string, number>`

**Value:** `{}`

#### `language`

**Type:** `unknown`

**Value:** `metadata.language || 'unknown'`

#### `category`

**Type:** `unknown`

**Value:** `metadata.category || 'unknown'`

### Dependencies

- `zod`

---

## src\learning\reinforcement

Reinforcement Learning System for Pattern Optimization

Implements Q-learning and policy gradient methods to optimize pattern selection
and recommendation based on historical effectiveness and context.

**File:** `src\learning\reinforcement.ts`

### Functions

### Classes

#### `QLearningAgent`

Uses tabular Q-learning with state-action value function approximation
Q-Learning Agent for Pattern Optimization

#### `PolicyGradientAgent`

Uses neural network approximation for policy learning
Policy Gradient Agent for Pattern Optimization

#### `RewardCalculator`

Computes rewards based on pattern effectiveness metrics
Reward Function Calculator

### Types

- `RLConfig`
- `Experience`

### Constants

#### `RLConfigSchema`

**Type:** `unknown`

**Value:** `z`

#### `ExperienceSchema`

**Type:** `unknown`

**Value:** `z`

#### `stateKey`

**Type:** `unknown`

**Value:** `this.getStateKey(state)`

#### `stateKey`

**Type:** `unknown`

**Value:** `this.getStateKey(state)`

#### `actionKey`

**Type:** `unknown`

**Value:** `this.getActionKey(action)`

#### `nextStateKey`

**Type:** `unknown`

**Value:** `this.getStateKey(nextState)`

#### `currentQ`

**Type:** `unknown`

**Value:** `this.qTable.get(stateKey)!.get(actionKey)!`

#### `nextStateActions`

**Type:** `unknown`

**Value:** `this.qTable.get(nextStateKey)!`

#### `targetQ`

**Type:** `unknown`

**Value:** `reward + this.config.discountFactor * maxNextQ`

#### `newQ`

**Type:** `unknown`

**Value:** `currentQ + this.config.learningRate * (targetQ - currentQ)`

#### `stateKey`

**Type:** `unknown`

**Value:** `this.getStateKey(state)`

#### `actionKey`

**Type:** `unknown`

**Value:** `this.getActionKey(action)`

#### `stateKey`

**Type:** `unknown`

**Value:** `this.getStateKey(state)`

#### `randomAction`

**Type:** `unknown`

**Value:** `availableActions[Math.floor(Math.random() * availableActions.length)]`

#### `stateActions`

**Type:** `unknown`

**Value:** `this.qTable.get(stateKey)!`

#### `actionKey`

**Type:** `unknown`

**Value:** `this.getActionKey({ action`

#### `value`

**Type:** `unknown`

**Value:** `stateActions.get(actionKey) || 0`

#### `data`

**Type:** `unknown`

**Value:** `{`

#### `parsed`

**Type:** `unknown`

**Value:** `JSON.parse(data)`

#### `stateKey`

**Type:** `unknown`

**Value:** `this.getStateKey(state)`

#### `actionProbs`

**Type:** `unknown`

**Value:** `this.getActionProbabilities(stateKey`

#### `action`

**Type:** `unknown`

**Value:** `this.sampleAction(actionProbs`

#### `logProb`

**Type:** `unknown`

**Value:** `Math.log(actionProbs.get(action.action) || 0.001)`

#### `logProb`

**Type:** `unknown`

**Value:** `action.parameters?.logProb || 0`

#### `discountedRewards`

**Type:** `unknown`

**Value:** `this.calculateDiscountedRewards()`

#### `mean`

**Type:** `unknown`

**Value:** `discountedRewards.reduce((sum`

#### `std`

**Type:** `unknown`

**Value:** `Math.sqrt(`

#### `normalizedRewards`

**Type:** `unknown`

**Value:** `discountedRewards.map((r) => (r - mean) / (std + 1e-8))`

#### `experience`

**Type:** `unknown`

**Value:** `this.episodeHistory[i]!`

#### `advantage`

**Type:** `unknown`

**Value:** `normalizedRewards[i]!`

#### `rewards`

**Type:** `number[]`

**Value:** `[]`

#### `stateKey`

**Type:** `unknown`

**Value:** `this.getStateKey(state)`

#### `actionKey`

**Type:** `unknown`

**Value:** `action.action`

#### `statePolicy`

**Type:** `unknown`

**Value:** `this.policy.get(stateKey)!`

#### `currentLogit`

**Type:** `unknown`

**Value:** `statePolicy.get(actionKey) || 0`

#### `gradient`

**Type:** `unknown`

**Value:** `this.config.learningRate * advantage`

#### `probs`

**Type:** `unknown`

**Value:** `new Map<string`

#### `uniformProb`

**Type:** `unknown`

**Value:** `1.0 / availableActions.length`

#### `statePolicy`

**Type:** `unknown`

**Value:** `this.policy.get(stateKey)!`

#### `logits`

**Type:** `unknown`

**Value:** `availableActions.map((action) => statePolicy.get(action) || 0)`

#### `maxLogit`

**Type:** `unknown`

**Value:** `Math.max(...logits)`

#### `expLogits`

**Type:** `unknown`

**Value:** `logits.map((logit) => Math.exp(logit - maxLogit))`

#### `sumExp`

**Type:** `unknown`

**Value:** `expLogits.reduce((sum`

#### `action`

**Type:** `unknown`

**Value:** `availableActions[i]!`

#### `prob`

**Type:** `unknown`

**Value:** `expLogits[i]! / sumExp`

#### `random`

**Type:** `unknown`

**Value:** `Math.random()`

#### `batch`

**Type:** `Experience[]`

**Value:** `[]`

#### `indices`

**Type:** `unknown`

**Value:** `new Set<number>()`

#### `randomIndex`

**Type:** `unknown`

**Value:** `Math.floor(Math.random() * this.buffer.length)`

#### `components`

**Type:** `unknown`

**Value:** `{`

#### `weights`

**Type:** `unknown`

**Value:** `this.getContextWeights(context)`

#### `immediate`

**Type:** `unknown`

**Value:** `components.successRateImprovement * weights.success +`

#### `total`

**Type:** `unknown`

**Value:** `this.applyRewardFunction(immediate)`

#### `improvement`

**Type:** `unknown`

**Value:** `after.successRate - before.successRate`

#### `timeImprovement`

**Type:** `unknown`

**Value:** `(before.averageExecutionTime - after.averageExecutionTime) / before.averageExecutionTime`

#### `improvement`

**Type:** `unknown`

**Value:** `(after.userSatisfaction - before.userSatisfaction) / 10`

#### `reduction`

**Type:** `unknown`

**Value:** `before.complexityReduction - after.complexityReduction`

#### `baseWeights`

**Type:** `unknown`

**Value:** `{ success: 0.3`

#### `rewardResult`

**Type:** `unknown`

**Value:** `this.rewardCalculator.calculateReward(`

#### `reward`

**Type:** `unknown`

**Value:** `rewardResult.total`

#### `experience`

**Type:** `Experience`

**Value:** `{`

#### `batch`

**Type:** `unknown`

**Value:** `this.replayBuffer.sample(this.config.batchSize)`

#### `pgData`

**Type:** `unknown`

**Value:** `JSON.parse(models.pgModel)`

### Dependencies

- `zod`

---

## src\learning\similarity

**File:** `src\learning\similarity.ts`

### Functions

### Classes

### Types

- `overlap`

### Constants

#### `maxLength`

**Type:** `unknown`

**Value:** `Math.max(vector1.features.length`

#### `v1`

**Type:** `unknown`

**Value:** `this.padVector(vector1.features`

#### `v2`

**Type:** `unknown`

**Value:** `this.padVector(vector2.features`

#### `n`

**Type:** `unknown`

**Value:** `vectors.length`

#### `matrix`

**Type:** `number[][]`

**Value:** `Array(n)`

#### `vec1`

**Type:** `unknown`

**Value:** `vectors[i]`

#### `vec2`

**Type:** `unknown`

**Value:** `vectors[j]`

#### `similarity`

**Type:** `unknown`

**Value:** `this.calculateSimilarity(vec1`

#### `embedding1`

**Type:** `unknown`

**Value:** `await this.getEmbedding(pattern1)`

#### `embedding2`

**Type:** `unknown`

**Value:** `await this.getEmbedding(pattern2)`

#### `text`

**Type:** `unknown`

**Value:** ``${pattern.description} ${pattern.code || ''}`.trim()`

#### `cacheKey`

**Type:** `unknown`

**Value:** `this.hashText(text)`

#### `embedding`

**Type:** `unknown`

**Value:** `this.generateTextEmbedding(text)`

#### `words`

**Type:** `unknown`

**Value:** `text.toLowerCase().split(/\s+/)`

#### `features`

**Type:** `number[]`

**Value:** `[]`

#### `avgWordLength`

**Type:** `unknown`

**Value:** `words.reduce((sum`

#### `keywords`

**Type:** `unknown`

**Value:** `[`

#### `count`

**Type:** `unknown`

**Value:** `(text.match(new RegExp(keyword`

#### `patterns`

**Type:** `unknown`

**Value:** `[`

#### `count`

**Type:** `unknown`

**Value:** `(text.match(pattern) || []).length`

#### `char`

**Type:** `unknown`

**Value:** `text.charCodeAt(i)`

#### `successSim`

**Type:** `unknown`

**Value:** `1 - Math.abs(pattern1Metrics.successRate - pattern2Metrics.successRate)`

#### `improvementSim`

**Type:** `unknown`

**Value:** `1 - Math.abs(pattern1Metrics.avgImprovement - pattern2Metrics.avgImprovement)`

#### `complexitySim`

**Type:** `unknown`

**Value:** `1 - Math.abs(pattern1Metrics.complexity - pattern2Metrics.complexity) / 100`

#### `maxFreq`

**Type:** `unknown`

**Value:** `Math.max(pattern1Usage.frequency`

#### `freqSim`

**Type:** `unknown`

**Value:** `maxFreq > 0 ? 1 - Math.abs(pattern1Usage.frequency - pattern2Usage.frequency) / maxFreq : 1`

#### `contexts1`

**Type:** `unknown`

**Value:** `new Set(pattern1Usage.contexts)`

#### `contexts2`

**Type:** `unknown`

**Value:** `new Set(pattern2Usage.contexts)`

#### `intersection`

**Type:** `unknown`

**Value:** `new Set([...contexts1].filter((x) => contexts2.has(x)))`

#### `union`

**Type:** `unknown`

**Value:** `new Set([...contexts1`

#### `contextSim`

**Type:** `unknown`

**Value:** `union.size > 0 ? intersection.size / union.size : 1`

#### `outcomeSim`

**Type:** `unknown`

**Value:** `this.calculateOutcomeCorrelation(`

#### `minLength`

**Type:** `unknown`

**Value:** `Math.min(outcomes1.length`

#### `o1`

**Type:** `unknown`

**Value:** `outcomes1.slice(0`

#### `o2`

**Type:** `unknown`

**Value:** `outcomes2.slice(0`

#### `mean1`

**Type:** `unknown`

**Value:** `o1.reduce((sum`

#### `mean2`

**Type:** `unknown`

**Value:** `o2.reduce((sum`

#### `diff1`

**Type:** `unknown`

**Value:** `(o1[i] ?? 0) - mean1`

#### `diff2`

**Type:** `unknown`

**Value:** `(o2[i] ?? 0) - mean2`

#### `denominator`

**Type:** `unknown`

**Value:** `Math.sqrt(sum1Sq * sum2Sq)`

#### `patternSim`

**Type:** `unknown`

**Value:** `this.calculateStringEditDistance(pattern1.astPattern`

#### `nodeTypeSim`

**Type:** `unknown`

**Value:** `this.calculateNodeTypeOverlap(pattern1.nodeTypes`

#### `complexitySim`

**Type:** `unknown`

**Value:** `this.calculateComplexitySimilarity(`

#### `maxLength`

**Type:** `unknown`

**Value:** `Math.max(str1.length`

#### `distance`

**Type:** `unknown`

**Value:** `this.levenshteinDistance(str1`

#### `matrix`

**Type:** `number[][]`

**Value:** `[]`

#### `set1`

**Type:** `unknown`

**Value:** `new Set(types1)`

#### `set2`

**Type:** `unknown`

**Value:** `new Set(types2)`

#### `intersection`

**Type:** `unknown`

**Value:** `new Set([...set1].filter((x) => set2.has(x)))`

#### `union`

**Type:** `unknown`

**Value:** `new Set([...set1`

#### `complexity1`

**Type:** `unknown`

**Value:** `this.calculatePatternComplexity(pattern1)`

#### `complexity2`

**Type:** `unknown`

**Value:** `this.calculatePatternComplexity(pattern2)`

#### `maxComplexity`

**Type:** `unknown`

**Value:** `Math.max(complexity1`

#### `variables`

**Type:** `unknown`

**Value:** `(pattern.match(/\$\w+/g) || []).length`

#### `wildcards`

**Type:** `unknown`

**Value:** `(pattern.match(/\$\$\$/g) || []).length`

#### `brackets`

**Type:** `unknown`

**Value:** `(pattern.match(/[{}()[\]]/g) || []).length`

#### `operators`

**Type:** `unknown`

**Value:** `(pattern.match(/[+\-*/%=<>!&|]/g) || []).length`

#### `cacheKey`

**Type:** `unknown`

**Value:** `this.generateCacheKey(pattern1`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `metrics`

**Type:** `SimilarityMetrics`

**Value:** `{`

#### `weights`

**Type:** `unknown`

**Value:** `this.config.weights || {}`

#### `overallSimilarity`

**Type:** `unknown`

**Value:** `metrics.cosine * (weights.cosine || 0.3) +`

#### `result`

**Type:** `SimilarityResult`

**Value:** `{`

#### `threshold`

**Type:** `unknown`

**Value:** `options.threshold || this.config.threshold || 0.7`

#### `limit`

**Type:** `unknown`

**Value:** `options.limit || 10`

#### `similarities`

**Type:** `Array<{ pattern: any; similarity: SimilarityResult }>`

**Value:** `[]`

#### `similarity`

**Type:** `unknown`

**Value:** `await this.calculateSimilarity(targetPattern`

#### `n`

**Type:** `unknown`

**Value:** `patterns.length`

#### `matrix`

**Type:** `number[][]`

**Value:** `Array(n)`

#### `pattern1`

**Type:** `unknown`

**Value:** `patterns[i]`

#### `pattern2`

**Type:** `unknown`

**Value:** `patterns[j]`

#### `result`

**Type:** `unknown`

**Value:** `await this.calculateSimilarity(pattern1`

#### `values`

**Type:** `unknown`

**Value:** `[metrics.cosine`

#### `validValues`

**Type:** `unknown`

**Value:** `values.filter((v) => v > 0)`

#### `mean`

**Type:** `unknown`

**Value:** `validValues.reduce((sum`

#### `variance`

**Type:** `unknown`

**Value:** `validValues.reduce((sum`

#### `stdDev`

**Type:** `unknown`

**Value:** `Math.sqrt(variance)`

#### `id1`

**Type:** `unknown`

**Value:** `pattern1.id || JSON.stringify(pattern1).slice(0`

#### `id2`

**Type:** `unknown`

**Value:** `pattern2.id || JSON.stringify(pattern2).slice(0`

#### `maxSize`

**Type:** `unknown`

**Value:** `this.config.maxCacheSize || 1000`

#### `firstKey`

**Type:** `unknown`

**Value:** `this.similarityCache.keys().next().value`

### Dependencies

- `zod`
- `./types.ts`

---

## src\learning\statistics

Statistical Analysis Tools for Pattern Metrics

This module provides real statistical algorithms for analyzing pattern effectiveness,
performance metrics, and learning insights in the Carmack Coder system.

**File:** `src\learning\statistics.ts`

### Functions

### Classes

#### `StatisticalAnalyzer`

Core Statistical Functions

#### `PatternStatistics`

Pattern-specific statistical analysis

### Constants

#### `sorted`

**Type:** `unknown`

**Value:** `[...data].sort((a`

#### `n`

**Type:** `unknown`

**Value:** `data.length`

#### `mean`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateMean(data)`

#### `median`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateMedian(sorted)`

#### `mode`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateMode(data)`

#### `variance`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateVariance(data`

#### `standardDeviation`

**Type:** `unknown`

**Value:** `Math.sqrt(variance)`

#### `min`

**Type:** `unknown`

**Value:** `sorted[0] ?? 0`

#### `max`

**Type:** `unknown`

**Value:** `sorted[n - 1] ?? 0`

#### `range`

**Type:** `unknown`

**Value:** `max - min`

#### `quartiles`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateQuartiles(sorted)`

#### `skewness`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateSkewness(data`

#### `kurtosis`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateKurtosis(data`

#### `outliers`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.detectOutliers(data`

#### `n`

**Type:** `unknown`

**Value:** `sortedData.length`

#### `frequency`

**Type:** `unknown`

**Value:** `new Map<number`

#### `maxFreq`

**Type:** `unknown`

**Value:** `Math.max(...frequency.values())`

#### `avg`

**Type:** `unknown`

**Value:** `mean ?? StatisticalAnalyzer.calculateMean(data)`

#### `squaredDiffs`

**Type:** `unknown`

**Value:** `data.map((value) => (value - avg) ** 2)`

#### `n`

**Type:** `unknown`

**Value:** `sortedData.length`

#### `q1Index`

**Type:** `unknown`

**Value:** `Math.floor(n * 0.25)`

#### `q2Index`

**Type:** `unknown`

**Value:** `Math.floor(n * 0.5)`

#### `q3Index`

**Type:** `unknown`

**Value:** `Math.floor(n * 0.75)`

#### `q1`

**Type:** `unknown`

**Value:** `sortedData[q1Index] ?? 0`

#### `q2`

**Type:** `unknown`

**Value:** `sortedData[q2Index] ?? 0`

#### `q3`

**Type:** `unknown`

**Value:** `sortedData[q3Index] ?? 0`

#### `iqr`

**Type:** `unknown`

**Value:** `q3 - q1`

#### `n`

**Type:** `unknown`

**Value:** `data.length`

#### `skewSum`

**Type:** `unknown`

**Value:** `data.reduce((sum`

#### `n`

**Type:** `unknown`

**Value:** `data.length`

#### `kurtSum`

**Type:** `unknown`

**Value:** `data.reduce((sum`

#### `kurtosis`

**Type:** `unknown`

**Value:** `((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurtSum`

#### `correction`

**Type:** `unknown`

**Value:** `(3 * (n - 1) ** 2) / ((n - 2) * (n - 3))`

#### `lowerBound`

**Type:** `unknown`

**Value:** `q1 - 1.5 * iqr`

#### `upperBound`

**Type:** `unknown`

**Value:** `q3 + 1.5 * iqr`

#### `n`

**Type:** `unknown`

**Value:** `x.length`

#### `pearsonCorrelation`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculatePearsonCorrelation(x`

#### `spearmanCorrelation`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateSpearmanCorrelation(x`

#### `kendallTau`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateKendallTau(x`

#### `significance`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateCorrelationSignificance(`

#### `confidenceInterval`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateCorrelationConfidenceInterval(`

#### `n`

**Type:** `unknown`

**Value:** `x.length`

#### `meanX`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateMean(x)`

#### `meanY`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateMean(y)`

#### `deltaX`

**Type:** `unknown`

**Value:** `(x[i] ?? 0) - meanX`

#### `deltaY`

**Type:** `unknown`

**Value:** `(y[i] ?? 0) - meanY`

#### `denominator`

**Type:** `unknown`

**Value:** `Math.sqrt(sumXSquared * sumYSquared)`

#### `ranksX`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateRanks(x)`

#### `ranksY`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateRanks(y)`

#### `indexed`

**Type:** `unknown`

**Value:** `data.map((value`

#### `ranks`

**Type:** `unknown`

**Value:** `new Array(data.length)`

#### `item`

**Type:** `unknown`

**Value:** `indexed[i]`

#### `n`

**Type:** `unknown`

**Value:** `x.length`

#### `signX`

**Type:** `unknown`

**Value:** `Math.sign((x[j] ?? 0) - (x[i] ?? 0))`

#### `signY`

**Type:** `unknown`

**Value:** `Math.sign((y[j] ?? 0) - (y[i] ?? 0))`

#### `totalPairs`

**Type:** `unknown`

**Value:** `(n * (n - 1)) / 2`

#### `t`

**Type:** `unknown`

**Value:** `correlation * Math.sqrt((n - 2) / (1 - correlation * correlation))`

#### `df`

**Type:** `unknown`

**Value:** `n - 2`

#### `z`

**Type:** `unknown`

**Value:** `0.5 * Math.log((1 + correlation) / (1 - correlation))`

#### `se`

**Type:** `unknown`

**Value:** `1 / Math.sqrt(n - 3)`

#### `zCritical`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.getZCritical(confidence)`

#### `zLower`

**Type:** `unknown`

**Value:** `z - zCritical * se`

#### `zUpper`

**Type:** `unknown`

**Value:** `z + zCritical * se`

#### `lower`

**Type:** `unknown`

**Value:** `(Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1)`

#### `upper`

**Type:** `unknown`

**Value:** `(Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1)`

#### `n`

**Type:** `unknown`

**Value:** `data.length`

#### `x`

**Type:** `unknown`

**Value:** `timePoints || Array.from({ length: n }`

#### `trend`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.determineTrend(slope`

#### `forecastSteps`

**Type:** `unknown`

**Value:** `Math.min(5`

#### `forecast`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.generateForecast(x`

#### `seasonality`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.detectSeasonality(data)`

#### `n`

**Type:** `unknown`

**Value:** `x.length`

#### `meanX`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateMean(x)`

#### `meanY`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateMean(y)`

#### `deltaX`

**Type:** `unknown`

**Value:** `(x[i] ?? 0) - meanX`

#### `deltaY`

**Type:** `unknown`

**Value:** `(y[i] ?? 0) - meanY`

#### `slope`

**Type:** `unknown`

**Value:** `denominator === 0 ? 0 : numerator / denominator`

#### `intercept`

**Type:** `unknown`

**Value:** `meanY - slope * meanX`

#### `predicted`

**Type:** `unknown`

**Value:** `slope * (x[i] ?? 0) + intercept`

#### `rSquared`

**Type:** `unknown`

**Value:** `ssTot === 0 ? 1 : 1 - ssRes / ssTot`

#### `slopeThreshold`

**Type:** `unknown`

**Value:** `0.01`

#### `rSquaredThreshold`

**Type:** `unknown`

**Value:** `0.3`

#### `lastX`

**Type:** `unknown`

**Value:** `x[x.length - 1] ?? 0`

#### `meanY`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateMean(y)`

#### `meanX`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateMean(x)`

#### `intercept`

**Type:** `unknown`

**Value:** `meanY - slope * meanX`

#### `forecast`

**Type:** `number[]`

**Value:** `[]`

#### `futureX`

**Type:** `unknown`

**Value:** `lastX + i`

#### `futureY`

**Type:** `unknown`

**Value:** `slope * futureX + intercept`

#### `n`

**Type:** `unknown`

**Value:** `data.length`

#### `maxLag`

**Type:** `unknown`

**Value:** `Math.min(Math.floor(n / 3)`

#### `correlation`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateAutocorrelation(data`

#### `threshold`

**Type:** `unknown`

**Value:** `0.3`

#### `n`

**Type:** `unknown`

**Value:** `data.length`

#### `x`

**Type:** `unknown`

**Value:** `data.slice(0`

#### `y`

**Type:** `unknown`

**Value:** `data.slice(lag)`

#### `x`

**Type:** `unknown`

**Value:** `df / (df + t * t)`

#### `zValues`

**Type:** `Record<number, number>`

**Value:** `{`

#### `successRates`

**Type:** `unknown`

**Value:** `metrics.map((m) => m.successRate)`

#### `performances`

**Type:** `unknown`

**Value:** `metrics.map((m) => m.averageExecutionTime)`

#### `complexityReductions`

**Type:** `unknown`

**Value:** `metrics.map((m) => m.complexityReduction)`

#### `userSatisfactions`

**Type:** `unknown`

**Value:** `metrics.map((m) => m.userSatisfaction)`

#### `summary`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateSummary(successRates)`

#### `successRateVsPerformance`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateCorrelation(`

#### `complexityVsEffectiveness`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateCorrelation(`

#### `insights`

**Type:** `unknown`

**Value:** `PatternStatistics.generateEffectivenessInsights(`

#### `insights`

**Type:** `string[]`

**Value:** `[]`

#### `recentMetrics`

**Type:** `unknown`

**Value:** `metrics`

#### `recentSuccessRates`

**Type:** `unknown`

**Value:** `recentMetrics.map((m) => m.successRate)`

#### `trend`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.analyzeTrend(recentSuccessRates)`

#### `dimensionality`

**Type:** `unknown`

**Value:** `patterns[0]?.features.length ?? 0`

#### `featureStatistics`

**Type:** `StatisticalSummary[]`

**Value:** `[]`

#### `featureValues`

**Type:** `unknown`

**Value:** `patterns.map((p) => p.features[dim] ?? 0)`

#### `principalComponents`

**Type:** `unknown`

**Value:** `PatternStatistics.approximatePCA(patterns)`

#### `insights`

**Type:** `unknown`

**Value:** `PatternStatistics.generateFeatureInsights(`

#### `features`

**Type:** `unknown`

**Value:** `patterns.map((p) => p.features)`

#### `dimensionality`

**Type:** `unknown`

**Value:** `features[0]?.length ?? 0`

#### `explained_variance`

**Type:** `number[]`

**Value:** `[]`

#### `values`

**Type:** `unknown`

**Value:** `features.map((f) => f[dim] ?? 0)`

#### `variance`

**Type:** `unknown`

**Value:** `StatisticalAnalyzer.calculateVariance(values)`

#### `totalVariance`

**Type:** `unknown`

**Value:** `explained_variance.reduce((sum`

#### `normalizedVariance`

**Type:** `unknown`

**Value:** `explained_variance.map((v) =>`

#### `cumulative_variance`

**Type:** `number[]`

**Value:** `[]`

#### `insights`

**Type:** `string[]`

**Value:** `[]`

#### `effectiveDimensions`

**Type:** `unknown`

**Value:** `pca.cumulative_variance.findIndex((cv) => cv >= 0.95) + 1`

#### `highVarianceFeatures`

**Type:** `unknown`

**Value:** `featureStats`

#### `skewedFeatures`

**Type:** `unknown`

**Value:** `featureStats.filter((stat) => Math.abs(stat.skewness) > 1).length`

---

## src\learning\types

Machine Learning Types for Pattern Learning System

**File:** `src\learning\types.ts`

### Functions

#### `VectorSchema()`

Machine Learning Types for Pattern Learning System

**Tags:** `exported`

#### `PatternFeatureVectorSchema()`

**Tags:** `exported`

#### `ClusterResultSchema()`

**Tags:** `exported`

#### `PatternSimilaritySchema()`

**Tags:** `exported`

#### `EffectivenessMetricsSchema()`

**Tags:** `exported`

#### `RLStateSchema()`

**Tags:** `exported`

#### `RLActionSchema()`

**Tags:** `exported`

#### `RLRewardSchema()`

**Tags:** `exported`

#### `NLPAnalysisSchema()`

**Tags:** `exported`

#### `PatternRecommendationSchema()`

**Tags:** `exported`

#### `LearningConfigSchema()`

**Tags:** `exported`

#### `TrainingDataSchema()`

**Tags:** `exported`

#### `ModelPerformanceSchema()`

**Tags:** `exported`

#### `SimilarityMetricsSchema()`

**Tags:** `exported`

#### `SimilarityResultSchema()`

**Tags:** `exported`

#### `PatternSimilarityConfigSchema()`

**Tags:** `exported`

#### `ClusteringConfigSchema()`

**Tags:** `exported`

### Classes

#### `VectorUtils`

### Types

- `Vector`
- `PatternFeatureVector`
- `ClusterResult`
- `PatternSimilarity`
- `EffectivenessMetrics`
- `RLState`
- `RLAction`
- `RLReward`
- `NLPAnalysis`
- `PatternRecommendation`
- `LearningConfig`
- `TrainingData`
- `ModelPerformance`
- `SimilarityMetrics`
- `SimilarityResult`
- `PatternSimilarityConfig`
- `ClusteringConfig`

### Constants

#### `VectorSchema`

**Type:** `unknown`

**Value:** `z.array(z.number())`

#### `PatternFeatureVectorSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ClusterResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternSimilaritySchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `EffectivenessMetricsSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `RLStateSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `RLActionSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `RLRewardSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `NLPAnalysisSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternRecommendationSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LearningConfigSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TrainingDataSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ModelPerformanceSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `SimilarityMetricsSchema`

**Type:** `unknown`

**Value:** `z`

#### `SimilarityResultSchema`

**Type:** `unknown`

**Value:** `z`

#### `PatternSimilarityConfigSchema`

**Type:** `unknown`

**Value:** `z`

#### `ClusteringConfigSchema`

**Type:** `unknown`

**Value:** `z`

#### `dotProduct`

**Type:** `unknown`

**Value:** `a.reduce((sum`

#### `magnitudeA`

**Type:** `unknown`

**Value:** `Math.sqrt(a.reduce((sum`

#### `magnitudeB`

**Type:** `unknown`

**Value:** `Math.sqrt(b.reduce((sum`

#### `magnitude`

**Type:** `unknown`

**Value:** `Math.sqrt(vector.reduce((sum`

#### `dimensions`

**Type:** `unknown`

**Value:** `vectors[0]?.length ?? 0`

#### `centroid`

**Type:** `unknown`

**Value:** `new Array(dimensions).fill(0)`

### Dependencies

- `zod`

---

## src\llm-annotation\analyzer

**File:** `src\llm-annotation\analyzer.ts`

### Functions

### Types

- `safety`
- `safety`

### Constants

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `validatedRequest`

**Type:** `unknown`

**Value:** `AnnotationRequestSchema.parse(request)`

#### `context`

**Type:** `unknown`

**Value:** `await this.analyzeCodeContext(validatedRequest)`

#### `patterns`

**Type:** `unknown`

**Value:** `await this.detectPatterns(validatedRequest)`

#### `architecture`

**Type:** `unknown`

**Value:** `await this.analyzeArchitecture(validatedRequest)`

#### `opportunities`

**Type:** `unknown`

**Value:** `await this.identifyOpportunities(`

#### `summary`

**Type:** `unknown`

**Value:** `this.generateSummary(context`

#### `llmPrompts`

**Type:** `unknown`

**Value:** `this.generateLLMPrompts(context`

#### `annotation`

**Type:** `LLMAnnotation`

**Value:** `{`

#### `validatedAnnotation`

**Type:** `unknown`

**Value:** `LLMAnnotationSchema.parse(annotation)`

#### `dependencies`

**Type:** `unknown`

**Value:** `new Set<string>()`

#### `exports`

**Type:** `unknown`

**Value:** `new Set<string>()`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `ext`

**Type:** `unknown`

**Value:** `extname(filePath)`

#### `languagePatterns`

**Type:** `unknown`

**Value:** `this.getLanguagePatterns(detectedLanguage)`

#### `importMatches`

**Type:** `unknown`

**Value:** `content.match(new RegExp(importPattern`

#### `extracted`

**Type:** `unknown`

**Value:** `this.extractDependencyFromMatch(match`

#### `exportMatches`

**Type:** `unknown`

**Value:** `content.match(new RegExp(exportPattern`

#### `extracted`

**Type:** `unknown`

**Value:** `this.extractExportFromMatch(match`

#### `complexityIndicators`

**Type:** `unknown`

**Value:** `languagePatterns.complexity`

#### `matches`

**Type:** `unknown`

**Value:** `content.match(new RegExp(pattern`

#### `framework`

**Type:** `unknown`

**Value:** `this.detectFramework(Array.from(dependencies)`

#### `purpose`

**Type:** `unknown`

**Value:** `this.inferPurpose(`

#### `patterns`

**Type:** `PatternAnnotation[]`

**Value:** `[]`

#### `detectedLanguage`

**Type:** `unknown`

**Value:** `this.detectLanguageFromExtension(`

#### `patternDefinitions`

**Type:** `unknown`

**Value:** `this.getPatternDefinitions(detectedLanguage)`

#### `matches`

**Type:** `unknown`

**Value:** `await this.astAnalyzer?.findPatternUsage(patternDef.astPattern`

#### `commonPatterns`

**Type:** `unknown`

**Value:** `[`

#### `architecture`

**Type:** `ArchitecturalAnnotation[]`

**Value:** `[]`

#### `moduleDoc`

**Type:** `unknown`

**Value:** `await this.astAnalyzer?.analyzeFile(filePath)`

#### `componentType`

**Type:** `unknown`

**Value:** `moduleDoc.exports.classes.length > 0`

#### `opportunities`

**Type:** `TransformationOpportunity[]`

**Value:** `[]`

#### `antiPatterns`

**Type:** `unknown`

**Value:** `patterns.filter((p) => p.type === 'anti-pattern')`

#### `highComplexityComponents`

**Type:** `unknown`

**Value:** `architecture.filter((a) => a.qualityMetrics.complexity > 10)`

#### `languageMap`

**Type:** `Record<string, string>`

**Value:** `{`

#### `patterns`

**Type:** `Record<string, { imports: string[]; exports: string[]; complexity: string[] }>`

**Value:** `{`

#### `pythonMatch`

**Type:** `unknown`

**Value:** `match.match(/(?:import|from)\s+([\w.]+)/)`

#### `cppMatch`

**Type:** `unknown`

**Value:** `match.match(/#include\s*[<"]([^>"]+)[>"]/)`

#### `jsMatch`

**Type:** `unknown`

**Value:** `match.match(/(?:from|require\s*\(\s*)['"]([^'"]+)['"]/)`

#### `javaMatch`

**Type:** `unknown`

**Value:** `match.match(/import\s+([\w.]+)/)`

#### `pythonMatch`

**Type:** `unknown`

**Value:** `match.match(/(?:def|class)\s+(\w+)/)`

#### `cppMatch`

**Type:** `unknown`

**Value:** `match.match(/(?:class|struct|__global__|__device__)\s+\w*\s*(\w+)/)`

#### `jsMatch`

**Type:** `unknown`

**Value:** `match.match(/(?:export\s+)?(?:function|class|const|let|var)\s+(\w+)/)`

#### `javaMatch`

**Type:** `unknown`

**Value:** `match.match(/(?:class|interface|enum)\s+(\w+)/)`

#### `responsibilities`

**Type:** `string[]`

**Value:** `[]`

#### `totalExports`

**Type:** `unknown`

**Value:** `moduleDoc.exports.functions.length + moduleDoc.exports.classes.length`

#### `pureFunctionCount`

**Type:** `unknown`

**Value:** `moduleDoc.exports.functions.filter(`

#### `totalFunctions`

**Type:** `unknown`

**Value:** `moduleDoc.exports.functions.length`

#### `principles`

**Type:** `string[]`

**Value:** `[]`

#### `violations`

**Type:** `string[]`

**Value:** `[]`

#### `antiPatterns`

**Type:** `unknown`

**Value:** `patterns.filter((p) => p.type === 'anti-pattern')`

#### `designPatterns`

**Type:** `unknown`

**Value:** `patterns.filter((p) => p.type === 'design')`

#### `highRiskOpportunities`

**Type:** `unknown`

**Value:** `opportunities.filter((o) => o.risk === 'high')`

#### `avgPatternConfidence`

**Type:** `unknown`

**Value:** `patterns.reduce((sum`

#### `architectureBonus`

**Type:** `unknown`

**Value:** `Math.min(0.2`

#### `outputDir`

**Type:** `unknown`

**Value:** `request.targetDirectory || './output/annotations'`

#### `filename`

**Type:** `unknown`

**Value:** ``annotation-${annotation.id}.${request.outputFormat}``

#### `outputPath`

**Type:** `unknown`

**Value:** `join(outputDir`

#### `yamlData`

**Type:** `unknown`

**Value:** `{`

#### `llmAnnotationActor`

**Type:** `unknown`

**Value:** `fromPromise(async ({ input }: { input: AnnotationRequest }) => {`

#### `analyzer`

**Type:** `unknown`

**Value:** `new LLMAnnotationAnalyzer()`

#### `generateLLMAnnotations`

**Type:** `unknown`

**Value:** `async (`

#### `analyzer`

**Type:** `unknown`

**Value:** `new LLMAnnotationAnalyzer()`

#### `validateAnnotationRequest`

**Type:** `unknown`

**Value:** `(data: unknown): AnnotationRequest => {`

### Dependencies

- `js-yaml`
- `xstate`
- `./types.js`

---

## src\llm-annotation\index

**File:** `src\llm-annotation\index.ts`

### Functions

#### `llmAnnotationSystemActor()`

**Tags:** `exported`

#### `createLLMAnnotations()`

**Tags:** `exported`

#### `annotateDirectory()`

**Tags:** `async` `exported`

#### `annotateProject()`

**Tags:** `async` `exported`

### Classes

#### `LLMAnnotationSystem`

and transformation opportunities.
that help language models understand code structure, patterns,
Main interface for generating LLM-optimized code annotations

LLM Annotation System

### Constants

#### `sourceFiles`

**Type:** `string[]`

**Value:** `[]`

#### `scanDirectory`

**Type:** `unknown`

**Value:** `async (dirPath: string): Promise<void> => {`

#### `entries`

**Type:** `unknown`

**Value:** `await readdir(dirPath)`

#### `fullPath`

**Type:** `unknown`

**Value:** `join(dirPath`

#### `stats`

**Type:** `unknown`

**Value:** `await stat(fullPath)`

#### `ext`

**Type:** `unknown`

**Value:** `extname(fullPath)`

#### `request`

**Type:** `AnnotationRequest`

**Value:** `{`

#### `impactOrder`

**Type:** `unknown`

**Value:** `{ critical: 4`

#### `effortOrder`

**Type:** `unknown`

**Value:** `{ trivial: 1`

#### `aScore`

**Type:** `unknown`

**Value:** `(impactOrder[a.risk as keyof typeof impactOrder] || 0) /`

#### `bScore`

**Type:** `unknown`

**Value:** `(impactOrder[b.risk as keyof typeof impactOrder] || 0) /`

#### `opportunities`

**Type:** `unknown`

**Value:** `this.getOpportunities(annotation)`

#### `topOpportunities`

**Type:** `unknown`

**Value:** `opportunities.slice(0`

#### `llmAnnotationSystemActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `system`

**Type:** `unknown`

**Value:** `new LLMAnnotationSystem()`

#### `createLLMAnnotations`

**Type:** `unknown`

**Value:** `async (`

#### `system`

**Type:** `unknown`

**Value:** `new LLMAnnotationSystem()`

#### `annotateDirectory`

**Type:** `unknown`

**Value:** `async (`

#### `system`

**Type:** `unknown`

**Value:** `new LLMAnnotationSystem()`

#### `annotateProject`

**Type:** `unknown`

**Value:** `async (`

#### `system`

**Type:** `unknown`

**Value:** `new LLMAnnotationSystem()`

### Dependencies

- `xstate`
- `./analyzer.js`
- `./types.js`

---

## src\llm-annotation\types

**File:** `src\llm-annotation\types.ts`

### Functions

#### `CodeContextSchema()`

**Tags:** `exported`

#### `PatternAnnotationSchema()`

**Tags:** `exported`

#### `ArchitecturalAnnotationSchema()`

**Tags:** `exported`

#### `TransformationOpportunitySchema()`

**Tags:** `exported`

#### `LLMAnnotationSchema()`

**Tags:** `exported`

#### `AnnotationRequestSchema()`

**Tags:** `exported`

#### `AnnotationResultSchema()`

**Tags:** `exported`

#### `validateAnnotationRequest()`

**Tags:** `exported`

#### `validateAnnotationResult()`

**Tags:** `exported`

### Types

- `CodeContext`
- `PatternAnnotation`
- `ArchitecturalAnnotation`
- `TransformationOpportunity`
- `LLMAnnotation`
- `AnnotationRequest`
- `AnnotationResult`

### Constants

#### `CodeContextSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternAnnotationSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ArchitecturalAnnotationSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TransformationOpportunitySchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LLMAnnotationSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `AnnotationRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `AnnotationResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `validateAnnotationRequest`

**Type:** `unknown`

**Value:** `(data: unknown): AnnotationRequest => {`

#### `validateAnnotationResult`

**Type:** `unknown`

**Value:** `(data: unknown): AnnotationResult => {`

### Dependencies

- `zod`

---

## src\machine

**File:** `src\machine.ts`

### Functions

#### `carmackCoderMachine()`

**Tags:** `exported`

### Types

- `TemplatePattern`
- `safety`

### Constants

#### `_carmackCoderMachine`

**Type:** `unknown`

**Value:** `setup({`

#### `complexity`

**Type:** `unknown`

**Value:** `context.currentTransformation?.complexity`

#### `validation`

**Type:** `unknown`

**Value:** `context.currentTransformation?.validation`

#### `validation`

**Type:** `unknown`

**Value:** `context.currentTransformation?.validation`

#### `newTransformation`

**Type:** `unknown`

**Value:** `{`

#### `analysisResult`

**Type:** `AnalysisResult`

**Value:** `{`

#### `complexity`

**Type:** `unknown`

**Value:** `context.currentTransformation?.complexity`

#### `mode`

**Type:** `unknown`

**Value:** `context.currentTransformation?.mode`

#### `mode`

**Type:** `unknown`

**Value:** `context.currentTransformation?.mode`

#### `transformationResult`

**Type:** `unknown`

**Value:** `event.output as {`

#### `transformationResult`

**Type:** `unknown`

**Value:** `event.output as {`

#### `carmackCoderMachine`

**Type:** `unknown`

**Value:** `_carmackCoderMachine as any`

### Dependencies

- `xstate`
- `./actors/analysis.ts`
- `./actors/ast-grep-transformation.ts`
- `./actors/complexity.ts`
- `./actors/dafny.ts`
- `./actors/feedback-loop.ts`
- `./actors/git.ts`
- `./actors/llm-testing-framework.ts`
- `./actors/llm-transformation-enhanced.ts`
- `./actors/pattern-discovery.ts`
- `./actors/pattern-learning.ts`
- `./actors/template-engine.ts`
- `./actors/transformation.ts`
- `./actors/transformation-enhanced.ts`
- `./actors/validation.ts`
- `./types.ts`

---

## src\pipeline\production-pipeline

**File:** `src\pipeline\production-pipeline.ts`

### Functions

### Types

- `ActorLogic`
- `ProductionConfig`
- `PipelineRequest`
- `ProductionPipelineRequest`
- `EnhancedPipelineResult`
- `ProductionPipelineResult`
- `as`
- `errors`

### Constants

#### `actor`

**Type:** `unknown`

**Value:** `createActor(actorLogic`

#### `subscription`

**Type:** `unknown`

**Value:** `actor.subscribe((state) => {`

#### `timeout`

**Type:** `unknown`

**Value:** `setTimeout(() => {`

#### `ProductionConfigSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PipelineRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ProductionPipelineRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `EnhancedPipelineResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ProductionPipelineResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `productionPipelineActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `transformationId`

**Type:** `unknown`

**Value:** ``transform_${Date.now()}_${Math.random().toString(36).substr(2`

#### `validatedInput`

**Type:** `unknown`

**Value:** `PipelineRequestSchema.parse(input)`

#### `enhancedRequest`

**Type:** `ProductionPipelineRequest`

**Value:** `{`

#### `orchestratorResult`

**Type:** `unknown`

**Value:** `await invokeActor<EnhancedPipelineResult>(`

#### `pipelineState`

**Type:** `unknown`

**Value:** `{`

#### `result`

**Type:** `unknown`

**Value:** `await executePipelineStages(validatedInput`

#### `stages`

**Type:** `unknown`

**Value:** `[`

#### `stageStart`

**Type:** `unknown`

**Value:** `Date.now()`

#### `elapsed`

**Type:** `unknown`

**Value:** `Date.now() - stageStart`

#### `elapsed`

**Type:** `unknown`

**Value:** `Date.now() - stageStart`

#### `errorInfo`

**Type:** `unknown`

**Value:** `{`

#### `postprocessingStage`

**Type:** `unknown`

**Value:** `stages.find((s) => s.name === 'postprocessing')`

#### `postStageStart`

**Type:** `unknown`

**Value:** `Date.now()`

#### `elapsed`

**Type:** `unknown`

**Value:** `Date.now() - postStageStart`

#### `elapsed`

**Type:** `unknown`

**Value:** `Date.now() - postStageStart`

#### `discoveryResult`

**Type:** `unknown`

**Value:** `await invokeActor<PatternDiscoveryResult>(patternDiscoveryActor`

#### `learningResult`

**Type:** `unknown`

**Value:** `await invokeActor<PatternLearningResult>(patternLearningActor`

#### `transformationOrder`

**Type:** `unknown`

**Value:** `transformationRequest.transformationType === 'auto'`

#### `cumulativeFilesModified`

**Type:** `unknown`

**Value:** `new Set<string>()`

#### `result`

**Type:** `unknown`

**Value:** `await executeTransformation(transformationType`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `templatePatterns`

**Type:** `unknown`

**Value:** `await getDefaultTemplatePatterns()`

#### `templateResult`

**Type:** `unknown`

**Value:** `await invokeActor<TemplateEngineResult>(templateEngineActor`

#### `astPatterns`

**Type:** `unknown`

**Value:** `await getDefaultASTPatterns()`

#### `astResult`

**Type:** `unknown`

**Value:** `await invokeActor<AstGrepResult>(astGrepTransformationActor`

#### `llmResult`

**Type:** `unknown`

**Value:** `await invokeActor<LLMTransformationResult>(llmTransformationActor`

#### `validationTasks`

**Type:** `Promise<ValidationActorResult>[]`

**Value:** `[]`

#### `maxComplexityIncrease`

**Type:** `unknown`

**Value:** `input.config.quality.maxComplexityIncrease`

#### `baselineComplexity`

**Type:** `unknown`

**Value:** `5`

#### `complexityIncrease`

**Type:** `unknown`

**Value:** `(complexityMetrics.cyclomaticComplexity - baselineComplexity) / baselineComplexity`

#### `validationResults`

**Type:** `unknown`

**Value:** `await Promise.all(validationTasks)`

#### `testResult`

**Type:** `unknown`

**Value:** `await invokeActor<LLMTestingResult>(llmTestingFrameworkActor`

#### `automaticScore`

**Type:** `unknown`

**Value:** `calculateAutomaticScore(state)`

#### `feedbackData`

**Type:** `unknown`

**Value:** `{`

#### `feedbackResult`

**Type:** `unknown`

**Value:** `await invokeActor<FeedbackLoopResult>(feedbackLoopActor`

#### `minProcessingTime`

**Type:** `unknown`

**Value:** `2`

#### `backupDir`

**Type:** `unknown`

**Value:** `join(process.cwd()`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `backupPath`

**Type:** `unknown`

**Value:** `join(backupDir`

#### `errorReduction`

**Type:** `unknown`

**Value:** `(state.validationResults?.typeErrors || 0) === 0 ? 0.2 : -0.1`

#### `testSuccess`

**Type:** `unknown`

**Value:** `(state.testResults?.passed || 0) > 0 ? 0.1 : -0.1`

#### `report`

**Type:** `unknown`

**Value:** `{`

#### `reportPath`

**Type:** `unknown`

**Value:** `join(process.cwd()`

#### `recommendations`

**Type:** `string[]`

**Value:** `[]`

#### `patternsContent`

**Type:** `unknown`

**Value:** `await readFile(join(process.cwd()`

#### `patternsData`

**Type:** `unknown`

**Value:** `JSON.parse(patternsContent)`

#### `patternsContent`

**Type:** `unknown`

**Value:** `await readFile(join(process.cwd()`

#### `patternsData`

**Type:** `unknown`

**Value:** `JSON.parse(patternsContent)`

#### `defaultProductionConfig`

**Type:** `ProductionConfig`

**Value:** `{`

### Dependencies

- `node:fs/promises`
- `node:path`
- `xstate`
- `zod`
- `../actors/ast-grep-transformation.ts`
- `../actors/complexity.ts`
- `../actors/feedback-loop.ts`
- `../actors/llm-testing-framework.ts`
- `../actors/llm-transformation.ts`
- `../actors/llm-transformation-enhanced.ts`
- `../actors/pattern-discovery.ts`
- `../actors/pattern-learning.ts`
- `../actors/template-engine.ts`
- `../actors/transformation-enhanced.ts`
- `../actors/validation.ts`
- `../docs/generator.ts`

---

## src\providers\llm-providers

Real LLM Provider Integration System

This module provides production-ready LLM provider integrations with:
- Multiple provider support (OpenAI, Anthropic, OpenRouter, Ollama)
- Rate limiting and cost tracking
- Robust error handling and fallback mechanisms
- Provider-specific optimizations
- Context-aware prompt engineering

**File:** `src\providers\llm-providers.ts`

### Functions

#### `LLMProviderSchema()`

**Tags:** `exported`

#### `LLMConfigSchema()`

**Tags:** `exported`

#### `LLMRequestSchema()`

**Tags:** `exported`

#### `LLMResponseSchema()`

**Tags:** `exported`

### Types

- `LLMProvider`
- `LLMConfig`
- `LLMRequest`
- `LLMResponse`

### Constants

#### `LLMProviderSchema`

**Type:** `unknown`

**Value:** `z.enum(['openai'`

#### `LLMConfigSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LLMRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LLMResponseSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `now`

**Type:** `unknown`

**Value:** `Date.now()`

#### `key`

**Type:** `unknown`

**Value:** ``${provider}-${config.model}``

#### `state`

**Type:** `unknown`

**Value:** `this.state.get(key)!`

#### `totalTokens`

**Type:** `unknown`

**Value:** `state.requests.reduce((sum`

#### `key`

**Type:** `unknown`

**Value:** ``${provider}-${config.model}``

#### `state`

**Type:** `unknown`

**Value:** `this.state.get(key)!`

#### `key`

**Type:** `unknown`

**Value:** ``${provider}-${model}``

#### `globalRateLimiter`

**Type:** `unknown`

**Value:** `new RateLimiter()`

#### `canProceed`

**Type:** `unknown`

**Value:** `await this.rateLimiter.checkRateLimit(`

#### `waitTime`

**Type:** `unknown`

**Value:** `Math.min(60000`

#### `validatedRequest`

**Type:** `unknown`

**Value:** `LLMRequestSchema.parse(request)`

#### `estimatedTokens`

**Type:** `unknown`

**Value:** `this.estimateTokens(validatedRequest.prompt)`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `maxRetries`

**Type:** `unknown`

**Value:** `validatedRequest.options?.maxRetries || this.config.retries`

#### `response`

**Type:** `unknown`

**Value:** `await fetch('https://api.openai.com/v1/chat/completions'`

#### `errorData`

**Type:** `unknown`

**Value:** `await response.json().catch(() => ({}))`

#### `data`

**Type:** `unknown`

**Value:** `await response.json()`

#### `content`

**Type:** `unknown`

**Value:** `data.choices?.[0]?.message?.content || ''`

#### `usage`

**Type:** `unknown`

**Value:** `data.usage || {}`

#### `cost`

**Type:** `unknown`

**Value:** `this.calculateCost(usage.total_tokens || estimatedTokens)`

#### `delay`

**Type:** `unknown`

**Value:** `Math.min(1000 * 2 ** retryCount`

#### `validatedRequest`

**Type:** `unknown`

**Value:** `LLMRequestSchema.parse(request)`

#### `estimatedTokens`

**Type:** `unknown`

**Value:** `this.estimateTokens(validatedRequest.prompt)`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `maxRetries`

**Type:** `unknown`

**Value:** `validatedRequest.options?.maxRetries || this.config.retries`

#### `response`

**Type:** `unknown`

**Value:** `await fetch('https://api.anthropic.com/v1/messages'`

#### `errorData`

**Type:** `unknown`

**Value:** `await response.json().catch(() => ({}))`

#### `data`

**Type:** `unknown`

**Value:** `await response.json()`

#### `content`

**Type:** `unknown`

**Value:** `data.content?.[0]?.text || ''`

#### `usage`

**Type:** `unknown`

**Value:** `data.usage || {}`

#### `cost`

**Type:** `unknown`

**Value:** `this.calculateCost(usage.output_tokens || estimatedTokens)`

#### `delay`

**Type:** `unknown`

**Value:** `Math.min(1000 * 2 ** retryCount`

#### `validatedRequest`

**Type:** `unknown`

**Value:** `LLMRequestSchema.parse(request)`

#### `estimatedTokens`

**Type:** `unknown`

**Value:** `this.estimateTokens(validatedRequest.prompt)`

#### `baseURL`

**Type:** `unknown`

**Value:** `this.config.baseURL || 'https://openrouter.ai/api/v1'`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `maxRetries`

**Type:** `unknown`

**Value:** `validatedRequest.options?.maxRetries || this.config.retries`

#### `response`

**Type:** `unknown`

**Value:** `await fetch(`${baseURL}/chat/completions``

#### `errorData`

**Type:** `unknown`

**Value:** `await response.json().catch(() => ({}))`

#### `data`

**Type:** `unknown`

**Value:** `await response.json()`

#### `content`

**Type:** `unknown`

**Value:** `data.choices?.[0]?.message?.content || ''`

#### `usage`

**Type:** `unknown`

**Value:** `data.usage || {}`

#### `cost`

**Type:** `unknown`

**Value:** `this.calculateCost(usage.total_tokens || estimatedTokens)`

#### `delay`

**Type:** `unknown`

**Value:** `Math.min(1000 * 2 ** retryCount`

#### `validatedRequest`

**Type:** `unknown`

**Value:** `LLMRequestSchema.parse(request)`

#### `estimatedTokens`

**Type:** `unknown`

**Value:** `this.estimateTokens(validatedRequest.prompt)`

#### `baseURL`

**Type:** `unknown`

**Value:** `this.config.baseURL || 'http://localhost:11434'`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `maxRetries`

**Type:** `unknown`

**Value:** `validatedRequest.options?.maxRetries || this.config.retries`

#### `prompt`

**Type:** `unknown`

**Value:** `validatedRequest.systemPrompt`

#### `response`

**Type:** `unknown`

**Value:** `await fetch(`${baseURL}/api/generate``

#### `data`

**Type:** `unknown`

**Value:** `await response.json()`

#### `content`

**Type:** `unknown`

**Value:** `data.response || ''`

#### `cost`

**Type:** `unknown`

**Value:** `0`

#### `delay`

**Type:** `unknown`

**Value:** `Math.min(1000 * 2 ** retryCount`

#### `finalConfig`

**Type:** `unknown`

**Value:** `{ ...this.defaultConfig`

#### `key`

**Type:** `unknown`

**Value:** ``${provider}-${JSON.stringify(finalConfig)}``

#### `providerInstance`

**Type:** `unknown`

**Value:** `this.createProvider(provider`

#### `fullConfig`

**Type:** `unknown`

**Value:** `LLMConfigSchema.parse(config)`

#### `env`

**Type:** `unknown`

**Value:** `getEnvironmentConfig()`

#### `providers`

**Type:** `unknown`

**Value:** `preferredProvider`

#### `provider`

**Type:** `unknown`

**Value:** `this.getProvider(providerName`

#### `response`

**Type:** `unknown`

**Value:** `await provider.makeRequest(request)`

#### `costs`

**Type:** `Record<string, number>`

**Value:** `{}`

#### `env`

**Type:** `unknown`

**Value:** `getEnvironmentConfig()`

### Dependencies

- `zod`
- `../config/environment.js`

---

## src\repository-manager

**File:** `src\repository-manager.ts`

### Functions

#### `RepositoryConfigSchema()`

**Tags:** `exported`

#### `RepositoryAnalysisSchema()`

**Tags:** `exported`

#### `RepositoryProcessingResultSchema()`

**Tags:** `exported`

#### `RepositoryStateSchema()`

**Tags:** `exported`

### Types

- `LearningResult`
- `RepositoryConfig`
- `RepositoryAnalysis`
- `RepositoryProcessingResult`
- `RepositoryState`
- `safety`

### Constants

#### `RepositoryConfigSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `RepositoryAnalysisSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `RepositoryProcessingResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `RepositoryStateSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `validatedConfig`

**Type:** `unknown`

**Value:** `RepositoryConfigSchema.parse(config)`

#### `repositoryId`

**Type:** `unknown`

**Value:** `crypto.randomUUID()`

#### `repoState`

**Type:** `RepositoryState`

**Value:** `{`

#### `clonePath`

**Type:** `unknown`

**Value:** `await this.cloneRepository(validatedConfig)`

#### `analysis`

**Type:** `unknown`

**Value:** `await this.analyzeRepository(clonePath`

#### `gitActorInstance`

**Type:** `unknown`

**Value:** `createActor(gitActor`

#### `subscription`

**Type:** `unknown`

**Value:** `gitActorInstance.subscribe((state) => {`

#### `repoState`

**Type:** `unknown`

**Value:** `this.activeRepositories.get(repositoryId)`

#### `consolidatedPatterns`

**Type:** `AstPattern[]`

**Value:** `[]`

#### `patternIds`

**Type:** `unknown`

**Value:** `new Set<string>()`

#### `content`

**Type:** `unknown`

**Value:** `await readFile('./patterns.json'`

#### `data`

**Type:** `unknown`

**Value:** `JSON.parse(content)`

#### `validatedPattern`

**Type:** `unknown`

**Value:** `AstPatternSchema.parse(pattern)`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `data`

**Type:** `unknown`

**Value:** `JSON.parse(content)`

#### `validatedPattern`

**Type:** `unknown`

**Value:** `AstPatternSchema.parse(pattern)`

#### `riskOrder`

**Type:** `unknown`

**Value:** `{ low: 0`

#### `riskDiff`

**Type:** `unknown`

**Value:** `riskOrder[a.riskLevel] - riskOrder[b.riskLevel]`

#### `startTime`

**Type:** `unknown`

**Value:** `Date.now()`

#### `validatedConfig`

**Type:** `unknown`

**Value:** `RepositoryConfigSchema.parse(config)`

#### `transformations`

**Type:** `TransformationResult[]`

**Value:** `[]`

#### `errors`

**Type:** `string[]`

**Value:** `[]`

#### `warnings`

**Type:** `string[]`

**Value:** `[]`

#### `transformationResults`

**Type:** `unknown`

**Value:** `await this.applyTransformations(clonePath`

#### `documentation`

**Type:** `unknown`

**Value:** `await this.generateDocumentation(clonePath`

#### `outputPath`

**Type:** `unknown`

**Value:** `await this.packageResults(`

#### `tempPath`

**Type:** `unknown`

**Value:** `await mkdtemp(join(this.tempDir`

#### `repoName`

**Type:** `unknown`

**Value:** `config.url.split('/').pop()?.replace('.git'`

#### `clonePath`

**Type:** `unknown`

**Value:** `join(tempPath`

#### `cloneCommand`

**Type:** `unknown`

**Value:** `[`

#### `analysis`

**Type:** `RepositoryAnalysis`

**Value:** `{`

#### `complexityScores`

**Type:** `number[]`

**Value:** `[]`

#### `detectedPatterns`

**Type:** `AstPattern[]`

**Value:** `[]`

#### `analyzeDirectory`

**Type:** `unknown`

**Value:** `async (dirPath: string): Promise<void> => {`

#### `entries`

**Type:** `unknown`

**Value:** `await readdir(dirPath)`

#### `fullPath`

**Type:** `unknown`

**Value:** `join(dirPath`

#### `stats`

**Type:** `unknown`

**Value:** `await stat(fullPath)`

#### `relativePath`

**Type:** `unknown`

**Value:** `relative(clonePath`

#### `relativePath`

**Type:** `unknown`

**Value:** `relative(clonePath`

#### `shouldInclude`

**Type:** `unknown`

**Value:** `config.includePatterns.some((pattern) =>`

#### `shouldExclude`

**Type:** `unknown`

**Value:** `config.excludePatterns.some((pattern) =>`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(fullPath`

#### `fileAnalysis`

**Type:** `unknown`

**Value:** `await this.analyzeFile(fullPath`

#### `ext`

**Type:** `unknown`

**Value:** `extname(fullPath)`

#### `buckets`

**Type:** `unknown`

**Value:** `[0`

#### `min`

**Type:** `unknown`

**Value:** `buckets[i]`

#### `max`

**Type:** `unknown`

**Value:** `buckets[i + 1]`

#### `count`

**Type:** `unknown`

**Value:** `complexityScores.filter((score) => score >= min && score < max).length`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `linesOfCode`

**Type:** `unknown`

**Value:** `lines.filter((line) => line.trim() && !line.trim().startsWith('//')).length`

#### `complexityPatterns`

**Type:** `unknown`

**Value:** `[`

#### `matches`

**Type:** `unknown`

**Value:** `content.match(pattern)`

#### `patterns`

**Type:** `AstPattern[]`

**Value:** `[]`

#### `issues`

**Type:** `Array<{
      file: string;
      line: number;
      severity: 'error' | 'warning' | 'info';
      message: string;
      rule: string;
    }>`

**Value:** `[]`

#### `patternChecks`

**Type:** `unknown`

**Value:** `[`

#### `matches`

**Type:** `unknown`

**Value:** `[...content.matchAll(check.pattern)]`

#### `lineNumber`

**Type:** `unknown`

**Value:** `content.substring(0`

#### `transformations`

**Type:** `TransformationResult[]`

**Value:** `[]`

#### `lowRiskPatterns`

**Type:** `unknown`

**Value:** `analysis.patterns.filter((p) => p.riskLevel === 'low')`

#### `mediumRiskPatterns`

**Type:** `unknown`

**Value:** `analysis.patterns.filter((p) => p.riskLevel === 'medium')`

#### `result`

**Type:** `unknown`

**Value:** `await this.applyPattern(_clonePath`

#### `result`

**Type:** `unknown`

**Value:** `await this.applyPattern(_clonePath`

#### `actualResult`

**Type:** `unknown`

**Value:** `await this.applyPattern(_clonePath`

#### `targetFiles`

**Type:** `unknown`

**Value:** `await this.discoverTargetFiles(clonePath`

#### `transformationRequest`

**Type:** `TransformationRequest`

**Value:** `{`

#### `validatedRequest`

**Type:** `unknown`

**Value:** `TransformationRequestSchema.parse(transformationRequest)`

#### `mockResult`

**Type:** `TransformationResult`

**Value:** `{`

#### `targetFiles`

**Type:** `string[]`

**Value:** `[]`

#### `languageExtensions`

**Type:** `Record<string, string[]>`

**Value:** `{`

#### `extensions`

**Type:** `unknown`

**Value:** `languageExtensions[pattern.language] || ['.ts'`

#### `walkDirectory`

**Type:** `unknown`

**Value:** `async (dirPath: string): Promise<void> => {`

#### `entries`

**Type:** `unknown`

**Value:** `await readdir(dirPath)`

#### `fullPath`

**Type:** `unknown`

**Value:** `join(dirPath`

#### `stats`

**Type:** `unknown`

**Value:** `await stat(fullPath)`

#### `ext`

**Type:** `unknown`

**Value:** `extname(entry)`

#### `patternLearningActorInstance`

**Type:** `unknown`

**Value:** `createActor(patternLearningActor`

#### `learningResult`

**Type:** `unknown`

**Value:** `await new Promise<LearningResult>((resolve`

#### `timeout`

**Type:** `unknown`

**Value:** `setTimeout(() => {`

#### `repoState`

**Type:** `unknown`

**Value:** `this.activeRepositories.get(repositoryId)`

#### `outputDir`

**Type:** `unknown`

**Value:** `'./output/repositories'`

#### `repoName`

**Type:** `unknown`

**Value:** `analysis.repositoryUrl.split('/').pop()?.replace('.git'`

#### `outputPath`

**Type:** `unknown`

**Value:** `join(outputDir`

#### `patternMap`

**Type:** `unknown`

**Value:** `new Map<string`

#### `recommendations`

**Type:** `string[]`

**Value:** `[]`

#### `jsFiles`

**Type:** `unknown`

**Value:** `analysis.languages['.js'] || 0`

#### `tsFiles`

**Type:** `unknown`

**Value:** `analysis.languages['.ts'] || 0`

#### `repositoryManagerActor`

**Type:** `unknown`

**Value:** `fromPromise(`

#### `manager`

**Type:** `unknown`

**Value:** `new RepositoryManager()`

#### `processRepository`

**Type:** `unknown`

**Value:** `async (`

#### `manager`

**Type:** `unknown`

**Value:** `new RepositoryManager()`

#### `validateRepositoryConfig`

**Type:** `unknown`

**Value:** `(data: unknown): RepositoryConfig => {`

### Dependencies

- `xstate`
- `zod`
- `./actors/git.js`
- `./actors/pattern-learning.js`
- `./machine.js`
- `./types.js`

---

## src\scripts\enhance-commit-message

**File:** `src\scripts\enhance-commit-message.ts`

### Functions

### Types

- `FileChange`
- `CommitAnalysis`
- `of`
- `prefix`
- `errors`

### Constants

#### `FileChangeSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `CommitAnalysisSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `diffOutput`

**Type:** `unknown`

**Value:** `execSync('git diff --cached --numstat'`

#### `statusOutput`

**Type:** `unknown`

**Value:** `execSync('git diff --cached --name-status'`

#### `files`

**Type:** `unknown`

**Value:** `parseDiffOutput(diffOutput`

#### `totalInsertions`

**Type:** `unknown`

**Value:** `files.reduce((sum`

#### `totalDeletions`

**Type:** `unknown`

**Value:** `files.reduce((sum`

#### `diffLines`

**Type:** `unknown`

**Value:** `diffOutput`

#### `statusLines`

**Type:** `unknown`

**Value:** `statusOutput`

#### `statusMap`

**Type:** `unknown`

**Value:** `new Map<string`

#### `files`

**Type:** `FileChange[]`

**Value:** `[]`

#### `status`

**Type:** `unknown`

**Value:** `statusMap.get(file) || 'M'`

#### `path`

**Type:** `unknown`

**Value:** `filePath.toLowerCase()`

#### `ext`

**Type:** `unknown`

**Value:** `extname(filePath).toLowerCase()`

#### `languageMap`

**Type:** `Record<string, string>`

**Value:** `{`

#### `totalChanges`

**Type:** `unknown`

**Value:** `totalInsertions + totalDeletions`

#### `sourceFiles`

**Type:** `unknown`

**Value:** `files.filter((f) => f.type === 'source').length`

#### `hasConfigChanges`

**Type:** `unknown`

**Value:** `files.some((f) => f.type === 'config')`

#### `hasBuildChanges`

**Type:** `unknown`

**Value:** `files.some((f) => f.type === 'build')`

#### `hasTests`

**Type:** `unknown`

**Value:** `files.some((f) => f.type === 'test')`

#### `hasSource`

**Type:** `unknown`

**Value:** `files.some((f) => f.type === 'source')`

#### `hasDocs`

**Type:** `unknown`

**Value:** `files.some((f) => f.type === 'docs')`

#### `hasConfig`

**Type:** `unknown`

**Value:** `files.some((f) => f.type === 'config')`

#### `hasBuild`

**Type:** `unknown`

**Value:** `files.some((f) => f.type === 'build')`

#### `fileNames`

**Type:** `unknown`

**Value:** `files.map((f) => basename(f.file).toLowerCase())`

#### `hasFixPattern`

**Type:** `unknown`

**Value:** `fileNames.some(`

#### `hasFeaturePattern`

**Type:** `unknown`

**Value:** `fileNames.some(`

#### `components`

**Type:** `unknown`

**Value:** `new Set<string>()`

#### `pathParts`

**Type:** `unknown`

**Value:** `file.file.split('/')`

#### `srcIndex`

**Type:** `unknown`

**Value:** `pathParts.indexOf('src')`

#### `component`

**Type:** `unknown`

**Value:** `pathParts[srcIndex + 1]`

#### `fileName`

**Type:** `unknown`

**Value:** `basename(file.file`

#### `parts`

**Type:** `unknown`

**Value:** `fileName.split('-')`

#### `firstPart`

**Type:** `unknown`

**Value:** `parts[0]`

#### `factors`

**Type:** `string[]`

**Value:** `[]`

#### `criticalFiles`

**Type:** `unknown`

**Value:** `files.filter(`

#### `largeChanges`

**Type:** `unknown`

**Value:** `files.filter((f) => f.insertions + f.deletions > 100)`

#### `deletions`

**Type:** `unknown`

**Value:** `files.filter((f) => f.status === 'D')`

#### `coreFiles`

**Type:** `unknown`

**Value:** `files.filter(`

#### `changeSize`

**Type:** `unknown`

**Value:** `file.insertions + file.deletions`

#### `tscOutput`

**Type:** `unknown`

**Value:** `execSync('bunx tsc --noEmit --pretty false'`

#### `output`

**Type:** `unknown`

**Value:** `error.stdout || error.stderr || ''`

#### `biomeOutput`

**Type:** `unknown`

**Value:** `execSync('bunx biome check --reporter=json .'`

#### `biomeResult`

**Type:** `unknown`

**Value:** `JSON.parse(biomeOutput)`

#### `lines`

**Type:** `string[]`

**Value:** `[]`

#### `cleanMessage`

**Type:** `unknown`

**Value:** `originalMessage.trim()`

#### `typePrefix`

**Type:** `unknown`

**Value:** `getTypePrefix(analysis.changeType)`

#### `componentSuffix`

**Type:** `unknown`

**Value:** `analysis.affectedComponents.length > 0`

#### `statusIcon`

**Type:** `unknown`

**Value:** `getStatusIcon(file.status)`

#### `sizeInfo`

**Type:** `unknown`

**Value:** `file.insertions + file.deletions > 0 ? ` (+${file.insertions} -${file.deletions})` : ''`

#### `reasoning`

**Type:** `unknown`

**Value:** `inferReasoning(analysis)`

#### `prefixes`

**Type:** `unknown`

**Value:** `{`

#### `icons`

**Type:** `unknown`

**Value:** `{`

#### `commitMsgFile`

**Type:** `unknown`

**Value:** `process.argv[2]`

#### `originalMessage`

**Type:** `unknown`

**Value:** `await readFile(commitMsgFile`

#### `analysis`

**Type:** `unknown`

**Value:** `await analyzeStagedChanges()`

#### `enhancedMessage`

**Type:** `unknown`

**Value:** `generateEnhancedMessage(originalMessage`

### Dependencies

- `node:child_process`
- `node:fs/promises`
- `node:path`
- `zod`

---

## src\scripts\pre-commit-imports

**File:** `src\scripts\pre-commit-imports.ts`

### Functions

### Types

- `imports`

### Constants

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `imports`

**Type:** `Array<{
      line: string;
      lineNumber: number;
      module: string;
      isNodeModule: boolean;
      isTypeOnly: boolean;
    }>`

**Value:** `[]`

#### `nonImportLines`

**Type:** `string[]`

**Value:** `[]`

#### `line`

**Type:** `unknown`

**Value:** `lines[i]`

#### `trimmed`

**Type:** `unknown`

**Value:** `line.trim()`

#### `moduleMatch`

**Type:** `unknown`

**Value:** `line.match(/from ['"]([^'"]+)['"]/)`

#### `module`

**Type:** `unknown`

**Value:** `moduleMatch ? moduleMatch[1] : ''`

#### `isNodeModule`

**Type:** `unknown`

**Value:** `module ? !module.startsWith('.') && !module.startsWith('/') : false`

#### `isTypeOnly`

**Type:** `unknown`

**Value:** `line.includes('import type')`

#### `organizedLines`

**Type:** `string[]`

**Value:** `[]`

#### `currentGroup`

**Type:** `unknown`

**Value:** `imp.isTypeOnly ? 'type' : imp.isNodeModule ? 'node' : 'relative'`

#### `newContent`

**Type:** `unknown`

**Value:** `organizedLines.join('\n')`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `lines`

**Type:** `unknown`

**Value:** `content.split('\n')`

#### `modifiedLines`

**Type:** `string[]`

**Value:** `[]`

#### `trimmed`

**Type:** `unknown`

**Value:** `line.trim()`

#### `files`

**Type:** `unknown`

**Value:** `process.argv.slice(2)`

#### `importsModified`

**Type:** `unknown`

**Value:** `await organizeImports(file)`

#### `unusedRemoved`

**Type:** `unknown`

**Value:** `await removeUnusedCode(file)`

### Dependencies

- `node:fs/promises`

---

## src\scripts\pre-commit-typescript

**File:** `src\scripts\pre-commit-typescript.ts`

### Functions

### Types

- `TypeScriptFixResult`

### Constants

#### `output`

**Type:** `unknown`

**Value:** `execSync('git diff --cached --name-only --diff-filter=ACM'`

#### `files`

**Type:** `unknown`

**Value:** `output`

#### `output`

**Type:** `unknown`

**Value:** `execSync(`

#### `files`

**Type:** `string[]`

**Value:** `[]`

#### `entries`

**Type:** `unknown`

**Value:** `await readdir(dir`

#### `fullPath`

**Type:** `unknown`

**Value:** `join(dir`

#### `subFiles`

**Type:** `unknown`

**Value:** `await findTypeScriptFiles(fullPath)`

#### `defaultConfig`

**Type:** `PreCommitConfig`

**Value:** `{`

#### `configPath`

**Type:** `unknown`

**Value:** `join(process.cwd()`

#### `configContent`

**Type:** `unknown`

**Value:** `await readFile(configPath`

#### `userConfig`

**Type:** `unknown`

**Value:** `JSON.parse(configContent)`

#### `fileList`

**Type:** `unknown`

**Value:** `files.join(' ')`

#### `successRate`

**Type:** `unknown`

**Value:** `errorsFound > 0 ? ((errorsFixed / errorsFound) * 100).toFixed(1) : '100.0'`

#### `config`

**Type:** `unknown`

**Value:** `await loadConfig()`

#### `files`

**Type:** `unknown`

**Value:** `config.stagedFilesOnly`

#### `filteredFiles`

**Type:** `unknown`

**Value:** `files.filter((file) => {`

#### `regex`

**Type:** `unknown`

**Value:** `new RegExp(pattern.replace(/\*\*/g`

#### `actor`

**Type:** `unknown`

**Value:** `createActor(typeScriptErrorResolverActor`

#### `result`

**Type:** `unknown`

**Value:** `await new Promise<TypeScriptFixResult>((resolve`

#### `output`

**Type:** `unknown`

**Value:** `actor.getSnapshot().output`

#### `args`

**Type:** `unknown`

**Value:** `process.argv.slice(2)`

### Dependencies

- `node:child_process`
- `node:fs`
- `node:fs/promises`
- `node:path`
- `xstate`
- `../actors/typescript-error-resolver.js`

---

## src\telemetry\collector

Core telemetry collection system for Carmack Coder
Provides high-performance, low-overhead metrics collection with privacy compliance

**File:** `src\telemetry\collector.ts`

### Functions

### Constants

#### `validated`

**Type:** `unknown`

**Value:** `TelemetryMetricSchema.parse(event)`

#### `shouldFlush`

**Type:** `unknown`

**Value:** `this.events.length >= this.config.batchSize ||`

#### `eventsToFlush`

**Type:** `unknown`

**Value:** `[...this.events]`

#### `sorted`

**Type:** `unknown`

**Value:** `[...this.samples].sort((a`

#### `len`

**Type:** `unknown`

**Value:** `sorted.length`

#### `startTime`

**Type:** `unknown`

**Value:** `performance.now()`

#### `metric`

**Type:** `PatternSuccessMetric`

**Value:** `{`

#### `startTime`

**Type:** `unknown`

**Value:** `performance.now()`

#### `totalLatency`

**Type:** `unknown`

**Value:** `Object.values(pipelineStages).reduce((a`

#### `metric`

**Type:** `LatencyMetric`

**Value:** `{`

#### `startTime`

**Type:** `unknown`

**Value:** `performance.now()`

#### `peakMemory`

**Type:** `unknown`

**Value:** `Math.max(...memoryTimeline.map((t) => t.rss))`

#### `memoryGrowthRate`

**Type:** `unknown`

**Value:** `memoryTimeline.length > 1`

#### `lastEntry`

**Type:** `unknown`

**Value:** `memoryTimeline[memoryTimeline.length - 1]`

#### `firstEntry`

**Type:** `unknown`

**Value:** `memoryTimeline[0]`

#### `timeDiff`

**Type:** `unknown`

**Value:** `lastEntry.timestamp - firstEntry.timestamp`

#### `memoryDiff`

**Type:** `unknown`

**Value:** `lastEntry.rss - firstEntry.rss`

#### `rate`

**Type:** `unknown`

**Value:** `(memoryDiff / timeDiff) * 1000`

#### `metric`

**Type:** `MemoryProfileMetric`

**Value:** `{`

#### `startTime`

**Type:** `unknown`

**Value:** `performance.now()`

#### `total`

**Type:** `unknown`

**Value:** `hits + misses`

#### `hitRate`

**Type:** `unknown`

**Value:** `total > 0 ? hits / total : 0`

#### `missRate`

**Type:** `unknown`

**Value:** `total > 0 ? misses / total : 0`

#### `evictionRate`

**Type:** `unknown`

**Value:** `cacheSize > 0 ? evictions / cacheSize : 0`

#### `averageLookupTime`

**Type:** `unknown`

**Value:** `lookupTimes.length > 0 ? lookupTimes.reduce((a`

#### `effectivenessScore`

**Type:** `unknown`

**Value:** `hitRate * 0.7 + (1 - averageLookupTime / 1000) * 0.3`

#### `metric`

**Type:** `CacheEfficiencyMetric`

**Value:** `{`

#### `anonymizedId`

**Type:** `unknown`

**Value:** `this.privacyManager.anonymizeUserId(userId)`

#### `startTime`

**Type:** `unknown`

**Value:** `performance.now()`

#### `modeCounts`

**Type:** `unknown`

**Value:** `actions.reduce(`

#### `dominantMode`

**Type:** `unknown`

**Value:** `(Object.entries(modeCounts).sort(([`

#### `modeSwitches`

**Type:** `unknown`

**Value:** `actions.reduce((count`

#### `patterns`

**Type:** `string[]`

**Value:** `[]`

#### `metric`

**Type:** `ModeSelectionMetric`

**Value:** `{`

#### `startTime`

**Type:** `unknown`

**Value:** `performance.now()`

#### `metric`

**Type:** `ErrorRecoveryMetric`

**Value:** `{`

#### `startTime`

**Type:** `unknown`

**Value:** `performance.now()`

#### `metric`

**Type:** `import('./types.js').CodeQualityDelta`

**Value:** `{`

### Dependencies

- `node:crypto`
- `node:events`
- `node:perf_hooks`
- `./types.js`

---

## src\telemetry\index

Telemetry system exports for Carmack Coder
Comprehensive observability and metrics collection

**File:** `src\telemetry\index.ts`

### Functions

#### `DEFAULT_TELEMETRY_CONFIG()`

Default telemetry configuration for production use

**Tags:** `exported`

#### `DEVELOPMENT_TELEMETRY_CONFIG()`

Development telemetry configuration with enhanced logging

**Tags:** `exported`

#### `DISABLED_TELEMETRY_CONFIG()`

Disable telemetry configuration

**Tags:** `exported`

### Constants

#### `DEFAULT_TELEMETRY_CONFIG`

**Type:** `unknown`

**Value:** `{`

#### `DEVELOPMENT_TELEMETRY_CONFIG`

**Type:** `unknown`

**Value:** `{`

#### `DISABLED_TELEMETRY_CONFIG`

**Type:** `unknown`

**Value:** `{`

---

## src\telemetry\integration

Telemetry integration for Carmack Coder transformation system
Provides comprehensive observability without impacting transformation performance

**File:** `src\telemetry\integration.ts`

### Functions

### Classes

#### `QualityAnalyzer`

Code quality analyzer for before/after comparison

#### `TransformationTelemetry`

Main telemetry integration class for transformation operations

### Constants

#### `startTime`

**Type:** `unknown`

**Value:** `this.startTimes.get(stage)`

#### `memUsage`

**Type:** `unknown`

**Value:** `process.memoryUsage()`

#### `prev`

**Type:** `unknown`

**Value:** `this.timeline[i - 1]`

#### `curr`

**Type:** `unknown`

**Value:** `this.timeline[i]`

#### `heapReduction`

**Type:** `unknown`

**Value:** `prev.heapUsed - curr.heapUsed`

#### `reductionPercentage`

**Type:** `unknown`

**Value:** `heapReduction / prev.heapUsed`

#### `stats`

**Type:** `unknown`

**Value:** `this.getOrCreateStats(cacheKey)`

#### `stats`

**Type:** `unknown`

**Value:** `this.stats.get(cacheKey)`

#### `stats`

**Type:** `unknown`

**Value:** `this.stats.get(cacheKey)`

#### `lines`

**Type:** `unknown`

**Value:** `code.split('\n')`

#### `linesOfCode`

**Type:** `unknown`

**Value:** `lines.filter(`

#### `functionMatches`

**Type:** `unknown`

**Value:** `code.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || []`

#### `functionCount`

**Type:** `unknown`

**Value:** `functionMatches.length`

#### `nestingDepth`

**Type:** `unknown`

**Value:** `this.calculateNestingDepth(code)`

#### `cyclomaticComplexity`

**Type:** `unknown`

**Value:** `this.calculateCyclomaticComplexity(code)`

#### `cognitiveComplexity`

**Type:** `unknown`

**Value:** `this.calculateCognitiveComplexity(code)`

#### `maintainabilityIndex`

**Type:** `unknown`

**Value:** `this.calculateMaintainabilityIndex(`

#### `duplicationRatio`

**Type:** `unknown`

**Value:** `this.calculateDuplicationRatio(lines)`

#### `controlFlowPatterns`

**Type:** `unknown`

**Value:** `[`

#### `matches`

**Type:** `unknown`

**Value:** `code.match(pattern)`

#### `tokens`

**Type:** `unknown`

**Value:** `code.split(/\s+/)`

#### `token`

**Type:** `unknown`

**Value:** `tokens[i]`

#### `halsteadVolume`

**Type:** `unknown`

**Value:** `Math.log2(code.length)`

#### `commentRatio`

**Type:** `unknown`

**Value:** `(code.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length / linesOfCode`

#### `maintainabilityIndex`

**Type:** `unknown`

**Value:** `Math.max(`

#### `lineMap`

**Type:** `unknown`

**Value:** `new Map<string`

#### `meaningfulLines`

**Type:** `unknown`

**Value:** `lines.filter((line) => {`

#### `trimmed`

**Type:** `unknown`

**Value:** `line.trim()`

#### `normalized`

**Type:** `unknown`

**Value:** `line.trim()`

#### `count`

**Type:** `unknown`

**Value:** `lineMap.get(normalized) || 0`

#### `memoryTimeline`

**Type:** `unknown`

**Value:** `this.memoryTracker.stop()`

#### `gcInfo`

**Type:** `unknown`

**Value:** `this.memoryTracker.detectGC()`

#### `originalQuality`

**Type:** `unknown`

**Value:** `await this.qualityAnalyzer.analyzeCode(this.originalCode)`

#### `transformedQuality`

**Type:** `unknown`

**Value:** `await this.qualityAnalyzer.analyzeCode(transformedCode)`

#### `improvement`

**Type:** `unknown`

**Value:** `{`

#### `overallQualityDelta`

**Type:** `unknown`

**Value:** `(improvement.cyclomaticComplexity > 0 ? 0.3 : -0.3) +`

#### `stats`

**Type:** `unknown`

**Value:** `this.cacheMonitor.getStats(cacheType)`

### Dependencies

- `node:crypto`
- `node:perf_hooks`
- `./collector.js`

---

## src\telemetry\types

Telemetry system type definitions for Carmack Coder
Provides comprehensive observability into transformation effectiveness and performance

**File:** `src\telemetry\types.ts`

### Functions

#### `TelemetryEventBaseSchema()`

**Tags:** `exported`

#### `TransformationModeSchema()`

**Tags:** `exported`

#### `PatternSuccessMetricSchema()`

Critical for understanding pattern quality and reliability
Measures the percentage of successful pattern applications
TEL-001: Pattern Success Rate Metric

**Tags:** `exported`

#### `SemanticCorrectnessMetricSchema()`

Essential for ensuring transformation safety
Validates that transformations preserve program semantics using Dafny verification
TEL-002: Semantic Correctness Score

**Tags:** `exported`

#### `QualityMetricsSchema()`

Quality metrics structure for before/after comparison

**Tags:** `exported`

#### `CodeQualityDeltaSchema()`

Quantifies actual improvement in maintainability and readability
Measures before/after code quality using multiple dimensions
TEL-003: Code Quality Delta

**Tags:** `exported`

#### `PipelineStagesSchema()`

Pipeline stage timing for detailed performance analysis

**Tags:** `exported`

#### `LatencyMetricSchema()`

Critical for user experience optimization
Tracks end-to-end transformation times across different modes and file sizes
TEL-004: Transformation Latency Distribution

**Tags:** `exported`

#### `MemoryTimelinePointSchema()`

Memory usage timeline point

**Tags:** `exported`

#### `MemoryProfileMetricSchema()`

Prevents system instability during large file processing
Tracks memory consumption during AST processing
TEL-005: Memory Usage Profile

**Tags:** `exported`

#### `CacheEfficiencyMetricSchema()`

Critical for repeat transformation performance
Measures cache hit rates for AST parsing operations
TEL-006: AST Parse Cache Effectiveness

**Tags:** `exported`

#### `UserActionSchema()`

User action sequence item for behavior analysis

**Tags:** `exported`

#### `ModeSelectionMetricSchema()`

Reveals user preferences and potential UX improvements
Understands when users choose template vs AST vs LLM modes
TEL-007: Mode Selection Patterns

**Tags:** `exported`

#### `RecoveryActionSchema()`

User recovery action for error analysis

**Tags:** `exported`

#### `ErrorRecoveryMetricSchema()`

Critical for improving error handling and UX design
Tracks how users respond to transformation failures
TEL-008: Error Recovery Patterns

**Tags:** `exported`

#### `ProductivityMeasurementSchema()`

Productivity measurement structure

**Tags:** `exported`

#### `ProductivityMetricSchema()`

Essential for ROI measurement and value demonstration
Quantifies actual time savings from using Carmack Coder
TEL-009: Developer Productivity Index

**Tags:** `exported`

#### `PatternLifecycleSchema()`

Pattern lifecycle stage tracking

**Tags:** `exported`

#### `PatternFeedbackSchema()`

User feedback on pattern effectiveness

**Tags:** `exported`

#### `PatternAdoptionMetricSchema()`

Guides pattern investment decisions and roadmap planning
Tracks how patterns evolve from experimental to stable
TEL-010: Pattern Adoption Lifecycle

**Tags:** `exported`

#### `TelemetryMetricSchema()`

**Tags:** `exported`

#### `TelemetryConfigSchema()`

Telemetry configuration schema

**Tags:** `exported`

### Types

- `definitions`
- `TelemetryEventBase`
- `TransformationMode`
- `PatternSuccessMetric`
- `SemanticCorrectnessMetric`
- `QualityMetrics`
- `CodeQualityDelta`
- `PipelineStages`
- `LatencyMetric`
- `MemoryProfileMetric`
- `CacheEfficiencyMetric`
- `being`
- `ModeSelectionMetric`
- `ErrorRecoveryMetric`
- `ProductivityMetric`
- `PatternAdoptionMetric`
- `for`
- `TelemetryMetric`
- `TelemetryConfig`

### Constants

#### `TelemetryEventBaseSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TransformationModeSchema`

**Type:** `unknown`

**Value:** `z.enum(['template'`

#### `PatternSuccessMetricSchema`

**Type:** `unknown`

**Value:** `TelemetryEventBaseSchema.extend({`

#### `SemanticCorrectnessMetricSchema`

**Type:** `unknown`

**Value:** `TelemetryEventBaseSchema.extend({`

#### `QualityMetricsSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `CodeQualityDeltaSchema`

**Type:** `unknown`

**Value:** `TelemetryEventBaseSchema.extend({`

#### `PipelineStagesSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LatencyMetricSchema`

**Type:** `unknown`

**Value:** `TelemetryEventBaseSchema.extend({`

#### `MemoryTimelinePointSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `MemoryProfileMetricSchema`

**Type:** `unknown`

**Value:** `TelemetryEventBaseSchema.extend({`

#### `CacheEfficiencyMetricSchema`

**Type:** `unknown`

**Value:** `TelemetryEventBaseSchema.extend({`

#### `UserActionSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ModeSelectionMetricSchema`

**Type:** `unknown`

**Value:** `TelemetryEventBaseSchema.extend({`

#### `RecoveryActionSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ErrorRecoveryMetricSchema`

**Type:** `unknown`

**Value:** `TelemetryEventBaseSchema.extend({`

#### `ProductivityMeasurementSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ProductivityMetricSchema`

**Type:** `unknown`

**Value:** `TelemetryEventBaseSchema.extend({`

#### `PatternLifecycleSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternFeedbackSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternAdoptionMetricSchema`

**Type:** `unknown`

**Value:** `TelemetryEventBaseSchema.extend({`

#### `TelemetryMetricSchema`

**Type:** `unknown`

**Value:** `z.discriminatedUnion('id'`

#### `TelemetryConfigSchema`

**Type:** `unknown`

**Value:** `z.object({`

### Dependencies

- `zod`

---

## src\test-e2e-function

Test function for end-to-end documentation system validation
@param testId - Unique identifier for this test
@returns Success confirmation message

**File:** `src\test-e2e-function.ts`

---

## src\types

**File:** `src\types.ts`

### Functions

#### `FilePathSchema()`

**Tags:** `exported`

#### `GitHashSchema()`

**Tags:** `exported`

#### `TimestampSchema()`

**Tags:** `exported`

#### `TransformationModeSchema()`

**Tags:** `exported`

#### `TransformationStatusSchema()`

**Tags:** `exported`

#### `ComplexityMetricsSchema()`

**Tags:** `exported`

#### `AstPatternSchema()`

**Tags:** `exported`

#### `ErrorInfoSchema()`

**Tags:** `exported`

#### `ValidationResultSchema()`

**Tags:** `exported`

#### `GitCheckpointSchema()`

**Tags:** `exported`

#### `TransformationRequestSchema()`

**Tags:** `exported`

#### `TransformationResultSchema()`

**Tags:** `exported`

#### `MachineContextSchema()`

**Tags:** `exported`

#### `MachineEventSchema()`

**Tags:** `exported`

#### `ActorResultBaseSchema()`

**Tags:** `exported`

#### `TemplateEngineResultSchema()`

**Tags:** `exported`

#### `AstGrepResultSchema()`

**Tags:** `exported`

#### `LLMTransformationResultSchema()`

**Tags:** `exported`

#### `PatternDiscoveryResultSchema()`

**Tags:** `exported`

#### `PatternLearningResultSchema()`

**Tags:** `exported`

#### `ValidationActorResultSchema()`

**Tags:** `exported`

#### `LLMTestingResultSchema()`

**Tags:** `exported`

#### `FeedbackLoopResultSchema()`

**Tags:** `exported`

#### `EnhancedTransformationContextSchema()`

**Tags:** `exported`

#### `EnhancedTransformationRequestSchema()`

**Tags:** `exported`

#### `EnhancedTransformationResultSchema()`

**Tags:** `exported`

#### `ContextAwarePromptSchema()`

**Tags:** `exported`

#### `MultiFileContextSchema()`

**Tags:** `exported`

#### `RollbackInfoSchema()`

**Tags:** `exported`

#### `PerformanceOptimizationSchema()`

**Tags:** `exported`

#### `validateTransformationRequest()`

**Tags:** `exported`

#### `validateEnhancedTransformationRequest()`

**Tags:** `exported`

#### `validateMachineContext()`

**Tags:** `exported`

#### `validateMachineEvent()`

**Tags:** `exported`

#### `isValidFilePath()`

**Tags:** `exported`

#### `isValidGitHash()`

**Tags:** `exported`

#### `isTransformationMode()`

**Tags:** `exported`

#### `isEnhancedTransformationRequest()`

**Tags:** `exported`

### Types

- `FilePath`
- `GitHash`
- `Timestamp`
- `TransformationMode`
- `TransformationStatus`
- `ComplexityMetrics`
- `AstPattern`
- `ErrorInfo`
- `ValidationResult`
- `GitCheckpoint`
- `TransformationRequest`
- `TransformationResult`
- `MachineContext`
- `MachineEvent`
- `ActorResultBase`
- `TemplateEngineResult`
- `AstGrepResult`
- `LLMTransformationResult`
- `PatternDiscoveryResult`
- `PatternLearningResult`
- `ValidationActorResult`
- `LLMTestingResult`
- `FeedbackLoopResult`
- `for`
- `TransformationActorResult`
- `exports`
- `EnhancedTransformationContext`
- `EnhancedTransformationRequest`
- `EnhancedTransformationResult`
- `ContextAwarePrompt`
- `MultiFileContext`
- `RollbackInfo`
- `PerformanceOptimization`

### Constants

#### `FilePathSchema`

**Type:** `unknown`

**Value:** `z.string().min(1)`

#### `GitHashSchema`

**Type:** `unknown`

**Value:** `z.string().regex(/^[a-f0-9]{40}$/)`

#### `TimestampSchema`

**Type:** `unknown`

**Value:** `z.number().int().positive()`

#### `TransformationModeSchema`

**Type:** `unknown`

**Value:** `z.enum(['template'`

#### `TransformationStatusSchema`

**Type:** `unknown`

**Value:** `z.enum([`

#### `ComplexityMetricsSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `AstPatternSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ErrorInfoSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ValidationResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `GitCheckpointSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TransformationRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TransformationResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `MachineContextSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `MachineEventSchema`

**Type:** `unknown`

**Value:** `z.union([`

#### `ActorResultBaseSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TemplateEngineResultSchema`

**Type:** `unknown`

**Value:** `ActorResultBaseSchema.extend({`

#### `AstGrepResultSchema`

**Type:** `unknown`

**Value:** `ActorResultBaseSchema.extend({`

#### `LLMTransformationResultSchema`

**Type:** `unknown`

**Value:** `ActorResultBaseSchema.extend({`

#### `PatternDiscoveryResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternLearningResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ValidationActorResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LLMTestingResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `FeedbackLoopResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `EnhancedTransformationContextSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `EnhancedTransformationRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `EnhancedTransformationResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `ContextAwarePromptSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `MultiFileContextSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `RollbackInfoSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PerformanceOptimizationSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `validateTransformationRequest`

**Type:** `unknown`

**Value:** `(data: unknown): TransformationRequest => {`

#### `validateEnhancedTransformationRequest`

**Type:** `unknown`

**Value:** `(`

#### `validateMachineContext`

**Type:** `unknown`

**Value:** `(data: unknown): MachineContext => {`

#### `validateMachineEvent`

**Type:** `unknown`

**Value:** `(data: unknown): MachineEvent => {`

#### `isValidFilePath`

**Type:** `unknown`

**Value:** `(path: unknown): path is FilePath => {`

#### `isValidGitHash`

**Type:** `unknown`

**Value:** `(hash: unknown): hash is GitHash => {`

#### `isTransformationMode`

**Type:** `unknown`

**Value:** `(mode: unknown): mode is TransformationMode => {`

#### `isEnhancedTransformationRequest`

**Type:** `unknown`

**Value:** `(`

### Dependencies

- `zod`

---

## src\utils\config-validators

Configuration-specific YAML validators for Carmack Coder

Provides type-safe validation for all configuration files used in the project

**File:** `src\utils\config-validators.ts`

### Functions

#### `LefthookConfigSchema()`

**Tags:** `exported`

#### `DockerComposeSchema()`

**Tags:** `exported`

#### `PrometheusRuleGroupSchema()`

**Tags:** `exported`

#### `PrometheusConfigSchema()`

**Tags:** `exported`

#### `GitHubWorkflowSchema()`

**Tags:** `exported`

### Constants

#### `LefthookCommandSchema`

**Type:** `unknown`

**Value:** `z`

#### `LefthookHookSchema`

**Type:** `unknown`

**Value:** `z`

#### `LefthookConfigSchema`

**Type:** `unknown`

**Value:** `z`

#### `DockerComposeServiceSchema`

**Type:** `unknown`

**Value:** `z`

#### `DockerComposeSchema`

**Type:** `unknown`

**Value:** `z`

#### `PrometheusRuleGroupSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PrometheusScrapeConfigSchema`

**Type:** `unknown`

**Value:** `z`

#### `PrometheusConfigSchema`

**Type:** `unknown`

**Value:** `z`

#### `GitHubActionStepSchema`

**Type:** `unknown`

**Value:** `z`

#### `GitHubActionJobSchema`

**Type:** `unknown`

**Value:** `z`

#### `GitHubWorkflowSchema`

**Type:** `unknown`

**Value:** `z`

#### `result`

**Type:** `unknown`

**Value:** `await YAML.validate(filePath`

#### `response`

**Type:** `{
        valid: boolean;
        errors?: string[];
        data?: z.infer<typeof LefthookConfigSchema>;
      }`

**Value:** `{`

#### `result`

**Type:** `unknown`

**Value:** `await YAML.validate(filePath`

#### `response`

**Type:** `{
        valid: boolean;
        errors?: string[];
        data?: z.infer<typeof DockerComposeSchema>;
      }`

**Value:** `{`

#### `result`

**Type:** `unknown`

**Value:** `await YAML.validate(filePath`

#### `response`

**Type:** `{
        valid: boolean;
        errors?: string[];
        data?: z.infer<typeof PrometheusConfigSchema>;
      }`

**Value:** `{`

#### `result`

**Type:** `unknown`

**Value:** `await YAML.validate(filePath`

#### `response`

**Type:** `{
        valid: boolean;
        errors?: string[];
        data?: z.infer<typeof GitHubWorkflowSchema>;
      }`

**Value:** `{`

#### `results`

**Type:** `any`

**Value:** `{}`

#### `workflowFiles`

**Type:** `unknown`

**Value:** `['.github/workflows/ci.yml'`

#### `result`

**Type:** `unknown`

**Value:** `await ConfigValidator.validateGitHubWorkflow(file)`

#### `results`

**Type:** `unknown`

**Value:** `await ConfigValidator.validateAllConfigs()`

#### `ConfigSchemas`

**Type:** `unknown`

**Value:** `{`

### Dependencies

- `zod`
- `./yaml-handler.js`

---

## src\utils\index

Utility functions for the Carmack Coder system

**File:** `src\utils\index.ts`

### Functions

### Types

- `AstPattern`
- `PatternsFile`

### Constants

#### `PatternsFileSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `data`

**Type:** `unknown`

**Value:** `JSON.parse(content)`

#### `validated`

**Type:** `unknown`

**Value:** `PatternsFileSchema.parse(data)`

#### `patternsFile`

**Type:** `PatternsFile`

**Value:** `{`

#### `content`

**Type:** `unknown`

**Value:** `JSON.stringify(patternsFile`

#### `riskLevels`

**Type:** `unknown`

**Value:** `{ low: 1`

#### `maxRiskLevel`

**Type:** `unknown`

**Value:** `riskLevels[maxRisk]`

#### `delay`

**Type:** `unknown`

**Value:** `initialDelay * 2 ** attempt`

#### `start`

**Type:** `unknown`

**Value:** `performance.now()`

#### `result`

**Type:** `unknown`

**Value:** `await fn()`

#### `timeMs`

**Type:** `unknown`

**Value:** `performance.now() - start`

#### `content`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `data`

**Type:** `unknown`

**Value:** `JSON.parse(content)`

#### `patterns`

**Type:** `AstPattern[]`

**Value:** `[]`

#### `mainPatterns`

**Type:** `unknown`

**Value:** `await loadPatterns(mainPatternsPath)`

#### `enhancedPatterns`

**Type:** `unknown`

**Value:** `await loadEnhancedPatterns(enhancedPatternsPath)`

#### `allPatterns`

**Type:** `unknown`

**Value:** `[...mainPatterns]`

#### `existingIds`

**Type:** `unknown`

**Value:** `new Set(mainPatterns.map(p => p.id))`

### Dependencies

- `node:fs/promises`
- `zod`
- `../types.js`

---

## src\utils\language-detection

Language Detection System for Multi-Language Code Transformation

This module provides comprehensive language detection based on file extensions
and content analysis, with full Zod schema validation for type safety.

**File:** `src\utils\language-detection.ts`

### Functions

#### `LanguageMappingSchema()`

and content analysis, with full Zod schema validation for type safety.
This module provides comprehensive language detection based on file extensions

Language Detection System for Multi-Language Code Transformation

**Tags:** `exported`

#### `LanguageDetectionRequestSchema()`

**Tags:** `exported`

#### `LanguageDetectionResultSchema()`

**Tags:** `exported`

#### `validateLanguageMapping()`

**Tags:** `exported`

#### `validateLanguageDetectionRequest()`

**Tags:** `exported`

#### `validateLanguageDetectionResult()`

**Tags:** `exported`

### Types

- `safety`
- `LanguageMapping`
- `LanguageDetectionRequest`
- `LanguageDetectionResult`

### Constants

#### `LanguageMappingSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `FILE_EXTENSION_MAP`

**Type:** `Record<string, LanguageMapping>`

**Value:** `{`

#### `LanguageDetectionRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `LanguageDetectionResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `request`

**Type:** `unknown`

**Value:** `LanguageDetectionRequestSchema.parse({ filePath })`

#### `result`

**Type:** `unknown`

**Value:** `detectLanguageFromFileDetailed(request.filePath)`

#### `request`

**Type:** `unknown`

**Value:** `LanguageDetectionRequestSchema.parse({ filePath })`

#### `extension`

**Type:** `unknown`

**Value:** `getFileExtension(request.filePath)`

#### `mapping`

**Type:** `unknown`

**Value:** `FILE_EXTENSION_MAP[extension]`

#### `result`

**Type:** `LanguageDetectionResult`

**Value:** `{`

#### `fallbackResult`

**Type:** `LanguageDetectionResult`

**Value:** `{`

#### `lastDotIndex`

**Type:** `unknown`

**Value:** `filePath.lastIndexOf('.')`

#### `languages`

**Type:** `unknown`

**Value:** `new Set<string>()`

#### `mapping`

**Type:** `unknown`

**Value:** `FILE_EXTENSION_MAP[extension.toLowerCase()]`

#### `extensions`

**Type:** `string[]`

**Value:** `[]`

#### `languageMap`

**Type:** `unknown`

**Value:** `new Map<string`

#### `language`

**Type:** `unknown`

**Value:** `detectLanguageFromFile(filePath)`

#### `distribution`

**Type:** `Record<string, number>`

**Value:** `{}`

#### `language`

**Type:** `unknown`

**Value:** `detectLanguageFromFile(filePath)`

#### `validateLanguageMapping`

**Type:** `unknown`

**Value:** `(mapping: unknown): LanguageMapping => {`

#### `validateLanguageDetectionRequest`

**Type:** `unknown`

**Value:** `(request: unknown): LanguageDetectionRequest => {`

#### `validateLanguageDetectionResult`

**Type:** `unknown`

**Value:** `(result: unknown): LanguageDetectionResult => {`

### Dependencies

- `zod`

---

## src\utils\pattern-filtering

Pattern Filtering System with Language Awareness and Zod Validation

This module provides comprehensive pattern filtering based on language compatibility,
transformation mode, complexity, and risk level with full Zod schema validation.

**File:** `src\utils\pattern-filtering.ts`

### Functions

#### `PatternFilterRequestSchema()`

transformation mode, complexity, and risk level with full Zod schema validation.
This module provides comprehensive pattern filtering based on language compatibility,

Pattern Filtering System with Language Awareness and Zod Validation

**Tags:** `exported`

#### `PatternFilterResultSchema()`

**Tags:** `exported`

#### `TransformationErrorSchema()`

**Tags:** `exported`

### Types

- `AstPattern`
- `TransformationMode`
- `PatternFilterRequest`
- `PatternFilterResult`
- `TransformationError`
- `checking`

### Constants

#### `PatternFilterRequestSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `PatternFilterResultSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `TransformationErrorSchema`

**Type:** `unknown`

**Value:** `z.object({`

#### `validatedErrorInfo`

**Type:** `unknown`

**Value:** `TransformationErrorSchema.parse(errorInfo)`

#### `request`

**Type:** `unknown`

**Value:** `PatternFilterRequestSchema.parse({`

#### `warnings`

**Type:** `string[]`

**Value:** `[]`

#### `errors`

**Type:** `string[]`

**Value:** `[]`

#### `languageMap`

**Type:** `unknown`

**Value:** `detectLanguagesFromFiles(request.targetFiles)`

#### `targetLanguages`

**Type:** `unknown`

**Value:** `new Set(Array.from(languageMap.values()))`

#### `filteredPatterns`

**Type:** `unknown`

**Value:** `request.patterns.filter(pattern => {`

#### `modeMatch`

**Type:** `unknown`

**Value:** `pattern.mode === request.mode ||`

#### `complexityMatch`

**Type:** `unknown`

**Value:** `pattern.complexity <= request.maxComplexity`

#### `riskMatch`

**Type:** `unknown`

**Value:** `request.allowedRiskLevels.includes(pattern.riskLevel)`

#### `languageDistribution`

**Type:** `unknown`

**Value:** `getLanguageDistribution(request.targetFiles)`

#### `modeDistribution`

**Type:** `unknown`

**Value:** `getDistribution(request.patterns`

#### `complexityDistribution`

**Type:** `unknown`

**Value:** `getDistribution(request.patterns`

#### `riskDistribution`

**Type:** `unknown`

**Value:** `getDistribution(request.patterns`

#### `availableLanguages`

**Type:** `unknown`

**Value:** `new Set(request.patterns.map(p => p.language))`

#### `missingLanguages`

**Type:** `unknown`

**Value:** `Array.from(targetLanguages).filter(lang => !availableLanguages.has(lang))`

#### `result`

**Type:** `PatternFilterResult`

**Value:** `{`

#### `result`

**Type:** `unknown`

**Value:** `filterPatternsByLanguageAndMode(patterns`

#### `warnings`

**Type:** `string[]`

**Value:** `[]`

#### `compatible`

**Type:** `AstPattern[]`

**Value:** `[]`

#### `incompatible`

**Type:** `AstPattern[]`

**Value:** `[]`

#### `targetLanguages`

**Type:** `unknown`

**Value:** `new Set(`

#### `distribution`

**Type:** `Record<string, number>`

**Value:** `{}`

#### `value`

**Type:** `unknown`

**Value:** `String(pattern[field] || 'undefined')`

#### `detectedLanguages`

**Type:** `unknown`

**Value:** `Array.from(new Set(`

#### `patternLanguages`

**Type:** `unknown`

**Value:** `Array.from(new Set(`

#### `compatibility`

**Type:** `unknown`

**Value:** `validatePatternCompatibility(patterns`

#### `recommendations`

**Type:** `string[]`

**Value:** `[]`

#### `potentialIssues`

**Type:** `string[]`

**Value:** `[]`

#### `missingLanguages`

**Type:** `unknown`

**Value:** `detectedLanguages.filter(lang =>`

#### `unusedLanguages`

**Type:** `unknown`

**Value:** `patternLanguages.filter(lang =>`

#### `options`

**Type:** `Partial<PatternFilterRequest>`

**Value:** `{}`

#### `validatePatternFilterRequest`

**Type:** `unknown`

**Value:** `(request: unknown): PatternFilterRequest => {`

#### `validatePatternFilterResult`

**Type:** `unknown`

**Value:** `(result: unknown): PatternFilterResult => {`

#### `validateTransformationError`

**Type:** `unknown`

**Value:** `(error: unknown): TransformationError => {`

#### `PRESET_FILTERS`

**Type:** `unknown`

**Value:** `{`

### Dependencies

- `zod`
- `../types.js`
- `./language-detection.js`

---

## src\utils\yaml-handler

YAML Handler - Provably correct YAML processing with Zod validation

Following Carmack principles:
1. Type Safety First - Zod schemas for all operations
2. Error Resilience - Explicit error handling
3. Performance - Efficient parsing and serialization

**File:** `src\utils\yaml-handler.ts`

### Functions

### Types

- `YamlOptions`
- `safety`
- `safety`

### Constants

#### `YamlOptionsSchema`

**Type:** `unknown`

**Value:** `z`

#### `parsed`

**Type:** `unknown`

**Value:** `yaml.load(yamlString)`

#### `fileContent`

**Type:** `unknown`

**Value:** `await readFile(filePath`

#### `validatedOptions`

**Type:** `unknown`

**Value:** `YamlOptionsSchema.parse(options)`

#### `yamlContent`

**Type:** `unknown`

**Value:** `serializeToYaml(data`

#### `data`

**Type:** `unknown`

**Value:** `await parseYamlFile(filePath`

#### `CommonYamlSchemas`

**Type:** `unknown`

**Value:** `{`

#### `YAML`

**Type:** `unknown`

**Value:** `{`

### Dependencies

- `node:fs/promises`
- `js-yaml`
- `zod`

---

