import { ts } from '@ast-grep/napi';

// Test object pattern
const objectCode = `const user = { name: name, age: age };`;
console.log('=== Object Code ===');
console.log(objectCode);

const objectRoot = ts.parse(objectCode);

// Test the actual node kinds we found
console.log('\n=== Testing Actual Node Kinds ===');

// Test object nodes
const objects = objectRoot.root().findAll('object');
console.log(`\nObject nodes: ${objects.length}`);
for (const obj of objects) {
  console.log(`Object: "${obj.text()}" (${obj.kind()})`);
}

// Test pair nodes
const pairs = objectRoot.root().findAll('pair');
console.log(`\nPair nodes: ${pairs.length}`);
for (const pair of pairs) {
  console.log(`Pair: "${pair.text()}" (${pair.kind()})`);
  
  // Test if we can match the pattern on pairs
  const children = pair.children();
  console.log(`  Children: ${children.length}`);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    console.log(`    Child ${i}: "${child.text()}" (${child.kind()})`);
  }
}

// Test property_identifier nodes
const propIds = objectRoot.root().findAll('property_identifier');
console.log(`\nProperty identifier nodes: ${propIds.length}`);
for (const propId of propIds) {
  console.log(`Property ID: "${propId.text()}" (${propId.kind()})`);
}

// Now test patterns that should work
console.log('\n=== Testing Working Patterns ===');

// Test pattern for pairs where key equals value
const workingPatterns = [
  'property_identifier: property_identifier',
  '$KEY: $KEY',
  '$PROP: $PROP',
];

for (const pattern of workingPatterns) {
  console.log(`\n--- Testing pattern: ${pattern} ---`);
  try {
    const matches = objectRoot.root().findAll(pattern);
    console.log(`Matches found: ${matches.length}`);
    for (const match of matches) {
      console.log(`Match: "${match.text()}" (${match.kind()})`);
      
      // Try to extract variables
      try {
        const keyMatch = match.getMatch?.('KEY') || match.getMatch?.('PROP');
        if (keyMatch) {
          console.log(`Variable: "${keyMatch.text()}"`);
        }
      } catch (e) {
        console.log('Variable extraction error:', e.message);
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}
