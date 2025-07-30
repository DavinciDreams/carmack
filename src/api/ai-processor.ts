import { z } from 'zod';

import type {
    QueryIntent,
  QueryComplexity,
  EvidenceItem,
  Hypothesis,
  InvestigationThread,
} from './contracts.ts';

/**
 * AI Processor for Knowledge Graph Query Engine
 *
 * Integrates with BAML for structured AI interactions, fact extraction,
 * hypothesis generation, and response synthesis. Follows Carmack's principles
 * of deterministic AI processing and structured outputs.
 */



// =============================================================================
// AI PROCESSOR ERRORS
// =============================================================================

export class AIProcessorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIProcessorError';
  }
}

export class BAMLIntegrationError extends AIProcessorError {
  constructor(
    message: string,
    public override readonly context?: Record<string, unknown>
  ) {
    super(message, 'BAML_INTEGRATION_ERROR', context);
  }
}

// =============================================================================
// AI PROCESSING SCHEMAS
// =============================================================================

/**
 * Fact extraction result schema
 */
export const FactExtractionSchema = z.object({
  facts: z.array(z.object({
    statement: z.string(),
    confidence: z.number().min(0).max(1),
    source_artifact_id: z.string().uuid(),
    evidence_text: z.string(),
    fact_type: z.enum(['technical', 'historical', 'performance', 'architectural']),
  })),
  key_concepts: z.array(z.string()),
  technical_terms: z.array(z.object({
    term: z.string(),
    definition: z.string(),
    context: z.string(),
  })),
  relationships: z.array(z.object({
    source_concept: z.string(),
    target_concept: z.string(),
    relationship_type: z.string(),
    confidence: z.number().min(0).max(1),
  })),
});

export type FactExtraction = z.infer<typeof FactExtractionSchema>;

/**
 * Hypothesis generation schema
 */
export const HypothesisGenerationSchema = z.object({
  hypotheses: z.array(z.object({
    statement: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    testable_predictions: z.array(z.string()),
    required_evidence: z.array(z.string()),
  })),
  investigation_directions: z.array(z.object({
    direction: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    expected_findings: z.array(z.string()),
  })),
});

export type HypothesisGeneration = z.infer<typeof HypothesisGenerationSchema>;

/**
 * Response synthesis schema
 */
export const ResponseSynthesisSchema = z.object({
  primary_answer: z.string(),
  supporting_evidence: z.array(z.string()),
  confidence_assessment: z.object({
    overall_confidence: z.number().min(0).max(1),
    confidence_factors: z.array(z.object({
      factor: z.string(),
      impact: z.enum(['positive', 'negative', 'neutral']),
      weight: z.number().min(0).max(1),
    })),
  }),
  follow_up_suggestions: z.array(z.string()),
  knowledge_gaps: z.array(z.string()),
});

export type ResponseSynthesis = z.infer<typeof ResponseSynthesisSchema>;

// =============================================================================
// BAML CLIENT INTERFACE
// =============================================================================

/**
 * BAML client interface for AI operations
 * In production, this would integrate with actual BAML client
 */

interface BAMLClient {
  extractFacts(input: {
    query: string;
    evidence: EvidenceItem[];
    context: Record<string, unknown>;
  }): Promise<FactExtraction>;

  generateHypotheses(input: {
    query: string;
    facts: FactExtraction;
    intent: QueryIntent;
    complexity: QueryComplexity;
  }): Promise<HypothesisGeneration>;

  synthesizeResponse(input: {
    query: string;
    facts: FactExtraction;
    hypotheses: HypothesisGeneration;
    evidence: EvidenceItem[];
    intent: QueryIntent;
  }): Promise<ResponseSynthesis>;

  classifyIntent(query: string): Promise<{
    intent: QueryIntent;
    confidence: number;
    reasoning: string;
  }>;

  assessComplexity(query: string, intent: QueryIntent): Promise<{
    complexity: QueryComplexity;
    factors: string[];
    reasoning: string;
  }>;
}

// Placeholder for RealBAMLClient if not already defined
declare class RealBAMLClient implements BAMLClient {
  extractFacts: BAMLClient['extractFacts'];
  generateHypotheses: BAMLClient['generateHypotheses'];
  synthesizeResponse: BAMLClient['synthesizeResponse'];
  classifyIntent: BAMLClient['classifyIntent'];
  assessComplexity: BAMLClient['assessComplexity'];
}





// =============================================================================
// AI PROCESSOR CORE
// =============================================================================

