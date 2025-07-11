// Test file for AST pattern transformations
function testPatterns() {
  // Strict equality/inequality patterns
  const a = 5;
  const b = '5';

  if (a == b) {
    // Should become ===
    console.log('Equal');
  }

  if (a != b) {
    // Should become !==
    console.log('Not equal');
  }

  // Array includes pattern
  const items = [1, 2, 3, 4, 5];
  if (items.includes(3)) {
    // Should become items.includes(3)
    console.log('Found 3');
  }

  // Object property shorthand
  const name = 'John';
  const age = 30;
  const user = {
    name: name, // Should become shorthand
    age: age, // Should become shorthand
  };

  // Template literal conversion
  const greeting = `Hello ${name}!`; // Should become template literal

  // Unnecessary return
  const double = (x) => x * 2; // Should remove return

  return user;
}
