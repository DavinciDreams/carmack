import type { Vector, ClusterResult, PatternFeatureVector } from './types.js';
import { VectorUtils } from './types.js';

/**
 * Clustering Algorithms for Pattern Categorization
 *
 * This module implements real clustering algorithms for intelligent pattern grouping
 * and categorization in the Carmack Coder system.
 */

export interface ClusteringConfig {
  algorithm: 'kmeans' | 'dbscan' | 'hierarchical';
  k?: number; // for k-means
  eps?: number; // for DBSCAN
  minPts?: number; // for DBSCAN
  linkage?: 'single' | 'complete' | 'average'; // for hierarchical
  maxIterations?: number;
  tolerance?: number;
}

/**
 * K-Means Clustering Algorithm
 *
 * Groups patterns into k clusters using iterative centroid optimization.
 * Optimized for speed and memory efficiency.
 */
export class KMeansClusterer {
  private config: Required<Pick<ClusteringConfig, 'k' | 'maxIterations' | 'tolerance'>>;

  constructor(config: Pick<ClusteringConfig, 'k' | 'maxIterations' | 'tolerance'>) {
    this.config = {
      k: config.k ?? 5,
      maxIterations: config.maxIterations ?? 100,
      tolerance: config.tolerance ?? 1e-6,
    };
  }

  /**
   * Cluster patterns using K-means algorithm
   */
  cluster(patterns: PatternFeatureVector[]): ClusterResult[] {
    if (patterns.length === 0) {
      return [];
    }

    if (patterns.length < this.config.k) {
      // If we have fewer patterns than clusters, each pattern gets its own cluster
      return patterns.map((pattern, index) => ({
        clusterId: index,
        centroid: pattern.features,
        patterns: [pattern.patternId],
        cohesion: 1.0,
        size: 1,
        label: `Cluster ${index}`,
      }));
    }

    const vectors = patterns.map((p) => p.features);
    const patternIds = patterns.map((p) => p.patternId);

    // Initialize centroids using k-means++ algorithm for better initial placement
    const centroids = this.initializeCentroidsKMeansPlusPlus(vectors);
    let assignments = new Array(vectors.length).fill(0);
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < this.config.maxIterations) {
      // Assign each point to the nearest centroid
      const newAssignments = vectors.map((vector) => this.findNearestCentroid(vector, centroids));

      // Check for convergence
      converged = this.hasConverged(assignments, newAssignments);
      assignments = newAssignments;

      if (!converged) {
        // Update centroids
        this.updateCentroids(vectors, assignments, centroids);
      }

      iteration++;
    }