/**
 * AI Processor for intelligent query analysis and response generation
 */
export class AIProcessor {
  private bamlClient: BAMLClient;

  constructor(bamlClient?: BAMLClient) {
    // Use provided client or default to real BAML client
    this.bamlClient = bamlClient || new RealBAMLClient();
  }

  async classifyIntent(query: string): Promise<{
    intent: QueryIntent;
    confidence: number;
    reasoning: string;
  }> {
    try {
      return await this.bamlClient.classifyIntent(query);
    } catch (error) {
      throw new AIProcessorError(
        'Intent classification failed',
        'INTENT_CLASSIFICATION_ERROR',
        {
          query,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Assess query complexity using AI
   */
  async assessComplexity(query: string, intent: QueryIntent): Promise<{
    complexity: QueryComplexity;
    factors: string[];
    reasoning: string;
  }> {
    try {
      return await this.bamlClient.assessComplexity(query, intent);
    } catch (error) {
      throw new AIProcessorError(
        'Complexity assessment failed',
        'COMPLEXITY_ASSESSMENT_ERROR',
        {
          query,
          intent,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Extract facts from query and evidence using BAML
   */
  async extractFacts(input: {
    query: string;
    evidence: EvidenceItem[];
    intent: QueryIntent;
    complexity: QueryComplexity;
    context?: Record<string, unknown>;
  }): Promise<FactExtraction> {
    try {
      // BAML expects context to be present, but may be optional
      return await this.bamlClient.extractFacts({
        query: input.query,
        evidence: input.evidence,
        context: input.context || {},
      });
    } catch (error) {
      throw new AIProcessorError(
        'Fact extraction failed',
        'FACT_EXTRACTION_ERROR',
        { input, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Generate hypotheses from facts using BAML
   */
  async generateHypotheses(input: {
    query: string;
    facts: FactExtraction;
    intent: QueryIntent;
    complexity: QueryComplexity;
    context?: Record<string, unknown>;
  }): Promise<HypothesisGeneration> {
    try {
      return await this.bamlClient.generateHypotheses({
        query: input.query,
        facts: input.facts,
        intent: input.intent,
        complexity: input.complexity,
      });
    } catch (error) {
      throw new AIProcessorError(
        'Hypothesis generation failed',
        'HYPOTHESIS_GENERATION_ERROR',
        { input, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Synthesize a response from facts and hypotheses using BAML
   */
  async synthesize(input: {
    query: string;
    facts: FactExtraction;
    hypotheses: HypothesisGeneration;
    intent: QueryIntent;
    complexity: QueryComplexity;
    context?: Record<string, unknown>;
  }): Promise<ResponseSynthesis> {
    try {
      return await this.bamlClient.synthesizeResponse({
        query: input.query,
        facts: input.facts,
        hypotheses: input.hypotheses,
        evidence: [], // Optionally pass evidence if needed
        intent: input.intent,
      });
    } catch (error) {
      throw new AIProcessorError(
        'Response synthesis failed',
        'RESPONSE_SYNTHESIS_ERROR',
        { input, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  generateInvestigationThreads(
    hypotheses: HypothesisGeneration,
    facts: FactExtraction
  ): InvestigationThread[] {
    return hypotheses.investigation_directions.map(direction => ({
      id: crypto.randomUUID(),
      title: direction.direction,
      description: `Investigation into ${direction.direction.toLowerCase()}`,
      priority: direction.priority,
      status: 'active' as const,
      hypotheses: hypotheses.hypotheses.slice(0, 2).map(h => ({
        id: crypto.randomUUID(),
        statement: h.statement,
        confidence: h.confidence,
        evidence_items: [],
        supporting_relationships: [],
        generated_at: new Date(),
      })),
      follow_up_questions: direction.expected_findings.map(finding => 
        `What evidence supports ${finding.toLowerCase()}?`
      ),
      created_at: new Date(),
      updated_at: new Date(),
    }));
  }

  private enhanceEvidence(evidence: EvidenceItem[], facts: FactExtraction): EvidenceItem[] {
    return evidence.map(item => {
      // Find related facts
      const relatedFacts = facts.facts.filter(fact => 
        fact.source_artifact_id === item.artifact_id
      );

      // Enhance explanation with AI insights
      let enhancedExplanation = item.explanation;
      if (relatedFacts.length > 0) {
        const topFact = relatedFacts[0]!;
        enhancedExplanation += ` AI Analysis: ${topFact.statement}`;
      }

      return {
        ...item,
        explanation: enhancedExplanation,
      };
    });
  }
}