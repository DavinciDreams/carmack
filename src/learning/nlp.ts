import { z } from 'zod';
import type { NLPAnalysis, Vector } from './types.ts';

/**
 * Natural Language Processing System for Pattern Analysis
 *
 * Implements text analysis, sentiment analysis, keyword extraction,
 * and semantic understanding for pattern descriptions and user feedback.
 */

// NLP Configuration Schema
const NLPConfigSchema = z
  .object({
    embeddingModel: z.string().default('sentence-transformers'),
    maxTokens: z.number().int().positive().default(512),
    languages: z.array(z.string()).default(['en']),
    enableSentimentAnalysis: z.boolean().default(true),
    enableKeywordExtraction: z.boolean().default(true),
    enableIntentClassification: z.boolean().default(true),
    enableTopicModeling: z.boolean().default(true),
    minKeywordScore: z.number().min(0).max(1).default(0.3),
    maxKeywords: z.number().int().positive().default(20),
  })
  .strict();

export type NLPConfig = z.infer<typeof NLPConfigSchema>;

// Text preprocessing result
const PreprocessedTextSchema = z
  .object({
    originalText: z.string(),
    cleanedText: z.string(),
    tokens: z.array(z.string()),
    sentences: z.array(z.string()),
    wordCount: z.number().int().min(0),
    characterCount: z.number().int().min(0),
    language: z.string(),
  })
  .strict();

export type PreprocessedText = z.infer<typeof PreprocessedTextSchema>;

// Keyword extraction result
const KeywordSchema = z
  .object({
    word: z.string(),
    score: z.number().min(0).max(1),
    frequency: z.number().int().min(0),
    position: z.number().int().min(0),
    category: z.enum(['technical', 'domain', 'action', 'quality', 'general']).optional(),
  })
  .strict();

export type Keyword = z.infer<typeof KeywordSchema>;

// Sentiment analysis result
const SentimentSchema = z
  .object({
    score: z.number().min(-1).max(1), // -1 = very negative, 0 = neutral, 1 = very positive
    confidence: z.number().min(0).max(1),
    label: z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']),
    aspects: z
      .array(
        z.object({
          aspect: z.string(),
          sentiment: z.number().min(-1).max(1),
          confidence: z.number().min(0).max(1),
        })
      )
      .optional(),
  })
  .strict();

export type Sentiment = z.infer<typeof SentimentSchema>;

// Intent classification result
const IntentSchema = z
  .object({
    intent: z.enum(['refactor', 'optimize', 'modernize', 'fix', 'enhance']),
    confidence: z.number().min(0).max(1),
    subIntents: z
      .array(
        z.object({
          intent: z.string(),
          confidence: z.number().min(0).max(1),
        })
      )
      .optional(),
  })
  .strict();

export type Intent = z.infer<typeof IntentSchema>;

// Topic modeling result
const TopicSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    keywords: z.array(z.string()),
    probability: z.number().min(0).max(1),
    coherence: z.number().min(0).max(1),
  })
  .strict();

export type Topic = z.infer<typeof TopicSchema>;

/**
 * Text Preprocessor
 * Handles text cleaning, tokenization, and normalization
 */
