import { js, ts } from '@ast-grep/napi';

// Test the exact patterns I need for the tests
console.log('=== Testing Final Patterns ===');

// 1. Function to arrow pattern
const functionCode = `function add(a, b) { return a + b; }
function multiply(x, y) { return x * y; }`;

console.log('\n--- Function Code ---');
console.log(functionCode);

const functionRoot = ts.parse(functionCode);
const functionPattern = 'function $NAME($$$) { return $$$; }';

console.log(`\nTesting function pattern: "${functionPattern}"`);
const functionMatches = functionRoot.root().findAll(functionPattern);
console.log(`Function matches: ${functionMatches.length}`);

for (const match of functionMatches) {
  console.log(`  Match: "${match.text()}"`);
  const nameMatch = match.getMatch('NAME');
  console.log(`  NAME: "${nameMatch ? nameMatch.text() : 'not found'}"`);
}

// 2. Object property shorthand pattern
const objectCode = `const name = "test";
const age = 25;
const user = { name: name, age: age };`;

console.log('\n--- Object Code ---');
console.log(objectCode);

const objectRoot = ts.parse(objectCode);

// Try to match individual pairs
const pairPattern = '$KEY: $VALUE';
console.log(`\nTesting pair pattern: "${pairPattern}"`);
const pairMatches = objectRoot.root().findAll(pairPattern);
console.log(`Pair matches: ${pairMatches.length}`);

for (const match of pairMatches) {
  console.log(`  Match: "${match.text()}"`);
  console.log(`  Kind: "${match.kind()}"`);

  try {
    const keyMatch = match.getMatch('KEY');
    const valueMatch = match.getMatch('VALUE');
    console.log(`  KEY: "${keyMatch ? keyMatch.text() : 'not found'}"`);
    console.log(`  VALUE: "${valueMatch ? valueMatch.text() : 'not found'}"`);
  } catch (error) {
    console.log(`  Variable extraction error: ${error.message}`);
  }
}

// Try matching specific shorthand candidates
const shorthands = ['name: name', 'age: age'];
for (const shorthand of shorthands) {
  console.log(`\nTesting literal pattern: "${shorthand}"`);
  const matches = objectRoot.root().findAll(shorthand);
  console.log(`Matches: ${matches.length}`);
  for (const match of matches) {
    console.log(`  Match: "${match.text()}" (${match.kind()})`);
  }
}
