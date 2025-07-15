import { ts } from '@ast-grep/napi';

// Test object pattern
const objectCode = `const user = { name: name, age: age };`;
console.log('=== Object Code ===');
console.log(objectCode);

const objectRoot = ts.parse(objectCode);

// Manually traverse the AST to find the actual structure
function traverseAST(node, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.kind()}: "${node.text()}"`);
  
  // If this is an object or pair, let's examine it closely
  if (node.kind() === 'object' || node.kind() === 'pair' || node.kind() === 'property_identifier') {
    console.log(`${indent}*** FOUND ${node.kind().toUpperCase()} ***`);
    
    // Try to find patterns within this node
    if (node.kind() === 'pair') {
      console.log(`${indent}Trying to match pair pattern...`);
      // Check if this pair has the same key and value
      const children = node.children();
      if (children.length >= 3) { // key : value
        const key = children[0];
        const value = children[2]; // Skip the colon
        console.log(`${indent}Key: "${key.text()}" (${key.kind()})`);
        console.log(`${indent}Value: "${value.text()}" (${value.kind()})`);
        
        if (key.text() === value.text()) {
          console.log(`${indent}*** SHORTHAND OPPORTUNITY: ${key.text()} ***`);
        }
      }
    }
  }
  
  if (depth < 5) { // Limit depth
    const children = node.children();
    for (const child of children) {
      traverseAST(child, depth + 1);
    }
  }
}

console.log('\n=== Full AST Traversal ===');
traverseAST(objectRoot.root());

// Try using kind-based search
console.log('\n=== Kind-based Search ===');
function findByKind(node, targetKind, results = []) {
  if (node.kind() === targetKind) {
    results.push(node);
  }
  
  const children = node.children();
  for (const child of children) {
    findByKind(child, targetKind, results);
  }
  
  return results;
}

const objects = findByKind(objectRoot.root(), 'object');
console.log(`Found ${objects.length} object nodes`);

const pairs = findByKind(objectRoot.root(), 'pair');
console.log(`Found ${pairs.length} pair nodes`);
for (const pair of pairs) {
  console.log(`Pair: "${pair.text()}"`);
}

const propIds = findByKind(objectRoot.root(), 'property_identifier');
console.log(`Found ${propIds.length} property_identifier nodes`);
for (const propId of propIds) {
  console.log(`Property ID: "${propId.text()}"`);
}