
// This code has several issues that LLM should fix
var userName = 'john';
var userAge = 25;

function checkUser(user) {
  if (user.name == userName) {
    console.log('User found');
    if (user.age == userAge) {
      console.log('Age matches');
      return true;
    }
  }
  return false;
}

// Error logging
console.log('Error: Something went wrong');

// Inefficient array search
if (users.indexOf(currentUser) != -1) {
  console.log('User is in list');
}
