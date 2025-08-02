
// Sample legacy TypeScript code with discoverable patterns
var oldVariable = 'this should be const';
var anotherVar = 42;

function oldFunction() {
  return 'this could be an arrow function';
}

function complexFunction(a, b) {
  if (a > b) {
    return a + b;
  }
  return a - b;
}

// String concatenation that could use template literals
const message = 'Hello ' + 'World' + '!';
const greeting = 'Hi ' + name + ', welcome!';

// TODO: This should be refactored
class OldClass {
  constructor(private value: string) {}
  
  getValue() {
    return this.value;
  }
}
