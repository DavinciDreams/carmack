import { z } from 'zod';
import type { RLState, RLAction, RLReward, EffectivenessMetrics } from './types.ts';

/**
 * Reinforcement Learning System for Pattern Optimization
 *
 * Implements Q-learning and policy gradient methods to optimize pattern selection
 * and recommendation based on historical effectiveness and context.
 */

// RL Configuration Schema
const RLConfigSchema = z
  .object({
    algorithm: z.enum(['q-learning', 'policy-gradient', 'actor-critic']).default('q-learning'),
    learningRate: z.number().min(0).max(1).default(0.1),
    discountFactor: z.number().min(0).max(1).default(0.9),
    explorationRate: z.number().min(0).max(1).default(0.1),
    explorationDecay: z.number().min(0).max(1).default(0.995),
    minExplorationRate: z.number().min(0).max(1).default(0.01),
    rewardFunction: z.enum(['linear', 'exponential', 'logarithmic']).default('linear'),
    memorySize: z.number().int().positive().default(10000),
    batchSize: z.number().int().positive().default(32),
    updateFrequency: z.number().int().positive().default(100),
  })
  .strict();

export type RLConfig = z.infer<typeof RLConfigSchema>;

// Experience replay memory entry
const ExperienceSchema = z
  .object({
    state: z.any(), // RLState but allowing flexibility
    action: z.any(), // RLAction
    reward: z.number(),
    nextState: z.any(), // RLState
    done: z.boolean(),
    timestamp: z.number(),
  })
  .strict();

export type Experience = z.infer<typeof ExperienceSchema>;

/**
 * Q-Learning Agent for Pattern Optimization
 * Uses tabular Q-learning with state-action value function approximation
 */
export class QLearningAgent {
  private qTable = new Map<string, Map<string, number>>();
  private config: RLConfig;
  private explorationRate: number;

  constructor(config: Partial<RLConfig> = {}) {
    this.config = RLConfigSchema.parse(config);
    this.explorationRate = this.config.explorationRate;
  }

  /**
   * Select action using epsilon-greedy policy
   */
  selectAction(state: RLState): RLAction {
    const stateKey = this.getStateKey(state);

    // Exploration vs exploitation
    if (Math.random() < this.explorationRate) {
      // Explore: select random action
      return this.selectRandomAction(state.availableActions);
    } else {
      // Exploit: select best known action
      return this.selectBestAction(stateKey, state.availableActions);
    }
  }

  /**
   * Update Q-value based on experience
   */
  updateQValue(
    state: RLState,
    action: RLAction,
    reward: number,
    nextState: RLState,
    done: boolean
  ): void {
    const stateKey = this.getStateKey(state);
    const actionKey = this.getActionKey(action);
    const nextStateKey = this.getStateKey(nextState);

    // Initialize Q-table entries if they don't exist
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }
    if (!this.qTable.get(stateKey)!.has(actionKey)) {
      this.qTable.get(stateKey)!.set(actionKey, 0);
    }

    // Current Q-value
    const currentQ = this.qTable.get(stateKey)!.get(actionKey)!;

    // Maximum Q-value for next state
    let maxNextQ = 0;
    if (!done && this.qTable.has(nextStateKey)) {
      const nextStateActions = this.qTable.get(nextStateKey)!;
      maxNextQ = Math.max(...Array.from(nextStateActions.values()));
    }

    // Q-learning update rule
    const targetQ = reward + this.config.discountFactor * maxNextQ;
    const newQ = currentQ + this.config.learningRate * (targetQ - currentQ);

    this.qTable.get(stateKey)!.set(actionKey, newQ);