    // Build cluster results
    return this.buildClusterResults(vectors, patternIds, assignments, centroids);
  }

  /**
   * Initialize centroids using k-means++ algorithm for better convergence
   */
  private initializeCentroidsKMeansPlusPlus(vectors: Vector[]): Vector[] {
    const centroids: Vector[] = [];
    const dimensions = vectors[0]?.length ?? 0;

    if (vectors.length === 0) {
      return [];
    }

    // Choose first centroid randomly
    const firstIndex = Math.floor(Math.random() * vectors.length);
    const firstVector = vectors[firstIndex];
    if (firstVector) {
      centroids.push([...firstVector]);
    }

    // Choose remaining centroids with probability proportional to squared distance
    for (let i = 1; i < this.config.k; i++) {
      const distances = vectors.map((vector) => {
        const minDistance = Math.min(
          ...centroids.map((centroid) => VectorUtils.euclideanDistance(vector, centroid))
        );
        return minDistance * minDistance;
      });

      const totalDistance = distances.reduce((sum, d) => sum + d, 0);
      const threshold = Math.random() * totalDistance;

      let cumulativeDistance = 0;
      let selectedIndex = 0;

      for (let j = 0; j < distances.length; j++) {
        cumulativeDistance += distances[j] ?? 0;
        if (cumulativeDistance >= threshold) {
          selectedIndex = j;
          break;
        }
      }

      const selectedVector = vectors[selectedIndex];
      if (selectedVector) {
        centroids.push([...selectedVector]);
      }
    }

    return centroids;
  }

  /**
   * Find the nearest centroid for a given vector
   */
  private findNearestCentroid(vector: Vector, centroids: Vector[]): number {
    let minDistance = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < centroids.length; i++) {
      const centroid = centroids[i];
      if (!centroid) continue;
      const distance = VectorUtils.euclideanDistance(vector, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  }

  /**
   * Check if the algorithm has converged
   */
  private hasConverged(oldAssignments: number[], newAssignments: number[]): boolean {
    if (oldAssignments.length !== newAssignments.length) {
      return false;
    }

    for (let i = 0; i < oldAssignments.length; i++) {
      if (oldAssignments[i] !== newAssignments[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update centroids based on current assignments
   */
  private updateCentroids(vectors: Vector[], assignments: number[], centroids: Vector[]): void {
    const clusterSums: Vector[] = centroids.map(() => new Array(vectors[0]?.length ?? 0).fill(0));
    const clusterCounts = new Array(centroids.length).fill(0);

    // Sum vectors for each cluster
    for (let i = 0; i < vectors.length; i++) {
      const clusterId = assignments[i];
      const vector = vectors[i];
      if (clusterId !== undefined && vector) {
        clusterCounts[clusterId]++;

        for (let j = 0; j < vector.length; j++) {
          const clusterSum = clusterSums[clusterId];
          if (clusterSum) {
            clusterSum[j] = (clusterSum[j] ?? 0) + (vector[j] ?? 0);
          }
        }
      }
    }

    // Update centroids (average of assigned vectors)
    for (let i = 0; i < centroids.length; i++) {
      const centroid = centroids[i];
      const clusterSum = clusterSums[i];
      if (clusterCounts[i] > 0 && centroid && clusterSum) {
        for (let j = 0; j < centroid.length; j++) {
          centroid[j] = (clusterSum[j] ?? 0) / clusterCounts[i];
        }
      }
    }
  }

  /**
   * Build final cluster results
   */
  private buildClusterResults(
    vectors: Vector[],
    patternIds: string[],
    assignments: number[],
    centroids: Vector[]
  ): ClusterResult[] {
    const clusters: ClusterResult[] = [];

    for (let i = 0; i < centroids.length; i++) {
      const clusterPatterns: string[] = [];
      const clusterVectors: Vector[] = [];

      for (let j = 0; j < assignments.length; j++) {
        if (assignments[j] === i) {
          const patternId = patternIds[j];
          const vector = vectors[j];
          if (patternId && vector) {
            clusterPatterns.push(patternId);
            clusterVectors.push(vector);
          }
        }
      }

      if (clusterPatterns.length > 0) {
        const centroid = centroids[i];
        if (centroid) {
          const cohesion = this.calculateCohesion(clusterVectors, centroid);

          clusters.push({
            clusterId: i,
            centroid,
            patterns: clusterPatterns,
            cohesion,
            size: clusterPatterns.length,
            label: `K-Means Cluster ${i}`,
          });
        }
      }
    }

    return clusters;
  }

  /**
   * Calculate cluster cohesion (how tightly grouped the cluster is)
   */
  private calculateCohesion(vectors: Vector[], centroid: Vector): number {
    if (vectors.length === 0) {
      return 0;
    }

    const distances = vectors.map((vector) => VectorUtils.euclideanDistance(vector, centroid));
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;

    // Convert to cohesion score (0-1, where 1 is most cohesive)
    // Using exponential decay to map distance to cohesion
    return Math.exp(-avgDistance);
  }
}

/**
 * DBSCAN Clustering Algorithm
 *
 * Density-based clustering that can find clusters of arbitrary shape
 * and automatically determines the number of clusters.
 */
export class DBSCANClusterer {
  private config: Required<Pick<ClusteringConfig, 'eps' | 'minPts'>>;

  constructor(config: Pick<ClusteringConfig, 'eps' | 'minPts'>) {
    this.config = {
      eps: config.eps ?? 0.5,
      minPts: config.minPts ?? 3,
    };
  }

  /**
   * Cluster patterns using DBSCAN algorithm
   */
  cluster(patterns: PatternFeatureVector[]): ClusterResult[] {
    if (patterns.length === 0) {
      return [];
    }

    const vectors = patterns.map((p) => p.features);
    const patternIds = patterns.map((p) => p.patternId);
    const labels = new Array(vectors.length).fill(-1); // -1 = unvisited, -2 = noise
    let clusterId = 0;

    for (let i = 0; i < vectors.length; i++) {
      if (labels[i] !== -1) continue; // Already processed

      const neighbors = this.findNeighbors(i, vectors);

      if (neighbors.length < this.config.minPts) {
        labels[i] = -2; // Mark as noise
      } else {
        this.expandCluster(i, neighbors, clusterId, labels, vectors);
        clusterId++;
      }
    }

    return this.buildDBSCANResults(vectors, patternIds, labels);
  }

  /**
   * Find all neighbors within eps distance
   */
  private findNeighbors(pointIndex: number, vectors: Vector[]): number[] {
    const neighbors: number[] = [];
    const point = vectors[pointIndex];

    for (let i = 0; i < vectors.length; i++) {
      if (i !== pointIndex) {
        const targetVector = vectors[i];
        if (targetVector && point) {
          const distance = VectorUtils.euclideanDistance(point, targetVector);
          if (distance <= this.config.eps) {
            neighbors.push(i);
          }
        }
      }
    }

    return neighbors;
  }

  /**
   * Expand cluster from a core point
   */
  private expandCluster(
    pointIndex: number,
    neighbors: number[],
    clusterId: number,
    labels: number[],
    vectors: Vector[]
  ): void {
    labels[pointIndex] = clusterId;
    const queue = [...neighbors];

    while (queue.length > 0) {
      const currentIndex = queue.shift()!;

      if (labels[currentIndex] === -2) {
        labels[currentIndex] = clusterId; // Change noise to border point
      }

      if (labels[currentIndex] !== -1) continue; // Already processed

      labels[currentIndex] = clusterId;
      const currentNeighbors = this.findNeighbors(currentIndex, vectors);

      if (currentNeighbors.length >= this.config.minPts) {
        queue.push(...currentNeighbors);
      }
    }
  }

  /**
   * Build DBSCAN cluster results
   */
  private buildDBSCANResults(
    vectors: Vector[],
    patternIds: string[],
    labels: number[]
  ): ClusterResult[] {
    const clusterMap = new Map<number, { patterns: string[]; vectors: Vector[] }>();

    // Group patterns by cluster
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const patternId = patternIds[i];
      const vector = vectors[i];

      if (label !== undefined && label >= 0 && patternId && vector) {
        // Ignore noise points (-2)
        if (!clusterMap.has(label)) {
          clusterMap.set(label, { patterns: [], vectors: [] });
        }
        clusterMap.get(label)!.patterns.push(patternId);
        clusterMap.get(label)!.vectors.push(vector);
      }
    }

    // Build cluster results
    const results: ClusterResult[] = [];
    for (const [clusterId, data] of clusterMap) {
      const centroid = VectorUtils.centroid(data.vectors);
      const cohesion = this.calculateDBSCANCohesion(data.vectors, centroid);

      results.push({
        clusterId,
        centroid,
        patterns: data.patterns,
        cohesion,
        size: data.patterns.length,
        label: `DBSCAN Cluster ${clusterId}`,
      });
    }

    return results;
  }

  /**
   * Calculate cohesion for DBSCAN clusters
   */
  private calculateDBSCANCohesion(vectors: Vector[], centroid: Vector): number {
    if (vectors.length === 0) {
      return 0;
    }

    const distances = vectors.map((vector) => VectorUtils.euclideanDistance(vector, centroid));
    const maxDistance = Math.max(...distances);
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;

    // Cohesion based on how much smaller average distance is compared to eps
    return Math.max(0, 1 - avgDistance / this.config.eps);
  }
}

/**
 * Hierarchical Clustering Algorithm
 *
 * Creates a hierarchy of clusters using agglomerative (bottom-up) approach.
 * Useful for understanding pattern relationships at different granularities.
 */
export class HierarchicalClusterer {
  private config: Required<Pick<ClusteringConfig, 'linkage'>>;

  constructor(config: Pick<ClusteringConfig, 'linkage'>) {
    this.config = {
      linkage: config.linkage ?? 'average',
    };
  }

  /**
   * Cluster patterns using hierarchical clustering
   */
  cluster(patterns: PatternFeatureVector[], targetClusters: number = 5): ClusterResult[] {
    if (patterns.length === 0) {
      return [];
    }

    if (patterns.length <= targetClusters) {
      // Each pattern gets its own cluster
      return patterns.map((pattern, index) => ({
        clusterId: index,
        centroid: pattern.features,
        patterns: [pattern.patternId],
        cohesion: 1.0,
        size: 1,
        label: `Hierarchical Cluster ${index}`,
      }));
    }

    const vectors = patterns.map((p) => p.features);
    const patternIds = patterns.map((p) => p.patternId);

    // Initialize each point as its own cluster
    let clusters = vectors.map((vector, index) => ({
      id: index,
      vectors: [vector],
      patterns: [patternIds[index]],
      centroid: [...vector],
    }));

    // Merge clusters until we reach the target number
    while (clusters.length > targetClusters) {
      const { cluster1Index, cluster2Index } = this.findClosestClusters(clusters);

      // Merge the two closest clusters
      const newCluster = this.mergeClusters(
        clusters[cluster1Index],
        clusters[cluster2Index],
        clusters.length
      );

      // Remove the merged clusters and add the new one
      clusters = clusters.filter((_, index) => index !== cluster1Index && index !== cluster2Index);
      clusters.push(newCluster);
    }

    // Convert to ClusterResult format
    return clusters.map((cluster, index) => ({
      clusterId: index,
      centroid: cluster.centroid,
      patterns: cluster.patterns.filter((p): p is string => p !== undefined),
      cohesion: this.calculateHierarchicalCohesion(cluster.vectors, cluster.centroid),
      size: cluster.patterns.length,
      label: `Hierarchical Cluster ${index}`,
    }));
  }

  /**
   * Find the two closest clusters based on linkage criteria
   */
  private findClosestClusters(clusters: any[]): { cluster1Index: number; cluster2Index: number } {
    let minDistance = Infinity;
    let cluster1Index = 0;
    let cluster2Index = 1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = this.calculateClusterDistance(clusters[i], clusters[j]);
        if (distance < minDistance) {
          minDistance = distance;
          cluster1Index = i;
          cluster2Index = j;
        }
      }
    }

    return { cluster1Index, cluster2Index };
  }

  /**
   * Calculate distance between two clusters based on linkage method
   */
  private calculateClusterDistance(cluster1: any, cluster2: any): number {
    switch (this.config.linkage) {
      case 'single':
        return this.singleLinkage(cluster1.vectors, cluster2.vectors);
      case 'complete':
        return this.completeLinkage(cluster1.vectors, cluster2.vectors);
      case 'average':
      default:
        return this.averageLinkage(cluster1.vectors, cluster2.vectors);
    }
  }

  /**
   * Single linkage: minimum distance between any two points
   */
  private singleLinkage(vectors1: Vector[], vectors2: Vector[]): number {
    let minDistance = Infinity;

    for (const v1 of vectors1) {
      for (const v2 of vectors2) {
        const distance = VectorUtils.euclideanDistance(v1, v2);
        minDistance = Math.min(minDistance, distance);
      }
    }

    return minDistance;
  }

  /**
   * Complete linkage: maximum distance between any two points
   */
  private completeLinkage(vectors1: Vector[], vectors2: Vector[]): number {
    let maxDistance = 0;

    for (const v1 of vectors1) {
      for (const v2 of vectors2) {
        const distance = VectorUtils.euclideanDistance(v1, v2);
        maxDistance = Math.max(maxDistance, distance);
      }
    }

    return maxDistance;
  }

  /**
   * Average linkage: average distance between all pairs of points
   */
  private averageLinkage(vectors1: Vector[], vectors2: Vector[]): number {
    let totalDistance = 0;
    let count = 0;

    for (const v1 of vectors1) {
      for (const v2 of vectors2) {
        totalDistance += VectorUtils.euclideanDistance(v1, v2);
        count++;
      }
    }

    return count > 0 ? totalDistance / count : 0;
  }

  /**
   * Merge two clusters into one
   */
  private mergeClusters(cluster1: any, cluster2: any, newId: number): any {
    const mergedVectors = [...cluster1.vectors, ...cluster2.vectors];
    const mergedPatterns = [...cluster1.patterns, ...cluster2.patterns];
    const newCentroid = VectorUtils.centroid(mergedVectors);

    return {
      id: newId,
      vectors: mergedVectors,
      patterns: mergedPatterns,
      centroid: newCentroid,
    };
  }

  /**
   * Calculate cohesion for hierarchical clusters
   */
  private calculateHierarchicalCohesion(vectors: Vector[], centroid: Vector): number {
    if (vectors.length === 0) {
      return 0;
    }

    const distances = vectors.map((vector) => VectorUtils.euclideanDistance(vector, centroid));
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const maxDistance = Math.max(...distances);

    // Cohesion based on how uniform the distances are
    return maxDistance > 0 ? 1 - avgDistance / maxDistance : 1;
  }
}

/**
 * Main clustering interface that delegates to specific algorithms
 */
export class PatternClusterer {
  /**
   * Cluster patterns using the specified algorithm
   */
  static cluster(patterns: PatternFeatureVector[], config: ClusteringConfig): ClusterResult[] {
    switch (config.algorithm) {
      case 'kmeans': {
        const clusterer = new KMeansClusterer({
          k: config.k ?? 5,
          maxIterations: config.maxIterations ?? 100,
          tolerance: config.tolerance ?? 1e-6,
        });
        return clusterer.cluster(patterns);
      }

      case 'dbscan': {
        const clusterer = new DBSCANClusterer({
          eps: config.eps ?? 0.5,
          minPts: config.minPts ?? 3,
        });
        return clusterer.cluster(patterns);
      }

      case 'hierarchical': {
        const clusterer = new HierarchicalClusterer({
          linkage: config.linkage ?? 'average',
        });
        return clusterer.cluster(patterns, config.k ?? 5);
      }

      default:
        throw new Error(`Unknown clustering algorithm: ${config.algorithm}`);
    }
  }

  /**
   * Automatically select the best clustering algorithm based on data characteristics
   */
  static autoCluster(patterns: PatternFeatureVector[]): ClusterResult[] {
    if (patterns.length === 0) {
      return [];
    }

    // For small datasets, use hierarchical clustering
    if (patterns.length < 50) {
      return this.cluster(patterns, {
        algorithm: 'hierarchical',
        k: Math.min(5, Math.ceil(patterns.length / 3)),
        linkage: 'average',
      });
    }

    // For medium datasets, use k-means
    if (patterns.length < 500) {
      const k = Math.min(10, Math.ceil(Math.sqrt(patterns.length / 2)));
      return this.cluster(patterns, {
        algorithm: 'kmeans',
        k,
        maxIterations: 100,
        tolerance: 1e-6,
      });
    }

    // For large datasets, use DBSCAN for efficiency
    return this.cluster(patterns, {
      algorithm: 'dbscan',
      eps: 0.5,
      minPts: Math.max(3, Math.ceil(patterns.length * 0.01)),
    });
  }
}
