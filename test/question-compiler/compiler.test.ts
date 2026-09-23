import { describe, expect, test } from 'bun:test';

import {
  compileQuestion,
  compileQuestions,
  evaluateQuestion,
  QuestionAstSchema,
  validateTypedAnswer,
} from '../../src/question-compiler';

describe('deterministic question compiler', () => {
  test('compiles supported question forms into typed AST nodes', () => {
    const results = compileQuestions([
      'Is the build reproducible?',
      'How many pages are in the frozen arena?',
      'Define [semantic perplexity]',
      'Which of [silent | rubber duck | Socratic why] minimizes held-out log loss?',
    ]);

    expect(results.map((result) => result.status)).toEqual([
      'compiled',
      'compiled',
      'compiled',
      'compiled',
    ]);
    expect(results.map((result) => (result.status === 'compiled' ? result.ast.answer.kind : null)))
      .toEqual(['boolean', 'cardinality', 'text', 'choice']);
  });

  test('preserves an explicit conditional as an assumption', () => {
    const result = compileQuestion(
      'Given the snapshot hash matches, is the task graph frozen?'
    );
    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') return;
    expect(result.ast.assumptions).toEqual(['the snapshot hash matches']);
    expect(result.ast.answer.kind).toBe('boolean');
  });

  test('rejects the Zeno category mistake instead of forcing a yes/no or count', () => {
    const result = compileQuestion(
      'If there are infinitely many points on a line, how many infinities will it take me to cross?'
    );
    expect(result.status).toBe('needs-clarification');
    if (result.status !== 'needs-clarification') return;
    expect(result.diagnostics.map(({ code }) => code)).toContain('higher-order-cardinality');
    expect(result.diagnostics[0]?.repairs).toHaveLength(3);
  });

  test('does not treat a binary result type as semantic disambiguation', () => {
    const result = compileQuestion('Is the statement true or metaphorical?');
    expect(result.status).toBe('needs-clarification');
    if (result.status !== 'needs-clarification') return;
    expect(result.diagnostics[0]?.code).toBe('ambiguous-coordination');
  });

  test('distinguishes coordination from quoted reserved words', () => {
    expect(compileQuestion('How many apples and oranges are there?').status).toBe(
      'needs-clarification'
    );
    expect(compileQuestion('Does this contain the word "or"?').status).toBe('compiled');
    expect(compileQuestion('How many infinity symbols are printed?').status).toBe('compiled');
  });

  test('does not pretend every what-question is a definition', () => {
    const result = compileQuestion('What are all employees in sales?');
    expect(result.status).toBe('needs-clarification');
    if (result.status !== 'needs-clarification') return;
    expect(result.diagnostics[0]?.code).toBe('ambiguous-what');
  });

  test('requires explicit finite options for choice questions', () => {
    const result = compileQuestion('Which explanation is correct?');
    expect(result.status).toBe('needs-clarification');
    if (result.status !== 'needs-clarification') return;
    expect(result.diagnostics[0]?.code).toBe('missing-choice-options');
  });

  test('returns a diagnostic instead of throwing for duplicate source options', () => {
    const result = compileQuestion('Which of [A | a] is supported?');
    expect(result.status).toBe('needs-clarification');
    if (result.status !== 'needs-clarification') return;
    expect(result.diagnostics[0]?.code).toBe('duplicate-choice-options');
  });

  test('returns unsupported for syntax outside the declared grammar', () => {
    const result = compileQuestion('Explain why this architecture is surprising.');
    expect(result.status).toBe('unsupported');
  });

  test('returns typed failures rather than throwing on oversized input or fields', () => {
    expect(compileQuestion(`Explain ${'x'.repeat(40_000)}`).status).toBe('unsupported');
    expect(compileQuestion(`Is ${'x'.repeat(5_000)}?`).status).toBe('needs-clarification');
    expect(
      compileQuestion(`Which of [${'x'.repeat(5_000)} | B] is supported?`).status
    ).toBe('needs-clarification');
  });

  test('Zod rejects duplicate or mismatched choice contracts', () => {
    expect(() =>
      QuestionAstSchema.parse({
        node: 'choice-question',
        source: 'Which of [A | A] is correct?',
        assumptions: [],
        prompt: 'is correct',
        options: ['A', 'A'],
        answer: { kind: 'choice', options: ['A', 'A'] },
      })
    ).toThrow(/unique/);
    expect(() =>
      QuestionAstSchema.parse({
        node: 'choice-question',
        source: 'Which of [A | B] is correct?',
        assumptions: [],
        prompt: 'is correct',
        options: ['A', 'B'],
        answer: { kind: 'choice', options: ['B', 'A'] },
      })
    ).toThrow(/equal/);
  });

  test('accepts only answers matching the AST contract', () => {
    const boolean = compileQuestion('Is the build reproducible?');
    if (boolean.status !== 'compiled') throw new Error('expected compiled boolean question');
    expect(validateTypedAnswer(boolean.ast, { kind: 'boolean', value: true }).status).toBe(
      'answered'
    );
    expect(validateTypedAnswer(boolean.ast, { kind: 'text', value: 'yes' }).status).toBe(
      'invalid-answer'
    );

    const choice = compileQuestion('Which of [A | B] is supported?');
    if (choice.status !== 'compiled') throw new Error('expected compiled choice question');
    expect(validateTypedAnswer(choice.ast, { kind: 'choice', value: 'C' }).status).toBe(
      'invalid-answer'
    );
  });

  test('keeps resolution separate and reports absent knowledge honestly', () => {
    const result = compileQuestion('How many pages are in the frozen arena?');
    if (result.status !== 'compiled') throw new Error('expected compiled cardinality question');
    expect(evaluateQuestion(result.ast, () => undefined)).toEqual({
      status: 'unresolved',
      reason: 'No deterministic resolver supplied an answer for this AST.',
    });
    expect(
      evaluateQuestion(result.ast, () => ({
        kind: 'cardinality',
        value: { class: 'finite', value: 37 },
      }))
    ).toEqual({
      status: 'answered',
      answer: { kind: 'cardinality', value: { class: 'finite', value: 37 } },
    });
  });

  test('does not let a resolver mutate the question contract', () => {
    const result = compileQuestion('Which of [A | B] is supported?');
    if (result.status !== 'compiled') throw new Error('expected compiled choice question');

    const evaluation = evaluateQuestion(result.ast, (question) => {
      if (question.node !== 'choice-question') throw new Error('expected choice question');
      expect(() => (question.options as string[]).push('C')).toThrow();
      return { kind: 'choice', value: 'C' };
    });

    expect(evaluation.status).toBe('invalid-answer');
  });

  test('contains resolver exceptions in the typed result algebra', () => {
    const result = compileQuestion('Is the build reproducible?');
    if (result.status !== 'compiled') throw new Error('expected compiled boolean question');
    expect(
      evaluateQuestion(result.ast, () => {
        throw new Error('database unavailable');
      })
    ).toEqual({
      status: 'resolver-error',
      reason: 'The deterministic resolver failed: database unavailable',
    });
  });

  test('rejects unsafe numeric cardinalities', () => {
    const result = compileQuestion('How many pages are in the frozen arena?');
    if (result.status !== 'compiled') throw new Error('expected compiled cardinality question');
    expect(
      validateTypedAnswer(result.ast, {
        kind: 'cardinality',
        value: { class: 'finite', value: 1e100 },
      }).status
    ).toBe('invalid-answer');
  });
});
