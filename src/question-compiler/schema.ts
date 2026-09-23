import { z } from 'zod';

export const ANSWER_KINDS = ['boolean', 'cardinality', 'choice', 'text'] as const;

const NonEmptyTextSchema = z.string().trim().min(1).max(4_096);
const SourceTextSchema = z.string().trim().min(1).max(32_768);

export const DiagnosticSchema = z
  .object({
    code: z.enum([
      'ambiguous-conditional',
      'ambiguous-coordination',
      'ambiguous-what',
      'higher-order-cardinality',
      'duplicate-choice-options',
      'missing-choice-options',
      'input-too-long',
      'invalid-structure',
      'unsupported-syntax',
    ]),
    severity: z.enum(['info', 'warning', 'error']),
    message: NonEmptyTextSchema,
    repairs: z.array(NonEmptyTextSchema).default([]),
  })
  .strict();

const BaseQuestionSchema = z.object({
  source: SourceTextSchema,
  assumptions: z.array(NonEmptyTextSchema),
});

export const BooleanQuestionSchema = BaseQuestionSchema.extend({
  node: z.literal('boolean-question'),
  proposition: NonEmptyTextSchema,
  answer: z.object({ kind: z.literal('boolean') }).strict(),
}).strict();

export const CardinalityQuestionSchema = BaseQuestionSchema.extend({
  node: z.literal('cardinality-question'),
  target: NonEmptyTextSchema,
  predicate: NonEmptyTextSchema.nullable(),
  answer: z.object({ kind: z.literal('cardinality') }).strict(),
}).strict();

const ChoiceQuestionBaseSchema = BaseQuestionSchema.extend({
  node: z.literal('choice-question'),
  prompt: NonEmptyTextSchema,
  options: z.array(NonEmptyTextSchema).min(2),
  answer: z
    .object({
      kind: z.literal('choice'),
      options: z.array(NonEmptyTextSchema).min(2),
    })
    .strict(),
}).strict();

export const ChoiceQuestionSchema = ChoiceQuestionBaseSchema.superRefine((question, context) => {
  const options = question.options.map((option) => option.normalize('NFKC').toLowerCase());
  if (new Set(options).size !== options.length) {
    context.addIssue({ code: 'custom', message: 'choice options must be unique' });
  }
  if (
    question.options.length !== question.answer.options.length ||
    question.options.some((option, index) => option !== question.answer.options[index])
  ) {
    context.addIssue({ code: 'custom', message: 'answer options must equal question options' });
  }
});

export const DefinitionQuestionSchema = BaseQuestionSchema.extend({
  node: z.literal('definition-question'),
  term: NonEmptyTextSchema,
  answer: z.object({ kind: z.literal('text') }).strict(),
}).strict();

export const QuestionAstSchema = z.union([
  BooleanQuestionSchema,
  CardinalityQuestionSchema,
  ChoiceQuestionSchema,
  DefinitionQuestionSchema,
]);

export const CompileResultSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('compiled'),
      ast: QuestionAstSchema,
      diagnostics: z.array(DiagnosticSchema),
    })
    .strict(),
  z
    .object({
      status: z.literal('needs-clarification'),
      source: SourceTextSchema,
      diagnostics: z.array(DiagnosticSchema).min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal('unsupported'),
      source: SourceTextSchema,
      diagnostics: z.array(DiagnosticSchema).min(1),
    })
    .strict(),
]);

const CardinalityValueSchema = z.discriminatedUnion('class', [
  z.object({ class: z.literal('finite'), value: z.number().int().nonnegative().safe() }).strict(),
  z.object({ class: z.literal('countably-infinite') }).strict(),
  z
    .object({
      class: z.literal('uncountably-infinite'),
      label: NonEmptyTextSchema.optional(),
    })
    .strict(),
]);

export const TypedAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('boolean'), value: z.boolean() }).strict(),
  z.object({ kind: z.literal('cardinality'), value: CardinalityValueSchema }).strict(),
  z.object({ kind: z.literal('choice'), value: NonEmptyTextSchema }).strict(),
  z.object({ kind: z.literal('text'), value: NonEmptyTextSchema }).strict(),
]);

export const EvaluationResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('answered'), answer: TypedAnswerSchema }).strict(),
  z
    .object({
      status: z.literal('invalid-answer'),
      issues: z.array(NonEmptyTextSchema).min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal('unresolved'),
      reason: NonEmptyTextSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal('resolver-error'),
      reason: NonEmptyTextSchema,
    })
    .strict(),
]);
