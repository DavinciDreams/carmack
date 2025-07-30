/**
 * AI Processor for Knowledge Graph Query Engine
 *
 * Integrates with BAML for structured AI interactions, fact extraction,
 * hypothesis generation, and response synthesis. Follows Carmack's principles
 * of deterministic AI processing and structured outputs.
 */

import { z } from 'zod';
import type {
  QueryIntent,
  QueryComplexity,
  EvidenceItem,
  Hypothesis,
  InvestigationThread,
} from './contracts.ts';

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

/**
 * Mock BAML client for development
 * In production, this would be replaced with actual BAML integration
 */
class MockBAMLClient implements BAMLClient {
  async extractFacts(input: {
    query: string;
    evidence: EvidenceItem[];
    context: Record<string, unknown>;
  }): Promise<FactExtraction> {
    // Mock fact extraction based on evidence
    const facts = input.evidence.slice(0, 5).map((evidence, index) => ({
      statement: `Fact extracted from ${evidence.artifact_name}: ${evidence.explanation}`,
      confidence: evidence.relevance_score,
      source_artifact_id: evidence.artifact_id,
      evidence_text: evidence.content_snippet || evidence.explanation,
      fact_type: this.inferFactType(evidence.artifact_type) as any,
    }));

    const key_concepts = this.extractKeyConcepts(input.query, input.evidence);
    const technical_terms = this.extractTechnicalTerms(input.evidence);
    const relationships = this.inferRelationships(key_concepts);

    return {
      facts,
      key_concepts,
      technical_terms,
      relationships,
    };
  }

  async generateHypotheses(input: {
    query: string;
    facts: FactExtraction;
    intent: QueryIntent;
    complexity: QueryComplexity;
  }): Promise<HypothesisGeneration> {
    const hypotheses = input.facts.facts.slice(0, 3).map((fact, index) => ({
      statement: `Hypothesis ${index + 1}: ${fact.statement} suggests a pattern in the codebase`,
      confidence: fact.confidence * 0.8,
      reasoning: `Based on the evidence from ${fact.source_artifact_id}, this hypothesis explains the observed behavior`,
      testable_predictions: [
        `Similar patterns should exist in related artifacts`,
        `Performance characteristics should be consistent`,
      ],
      required_evidence: [
        `Additional code examples`,
        `Performance benchmarks`,
        `Historical change data`,
      ],
    }));

    const investigation_directions = this.generateInvestigationDirections(input.intent, input.facts);

    return {
      hypotheses,
      investigation_directions,
    };
  }

  async synthesizeResponse(input: {
    query: string;
    facts: FactExtraction;
    hypotheses: HypothesisGeneration;
    evidence: EvidenceItem[];
    intent: QueryIntent;
  }): Promise<ResponseSynthesis> {
    const primary_answer = this.generatePrimaryAnswer(input);
    const supporting_evidence = input.facts.facts.map(f => f.statement);
    const confidence_assessment = this.assessConfidence(input.facts, input.hypotheses);
    const follow_up_suggestions = this.generateFollowUpSuggestions(input.intent, input.hypotheses);
    const knowledge_gaps = this.identifyKnowledgeGaps(input.facts, input.evidence);

    return {
      primary_answer,
      supporting_evidence,
      confidence_assessment,
      follow_up_suggestions,
      knowledge_gaps,
    };
  }

