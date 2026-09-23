import {
  compileQuestions,
  evaluateQuestion,
  type QuestionResolver,
} from '../src/question-compiler';

const questions = [
  'Is the build reproducible?',
  'How many pages are in the frozen arena?',
  'Which of [silent | rubber duck | Socratic why] minimizes held-out log loss?',
  'If there are infinitely many points on a line, how many infinities will it take me to cross?',
  'Explain why this architecture is surprising.',
];

const resolver: QuestionResolver = (question) => {
  if (question.node === 'cardinality-question' && question.target.toLowerCase() === 'pages') {
    return { kind: 'cardinality', value: { class: 'finite', value: 37 } };
  }
  return undefined;
};

const started = performance.now();
const results = compileQuestions(questions).map((result) => ({
  ...result,
  evaluation: result.status === 'compiled' ? evaluateQuestion(result.ast, resolver) : undefined,
}));

console.log(
  JSON.stringify(
    {
      engine: 'deterministic-question-compiler',
      llmCalls: 0,
      elapsedMilliseconds: performance.now() - started,
      results,
    },
    null,
    2
  )
);
