import { ts } from '@ast-grep/napi';

// Test object pattern
const objectCode = `const user = { name: name, age: age };`;
console.log('=== Object Code ===');
console.log(objectCode);

const objectRoot = ts.parse(objectCode);

// Try different node kinds that might represent objects
const nodeKinds = [
  'object',
  'object_literal',
  'object_expression', 
  'property_identifier',
  'pair',
  'property',
];

for (const kind of nodeKinds) {
  console.log(`\n--- Looking for nodes of kind: ${kind} ---`);
  const nodes = objectRoot.root().findAll(kind);
  console.log(`Found: ${nodes.length}`);
  
  for (const node of nodes) {
    console.log(`  Text: "${node.text()}"`);
    console.log(`  Kind: ${node.kind()}`);
  }
}

// Let's also try to find all nodes and see what kinds exist
console.log('\n=== All Node Kinds in AST ===');
function collectNodeKinds(node, kinds = new Set()) {
  kinds.add(node.kind());
  const children = node.children();
  for (const child of children) {
    collectNodeKinds(child, kinds);
  }
  return kinds;
}

const allKinds = collectNodeKinds(objectRoot.root());
console.log('All node kinds found:', Array.from(allKinds).sort());

// Try to find patterns that match property syntax
console.log('\n=== Testing Property Patterns ===');
const propertyPatterns = [
  'property_identifier: property_identifier',
  '$PROP: $PROP',
  'identifier: identifier',
];

for (const pattern of propertyPatterns) {
  console.log(`\n--- Testing pattern: ${pattern} ---`);
  try {
    const matches = objectRoot.root().findAll(pattern);
    console.log(`Matches found: ${matches.length}`);
    for (const match of matches) {
      console.log('Match text:', match.text());
      console.log('Match kind:', match.kind());
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}