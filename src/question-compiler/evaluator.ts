import { EvaluationResultSchema, QuestionAstSchema, TypedAnswerSchema } from './schema';
import type {
  DeepReadonly,
  EvaluationResult,
  QuestionAst,
  QuestionResolver,
  TypedAnswer,
} from './types';

function issues(messages: readonly string[]): EvaluationResult {
  return EvaluationResultSchema.parse({ status: 'invalid-answer', issues: messages });
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

/** Validates both the value shape and its agreement with the AST's declared answer kind. */
export function validateTypedAnswer(question: QuestionAst, candidate: unknown): EvaluationResult {
  const parsedQuestion = QuestionAstSchema.safeParse(question);
  if (!parsedQuestion.success) {
    return issues(
      parsedQuestion.error.issues.map(
        ({ message, path }) => `question AST ${path.join('.')}: ${message}`
      )
    );
  }
  const parsed = TypedAnswerSchema.safeParse(candidate);
  if (!parsed.success) {
    return issues(parsed.error.issues.map(({ message, path }) => `${path.join('.')}: ${message}`));
  }

  const answer: TypedAnswer = parsed.data;
  const validatedQuestion = parsedQuestion.data;
  if (answer.kind !== validatedQuestion.answer.kind) {
    return issues([
      `answer kind “${answer.kind}” does not match question contract “${validatedQuestion.answer.kind}”`,
    ]);
  }
  if (
    validatedQuestion.node === 'choice-question' &&
    answer.kind === 'choice' &&
    !validatedQuestion.answer.options.includes(answer.value)
  ) {
    return issues([`choice “${answer.value}” is outside the declared option set`]);
  }

  return EvaluationResultSchema.parse({ status: 'answered', answer });
}

export function evaluateQuestion(
  question: QuestionAst,
  resolver: QuestionResolver
): EvaluationResult {
  const parsedQuestion = QuestionAstSchema.safeParse(question);
  if (!parsedQuestion.success) {
    return issues(
      parsedQuestion.error.issues.map(
        ({ message, path }) => `question AST ${path.join('.')}: ${message}`
      )
    );
  }
  const questionSnapshot = deepFreeze(structuredClone(parsedQuestion.data));
  let candidate: unknown;
  try {
    candidate = resolver(questionSnapshot);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return EvaluationResultSchema.parse({
      status: 'resolver-error',
      reason: `The deterministic resolver failed: ${detail}`.slice(0, 4_096),
    });
  }
  if (candidate === undefined) {
    return EvaluationResultSchema.parse({
      status: 'unresolved',
      reason: 'No deterministic resolver supplied an answer for this AST.',
    });
  }
  return validateTypedAnswer(parsedQuestion.data, candidate);
}
