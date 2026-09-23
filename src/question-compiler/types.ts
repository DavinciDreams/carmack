import type { z } from 'zod';

import type {
  CompileResultSchema,
  DiagnosticSchema,
  EvaluationResultSchema,
  QuestionAstSchema,
  TypedAnswerSchema,
} from './schema';

export type Diagnostic = z.infer<typeof DiagnosticSchema>;
export type QuestionAst = z.infer<typeof QuestionAstSchema>;
export type CompileResult = z.infer<typeof CompileResultSchema>;
export type TypedAnswer = z.infer<typeof TypedAnswerSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export type QuestionResolver = (question: DeepReadonly<QuestionAst>) => unknown | undefined;
