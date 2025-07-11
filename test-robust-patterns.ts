// Test file to demonstrate robust transformation patterns
const userObj = { id: id, name: name, email: email };
const isActive = status == 'active';
const isValid = data != null;

function processUser(user) {
  if (user.status == 'pending') {
    console.log('Error: User is pending');
    return false;
  }
  return user.items.indexOf('premium') !== -1;
}

// String concatenation that could be template literals
const message = 'Hello ' + userName + ', welcome to ' + siteName;
const url = 'https://' + domain + '/api/' + endpoint;

// For loop with const variable that should be let
for (const i = 0; i < items.length; i++) {
  items[i].process();
}

// Arrow function with unnecessary return
const double = (x) => {
  return x * 2;
};
const isEven = (n) => {
  return n % 2 === 0;
};
