import { ts } from '@ast-grep/napi';

// Test object pattern
const objectCode = `const user = { name: name, age: age };`;
console.log('=== Object Code ===');
console.log(objectCode);

const objectRoot = ts.parse(objectCode);

// Find the object node specifically
const objects = objectRoot.root().findAll('object');
console.log(`\nObjects found: ${objects.length}`);

for (const obj of objects) {
  console.log('\n=== Object Details ===');
  console.log('Object text:', obj.text());
  console.log('Object kind:', obj.kind());
  
  // Explore children
  const children = obj.children();
  console.log(`Children count: ${children.length}`);
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    console.log(`Child ${i}: ${child.kind()} = "${child.text()}"`);
    
    // If it's a pair, explore further
    if (child.kind() === 'pair') {
      const pairChildren = child.children();
      console.log(`  Pair children: ${pairChildren.length}`);
      for (let j = 0; j < pairChildren.length; j++) {
        const pairChild = pairChildren[j];
        console.log(`    Pair child ${j}: ${pairChild.kind()} = "${pairChild.text()}"`);
      }
    }
  }
}

// Test patterns on the object node directly
console.log('\n=== Testing Patterns on Object Node ===');
const obj = objects[0];
if (obj) {
  const pairPatterns = [
    'pair',
    '$KEY: $VALUE',
    '$KEY: $KEY',
    '$PROP: $PROP',
  ];
  
  for (const pattern of pairPatterns) {
    console.log(`\n--- Testing pattern: ${pattern} ---`);
    try {
      const matches = obj.findAll(pattern);
      console.log(`Matches found: ${matches.length}`);
      for (const match of matches) {
        console.log('Match text:', match.text());
        console.log('Match kind:', match.kind());
      }
    } catch (error) {
      console.log('Error:', error.message);
    }
  }
}