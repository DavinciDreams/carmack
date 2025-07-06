// Sample TypeScript code with various patterns that can be improved
const userName = 'john_doe';
const userAge = 25;
const isActive = true;

function getUserInfo(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id === 0) {
        // Test loose equality
        reject('Invalid user ID');
      } else {
        resolve({
          id: id,
          name: userName,
          age: userAge,
          active: isActive,
        });
      }
    }, 1000);
  });
}

function processUser(userId) {
  getUserInfo(userId)
    .then((user) => {
      console.log('User found:', user.name);
      if (user.active) {
        console.log('User is active');
      }
    })
    .catch((error) => {
      console.log('Error:', error);
    });
}

const userList = [1, 2, 3, 4, 5];
for (const i = 0; i < userList.length; i++) {
  processUser(userList[i]);
}

// Some more patterns to transform
function calculateTotal(items) {
  const total = 0;
  for (const j = 0; j < items.length; j++) {
    total = total + items[j].price;
  }
  return total;
}

// Legacy callback pattern
function fetchData(callback) {
  setTimeout(() => {
    callback(null, { data: 'sample data' });
  }, 500);
}

// Using the legacy callback
fetchData((err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Data:', result.data);
  }
});