  async classifyIntent(query: string): Promise<{
    intent: QueryIntent;
    confidence: number;
    reasoning: string;
  }> {
    // Simple keyword-based classification
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('performance') || lowerQuery.includes('optimization')) {
      return {
        intent: 'performance_investigation',
        confidence: 0.8,
        reasoning: 'Query contains performance-related keywords',
      };
    } else if (lowerQuery.includes('history') || lowerQuery.includes('change')) {
      return {
        intent: 'historical_analysis',
        confidence: 0.7,
        reasoning: 'Query asks about historical changes',
      };
    } else if (lowerQuery.includes('architecture') || lowerQuery.includes('design')) {
      return {
        intent: 'architecture_exploration',
        confidence: 0.8,
        reasoning: 'Query focuses on architectural aspects',
      };
    } else {
      return {
        intent: 'technical_question',
        confidence: 0.6,
        reasoning: 'General technical question',
      };
    }
  }

  async assessComplexity(query: string, intent: QueryIntent): Promise<{
    complexity: QueryComplexity;
    factors: string[];
    reasoning: string;
  }> {
    const factors: string[] = [];
    let complexity: QueryComplexity = 'simple';

    const words = query.split(/\s+/).length;
    if (words > 15) {
      factors.push('Long query with multiple concepts');
      complexity = 'complex';
    } else if (words > 8) {
      factors.push('Moderate length query');
      complexity = 'moderate';
    }

    if (/\b(implementation|architecture|optimization)\b/i.test(query)) {
      factors.push('Contains advanced technical terms');
      complexity = complexity === 'simple' ? 'moderate' : 'complex';
    }

    if (intent === 'performance_investigation' || intent === 'architecture_exploration') {
      factors.push('Complex domain area');
      complexity = complexity === 'simple' ? 'moderate' : 'expert';
    }

    return {
      complexity,
      factors,
      reasoning: `Assessed as ${complexity} based on: ${factors.join(', ')}`,
    };
  }

  // Helper methods for mock implementation
  private inferFactType(artifactType: string): string {
    const typeMap: Record<string, string> = {
      'function': 'technical',
      'class': 'architectural',
      'commit': 'historical',
      'pr': 'historical',
      'issue': 'technical',
      'documentation': 'technical',
    };
    return typeMap[artifactType] || 'technical';
  }

  private extractKeyConcepts(query: string, evidence: EvidenceItem[]): string[] {
    const concepts = new Set<string>();
    
    // Extract from query
    const queryWords = query.toLowerCase().split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !/^(the|and|or|but|for|with|from|to|in|on|at)$/.test(word));
    
    queryWords.forEach(word => concepts.add(word));

    // Extract from evidence
    evidence.forEach(item => {
      if (item.artifact_name) {
        const nameWords = item.artifact_name.toLowerCase().split(/[_\s]+/)
          .filter(word => word.length > 2);
        nameWords.forEach(word => concepts.add(word));
      }
    });

    return Array.from(concepts).slice(0, 10);
  }

  private extractTechnicalTerms(evidence: EvidenceItem[]): Array<{
    term: string;
    definition: string;
    context: string;
  }> {
    const terms: Array<{ term: string; definition: string; context: string }> = [];
    
    evidence.slice(0, 3).forEach(item => {
      if (item.artifact_type === 'function' || item.artifact_type === 'class') {
        terms.push({
          term: item.artifact_name,
          definition: `A ${item.artifact_type} in the codebase`,
          context: item.explanation,
        });
      }
    });

    return terms;
  }

  private inferRelationships(concepts: string[]): Array<{
    source_concept: string;
    target_concept: string;
    relationship_type: string;
    confidence: number;
  }> {
    const relationships: Array<{
      source_concept: string;
      target_concept: string;
      relationship_type: string;
      confidence: number;
    }> = [];

    for (let i = 0; i < concepts.length - 1; i++) {
      for (let j = i + 1; j < concepts.length && j < i + 3; j++) {
        relationships.push({
          source_concept: concepts[i]!,
          target_concept: concepts[j]!,
          relationship_type: 'related_to',
          confidence: 0.6,
        });
      }
    }

    return relationships.slice(0, 5);
  }

  private generateInvestigationDirections(
    intent: QueryIntent,
    facts: FactExtraction
  ): Array<{
    direction: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    expected_findings: string[];
  }> {
    const directions: Array<{
      direction: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      expected_findings: string[];
    }> = [];

    switch (intent) {
      case 'performance_investigation':
        directions.push({
          direction: 'Analyze performance bottlenecks',
          priority: 'high' as const,
          expected_findings: ['CPU usage patterns', 'Memory allocation patterns', 'I/O bottlenecks'],
        });
        break;
      case 'historical_analysis':
        directions.push({
          direction: 'Trace code evolution',
          priority: 'medium' as const,
          expected_findings: ['Change patterns', 'Author contributions', 'Feature development timeline'],
        });
        break;
      default:
        directions.push({
          direction: 'Explore related components',
          priority: 'medium' as const,
          expected_findings: ['Related functions', 'Dependencies', 'Usage patterns'],
        });
    }

    return directions;
  }

  private generatePrimaryAnswer(input: {
    query: string;
    facts: FactExtraction;
    hypotheses: HypothesisGeneration;
    evidence: EvidenceItem[];
    intent: QueryIntent;
  }): string {
    const topFacts = input.facts.facts.slice(0, 3);
    const topHypothesis = input.hypotheses.hypotheses[0];

    let answer = `Based on my analysis of ${input.evidence.length} relevant artifacts, `;
    
    if (topFacts.length > 0) {
      answer += `I found that ${topFacts[0]!.statement.toLowerCase()}. `;
    }

    if (topHypothesis) {
      answer += `${topHypothesis.statement} `;
      answer += `This hypothesis has a confidence of ${(topHypothesis.confidence * 100).toFixed(1)}%. `;
    }

    answer += `The analysis suggests that ${input.query.toLowerCase()} involves multiple components working together. `;

    if (input.facts.key_concepts.length > 0) {
      answer += `Key concepts include: ${input.facts.key_concepts.slice(0, 3).join(', ')}.`;
    }

    return answer;
  }

  private assessConfidence(
    facts: FactExtraction,
    hypotheses: HypothesisGeneration
  ): {
    overall_confidence: number;
    confidence_factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
    }>;
  } {
    const factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
    }> = [];
    let totalConfidence = 0;
    let totalWeight = 0;

    if (facts.facts.length > 0) {
      const avgFactConfidence = facts.facts.reduce((sum, f) => sum + f.confidence, 0) / facts.facts.length;
      factors.push({
        factor: `${facts.facts.length} facts extracted`,
        impact: 'positive' as const,
        weight: 0.4,
      });
      totalConfidence += avgFactConfidence * 0.4;
      totalWeight += 0.4;
    }

    if (hypotheses.hypotheses.length > 0) {
      const avgHypothesisConfidence = hypotheses.hypotheses.reduce((sum, h) => sum + h.confidence, 0) / hypotheses.hypotheses.length;
      factors.push({
        factor: `${hypotheses.hypotheses.length} hypotheses generated`,
        impact: 'positive' as const,
        weight: 0.3,
      });
      totalConfidence += avgHypothesisConfidence * 0.3;
      totalWeight += 0.3;
    }

    factors.push({
      factor: 'Evidence quality',
      impact: 'positive' as const,
      weight: 0.3,
    });
    totalConfidence += 0.7 * 0.3; // Assume good evidence quality
    totalWeight += 0.3;

    return {
      overall_confidence: totalWeight > 0 ? totalConfidence / totalWeight : 0,
      confidence_factors: factors,
    };
  }

  private generateFollowUpSuggestions(
    intent: QueryIntent,
    hypotheses: HypothesisGeneration
  ): string[] {
    const suggestions: string[] = [];

    if (hypotheses.hypotheses.length > 0) {
      const topHypothesis = hypotheses.hypotheses[0]!;
      suggestions.push(`Test the hypothesis: ${topHypothesis.statement}`);
      suggestions.push(...topHypothesis.testable_predictions.slice(0, 2));
    }

    switch (intent) {
      case 'performance_investigation':
        suggestions.push('Analyze performance benchmarks');
        suggestions.push('Compare with baseline measurements');
        break;
      case 'historical_analysis':
        suggestions.push('Examine recent commit history');
        suggestions.push('Identify key contributors');
        break;
      default:
        suggestions.push('Explore related components');
        suggestions.push('Look for usage examples');
    }

    return suggestions.slice(0, 5);
  }

  private identifyKnowledgeGaps(
    facts: FactExtraction,
    evidence: EvidenceItem[]
  ): string[] {
    const gaps: string[] = [];

    if (facts.facts.length < 3) {
      gaps.push('Limited factual evidence available');
    }

    if (evidence.length < 5) {
      gaps.push('Insufficient code examples');
    }

    if (facts.technical_terms.length < 2) {
      gaps.push('Missing technical context');
    }

    gaps.push('Performance data not available');
    gaps.push('Historical context incomplete');

    return gaps.slice(0, 3);
  }
}