class TextPreprocessor {
  private stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'me',
    'him',
    'her',
    'us',
    'them',
    'my',
    'your',
    'his',
    'her',
    'its',
    'our',
    'their',
    'mine',
    'yours',
    'hers',
    'ours',
    'theirs',
  ]);

  private codeKeywords = new Set([
    'function',
    'class',
    'method',
    'variable',
    'const',
    'let',
    'var',
    'if',
    'else',
    'for',
    'while',
    'return',
    'import',
    'export',
    'async',
    'await',
    'promise',
    'callback',
    'api',
    'interface',
    'type',
    'enum',
    'namespace',
    'module',
    'component',
    'service',
    'controller',
    'model',
    'view',
  ]);

  /**
   * Preprocess text for NLP analysis
   */
  preprocess(text: string): PreprocessedText {
    const originalText = text;

    // Basic cleaning
    let cleanedText = text
      .toLowerCase()
      .replace(/[^\w\s\-\.]/g, ' ') // Remove special characters except hyphens and dots
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Tokenization
    const tokens = this.tokenize(cleanedText);

    // Sentence splitting
    const sentences = this.splitSentences(originalText);

    // Language detection (simplified)
    const language = this.detectLanguage(originalText);

    return {
      originalText,
      cleanedText,
      tokens,
      sentences,
      wordCount: tokens.length,
      characterCount: originalText.length,
      language,
    };
  }

  private tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .filter((token) => token.length > 1)
      .filter((token) => !this.stopWords.has(token));
  }

  private splitSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);
  }

  private detectLanguage(text: string): string {
    // Simplified language detection - in a real implementation,
    // this would use a proper language detection library
    const englishWords = ['the', 'and', 'or', 'but', 'is', 'are', 'was', 'were'];
    const englishCount = englishWords.reduce((count, word) => {
      return count + (text.toLowerCase().includes(word) ? 1 : 0);
    }, 0);

    return englishCount > 2 ? 'en' : 'unknown';
  }

  /**
   * Check if token is a code-related keyword
   */
  isCodeKeyword(token: string): boolean {
    return this.codeKeywords.has(token.toLowerCase());
  }
}

/**
 * Keyword Extractor
 * Extracts important keywords and phrases from text
 */
class KeywordExtractor {
  private preprocessor = new TextPreprocessor();

  /**
   * Extract keywords from text using TF-IDF-like scoring
   */
  extractKeywords(text: string, maxKeywords: number = 20): Keyword[] {
    const preprocessed = this.preprocessor.preprocess(text);
    const tokens = preprocessed.tokens;

    // Calculate term frequencies
    const termFreq = new Map<string, number>();
    tokens.forEach((token) => {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    });

    // Calculate keyword scores
    const keywords: Keyword[] = [];
    for (const [word, frequency] of termFreq.entries()) {
      const score = this.calculateKeywordScore(
        word,
        frequency,
        tokens.length,
        preprocessed.originalText
      );
      const position = preprocessed.originalText.toLowerCase().indexOf(word.toLowerCase());
      const category = this.categorizeKeyword(word);

      keywords.push({
        word,
        score,
        frequency,
        position,
        category,
      });
    }

    // Sort by score and return top keywords
    return keywords.sort((a, b) => b.score - a.score).slice(0, maxKeywords);
  }

  private calculateKeywordScore(
    word: string,
    frequency: number,
    totalTokens: number,
    originalText: string
  ): number {
    // Base TF score
    const tf = frequency / totalTokens;

    // Length bonus (longer words are often more meaningful)
    const lengthBonus = Math.min(word.length / 10, 1);

    // Position bonus (words appearing early are often more important)
    const position = originalText.toLowerCase().indexOf(word.toLowerCase());
    const positionBonus = position === -1 ? 0 : Math.max(0, 1 - position / originalText.length);

    // Code keyword bonus
    const codeBonus = this.preprocessor.isCodeKeyword(word) ? 0.5 : 0;

    // Capitalization bonus (proper nouns, acronyms)
    const capBonus = /^[A-Z]/.test(word) ? 0.3 : 0;

    return tf + lengthBonus * 0.3 + positionBonus * 0.2 + codeBonus + capBonus;
  }

