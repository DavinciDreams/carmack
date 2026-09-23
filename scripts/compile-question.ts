import { compileQuestion } from '../src/question-compiler';

const question = process.argv.slice(2).join(' ').trim();
if (question.length === 0) {
  console.error('Usage: bun run question -- "Is the build reproducible?"');
  process.exitCode = 64;
} else {
  const result = compileQuestion(question);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'needs-clarification') process.exitCode = 2;
  if (result.status === 'unsupported') process.exitCode = 3;
}
