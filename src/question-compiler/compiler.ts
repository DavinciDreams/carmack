import { CompileResultSchema, QuestionAstSchema } from './schema';
import type { CompileResult, Diagnostic, QuestionAst } from './types';

const CONDITIONAL_PREFIX = /^(?:if|given)\s+(.+?),\s*(.+)$/i;
const CARDINALITY =
  /^how many\s+(.+?)(?:\s+(are|were|is|was|will|would|do|does|did|can|could|should|must)\s+(.+))?$/i;
const DEFINITION = /^define\s+\[([^\]]+)\]$/i;
const EXPLICIT_CHOICE = /^which of\s*\[([^\]]+)\]\s*[:,]?\s*(.+)$/i;
const BOOLEAN =
  /^(?:is|are|was|were|does|do|did|can|could|will|would|has|have|had|should|must)\s+(.+)$/i;
const MAX_SOURCE_LENGTH = 32_768;

function diagnostic(
  code: Diagnostic['code'],
  severity: Diagnostic['severity'],
  message: string,
  repairs: readonly string[] = []
): Diagnostic {
  return { code, severity, message, repairs: [...repairs] };
}

function normalizeSource(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function canonicalizeChoice(input: string): string {
  return input.normalize('NFKC').toLowerCase();
}

function unquotedText(input: string): string {
  return input.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '');
}

function stripQuestionMark(input: string): string {
  return input.endsWith('?') ? input.slice(0, -1).trim() : input;
}

function compiled(ast: QuestionAst, diagnostics: readonly Diagnostic[] = []): CompileResult {
  const validated = QuestionAstSchema.safeParse(ast);
  if (!validated.success) {
    return clarification(ast.source, [
      diagnostic(
        'invalid-structure',
        'error',
        'The recognized question form exceeds or violates the declared AST contract.',
        ['Shorten the question fields or rewrite the question using the documented grammar.']
      ),
    ]);
  }
  return CompileResultSchema.parse({
    status: 'compiled',
    ast: validated.data,
    diagnostics,
  });
}

function clarification(source: string, diagnostics: readonly Diagnostic[]): CompileResult {
  return CompileResultSchema.parse({ status: 'needs-clarification', source, diagnostics });
}

function unsupported(source: string, diagnostics?: readonly Diagnostic[]): CompileResult {
  return CompileResultSchema.parse({
    status: 'unsupported',
    source,
    diagnostics: diagnostics ?? [
      diagnostic(
        'unsupported-syntax',
        'error',
        'The deterministic grammar does not recognize this question form.',
        [
          'Use a yes/no question beginning with is, are, does, can, or will.',
          'Use “How many …?”, “Define [term]”, or “Which of [A | B] …?”.',
        ]
      ),
    ],
  });
}

/**
 * Compiles a deliberately small English question grammar into a validated AST.
 * It refuses unresolved semantic structure rather than inventing a decomposition.
 */
