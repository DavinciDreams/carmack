import { getDatabaseOperations } from '../db/operations.ts';
import type { Artifact, GraphEdge } from '../db/schema.ts';

import { z } from 'zod';
import { ArtifactSchema, GraphEdgeSchema } from '../db/schema.ts';

export const GraphPathSchema = z.object({
  artifacts: z.array(z.object({
    artifact: ArtifactSchema,
    depth: z.number(),
    relationship: GraphEdgeSchema.optional(),
    confidence: z.number(),
  })),
  total_confidence: z.number(),
  path_length: z.number(),
  path_ids: z.array(z.string()),
});

export const TraversalOptionsSchema = z.object({
  max_depth: z.number(),
  min_confidence: z.number(),
  direction: z.enum(['outgoing', 'incoming', 'both']),
  relation_types: z.array(z.string()).optional(),
  limit: z.number(),
  avoid_cycles: z.boolean(),
  confidence_decay: z.number(),
  relevance_boost: z.record(z.string(), z.number()),
});

export const GraphTraversalResponseSchema = z.object({
  paths: z.array(z.object({
    artifacts: z.array(z.object({
      artifact: ArtifactSchema,
      depth: z.number(),
      relationship: GraphEdgeSchema.optional(),
    })),
    total_confidence: z.number(),
    path_length: z.number(),
  })),
  total_paths: z.number(),
  max_depth_reached: z.number(),
  execution_time_ms: z.number(),
});






/**
 * Graph Walker for Knowledge Graph Traversal
 *
 * Implements relationship traversal algorithms, path finding, cycle detection,
 * and evidence chain construction for the TensorRT-LLM Knowledge Graph.
 * Follows Carmack's principles of algorithmic correctness and performance.
 */



// =============================================================================
// GRAPH WALKER ERRORS
// =============================================================================

export class GraphWalkerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GraphWalkerError';
  }
}

export type GraphPath = z.infer<typeof GraphPathSchema>;
export type TraversalOptions = z.infer<typeof TraversalOptionsSchema>;
export type GraphTraversalResponse = z.infer<typeof GraphTraversalResponseSchema>;

// =============================================================================
// GRAPH PATH TYPES
// =============================================================================

/**
 * Graph path representation
 */


/**
 * Traversal options
 */


/**
 * Traversal state for tracking progress
 */
interface TraversalState {
  visited: Set<string>;
  paths: GraphPath[];
  current_depth: number;
  nodes_processed: number;
  relationships_traversed: number;
}

// =============================================================================
// GRAPH WALKER CORE
// =============================================================================

/**
 * Graph Walker for intelligent knowledge graph traversal
 */
export class GraphWalker {
  private db = getDatabaseOperations();
  private readonly DEFAULT_CONFIDENCE_DECAY = 0.9;
  private readonly DEFAULT_MAX_PATHS = 1000;

  /**
   * Traverse the knowledge graph from a starting artifact
   */
  async traverse(request: unknown): Promise<GraphTraversalResponse> {
    const startTime = Date.now();
    try {
      // Validate input
      const validatedRequest = z.object({
        start_artifact_id: z.string().uuid(),
        relation_types: z.array(z.string()).optional(),
        max_depth: z.number().int().positive().max(10).default(3),
        min_confidence: z.number().min(0).max(1).default(0.5),
        direction: z.enum(['outgoing', 'incoming', 'both']).default('outgoing'),
        limit: z.number().int().positive().max(1000).default(100),
      }).parse(request);

      // Build traversal options
      const options: TraversalOptions = TraversalOptionsSchema.parse({
        max_depth: validatedRequest.max_depth,
        min_confidence: validatedRequest.min_confidence,
        direction: validatedRequest.direction,
        relation_types: validatedRequest.relation_types || undefined,
        limit: validatedRequest.limit,
        avoid_cycles: true,
        confidence_decay: this.DEFAULT_CONFIDENCE_DECAY,
        relevance_boost: this.buildRelevanceBoost(),
      });

      // Perform traversal
      const traversalResult = await this.performTraversal(
        validatedRequest.start_artifact_id,
        options
      );

      // Build response
      const response: GraphTraversalResponse = {
        paths: traversalResult.paths.map(path => ({
          artifacts: path.artifacts.map(item => ({
            artifact: item.artifact,
            depth: item.depth,
            relationship: item.relationship,
          })),
          total_confidence: path.total_confidence,
          path_length: path.path_length,
        })),
        total_paths: traversalResult.paths.length,
        max_depth_reached: Math.max(...traversalResult.paths.map(p => 
          Math.max(...p.artifacts.map(a => a.depth))
        ), 0),
        execution_time_ms: Date.now() - startTime,
      };

      // Validate output
      return GraphTraversalResponseSchema.parse(response);
    } catch (error) {
      throw new GraphWalkerError(
        'Graph traversal failed',
        'TRAVERSAL_ERROR',
        {
          request,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime,
        }
      );
    }
  }