    // Decay exploration rate
    this.explorationRate = Math.max(
      this.config.minExplorationRate,
      this.explorationRate * this.config.explorationDecay
    );
  }

  /**
   * Get Q-value for state-action pair
   */
  getQValue(state: RLState, action: RLAction): number {
    const stateKey = this.getStateKey(state);
    const actionKey = this.getActionKey(action);

    if (!this.qTable.has(stateKey)) {
      return 0;
    }

    return this.qTable.get(stateKey)!.get(actionKey) || 0;
  }

  /**
   * Get action values for a state
   */
  getActionValues(state: RLState): Map<string, number> {
    const stateKey = this.getStateKey(state);
    return this.qTable.get(stateKey) || new Map();
  }

  private selectRandomAction(availableActions: RLAction['action'][]): RLAction {
    const randomAction = availableActions[Math.floor(Math.random() * availableActions.length)];
    return {
      action: randomAction!,
      confidence: Math.random(),
    };
  }

  private selectBestAction(stateKey: string, availableActions: RLAction['action'][]): RLAction {
    if (!this.qTable.has(stateKey)) {
      return this.selectRandomAction(availableActions);
    }

    const stateActions = this.qTable.get(stateKey)!;
    let bestAction = availableActions[0]!;
    let bestValue = -Infinity;

    for (const action of availableActions) {
      const actionKey = this.getActionKey({ action, confidence: 1.0 });
      const value = stateActions.get(actionKey) || 0;

      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }

    return {
      action: bestAction,
      confidence: Math.min(1.0, Math.max(0.1, bestValue / 10)), // Normalize confidence
    };
  }

  private getStateKey(state: RLState): string {
    // Create a compact state representation
    return JSON.stringify({
      pattern: state.patternId,
      complexity: Math.round(state.context.codebaseComplexity),
      project: state.context.projectType,
      team: state.context.teamExperience,
      time: state.context.timeConstraints,
      quality: state.context.qualityRequirements,
      success: Math.round(state.currentMetrics.successRate * 10) / 10,
    });
  }

  private getActionKey(action: RLAction): string {
    return `${action.action}:${Math.round(action.confidence * 10) / 10}`;
  }

  /**
   * Save Q-table to storage
   */
  saveModel(): string {
    const data = {
      qTable: Array.from(this.qTable.entries()).map(([state, actions]) => [
        state,
        Array.from(actions.entries()),
      ]),
      config: this.config,
      explorationRate: this.explorationRate,
    };
    return JSON.stringify(data);
  }

  /**
   * Load Q-table from storage
   */
  loadModel(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.qTable = new Map(
        parsed.qTable.map(([state, actions]: [string, [string, number][]]) => [
          state,
          new Map(actions),
        ])
      );
      this.explorationRate = parsed.explorationRate || this.config.explorationRate;
    } catch (error) {
      console.warn('Failed to load Q-learning model:', error);
    }
  }
}

/**
 * Policy Gradient Agent for Pattern Optimization
 * Uses neural network approximation for policy learning
 */
export class PolicyGradientAgent {
  private policy = new Map<string, Map<string, number>>();
  private config: RLConfig;
  private episodeHistory: Array<{
    state: RLState;
    action: RLAction;
    reward: number;
    logProb: number;
  }> = [];

  constructor(config: Partial<RLConfig> = {}) {
    this.config = RLConfigSchema.parse(config);
  }

  /**
   * Select action using policy probabilities
   */
  selectAction(state: RLState): RLAction {
    const stateKey = this.getStateKey(state);
    const actionProbs = this.getActionProbabilities(stateKey, state.availableActions);

    // Sample action from probability distribution
    const action = this.sampleAction(actionProbs, state.availableActions);
    const logProb = Math.log(actionProbs.get(action.action) || 0.001);

    return {
      ...action,
      parameters: { logProb },
    };
  }

  /**
   * Store experience for episode
   */
  storeExperience(state: RLState, action: RLAction, reward: number): void {
    const logProb = action.parameters?.logProb || 0;
    this.episodeHistory.push({ state, action, reward, logProb });
  }

  /**
   * Update policy at end of episode
   */
  updatePolicy(): void {
    if (this.episodeHistory.length === 0) return;

    // Calculate discounted rewards
    const discountedRewards = this.calculateDiscountedRewards();

    // Normalize rewards
    const mean = discountedRewards.reduce((sum, r) => sum + r, 0) / discountedRewards.length;
    const std = Math.sqrt(
      discountedRewards.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
        discountedRewards.length
    );
    const normalizedRewards = discountedRewards.map((r) => (r - mean) / (std + 1e-8));

    // Update policy parameters
    for (let i = 0; i < this.episodeHistory.length; i++) {
      const experience = this.episodeHistory[i]!;
      const advantage = normalizedRewards[i]!;

      this.updatePolicyParameters(experience.state, experience.action, advantage);
    }

    // Clear episode history
    this.episodeHistory = [];
  }

