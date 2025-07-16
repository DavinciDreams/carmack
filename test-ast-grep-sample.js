// Test file for AST-grep patterns
function testFunction(param1, param2) {
  return param1 + param2;
}

const arrowFunction = (a, b) => a * b;

class TestClass {
  constructor(name) {
    this.name = name;
  }

  method(value) {
    return this.name + value;
  }
}

export function exportedFunction() {
  return 'exported';
}