export function compileQuestion(input: string): CompileResult {
  if (input.length > MAX_SOURCE_LENGTH) {
    const suffix = ' …[truncated]';
    const preview = normalizeSource(input.slice(0, MAX_SOURCE_LENGTH - suffix.length));
    const boundedSource = `${preview || '(whitespace)'}${suffix}`;
    return unsupported(boundedSource, [
      diagnostic(
        'input-too-long',
        'error',
        `The question exceeds the ${MAX_SOURCE_LENGTH}-character source limit.`,
        ['Submit a shorter question or decompose it into independently scoped questions.']
      ),
    ]);
  }
  const source = normalizeSource(input);
  if (source.length === 0) return unsupported('(empty question)');

  let body = stripQuestionMark(source);
  const assumptions: string[] = [];
  const conditional = body.match(CONDITIONAL_PREFIX);
  if (conditional) {
    const assumption = conditional[1];
    const consequent = conditional[2];
    if (!assumption || !consequent) {
      return clarification(source, [
        diagnostic(
          'ambiguous-conditional',
          'error',
          'The condition and the question could not be separated.',
          ['Write “Given <assumption>, <question>?” with one explicit comma.']
        ),
      ]);
    }
    assumptions.push(assumption);
    body = consequent;
  } else if (/^(?:if|given)\b/i.test(body)) {
    return clarification(source, [
      diagnostic(
        'ambiguous-conditional',
        'error',
        'A conditional question needs an explicit boundary between assumption and query.',
        ['Write “Given <assumption>, <question>?”.']
      ),
    ]);
  }

  const choice = body.match(EXPLICIT_CHOICE);
  if (choice) {
    const rawOptions = choice[1];
    const prompt = choice[2];
    const options =
      rawOptions
        ?.split('|')
        .map((option) => option.trim())
        .filter(Boolean) ?? [];
    if (options.length < 2 || !prompt) {
      return clarification(source, [
        diagnostic(
          'missing-choice-options',
          'error',
          'A choice question needs at least two explicit pipe-separated options and a prompt.',
          ['Use “Which of [A | B] satisfies <criterion>?”.']
        ),
      ]);
    }
    const normalizedOptions = options.map(canonicalizeChoice);
    if (new Set(normalizedOptions).size !== normalizedOptions.length) {
      return clarification(source, [
        diagnostic(
          'duplicate-choice-options',
          'error',
          'Choice options must be distinct after case normalization.',
          ['Remove or rename the repeated option.']
        ),
      ]);
    }
    return compiled({
      node: 'choice-question',
      source,
      assumptions,
      prompt,
      options,
      answer: { kind: 'choice', options },
    });
  }

  if (/^which\b/i.test(body)) {
    return clarification(source, [
      diagnostic(
        'missing-choice-options',
        'error',
        'Open-domain “which” questions do not define a finite result type.',
        ['Supply the option set as “Which of [A | B | C] …?”.']
      ),
    ]);
  }

  const definition = body.match(DEFINITION);
  if (definition?.[1]) {
    return compiled({
      node: 'definition-question',
      source,
      assumptions,
      term: definition[1],
      answer: { kind: 'text' },
    });
  }

  if (/^what (?:is|are)\b/i.test(body)) {
    return clarification(source, [
      diagnostic(
        'ambiguous-what',
        'error',
        '“What is/are” can request a definition, identity, lookup, or collection and does not determine one result contract.',
        [
          'Use “Define [term]” for a definition.',
          'Use a vocabulary-backed SELECT or DESCRIBE query for entity lookup.',
        ]
      ),
    ]);
  }

  const cardinality = body.match(CARDINALITY);
  if (cardinality?.[1]) {
    const target = cardinality[1].trim();
    if (/^infinities?$/i.test(target)) {
      return clarification(source, [
        diagnostic(
          'higher-order-cardinality',
          'error',
          '“Infinity” denotes a cardinality class here, not a default unit or traversable object. Counting infinities therefore does not yet name the intended quantity.',
          [
            'Ask for the cardinality of the points on the segment.',
            'Ask for distance, duration, or steps and define that unit.',
            'If distinct cardinalities are intended, define the set of cardinalities being counted.',
          ]
        ),
      ]);
    }
    if (/\b(?:and|or)\b/i.test(unquotedText(target))) {
      return clarification(source, [
        diagnostic(
          'ambiguous-coordination',
          'error',
          'A single cardinality does not determine whether coordinated targets are counted jointly, separately, or by intersection.',
          [
            'Ask one count question per target.',
            'Define the union or intersection whose members should be counted.',
          ]
        ),
      ]);
    }
    const auxiliary = cardinality[2];
    const remainder = cardinality[3];
    return compiled({
      node: 'cardinality-question',
      source,
      assumptions,
      target,
      predicate: auxiliary && remainder ? `${auxiliary.toLowerCase()} ${remainder}` : null,
      answer: { kind: 'cardinality' },
    });
  }

  const boolean = body.match(BOOLEAN);
  if (boolean?.[1]) {
    if (/\bor\b/i.test(unquotedText(boolean[1]))) {
      return clarification(source, [
        diagnostic(
          'ambiguous-coordination',
          'error',
          'A yes/no result does not determine whether “or” is inclusive, exclusive, or a request to choose.',
          [
            'Split the alternatives into two boolean questions.',
            'Use “Which of [A | B] …?” for an exclusive choice.',
          ]
        ),
      ]);
    }
    return compiled({
      node: 'boolean-question',
      source,
      assumptions,
      proposition: body,
      answer: { kind: 'boolean' },
    });
  }

  return unsupported(source);
}

export function compileQuestions(inputs: readonly string[]): readonly CompileResult[] {
  return Object.freeze(inputs.map(compileQuestion));
}