  private calculateDiscountedRewards(): number[] {
    const rewards: number[] = [];
    let discountedReward = 0;

    // Calculate discounted rewards backwards
    for (let i = this.episodeHistory.length - 1; i >= 0; i--) {
      discountedReward =
        this.episodeHistory[i]!.reward + this.config.discountFactor * discountedReward;
      rewards.unshift(discountedReward);
    }

    return rewards;
  }

  private updatePolicyParameters(state: RLState, action: RLAction, advantage: number): void {
    const stateKey = this.getStateKey(state);
    const actionKey = action.action;

    if (!this.policy.has(stateKey)) {
      this.policy.set(stateKey, new Map());
    }

    const statePolicy = this.policy.get(stateKey)!;
    const currentLogit = statePolicy.get(actionKey) || 0;

    // Policy gradient update
    const gradient = this.config.learningRate * advantage;
    statePolicy.set(actionKey, currentLogit + gradient);
  }

  private getActionProbabilities(
    stateKey: string,
    availableActions: RLAction['action'][]
  ): Map<string, number> {
    const probs = new Map<string, number>();

    if (!this.policy.has(stateKey)) {
      // Uniform distribution for unseen states
      const uniformProb = 1.0 / availableActions.length;
      for (const action of availableActions) {
        probs.set(action, uniformProb);
      }
      return probs;
    }

    const statePolicy = this.policy.get(stateKey)!;

    // Convert logits to probabilities using softmax
    const logits = availableActions.map((action) => statePolicy.get(action) || 0);
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map((logit) => Math.exp(logit - maxLogit));
    const sumExp = expLogits.reduce((sum, exp) => sum + exp, 0);

    for (let i = 0; i < availableActions.length; i++) {
      const action = availableActions[i]!;
      const prob = expLogits[i]! / sumExp;
      probs.set(action, prob);
    }

    return probs;
  }

  private sampleAction(
    actionProbs: Map<string, number>,
    availableActions: RLAction['action'][]
  ): RLAction {
    const random = Math.random();
    let cumulative = 0;

    for (const action of availableActions) {
      cumulative += actionProbs.get(action) || 0;
      if (random <= cumulative) {
        return {
          action,
          confidence: actionProbs.get(action) || 0,
        };
      }
    }

    // Fallback to last action
    return {
      action: availableActions[availableActions.length - 1]!,
      confidence: actionProbs.get(availableActions[availableActions.length - 1]!) || 0,
    };
  }

  private getStateKey(state: RLState): string {
    return JSON.stringify({
      pattern: state.patternId,
      complexity: Math.round(state.context.codebaseComplexity),
      project: state.context.projectType,
      team: state.context.teamExperience,
      time: state.context.timeConstraints,
      quality: state.context.qualityRequirements,
    });
  }
}

/**
 * Experience Replay Buffer for training stability
 */
export class ExperienceReplayBuffer {
  private buffer: Experience[] = [];
  private maxSize: number;
  private currentIndex = 0;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  /**
   * Add experience to buffer
   */
  add(experience: Experience): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(experience);
    } else {
      this.buffer[this.currentIndex] = experience;
      this.currentIndex = (this.currentIndex + 1) % this.maxSize;
    }
  }

  /**
   * Sample random batch of experiences
   */
  sample(batchSize: number): Experience[] {
    if (this.buffer.length < batchSize) {
      return [...this.buffer];
    }

    const batch: Experience[] = [];
    const indices = new Set<number>();

    while (indices.size < batchSize) {
      const randomIndex = Math.floor(Math.random() * this.buffer.length);
      if (!indices.has(randomIndex)) {
        indices.add(randomIndex);
        batch.push(this.buffer[randomIndex]!);
      }
    }

    return batch;
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer = [];
    this.currentIndex = 0;
  }
}

/**
 * Reward Function Calculator
 * Computes rewards based on pattern effectiveness metrics
 */
