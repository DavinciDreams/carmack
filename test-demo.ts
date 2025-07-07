// Fresh test file to show AST vs Template differences
var counter = 0;
var isActive = true;
var userData = { id: id, name: name, active: active };

function doSomething() {
  for (const i = 0; i < 10; i++) {
    counter++;
  }
}

// Promise chain
getData().then((result) => {
  console.log('Got result:', result);
}).catch((err) => {
  console.error('Error:', err);
});

// String concatenation
const greeting = 'Hello ' + userName + '!';

// Unnecessary return
const add = (a, b) => { return a + b; };