  private categorizeKeyword(
    word: string
  ): 'technical' | 'domain' | 'action' | 'quality' | 'general' {
    const technical = ['function', 'class', 'method', 'api', 'interface', 'component', 'service'];
    const domain = ['typescript', 'javascript', 'react', 'node', 'frontend', 'backend', 'database'];
    const action = ['refactor', 'optimize', 'improve', 'fix', 'enhance', 'update', 'modernize'];
    const quality = ['performance', 'security', 'maintainability', 'readability', 'scalability'];

    const lowerWord = word.toLowerCase();

    if (technical.some((t) => lowerWord.includes(t))) return 'technical';
    if (domain.some((d) => lowerWord.includes(d))) return 'domain';
    if (action.some((a) => lowerWord.includes(a))) return 'action';
    if (quality.some((q) => lowerWord.includes(q))) return 'quality';

    return 'general';
  }
}

/**
 * Sentiment Analyzer
 * Analyzes emotional tone and sentiment of text
 */
class SentimentAnalyzer {
  private positiveWords = new Set([
    'good',
    'great',
    'excellent',
    'amazing',
    'wonderful',
    'fantastic',
    'perfect',
    'best',
    'love',
    'like',
    'enjoy',
    'happy',
    'pleased',
    'satisfied',
    'impressed',
    'awesome',
    'efficient',
    'fast',
    'clean',
    'elegant',
    'simple',
    'clear',
    'useful',
    'helpful',
  ]);

  private negativeWords = new Set([
    'bad',
    'terrible',
    'awful',
    'horrible',
    'worst',
    'hate',
    'dislike',
    'annoying',
    'frustrated',
    'disappointed',
    'confused',
    'difficult',
    'hard',
    'complex',
    'slow',
    'broken',
    'buggy',
    'error',
    'problem',
    'issue',
    'fail',
    'wrong',
    'poor',
  ]);

  private intensifiers = new Map([
    ['very', 1.5],
    ['extremely', 2.0],
    ['really', 1.3],
    ['quite', 1.2],
    ['somewhat', 0.8],
    ['slightly', 0.6],
    ['not', -1.0],
    ['never', -1.0],
  ]);

  /**
   * Analyze sentiment of text
   */
  analyzeSentiment(text: string): Sentiment {
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let wordCount = 0;
    let intensifier = 1.0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i]!.replace(/[^\w]/g, '');

      // Check for intensifiers
      if (this.intensifiers.has(word)) {
        intensifier = this.intensifiers.get(word)!;
        continue;
      }

      // Calculate sentiment for this word
      let wordSentiment = 0;
      if (this.positiveWords.has(word)) {
        wordSentiment = 1;
      } else if (this.negativeWords.has(word)) {
        wordSentiment = -1;
      }

      if (wordSentiment !== 0) {
        score += wordSentiment * intensifier;
        wordCount++;
        intensifier = 1.0; // Reset intensifier after use
      }
    }

    // Normalize score
    const normalizedScore = wordCount > 0 ? Math.max(-1, Math.min(1, score / wordCount)) : 0;

    // Calculate confidence based on number of sentiment words found
    const confidence = Math.min(1, wordCount / Math.max(1, words.length * 0.1));

    // Determine label
    const label = this.scoreToLabel(normalizedScore);

    return {
      score: normalizedScore,
      confidence,
      label,
    };
  }

  private scoreToLabel(
    score: number
  ): 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' {
    if (score <= -0.6) return 'very_negative';
    if (score <= -0.2) return 'negative';
    if (score >= 0.6) return 'very_positive';
    if (score >= 0.2) return 'positive';
    return 'neutral';
  }
}

/**
 * Intent Classifier
 * Classifies the intent or purpose of text
 */
class IntentClassifier {
  private intentPatterns = new Map([
    [
      'refactor',
      [
        'refactor',
        'restructure',
        'reorganize',
        'clean up',
        'rewrite',
        'analyze',
        'review',
        'examine',
      ],
    ],
    [
      'optimize',
      ['optimize', 'improve performance', 'speed up', 'make faster', 'efficiency', 'performance'],
    ],
    [
      'modernize',
      ['modernize', 'update', 'upgrade', 'latest', 'current', 'new version', 'document', 'comment'],
    ],
    ['fix', ['fix', 'bug', 'error', 'issue', 'problem', 'broken', 'repair', 'debug']],
    [
      'enhance',
      [
        'enhance',
        'improve',
        'better',
        'add feature',
        'extend',
        'augment',
        'explain',
        'describe',
        'clarify',
      ],
    ],
  ]);

