// Test file to demonstrate AST vs Template patterns
var globalData = { id: id, name: name, email: email };
var isReady = false;

function testFunction() {
  var localVar = 'hello';
  return localVar;
}

function processItems(items) {
  for (const i = 0; i < items.length; i++) {
    if (items.indexOf('test') !== -1) {
      console.log('Found test item');
    }
  }
}

// Object property shorthand opportunities
const user = {
  id: id,
  name: name,
  active: active
};

// Promise chain that could be async/await
getData().then((result) => {
  console.log('Data received:', result);
  processData(result);
}).catch((error) => {
  console.error('Error:', error);
});

// Arrow function with unnecessary return
const calculate = (x, y) => { return x + y; };

// String concatenation
const message = 'Hello ' + userName + ', welcome!';
