
// Legacy JavaScript code with multiple issues
var userName = 'admin';
var userPermissions = ['read', 'write'];

function validateUser(user) {
  // Using == instead of ===
  if (user.name == userName) {
    console.log('User validation started');
    
    // Nested if statements (complexity issue)
    if (user.permissions) {
      if (user.permissions.length > 0) {
        if (user.permissions.indexOf('admin') != -1) {
          console.log('Admin user detected');
          return true;
        } else if (user.permissions.indexOf('moderator') != -1) {
          console.log('Moderator user detected');
          return true;
        } else {
          console.log('Regular user detected');
          return false;
        }
      }
    }
  }
  
  // Missing return statement
}

// Inefficient array operations
function findUserInList(users, targetUser) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].id == targetUser.id) {
      return users[i];
    }
  }
  return null;
}

// Error handling issues
function processUserData(data) {
  try {
    var result = JSON.parse(data);
    console.log('Data processed successfully');
    return result;
  } catch (e) {
    console.log('Error occurred: ' + e.message);
    // No proper error handling
  }
}

// Using var instead of const/let
var API_URL = 'https://api.example.com';
var MAX_RETRIES = 3;