  /**
   * Classify the intent of text
   */
  classifyIntent(text: string): Intent {
    const lowerText = text.toLowerCase();
    const scores = new Map<string, number>();

    // Calculate scores for each intent
    for (const [intent, patterns] of this.intentPatterns.entries()) {
      let score = 0;
      for (const pattern of patterns) {
        if (lowerText.includes(pattern)) {
          score += 1;
        }
      }
      scores.set(intent, score);
    }

    // Find the highest scoring intent
    let bestIntent = 'enhance';
    let bestScore = 0;
    for (const [intent, score] of scores.entries()) {
      if (score > bestScore) {
        bestIntent = intent;
        bestScore = score;
      }
    }

    // Calculate confidence
    const totalMatches = Array.from(scores.values()).reduce((sum, score) => sum + score, 0);
    const confidence = totalMatches > 0 ? bestScore / totalMatches : 0.1;

    return {
      intent: bestIntent as Intent['intent'],
      confidence: Math.min(1, confidence),
    };
  }
}

/**
 * Semantic Embedding Generator
 * Creates vector representations of text for semantic similarity
 */
class SemanticEmbedding {
  /**
   * Generate semantic embedding for text
   * This is a simplified implementation - in production, you'd use a pre-trained model
   */
  generateEmbedding(text: string): Vector {
    const preprocessor = new TextPreprocessor();
    const keywordExtractor = new KeywordExtractor();

    const preprocessed = preprocessor.preprocess(text);
    const keywords = keywordExtractor.extractKeywords(text, 50);

    // Create a feature vector based on various text characteristics
    const features: number[] = [];

    // Length features
    features.push(Math.min(preprocessed.wordCount / 100, 1)); // Normalized word count
    features.push(Math.min(preprocessed.characterCount / 1000, 1)); // Normalized char count
    features.push(preprocessed.sentences.length / 10); // Sentence count

    // Keyword category features
    const categoryCount = { technical: 0, domain: 0, action: 0, quality: 0, general: 0 };
    keywords.forEach((keyword) => {
      if (keyword.category) {
        categoryCount[keyword.category]++;
      }
    });

    features.push(categoryCount.technical / keywords.length);
    features.push(categoryCount.domain / keywords.length);
    features.push(categoryCount.action / keywords.length);
    features.push(categoryCount.quality / keywords.length);
    features.push(categoryCount.general / keywords.length);

    // Top keyword features (use scores of top 10 keywords)
    const topKeywords = keywords.slice(0, 10);
    for (let i = 0; i < 10; i++) {
      features.push(topKeywords[i]?.score || 0);
    }

    // Sentiment features
    const sentimentAnalyzer = new SentimentAnalyzer();
    const sentiment = sentimentAnalyzer.analyzeSentiment(text);
    features.push((sentiment.score + 1) / 2); // Normalize to 0-1
    features.push(sentiment.confidence);

    // Intent features
    const intentClassifier = new IntentClassifier();
    const intent = intentClassifier.classifyIntent(text);
    features.push(intent.confidence);

    // Pad or truncate to fixed size (50 dimensions)
    while (features.length < 50) {
      features.push(0);
    }

    return features.slice(0, 50);
  }
}

/**
 * Main NLP Analyzer
 * Coordinates all NLP analysis components
 */
export class NLPAnalyzer {
  private config: NLPConfig;
  private preprocessor = new TextPreprocessor();
  private keywordExtractor = new KeywordExtractor();
  private sentimentAnalyzer = new SentimentAnalyzer();
  private intentClassifier = new IntentClassifier();
  private semanticEmbedding = new SemanticEmbedding();

