import { js, ts } from '@ast-grep/napi';

// Test function pattern
const functionCode = 'function add(a, b) { return a + b; }';
console.log('=== Function Code ===');
console.log(functionCode);

const functionRoot = ts.parse(functionCode);
console.log('\n=== Function AST Structure ===');
console.log('Root kind:', functionRoot.root().kind());
console.log('Root text:', functionRoot.root().text());

// Try different patterns for function
const functionPatterns = [
  'function $NAME($PARAMS) { return $EXPR }',
  'function $NAME($PARAMS) { return $EXPR; }',
  'function $NAME($$$) { return $$$; }',
  'function $NAME($$$) { $$$ }',
];

for (const pattern of functionPatterns) {
  console.log(`\nTesting pattern: "${pattern}"`);
  try {
    const matches = functionRoot.root().findAll(pattern);
    console.log(`Matches found: ${matches.length}`);
    for (const match of matches) {
      console.log(`  Match text: "${match.text()}"`);
      console.log(`  Match kind: "${match.kind()}"`);
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
}

// Test object property pattern
const objectCode = 'const user = { name: name, age: age };';
console.log('\n\n=== Object Code ===');
console.log(objectCode);

const objectRoot = ts.parse(objectCode);
console.log('\n=== Object AST Structure ===');
console.log('Root kind:', objectRoot.root().kind());
console.log('Root text:', objectRoot.root().text());

// Try different patterns for object properties
const objectPatterns = ['$KEY: $VALUE', '$KEY: $KEY', '{ $$$: $$$ }', 'name: name'];

for (const pattern of objectPatterns) {
  console.log(`\nTesting pattern: "${pattern}"`);
  try {
    const matches = objectRoot.root().findAll(pattern);
    console.log(`Matches found: ${matches.length}`);
    for (const match of matches) {
      console.log(`  Match text: "${match.text()}"`);
      console.log(`  Match kind: "${match.kind()}"`);
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
}
