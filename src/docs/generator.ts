import { fromPromise } from 'xstate';
import { z } from 'zod';
import { ASTGrepAnalyzer } from './ast-analyzer.js';
import type {
  ArchitectureDoc,
  ClassDoc,
  DocumentationRequest,
  DocumentationResult,
  FunctionDoc,
  ModuleDoc,
  PatternDoc,
} from './types.js';
import { validateDocumentationRequest, validateDocumentationResult } from './types.js';

