import { js, ts } from '@ast-grep/napi';

// Test function pattern
const functionCode = `function add(a, b) { return a + b; }`;
console.log('=== Function Code ===');
console.log(functionCode);

const functionRoot = ts.parse(functionCode);
console.log('\n=== Function AST Structure ===');
console.log('Root kind:', functionRoot.root().kind());
console.log('Root text:', functionRoot.root().text());

// Try different patterns
const patterns = [
  'function $NAME($PARAMS) { return $BODY }',
  'function $NAME($PARAMS) { return $BODY; }',
  'function $NAME($$$PARAMS) { return $$$BODY }',
  'function $NAME($$$PARAMS) { $$$BODY }',
];

for (const pattern of patterns) {
  console.log(`\n--- Testing pattern: ${pattern} ---`);
  try {
    const matches = functionRoot.root().findAll(pattern);
    console.log(`Matches found: ${matches.length}`);
    for (const match of matches) {
      console.log('Match text:', match.text());
      console.log('Match kind:', match.kind());
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// Test object pattern
const objectCode = `const user = { name: name, age: age };`;
console.log('\n\n=== Object Code ===');
console.log(objectCode);

const objectRoot = ts.parse(objectCode);
console.log('\n=== Object AST Structure ===');
console.log('Root kind:', objectRoot.root().kind());

// Find object literal
const objectLiterals = objectRoot.root().findAll('{ $$$PROPS }');
console.log(`\nObject literals found: ${objectLiterals.length}`);
for (const obj of objectLiterals) {
  console.log('Object text:', obj.text());
  console.log('Object kind:', obj.kind());
  
  // Find properties
  const properties = obj.findAll('$KEY: $VALUE');
  console.log(`Properties found: ${properties.length}`);
  for (const prop of properties) {
    console.log('Property text:', prop.text());
    console.log('Property kind:', prop.kind());
  }
}
