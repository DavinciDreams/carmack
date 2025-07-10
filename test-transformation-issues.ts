// Test file with intentional transformation targets
export function testTransformations() {
  // Issues that should be caught by template transformations:
  
  // 1. Double semicolons (fix-double-semicolons)
  const value = 42;;
  console.log(value);;
  
  // 2. Console.log for errors (console-log-to-console-error)
  console.log('Error: Something went wrong');
  console.log("Error: Another issue");
  
  // 3. Malformed object literal (fix-malformed-object-literal)
  const obj = {;
  // Should be fixed to: const obj = {
  
  // Issues for AST transformations:
  
  // 4. Loose equality (strict-equality)
  if (value == 42) {
    console.log('Found it');
  }
  
  // 5. Loose inequality (strict-inequality)  
  if (value != null) {
    console.log('Not null');
  }
  
  // 6. Array indexOf instead of includes (array-includes-instead-of-indexof)
  const items = [1, 2, 3];
  if (items.indexOf(2) !== -1) {
    console.log('Found 2');
  }
  
  // 7. String concatenation (template-literal-conversion)
  const message = 'Hello ' + value + ' world';
  
  // 8. Object property shorthand opportunity
  const name = 'test';
  const id = 'id123';
  const config = { name: name, id: id };
  
  // 9. Var declarations (smart-var-to-const-let)
  var counter = 0;
  var items2 = [];
  
  return config;
}
