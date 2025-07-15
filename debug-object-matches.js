import { ts } from '@ast-grep/napi';

const objectCode = `const name = "test";
const age = 25;
const user = { name: name, age: age };`;

console.log('=== Object Code ===');
console.log(objectCode);

const objectRoot = ts.parse(objectCode);

// Test the current pattern that's matching 20 times
const patterns = ['name: name', 'age: age', '$VAR: $VAR'];

for (const pattern of patterns) {
  console.log(`\nTesting pattern: "${pattern}"`);
  const matches = objectRoot.root().findAll(pattern);
  console.log(`Matches: ${matches.length}`);

  for (let i = 0; i < Math.min(matches.length, 5); i++) {
    const match = matches[i];
    console.log(`  ${i + 1}. "${match.text()}" (${match.kind()})`);
  }

  if (matches.length > 5) {
    console.log(`  ... and ${matches.length - 5} more matches`);
  }
}

// Test function pattern
console.log('\n\n=== Function Code ===');
const functionCode = 'function add(a, b) { return a + b; }';
console.log(functionCode);

const functionRoot = ts.parse(functionCode);
const functionPatterns = [
  'function $NAME($PARAMS) { return $EXPR; }',
  'function $NAME($PARAMS) { return $EXPR }',
  'function add(a, b) { return a + b; }',
];

for (const pattern of functionPatterns) {
  console.log(`\nTesting function pattern: "${pattern}"`);
  const matches = functionRoot.root().findAll(pattern);
  console.log(`Matches: ${matches.length}`);

  for (const match of matches) {
    console.log(`  Match: "${match.text()}" (${match.kind()})`);
  }
}
