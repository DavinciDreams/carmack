// Test file with obvious TypeScript/code quality issues that should be auto-fixed
const oldVar = 'should be const';
const anotherOldVar = 42;
if (value == null) {
  console.log('should use strict equality');
}

if (items.indexOf(target) != -1) {
  console.log('should use array.includes and strict inequality');
}

// Object that should use shorthand
const config = {
  name: name,
  value: value,
  enabled: enabled,
};

// Promise chain that could be async/await
function fetchUserData() {
  return fetch('/api/user')
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      return data;
    })
    .catch((error) => {
      console.error(error);
      throw error;
    });
}

// Arrow function with unnecessary return
const mapper = (item) => item.name;

// String concatenation that should be template literal
const message = `Hello ${userName}, welcome to ` + appName + '!';
