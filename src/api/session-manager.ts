/**
 * Session Manager for Multi-Turn Conversations
 *
 * Manages query sessions, context preservation, and investigation state
 * for the TensorRT-LLM Knowledge Graph Query Engine.
 * Follows Carmack's principles of state management and data integrity.
 */

import { z } from 'zod';
import type {
  SessionInfo,
  InvestigationThread,
  QueryResponse,
  ContinueQueryRequest,
} from './contracts.ts';
import {
  validateContinueQueryRequest,
  SessionInfoSchema,
  InvestigationThreadSchema,
} from './contracts.ts';
import { getDatabaseOperations } from '../db/operations.ts';
import type { QuerySession } from '../db/schema.ts';

// =============================================================================
// SESSION MANAGER ERRORS
// =============================================================================

export class SessionManagerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SessionManagerError';
  }
}

export class SessionNotFoundError extends SessionManagerError {
  constructor(sessionId: string) {
    super(
      `Session not found: ${sessionId}`,
      'SESSION_NOT_FOUND',
      { sessionId }
    );
  }
}

export class SessionExpiredError extends SessionManagerError {
  constructor(sessionId: string) {
    super(
      `Session expired: ${sessionId}`,
      'SESSION_EXPIRED',
      { sessionId }
    );
  }
}

// =============================================================================
// SESSION CONTEXT MANAGEMENT
// =============================================================================

/**
 * Session context for maintaining conversation state
 */
export interface SessionContext {
  // Query history
  query_history: Array<{
    query: string;
    intent: string;
    timestamp: Date;
    results_count: number;
  }>;
  
  // Investigation state
  active_investigations: InvestigationThread[];
  completed_investigations: InvestigationThread[];
  
  // Artifact focus
  focused_artifacts: string[]; // Artifact IDs user is interested in
  artifact_context: Record<string, {
    relevance_score: number;
    last_accessed: Date;
    interaction_count: number;
  }>;
  
  // Domain context
  domain_focus: string[]; // Technical domains of interest
  language_preferences: string[]; // Programming languages
  repository_context: string[]; // Repository URLs
  
  // Learning context
  user_expertise_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferred_explanation_style: 'concise' | 'detailed' | 'technical' | 'examples';
  
  // Session metadata
  session_goals: string[];
  progress_indicators: Record<string, number>; // Goal -> completion percentage
}

/**
 * Session context schema for validation
 */
export const SessionContextSchema = z.object({
  query_history: z.array(z.object({
    query: z.string(),
    intent: z.string(),
    timestamp: z.date(),
    results_count: z.number(),
  })).default([]),
  
  active_investigations: z.array(InvestigationThreadSchema).default([]),
  completed_investigations: z.array(InvestigationThreadSchema).default([]),
  
  focused_artifacts: z.array(z.string().uuid()).default([]),
  artifact_context: z.record(z.object({
    relevance_score: z.number().min(0).max(1),
    last_accessed: z.date(),
    interaction_count: z.number().min(0),
  })).default({}),
  
  domain_focus: z.array(z.string()).default([]),
  language_preferences: z.array(z.string()).default([]),
  repository_context: z.array(z.string()).default([]),
  
  user_expertise_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
  preferred_explanation_style: z.enum(['concise', 'detailed', 'technical', 'examples']).default('detailed'),
  
  session_goals: z.array(z.string()).default([]),
  progress_indicators: z.record(z.number().min(0).max(1)).default({}),
});

// =============================================================================
// SESSION MANAGER CORE
// =============================================================================

/**
 * Session Manager for handling multi-turn conversations
 */
export class SessionManager {
  private db = getDatabaseOperations();
  private readonly SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_QUERY_HISTORY = 50;
  private readonly MAX_ACTIVE_INVESTIGATIONS = 10;

