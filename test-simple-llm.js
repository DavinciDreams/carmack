// Simple test file for LLM transformation verification
var message = 'Hello World';
var count = 0;

function greet(name) {
  if (name == null) {
    console.log('Error: name is null');
    return false;
  }
  var greeting = 'Hello ' + name + '!';
  return greeting;
}

var result = greet('LLM');
console.log(result);
