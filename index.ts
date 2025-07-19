#!/usr/bin/env bun

import { createActor } from 'xstate';
import { carmackCoderMachine } from './src/machine.js';
import type { MachineEvent, TransformationMode, TransformationRequest } from './src/types.js';
import { loadPatterns } from './src/utils/index.js';

/**
 * Carmack Coder - Code Editing Agent Architecture
 *
 * A sophisticated code transformation system that uses:
 * - Zod for runtime validation and type safety
 * - XState for deterministic state machine orchestration
 * - AST-grep for syntax tree transformations
 * - Dafny for formal verification of correctness
 * - Biome for formatting and ESLint for quality analysis
 *
 * The system prioritizes speed (template -> AST -> LLM) while ensuring
 * provably correct outputs through formal verification.
 */

