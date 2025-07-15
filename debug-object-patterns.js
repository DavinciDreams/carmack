import { ts } from '@ast-grep/napi';

// Test object pattern
const objectCode = `const user = { name: name, age: age };`;
console.log('=== Object Code ===');
console.log(objectCode);

const objectRoot = ts.parse(objectCode);
console.log('\n=== Object AST Structure ===');

// Let's explore the AST structure
function exploreNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.kind()}: "${node.text()}"`);
  
  if (depth < 3) { // Limit depth to avoid too much output
    const children = node.children();
    for (const child of children) {
      exploreNode(child, depth + 1);
    }
  }
}

exploreNode(objectRoot.root());

console.log('\n=== Testing Object Patterns ===');

// Try different object patterns
const objectPatterns = [
  '{ $$$PROPS }',
  '{ $KEY: $VALUE }',
  '{ $KEY: $KEY }',
  '$KEY: $VALUE',
  '$KEY: $KEY',
];

for (const pattern of objectPatterns) {
  console.log(`\n--- Testing pattern: ${pattern} ---`);
  try {
    const matches = objectRoot.root().findAll(pattern);
    console.log(`Matches found: ${matches.length}`);
    for (const match of matches) {
      console.log('Match text:', match.text());
      console.log('Match kind:', match.kind());
      
      // Try to extract variables
      try {
        if (pattern.includes('$KEY')) {
          const keyMatch = match.getMatch?.('KEY');
          if (keyMatch) {
            console.log('KEY variable:', keyMatch.text());
          }
        }
        if (pattern.includes('$VALUE')) {
          const valueMatch = match.getMatch?.('VALUE');
          if (valueMatch) {
            console.log('VALUE variable:', valueMatch.text());
          }
        }
      } catch (e) {
        console.log('Variable extraction error:', e.message);
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}