export class RewardCalculator {
  private config: RLConfig;

  constructor(config: Partial<RLConfig> = {}) {
    this.config = RLConfigSchema.parse(config);
  }

  /**
   * Calculate reward based on effectiveness metrics
   */
  calculateReward(
    beforeMetrics: EffectivenessMetrics,
    afterMetrics: EffectivenessMetrics,
    context: {
      timeConstraints: string;
      qualityRequirements: string;
      userFeedback?: number; // 1-5 scale
    }
  ): RLReward {
    const components = {
      successRateImprovement: this.calculateSuccessRateReward(beforeMetrics, afterMetrics),
      performanceGain: this.calculatePerformanceReward(beforeMetrics, afterMetrics),
      userSatisfactionDelta: this.calculateUserSatisfactionReward(beforeMetrics, afterMetrics),
      complexityReduction: this.calculateComplexityReward(beforeMetrics, afterMetrics),
    };

    // Apply context-based weights
    const weights = this.getContextWeights(context);

    const immediate =
      components.successRateImprovement * weights.success +
      components.performanceGain * weights.performance +
      components.userSatisfactionDelta * weights.satisfaction +
      components.complexityReduction * weights.complexity;

    // Apply reward function transformation
    const total = this.applyRewardFunction(immediate);

    return {
      immediate,
      total,
      components,
    };
  }

  private calculateSuccessRateReward(
    before: EffectivenessMetrics,
    after: EffectivenessMetrics
  ): number {
    const improvement = after.successRate - before.successRate;
    return Math.tanh(improvement * 10); // Bounded between -1 and 1
  }

  private calculatePerformanceReward(
    before: EffectivenessMetrics,
    after: EffectivenessMetrics
  ): number {
    const timeImprovement =
      (before.averageExecutionTime - after.averageExecutionTime) / before.averageExecutionTime;
    return Math.tanh(timeImprovement * 5);
  }

  private calculateUserSatisfactionReward(
    before: EffectivenessMetrics,
    after: EffectivenessMetrics
  ): number {
    const improvement = (after.userSatisfaction - before.userSatisfaction) / 10; // Normalize to 0-1
    return Math.tanh(improvement * 10);
  }

  private calculateComplexityReward(
    before: EffectivenessMetrics,
    after: EffectivenessMetrics
  ): number {
    const reduction = before.complexityReduction - after.complexityReduction;
    return Math.tanh(reduction * 0.1);
  }

  private getContextWeights(context: { timeConstraints: string; qualityRequirements: string }): {
    success: number;
    performance: number;
    satisfaction: number;
    complexity: number;
  } {
    const baseWeights = { success: 0.3, performance: 0.2, satisfaction: 0.3, complexity: 0.2 };

    // Adjust weights based on context
    if (context.timeConstraints === 'tight') {
      baseWeights.performance += 0.2;
      baseWeights.complexity -= 0.1;
    }

    if (context.qualityRequirements === 'critical') {
      baseWeights.success += 0.2;
      baseWeights.satisfaction += 0.1;
      baseWeights.performance -= 0.1;
    }

    return baseWeights;
  }

  private applyRewardFunction(reward: number): number {
    switch (this.config.rewardFunction) {
      case 'exponential':
        return reward > 0 ? Math.exp(reward) - 1 : -(Math.exp(-reward) - 1);
      case 'logarithmic':
        return reward > 0 ? Math.log(1 + reward) : -Math.log(1 - reward);
      case 'linear':
      default:
        return reward;
    }
  }
}

/**
 * Main Reinforcement Learning Manager
 * Coordinates different RL algorithms and manages training
 */
export class ReinforcementLearningManager {
  private qAgent: QLearningAgent;
  private pgAgent: PolicyGradientAgent;
  private replayBuffer: ExperienceReplayBuffer;
  private rewardCalculator: RewardCalculator;
  private config: RLConfig;
  private trainingStep = 0;

  constructor(config: Partial<RLConfig> = {}) {
    this.config = RLConfigSchema.parse(config);
    this.qAgent = new QLearningAgent(config);
    this.pgAgent = new PolicyGradientAgent(config);
    this.replayBuffer = new ExperienceReplayBuffer(this.config.memorySize);
    this.rewardCalculator = new RewardCalculator(config);
  }