  constructor(config: Partial<NLPConfig> = {}) {
    this.config = NLPConfigSchema.parse(config);
  }

  /**
   * Perform comprehensive NLP analysis on text
   */
  async analyzeText(patternId: string, description: string): Promise<NLPAnalysis> {
    // Preprocess text
    const preprocessed = this.preprocessor.preprocess(description);

    // Extract keywords
    const keywords = this.config.enableKeywordExtraction
      ? this.keywordExtractor
          .extractKeywords(description, this.config.maxKeywords)
          .filter((keyword) => keyword.score >= this.config.minKeywordScore)
          .map((keyword) => keyword.word)
      : [];

    // Analyze sentiment
    const sentiment = this.config.enableSentimentAnalysis
      ? this.sentimentAnalyzer.analyzeSentiment(description)
      : { score: 0, confidence: 0, label: 'neutral' as const };

    // Classify intent
    const intent = this.config.enableIntentClassification
      ? this.intentClassifier.classifyIntent(description)
      : { intent: 'enhance' as const, confidence: 0 };

    // Generate semantic embedding
    const semanticEmbedding = this.semanticEmbedding.generateEmbedding(description);

    // Extract domain information
    const domain = this.extractDomain(keywords, description);

    // Calculate complexity score
    const complexity = this.calculateComplexity(preprocessed, keywords);

    return {
      patternId,
      description,
      extractedFeatures: {
        keywords,
        sentiment: sentiment.score,
        complexity,
        intent: intent.intent,
        domain,
      },
      semanticEmbedding,
      relatedConcepts: this.extractRelatedConcepts(keywords, description),
    };
  }

  /**
   * Analyze user feedback text
   */
  async analyzeFeedback(feedbackText: string): Promise<{
    sentiment: Sentiment;
    intent: Intent;
    keywords: string[];
    suggestions: string[];
  }> {
    const sentiment = this.sentimentAnalyzer.analyzeSentiment(feedbackText);
    const intent = this.intentClassifier.classifyIntent(feedbackText);
    const keywords = this.keywordExtractor
      .extractKeywords(feedbackText, 10)
      .map((keyword) => keyword.word);

    const suggestions = this.generateSuggestions(sentiment, intent, keywords);

    return {
      sentiment,
      intent,
      keywords,
      suggestions,
    };
  }

