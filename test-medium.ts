// Medium complexity file to test AST mode
const count = 0;
const active = true;

function simpleFunction(input: string): string {
  if (input === 'test') {
    return 'tested';
  }
  return input;
}

const items = [1, 2, 3];
for (var i = 0; i < items.length; i++) {
  if (items[i] === 2) {
    console.log('Error: Found item 2');
  }
}

const result = simpleFunction('hello');
console.log(result);