  /**
   * Create a new session
   */
  async createSession(options: {
    user_id?: string;
    investigation_goal?: string;
    initial_context?: Partial<SessionContext>;
  } = {}): Promise<SessionInfo> {
    const startTime = Date.now();
    
    try {
      const sessionToken = this.generateSessionToken();
      const initialContext = this.buildInitialContext(options.initial_context);
      
      const dbSession = await this.db.sessions.create(sessionToken, options.user_id);
      
      // Update with investigation goal and context
      if (options.investigation_goal || Object.keys(initialContext).length > 0) {
        await this.db.sessions.updateContext(dbSession.id, {
          investigation_goal: options.investigation_goal,
          ...initialContext,
        });
      }

      const sessionInfo = this.mapDbSessionToSessionInfo(dbSession, initialContext);
      
      return sessionInfo;
    } catch (error) {
      throw new SessionManagerError(
        'Failed to create session',
        'SESSION_CREATE_ERROR',
        {
          options,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime,
        }
      );
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionInfo> {
    try {
      const dbSession = await this.db.sessions.getByToken(sessionId);
      
      if (!dbSession) {
        throw new SessionNotFoundError(sessionId);
      }

      // Check if session is expired
      const now = new Date();
      const lastActivity = new Date(dbSession.last_activity_at);
      if (now.getTime() - lastActivity.getTime() > this.SESSION_TIMEOUT_MS) {
        throw new SessionExpiredError(sessionId);
      }

      const context = this.parseSessionContext(dbSession.current_context);
      return this.mapDbSessionToSessionInfo(dbSession, context);
    } catch (error) {
      if (error instanceof SessionManagerError) {
        throw error;
      }
      
      throw new SessionManagerError(
        'Failed to get session',
        'SESSION_GET_ERROR',
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Update session with query results and context
   */
  async updateSessionWithQuery(
    sessionId: string,
    query: string,
    queryResponse: QueryResponse
  ): Promise<SessionInfo> {
    try {
      const session = await this.getSession(sessionId);
      const context = this.parseSessionContext(session.context);

      // Update query history
      context.query_history.push({
        query,
        intent: queryResponse.intent,
        timestamp: new Date(),
        results_count: queryResponse.evidence_chain.length,
      });

      // Trim history if too long
      if (context.query_history.length > this.MAX_QUERY_HISTORY) {
        context.query_history = context.query_history.slice(-this.MAX_QUERY_HISTORY);
      }

      // Update focused artifacts
      const newArtifacts = queryResponse.evidence_chain.map(e => e.artifact_id);
      this.updateArtifactContext(context, newArtifacts);

      // Update investigation threads
      this.updateInvestigationThreads(context, queryResponse.investigation_threads);

      // Update domain and language context
      this.updateDomainContext(context, queryResponse);

      // Save updated context
      await this.db.sessions.updateContext(session.id, context as unknown as Record<string, unknown>);

      return {
        ...session,
        context: context as unknown as Record<string, unknown>,
        last_activity_at: new Date(),
        total_queries: session.total_queries + 1,
        successful_queries: session.successful_queries + (queryResponse.confidence_score > 0.5 ? 1 : 0),
      };
    } catch (error) {
      throw new SessionManagerError(
        'Failed to update session with query',
        'SESSION_UPDATE_ERROR',
        {
          sessionId,
          query,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Continue investigation with follow-up query
   */
  async continueInvestigation(
    sessionId: string,
    request: ContinueQueryRequest
  ): Promise<{
    session: SessionInfo;
    context_hints: Record<string, unknown>;
  }> {
    try {
      const validatedRequest = validateContinueQueryRequest(request);
      const session = await this.getSession(sessionId);
      const context = this.parseSessionContext(session.context);

      // Build context hints for the query engine
      const contextHints = this.buildContextHints(context, validatedRequest);

      // Update investigation thread if specified
      if (validatedRequest.thread_id) {
        this.updateInvestigationThread(context, validatedRequest.thread_id, validatedRequest);
      }

      // Update focused artifacts if specified
      if (validatedRequest.focus_artifacts && validatedRequest.focus_artifacts.length > 0) {
        this.updateArtifactContext(context, validatedRequest.focus_artifacts);
      }

      return {
        session,
        context_hints: contextHints,
      };
    } catch (error) {
      throw new SessionManagerError(
        'Failed to continue investigation',
        'INVESTIGATION_CONTINUE_ERROR',
        {
          sessionId,
          request,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * List sessions for a user
   */
  async listSessions(options: {
    user_id?: string;
    status?: 'active' | 'completed' | 'abandoned';
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    sessions: SessionInfo[];
    total_count: number;
    has_more: boolean;
  }> {
    try {
      // This would need to be implemented in the database operations
      // For now, return empty result
      return {
        sessions: [],
        total_count: 0,
        has_more: false,
      };
    } catch (error) {
      throw new SessionManagerError(
        'Failed to list sessions',
        'SESSION_LIST_ERROR',
        {
          options,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Update session status and metadata
   */
  async updateSession(
    sessionId: string,
    updates: {
      investigation_goal?: string;
      status?: 'active' | 'completed' | 'abandoned';
      context?: Partial<SessionContext>;
    }
  ): Promise<SessionInfo> {
    try {
      const session = await this.getSession(sessionId);
      const context = this.parseSessionContext(session.context);

      // Merge context updates
      if (updates.context) {
        Object.assign(context, updates.context);
      }

      // Update database session
      await this.db.sessions.updateContext(session.id, {
        ...context,
        investigation_goal: updates.investigation_goal || session.investigation_goal,
        status: updates.status || session.status,
      } as unknown as Record<string, unknown>);

      return {
        ...session,
        investigation_goal: updates.investigation_goal || session.investigation_goal,
        status: updates.status || session.status,
        context: context as unknown as Record<string, unknown>,
      };
    } catch (error) {
      throw new SessionManagerError(
        'Failed to update session',
        'SESSION_UPDATE_ERROR',
        {
          sessionId,
          updates,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Generate unique session token
   */
  private generateSessionToken(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Build initial session context
   */
  private buildInitialContext(partial?: Partial<SessionContext>): SessionContext {
    const defaultContext: SessionContext = {
      query_history: [],
      active_investigations: [],
      completed_investigations: [],
      focused_artifacts: [],
      artifact_context: {},
      domain_focus: [],
      language_preferences: [],
      repository_context: [],
      user_expertise_level: 'intermediate',
      preferred_explanation_style: 'detailed',
      session_goals: [],
      progress_indicators: {},
    };

    return { ...defaultContext, ...partial };
  }

  /**
   * Parse session context from database
   */
  private parseSessionContext(dbContext: Record<string, unknown>): SessionContext {
    try {
      return SessionContextSchema.parse(dbContext);
    } catch (error) {
      // Return default context if parsing fails
      return this.buildInitialContext();
    }
  }

  /**
   * Map database session to SessionInfo
   */
  private mapDbSessionToSessionInfo(
    dbSession: QuerySession,
    context: SessionContext
  ): SessionInfo {
    return {
      id: dbSession.id,
      token: dbSession.session_token,
      user_id: dbSession.user_id,
      status: dbSession.status,
      investigation_goal: dbSession.investigation_goal,
      total_queries: dbSession.total_queries,
      successful_queries: dbSession.successful_queries,
      active_threads: context.active_investigations,
      context: context as unknown as Record<string, unknown>,
      started_at: dbSession.started_at,
      last_activity_at: dbSession.last_activity_at,
    };
  }

  /**
   * Update artifact context with new artifacts
   */
  private updateArtifactContext(context: SessionContext, artifactIds: string[]): void {
    const now = new Date();
    
    for (const artifactId of artifactIds) {
      if (context.artifact_context[artifactId]) {
        context.artifact_context[artifactId]!.last_accessed = now;
        context.artifact_context[artifactId]!.interaction_count += 1;
        context.artifact_context[artifactId]!.relevance_score = Math.min(
          context.artifact_context[artifactId]!.relevance_score + 0.1,
          1.0
        );
      } else {
        context.artifact_context[artifactId] = {
          relevance_score: 0.5,
          last_accessed: now,
          interaction_count: 1,
        };
      }
    }

    // Update focused artifacts list
    context.focused_artifacts = [
      ...new Set([...artifactIds, ...context.focused_artifacts])
    ].slice(0, 20); // Keep top 20 focused artifacts
  }

  /**
   * Update investigation threads
   */
  private updateInvestigationThreads(
    context: SessionContext,
    newThreads: InvestigationThread[]
  ): void {
    // Add new threads
    for (const thread of newThreads) {
      const existingIndex = context.active_investigations.findIndex(t => t.id === thread.id);
      if (existingIndex >= 0) {
        context.active_investigations[existingIndex] = thread;
      } else {
        context.active_investigations.push(thread);
      }
    }

    // Limit active investigations
    if (context.active_investigations.length > this.MAX_ACTIVE_INVESTIGATIONS) {
      const excess = context.active_investigations.splice(this.MAX_ACTIVE_INVESTIGATIONS);
      context.completed_investigations.push(...excess.map(t => ({ ...t, status: 'completed' as const })));
    }
  }

  /**
   * Update specific investigation thread
   */
  private updateInvestigationThread(
    context: SessionContext,
    threadId: string,
    request: ContinueQueryRequest
  ): void {
    const thread = context.active_investigations.find(t => t.id === threadId);
    if (thread) {
      thread.updated_at = new Date();
      
      // Add follow-up query to thread description
      if (request.follow_up_query) {
        thread.description += `\n\nFollow-up: ${request.follow_up_query}`;
      }
    }
  }

  /**
   * Update domain context based on query response
   */
  private updateDomainContext(context: SessionContext, response: QueryResponse): void {
    // Extract domain hints from evidence
    const domains = new Set<string>();
    const languages = new Set<string>();

    for (const evidence of response.evidence_chain) {
      // Extract file extension as language hint
      if (evidence.file_path) {
        const ext = evidence.file_path.split('.').pop()?.toLowerCase();
        if (ext) {
          const langMap: Record<string, string> = {
            'ts': 'typescript',
            'js': 'javascript',
            'py': 'python',
            'cpp': 'cpp',
            'cu': 'cuda',
            'h': 'c',
            'hpp': 'cpp',
          };
          if (langMap[ext]) {
            languages.add(langMap[ext]!);
          }
        }
      }

      // Extract domain from artifact type
      if (evidence.artifact_type) {
        domains.add(evidence.artifact_type);
      }
    }

    // Update context
    context.domain_focus = [...new Set([...domains, ...context.domain_focus])].slice(0, 10);
    context.language_preferences = [...new Set([...languages, ...context.language_preferences])].slice(0, 5);
  }

  /**
   * Build context hints for query engine
   */
  private buildContextHints(
    context: SessionContext,
    request: ContinueQueryRequest
  ): Record<string, unknown> {
    return {
      // Recent query context
      recent_queries: context.query_history.slice(-5).map(h => h.query),
      recent_intents: context.query_history.slice(-5).map(h => h.intent),
      
      // Artifact focus
      focused_artifacts: request.focus_artifacts || context.focused_artifacts.slice(0, 10),
      artifact_relevance: context.artifact_context,
      
      // Domain context
      domain_preferences: context.domain_focus,
      language_preferences: context.language_preferences,
      repository_context: context.repository_context,
      
      // User preferences
      expertise_level: context.user_expertise_level,
      explanation_style: context.preferred_explanation_style,
      
      // Investigation direction
      investigation_direction: request.investigation_direction,
      active_thread_id: request.thread_id,
      
      // Session goals
      session_goals: context.session_goals,
      progress_indicators: context.progress_indicators,
    };
  }
}