  /**
   * Compare semantic similarity between two texts
   */
  calculateSemanticSimilarity(text1: string, text2: string): number {
    const embedding1 = this.semanticEmbedding.generateEmbedding(text1);
    const embedding2 = this.semanticEmbedding.generateEmbedding(text2);

    // Calculate cosine similarity
    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * (embedding2[i] ?? 0), 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  private extractDomain(keywords: string[], description: string): string[] {
    const domains = new Set<string>();
    const domainKeywords = {
      frontend: [
        'react',
        'vue',
        'angular',
        'html',
        'css',
        'javascript',
        'typescript',
        'ui',
        'component',
      ],
      backend: [
        'node',
        'express',
        'api',
        'server',
        'database',
        'sql',
        'mongodb',
        'rest',
        'graphql',
      ],
      mobile: ['react-native', 'flutter', 'ios', 'android', 'mobile', 'app'],
      devops: ['docker', 'kubernetes', 'ci', 'cd', 'deployment', 'infrastructure', 'cloud'],
      testing: ['test', 'unit', 'integration', 'e2e', 'jest', 'cypress', 'testing'],
      security: [
        'security',
        'auth',
        'authentication',
        'authorization',
        'encryption',
        'vulnerability',
      ],
    };

    const lowerDescription = description.toLowerCase();
    const lowerKeywords = keywords.map((k) => k.toLowerCase());

    for (const [domain, domainWords] of Object.entries(domainKeywords)) {
      const hasMatch = domainWords.some(
        (word) => lowerDescription.includes(word) || lowerKeywords.includes(word)
      );
      if (hasMatch) {
        domains.add(domain);
      }
    }

    return Array.from(domains);
  }

  private calculateComplexity(preprocessed: PreprocessedText, keywords: string[]): number {
    // Base complexity from text length
    const lengthComplexity = Math.min(preprocessed.wordCount / 50, 1);

    // Technical keyword complexity
    const technicalKeywords = keywords.filter((keyword) =>
      this.preprocessor.isCodeKeyword(keyword)
    );
    const technicalComplexity = Math.min(technicalKeywords.length / 10, 1);

    // Sentence complexity
    const avgSentenceLength = preprocessed.wordCount / Math.max(preprocessed.sentences.length, 1);
    const sentenceComplexity = Math.min(avgSentenceLength / 20, 1);

    return Math.min(((lengthComplexity + technicalComplexity + sentenceComplexity) / 3) * 10, 10);
  }

  private extractRelatedConcepts(
    keywords: string[],
    description: string
  ): Array<{ concept: string; relevance: number }> {
    const concepts = new Map<string, number>();

    // Extract concepts from keywords
    keywords.forEach((keyword, index) => {
      const relevance = Math.max(0.1, 1 - index / keywords.length);
      concepts.set(keyword, relevance);
    });

    // Add related technical concepts
    const technicalConcepts = {
      performance: ['optimization', 'speed', 'efficiency', 'memory'],
      maintainability: ['readability', 'documentation', 'structure', 'organization'],
      scalability: ['growth', 'expansion', 'load', 'capacity'],
      security: ['safety', 'protection', 'vulnerability', 'encryption'],
    };

    const lowerDescription = description.toLowerCase();
    for (const [concept, related] of Object.entries(technicalConcepts)) {
      if (
        lowerDescription.includes(concept) ||
        keywords.some((k) => k.toLowerCase().includes(concept))
      ) {
        related.forEach((relatedConcept) => {
          if (!concepts.has(relatedConcept)) {
            concepts.set(relatedConcept, 0.5);
          }
        });
      }
    }

    return Array.from(concepts.entries())
      .map(([concept, relevance]) => ({ concept, relevance }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }

  private generateSuggestions(sentiment: Sentiment, intent: Intent, keywords: string[]): string[] {
    const suggestions: string[] = [];

    // Sentiment-based suggestions
    if (sentiment.score < -0.3) {
      suggestions.push('Consider addressing user concerns about usability');
      suggestions.push('Review pattern effectiveness and user experience');
    } else if (sentiment.score > 0.3) {
      suggestions.push('Pattern shows positive user feedback - consider promoting');
      suggestions.push('Document successful aspects for reuse');
    }

    // Intent-based suggestions
    switch (intent.intent) {
      case 'fix':
        suggestions.push('Prioritize bug fixes and error resolution');
        break;
      case 'optimize':
        suggestions.push('Focus on performance improvements');
        break;
      case 'modernize':
        suggestions.push('Update to latest best practices and standards');
        break;
      case 'enhance':
        suggestions.push('Add new features or capabilities');
        break;
      case 'refactor':
        suggestions.push('Consider code restructuring and organization improvements');
        break;
    }

    // Keyword-based suggestions
    if (keywords.includes('performance') || keywords.includes('slow')) {
      suggestions.push('Consider performance optimization patterns');
    }
    if (keywords.includes('complex') || keywords.includes('difficult')) {
      suggestions.push('Simplify pattern or provide better documentation');
    }

    return suggestions.slice(0, 5);
  }
}

// Export factory function for easy instantiation
export function createNLPAnalyzer(config?: Partial<NLPConfig>): NLPAnalyzer {
  return new NLPAnalyzer(config);
}

// Export individual components for specialized use cases
export {
  TextPreprocessor,
  KeywordExtractor,
  SentimentAnalyzer,
  IntentClassifier,
  SemanticEmbedding,
};