  /**
   * Select action using the configured algorithm
   */
  selectAction(state: RLState): RLAction {
    switch (this.config.algorithm) {
      case 'q-learning':
        return this.qAgent.selectAction(state);
      case 'policy-gradient':
        return this.pgAgent.selectAction(state);
      case 'actor-critic':
        // Use policy gradient for action selection
        return this.pgAgent.selectAction(state);
      default:
        return this.qAgent.selectAction(state);
    }
  }

  /**
   * Process experience and update models
   */
  processExperience(
    state: RLState,
    action: RLAction,
    beforeMetrics: EffectivenessMetrics,
    afterMetrics: EffectivenessMetrics,
    nextState: RLState,
    done: boolean,
    context: { timeConstraints: string; qualityRequirements: string }
  ): void {
    // Calculate reward
    const rewardResult = this.rewardCalculator.calculateReward(
      beforeMetrics,
      afterMetrics,
      context
    );
    const reward = rewardResult.total;

    // Store experience
    const experience: Experience = {
      state,
      action,
      reward,
      nextState,
      done,
      timestamp: Date.now(),
    };
    this.replayBuffer.add(experience);

    // Update models based on algorithm
    switch (this.config.algorithm) {
      case 'q-learning':
        this.qAgent.updateQValue(state, action, reward, nextState, done);
        break;
      case 'policy-gradient':
        this.pgAgent.storeExperience(state, action, reward);
        if (done) {
          this.pgAgent.updatePolicy();
        }
        break;
      case 'actor-critic':
        // Update both Q-learning (critic) and policy gradient (actor)
        this.qAgent.updateQValue(state, action, reward, nextState, done);
        this.pgAgent.storeExperience(state, action, reward);
        if (done) {
          this.pgAgent.updatePolicy();
        }
        break;
    }

    this.trainingStep++;

    // Periodic batch training
    if (this.trainingStep % this.config.updateFrequency === 0) {
      this.batchUpdate();
    }
  }

  /**
   * Perform batch update using experience replay
   */
  private batchUpdate(): void {
    if (this.replayBuffer.size() < this.config.batchSize) {
      return;
    }

    const batch = this.replayBuffer.sample(this.config.batchSize);

    for (const experience of batch) {
      if (this.config.algorithm === 'q-learning' || this.config.algorithm === 'actor-critic') {
        this.qAgent.updateQValue(
          experience.state,
          experience.action,
          experience.reward,
          experience.nextState,
          experience.done
        );
      }
    }
  }

  /**
   * Get action values for analysis
   */
  getActionValues(state: RLState): Map<string, number> {
    return this.qAgent.getActionValues(state);
  }

  /**
   * Get training statistics
   */
  getTrainingStats(): {
    trainingSteps: number;
    bufferSize: number;
    explorationRate: number;
    algorithm: string;
  } {
    return {
      trainingSteps: this.trainingStep,
      bufferSize: this.replayBuffer.size(),
      explorationRate: (this.qAgent as any).explorationRate || 0,
      algorithm: this.config.algorithm,
    };
  }

  /**
   * Save models to storage
   */
  saveModels(): { qModel: string; pgModel: string } {
    return {
      qModel: this.qAgent.saveModel(),
      pgModel: JSON.stringify({
        policy: Array.from((this.pgAgent as any).policy.entries()),
        config: this.config,
      }),
    };
  }

  /**
   * Load models from storage
   */
  loadModels(models: { qModel: string; pgModel: string }): void {
    try {
      this.qAgent.loadModel(models.qModel);

      const pgData = JSON.parse(models.pgModel);
      (this.pgAgent as any).policy = new Map(pgData.policy);
    } catch (error) {
      console.warn('Failed to load RL models:', error);
    }
  }

  /**
   * Reset training state
   */
  reset(): void {
    this.replayBuffer.clear();
    this.trainingStep = 0;
  }
}

// Export factory function for easy instantiation
export function createReinforcementLearningManager(
  config?: Partial<RLConfig>
): ReinforcementLearningManager {
  return new ReinforcementLearningManager(config);
}