  /**
   * Find shortest paths between two artifacts
   */
  async findShortestPaths(
    sourceId: string,
    targetId: string,
    options: {
      max_depth?: number;
      relation_types?: string[];
      max_paths?: number;
    } = {}
  ): Promise<GraphPath[]> {
    const {
      max_depth = 5,
      relation_types,
      max_paths = 10,
    } = options;

    try {
      // Use bidirectional BFS for efficiency
      const forwardPaths = await this.performBFS(sourceId, {
        max_depth: Math.ceil(max_depth / 2),
        direction: 'outgoing',
  ...(relation_types ? { relation_types } : {}),
        target_id: targetId,
      });

      const backwardPaths = await this.performBFS(targetId, {
        max_depth: Math.ceil(max_depth / 2),
        direction: 'incoming',
  ...(relation_types ? { relation_types } : {}),
        target_id: sourceId,
      });

      // Find intersections and build complete paths
      const completePaths = this.findPathIntersections(forwardPaths, backwardPaths);
      
      // Sort by path length and confidence
      return completePaths
        .sort((a, b) => {
          if (a.path_length !== b.path_length) {
            return a.path_length - b.path_length;
          }
          return b.total_confidence - a.total_confidence;
        })
        .slice(0, max_paths);
    } catch (error) {
      throw new GraphWalkerError(
        'Shortest path finding failed',
        'SHORTEST_PATH_ERROR',
        {
          sourceId,
          targetId,
          options,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Find strongly connected components in the graph
   */
  async findStronglyConnectedComponents(
    artifactIds: string[],
    options: {
      min_confidence?: number;
      relation_types?: string[];
    } = {}
  ): Promise<string[][]> {
    try {
      // Simplified implementation - in production would use Tarjan's algorithm
      const components: string[][] = [];
      const visited = new Set<string>();

      for (const artifactId of artifactIds) {
        if (!visited.has(artifactId)) {
          const component = await this.findConnectedComponent(artifactId, visited, options);
          if (component.length > 1) {
            components.push(component);
          }
        }
      }

      return components;
    } catch (error) {
      throw new GraphWalkerError(
        'SCC finding failed',
        'SCC_ERROR',
        {
          artifactIds,
          options,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Calculate centrality measures for artifacts
   */
  async calculateCentrality(
    artifactIds: string[],
    centralityType: 'degree' | 'betweenness' | 'closeness' = 'degree'
  ): Promise<Record<string, number>> {
    try {
      switch (centralityType) {
        case 'degree':
          return await this.calculateDegreeCentrality(artifactIds);
        case 'betweenness':
          return await this.calculateBetweennessCentrality(artifactIds);
        case 'closeness':
          return await this.calculateClosenessCentrality(artifactIds);
        default:
          throw new GraphWalkerError(
            `Unknown centrality type: ${centralityType}`,
            'UNKNOWN_CENTRALITY_TYPE'
          );
      }
    } catch (error) {
      throw new GraphWalkerError(
        'Centrality calculation failed',
        'CENTRALITY_ERROR',
        {
          artifactIds,
          centralityType,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // =============================================================================
  // PRIVATE TRAVERSAL METHODS
  // =============================================================================

  /**
   * Perform depth-first traversal
   */
  private async performTraversal(
    startArtifactId: string,
    options: TraversalOptions
  ): Promise<{ paths: GraphPath[] }> {
    // Get starting artifact
    const startArtifact = await this.db.artifacts.getById(startArtifactId);
    if (!startArtifact) {
      throw new GraphWalkerError(
        `Starting artifact not found: ${startArtifactId}`,
        'START_ARTIFACT_NOT_FOUND',
        { startArtifactId }
      );
    }

    const state: TraversalState = {
      visited: new Set(),
      paths: [],
      current_depth: 0,
      nodes_processed: 0,
      relationships_traversed: 0,
    };

    // Start traversal
    await this.traverseRecursive(
      startArtifact,
      [],
      0,
      1.0, // Initial confidence
      options,
      state
    );

    // Sort paths by confidence and limit results
    state.paths.sort((a, b) => b.total_confidence - a.total_confidence);
    
    return {
      paths: state.paths.slice(0, options.limit),
    };
  }

  /**
   * Recursive traversal implementation
   */
  private async traverseRecursive(
    currentArtifact: Artifact,
    currentPath: GraphPath['artifacts'],
    depth: number,
    pathConfidence: number,
    options: TraversalOptions,
    state: TraversalState
  ): Promise<void> {
    // Check depth limit
    if (depth >= options.max_depth) {
      return;
    }

    // Check if we've processed too many nodes
    if (state.nodes_processed >= this.DEFAULT_MAX_PATHS) {
      return;
    }

    // Add current artifact to path
    const currentPathItem = {
      artifact: currentArtifact,
      depth,
      confidence: pathConfidence,
    };
    const newPath = [...currentPath, currentPathItem];

    // Check for cycles if enabled
    if (options.avoid_cycles) {
      const pathIds = newPath.map(item => item.artifact.id);
      if (new Set(pathIds).size !== pathIds.length) {
        return; // Cycle detected, skip this path
      }
    }

    state.nodes_processed++;

    // Get outgoing relationships
    const relationships = await this.getRelationships(
      currentArtifact.id,
      options.direction,
      options.relation_types
    );

    // If this is a leaf node or we have a complete path, save it
    if (relationships.length === 0 || depth > 0) {
      const graphPath: GraphPath = {
        artifacts: newPath,
        total_confidence: pathConfidence,
        path_length: newPath.length,
        path_ids: newPath.map(item => item.artifact.id),
      };
      state.paths.push(graphPath);
    }

    // Continue traversal for each relationship
    for (const relationship of relationships) {
      if (relationship.confidence < options.min_confidence) {
        continue;
      }

      // Get target artifact
      const targetId = options.direction === 'incoming' ? 
        relationship.source_id : relationship.target_id;
      
      const targetArtifact = await this.db.artifacts.getById(targetId);
      if (!targetArtifact) {
        continue;
      }

      // Calculate new confidence with decay and relevance boost
      const relevanceBoost = options.relevance_boost[targetArtifact.type] || 1.0;
      const newConfidence = pathConfidence * 
        relationship.confidence * 
        options.confidence_decay * 
        relevanceBoost;

      if (newConfidence < options.min_confidence) {
        continue;
      }

      // Add relationship to path
      const pathWithRelationship = [...newPath];
      if (pathWithRelationship.length > 0) {
        const lastItem = pathWithRelationship[pathWithRelationship.length - 1]!;
        (lastItem as any).relationship = relationship;
      }

      state.relationships_traversed++;

      // Recursive call
      await this.traverseRecursive(
        targetArtifact,
        pathWithRelationship,
        depth + 1,
        newConfidence,
        options,
        state
      );
    }
  }

  /**
   * Get relationships for an artifact
   */
  private async getRelationships(
    artifactId: string,
    direction: 'outgoing' | 'incoming' | 'both',
    relationTypes?: string[]
  ): Promise<GraphEdge[]> {
    let relationships: GraphEdge[] = [];

    if (direction === 'outgoing' || direction === 'both') {
      const outgoing = await this.db.edges.getBySourceId(artifactId);
      relationships.push(...outgoing);
    }

    if (direction === 'incoming' || direction === 'both') {
      const incoming = await this.db.edges.getByTargetId(artifactId);
      relationships.push(...incoming);
    }

    // Filter by relation types if specified
    if (relationTypes && relationTypes.length > 0) {
      relationships = relationships.filter(rel => 
        relationTypes.includes(rel.relation_type)
      );
    }

    // Sort by confidence
    return relationships.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Perform breadth-first search
   */
  private async performBFS(
    startId: string,
    options: {
      max_depth: number;
      direction: 'outgoing' | 'incoming';
      relation_types?: string[];
      target_id?: string;
    }
  ): Promise<Map<string, GraphPath>> {
    const paths = new Map<string, GraphPath>();
    const queue: Array<{ artifactId: string; path: GraphPath; depth: number }> = [];
    
    // Initialize with start artifact
    const startArtifact = await this.db.artifacts.getById(startId);
    if (!startArtifact) {
      return paths;
    }

    const initialPath: GraphPath = {
      artifacts: [{
        artifact: startArtifact,
        depth: 0,
        confidence: 1.0,
      }],
      total_confidence: 1.0,
      path_length: 1,
      path_ids: [startId],
    };

    queue.push({ artifactId: startId, path: initialPath, depth: 0 });
    paths.set(startId, initialPath);

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.depth >= options.max_depth) {
        continue;
      }

      // If we found the target, we can stop this branch
      if (options.target_id && current.artifactId === options.target_id) {
        continue;
      }

      const relationships = await this.getRelationships(
        current.artifactId,
        options.direction,
        options.relation_types
      );

      for (const relationship of relationships) {
        const targetId = options.direction === 'outgoing' ? 
          relationship.target_id : relationship.source_id;

        // Skip if already visited with a better path
        if (paths.has(targetId)) {
          const existingPath = paths.get(targetId)!;
          if (existingPath.path_length <= current.path.path_length + 1) {
            continue;
          }
        }

        const targetArtifact = await this.db.artifacts.getById(targetId);
        if (!targetArtifact) {
          continue;
        }

        // Build new path
        const newPath: GraphPath = {
          artifacts: [
            ...current.path.artifacts,
            {
              artifact: targetArtifact,
              depth: current.depth + 1,
              relationship,
              confidence: relationship.confidence,
            }
          ],
          total_confidence: current.path.total_confidence * relationship.confidence,
          path_length: current.path.path_length + 1,
          path_ids: [...current.path.path_ids, targetId],
        };

        paths.set(targetId, newPath);
        queue.push({ artifactId: targetId, path: newPath, depth: current.depth + 1 });
      }
    }

    return paths;
  }

  /**
   * Find intersections between forward and backward paths
   */
  private findPathIntersections(
    forwardPaths: Map<string, GraphPath>,
    backwardPaths: Map<string, GraphPath>
  ): GraphPath[] {
    const completePaths: GraphPath[] = [];

    for (const [nodeId, forwardPath] of forwardPaths) {
      if (backwardPaths.has(nodeId)) {
        const backwardPath = backwardPaths.get(nodeId)!;
        
        // Combine paths
        const combinedPath: GraphPath = {
          artifacts: [
            ...forwardPath.artifacts,
            ...backwardPath.artifacts.slice(1).reverse() // Skip duplicate node and reverse
          ],
          total_confidence: forwardPath.total_confidence * backwardPath.total_confidence,
          path_length: forwardPath.path_length + backwardPath.path_length - 1,
          path_ids: [
            ...forwardPath.path_ids,
            ...backwardPath.path_ids.slice(1).reverse()
          ],
        };

        completePaths.push(combinedPath);
      }
    }

    return completePaths;
  }

  /**
   * Find connected component starting from an artifact
   */
  private async findConnectedComponent(
    startId: string,
    visited: Set<string>,
    options: {
      min_confidence?: number;
      relation_types?: string[];
    }
  ): Promise<string[]> {
    const component: string[] = [];
    const stack = [startId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      
      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);
      component.push(currentId);

      // Get all connected artifacts
      const relationships = await this.getRelationships(currentId, 'both', options.relation_types);
      
      for (const relationship of relationships) {
        if (options.min_confidence && relationship.confidence < options.min_confidence) {
          continue;
        }

        const connectedId = relationship.source_id === currentId ? 
          relationship.target_id : relationship.source_id;
        
        if (!visited.has(connectedId)) {
          stack.push(connectedId);
        }
      }
    }

    return component;
  }

  /**
   * Calculate degree centrality
   */
  private async calculateDegreeCentrality(artifactIds: string[]): Promise<Record<string, number>> {
    const centrality: Record<string, number> = {};

    for (const artifactId of artifactIds) {
      const outgoing = await this.db.edges.getBySourceId(artifactId);
      const incoming = await this.db.edges.getByTargetId(artifactId);
      centrality[artifactId] = outgoing.length + incoming.length;
    }

    // Normalize by maximum possible degree
    const maxDegree = Math.max(...Object.values(centrality));
    if (maxDegree > 0) {
      for (const artifactId of artifactIds) {
        centrality[artifactId] = centrality[artifactId]! / maxDegree;
      }
    }

    return centrality;
  }

  /**
   * Calculate betweenness centrality (simplified)
   */
  private async calculateBetweennessCentrality(artifactIds: string[]): Promise<Record<string, number>> {
    // Simplified implementation - in production would use proper betweenness algorithm
    const centrality: Record<string, number> = {};
    
    for (const artifactId of artifactIds) {
      centrality[artifactId] = 0;
    }

    return centrality;
  }

  /**
   * Calculate closeness centrality (simplified)
   */
  private async calculateClosenessCentrality(artifactIds: string[]): Promise<Record<string, number>> {
    // Simplified implementation - in production would calculate shortest paths to all nodes
    const centrality: Record<string, number> = {};
    
    for (const artifactId of artifactIds) {
      centrality[artifactId] = 0;
    }

    return centrality;
  }

  /**
   * Build relevance boost map
   */
  private buildRelevanceBoost(): Record<string, number> {
    return {
      'function': 1.2,
      'class': 1.1,
      'module': 1.0,
      'file': 0.9,
      'commit': 0.8,
      'issue': 0.7,
      'pr': 0.7,
      'documentation': 0.6,
      'config': 0.5,
      'test': 0.4,
    };
  }

  /**
   * Convert artifact to record for response
   */
  private artifactToRecord(artifact: Artifact): Record<string, unknown> {
    return {
      id: artifact.id,
      type: artifact.type,
      name: artifact.name,
      description: artifact.description,
      file_path: artifact.file_path,
      line_start: artifact.line_start,
      line_end: artifact.line_end,
      language: artifact.language,
      repository_url: artifact.repository_url,
      commit_hash: artifact.commit_hash,
      author_name: artifact.author_name,
      author_email: artifact.author_email,
      created_date: artifact.created_date,
      modified_date: artifact.modified_date,
      metadata: artifact.metadata,
      complexity_score: artifact.complexity_score,
      performance_impact: artifact.performance_impact,
      quality_score: artifact.quality_score,
      created_at: artifact.created_at,
      updated_at: artifact.updated_at,
    };
  }

  /**
   * Convert graph edge to record for response
   */
  private edgeToRecord(edge: GraphEdge): Record<string, unknown> {
    return {
      id: edge.id,
      source_id: edge.source_id,
      target_id: edge.target_id,
      relation_type: edge.relation_type,
      confidence: edge.confidence,
      weight: edge.weight,
      is_bidirectional: edge.is_bidirectional,
      metadata: edge.metadata,
      evidence: edge.evidence,
      evidence_type: edge.evidence_type,
      created_at: edge.created_at,
      updated_at: edge.updated_at,
    };
  }
}