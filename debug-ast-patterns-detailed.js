import { js, ts } from '@ast-grep/napi';

// Test object property pattern in more detail
const objectCode = 'const user = { name: name, age: age };';
console.log('=== Object Code ===');
console.log(objectCode);

const objectRoot = ts.parse(objectCode);

// Let's explore the AST structure more deeply
function exploreNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.kind()}: "${node.text()}"`);

  const children = node.children();
  for (const child of children) {
    if (depth < 4) {
      // Limit depth to avoid too much output
      exploreNode(child, depth + 1);
    }
  }
}

console.log('\n=== Detailed AST Structure ===');
exploreNode(objectRoot.root());

// Try more specific patterns for object properties
const objectPatterns = [
  'name: name',
  'age: age',
  '{ name: name, age: age }',
  '{ $$$, $$$ }',
  '{ $$$ }',
  'name: $VAR',
  '$KEY: name',
  '$KEY: $VALUE',
];

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

// Test function patterns with variable extraction
console.log('\n\n=== Function Variable Extraction ===');
const functionCode = 'function add(a, b) { return a + b; }';
const functionRoot = ts.parse(functionCode);

const workingPattern = 'function $NAME($$$) { $$$ }';
console.log(`Using working pattern: "${workingPattern}"`);

const matches = functionRoot.root().findAll(workingPattern);
for (const match of matches) {
  console.log(`Match: "${match.text()}"`);

  // Try to extract variables
  try {
    const nameMatch = match.getMatch('NAME');
    if (nameMatch) {
      console.log(`  NAME: "${nameMatch.text()}"`);
    } else {
      console.log('  NAME: not found');
    }
  } catch (error) {
    console.log(`  NAME extraction error: ${error.message}`);
  }
}
