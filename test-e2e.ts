// Test file for comprehensive end-to-end validation
const oldStyleVar = 'this should be const';
const anotherVar = 42;
if (value == null) {
  console.log('This should use strict equality');
}

if (array.includes(item)) {
  console.log('This should use array.includes()');
}

function unnecessaryReturn() {
  return console.log('This return is unnecessary');
}

// Some modern patterns that should be preserved
const modernConst = 'keep this';
const result = array.includes(searchItem);

// Object that could use shorthand
const obj = {
  name: name,
  value: value,
  count: count,
};

// Promise that could be async/await
function fetchData() {
  return fetch('/api/data')
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