// =============================================================================
// AI PROCESSOR CORE
// =============================================================================

/**
 * AI Processor for intelligent query analysis and response generation
 */
export class AIProcessor {
  private bamlClient: BAMLClient;

  constructor() {
    // In production, this would initialize the actual BAML client
    this.bamlClient = new MockBAMLClient();
  }

  /**
   * Process query with AI-powered analysis
   */
  async processQuery(input: {
    query: string;
    evidence: EvidenceItem[];
    intent: QueryIntent;
    complexity: QueryComplexity;
    context: Record<string, unknown>;
  }): Promise<{
    facts: FactExtraction;
    hypotheses: HypothesisGeneration;
    synthesis: ResponseSynthesis;
    enhanced_evidence: EvidenceItem[];
  }> {
    const startTime = Date.now();

    try {
      // Extract facts from evidence
      const facts = await this.bamlClient.extractFacts({
        query: input.query,
        evidence: input.evidence,
        context: input.context,
      });

      // Generate hypotheses
      const hypotheses = await this.bamlClient.generateHypotheses({
        query: input.query,
        facts,
        intent: input.intent,
        complexity: input.complexity,
      });

      // Synthesize response
      const synthesis = await this.bamlClient.synthesizeResponse({
        query: input.query,
        facts,
        hypotheses,
        evidence: input.evidence,
        intent: input.intent,
      });

      // Enhance evidence with AI insights
      const enhanced_evidence = this.enhanceEvidence(input.evidence, facts);

      return {
        facts,
        hypotheses,
        synthesis,
        enhanced_evidence,
      };
    } catch (error) {
      throw new AIProcessorError(
        'AI processing failed',
        'PROCESSING_ERROR',
        {
          input,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime,
        }
      );
    }
  }

  /**
   * Classify query intent using AI
   */
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
   * Generate investigation threads from hypotheses
   */
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

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Enhance evidence with AI-extracted insights
   */
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