// Sample TypeScript code with various patterns that can be improved
var userName = 'john_doe';
var userAge = 25;
var isActive = true;

function getUserInfo(
  id: number
): Promise<{ id: number; name: string; age: number; active: boolean }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id === 0) {
        // Test loose equality - should become ===
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

function processUser(userId: number): void {
  getUserInfo(userId)
    .then((user) => {
      console.log('User found:', user.name);
      if (user.active) {
        console.log('User is active');
      }
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

const userList = [1, 2, 3, 4, 5];
for (let i = 0; i < userList.length; i++) {
  processUser(userList[i]);
}

// Some more patterns to transform
function calculateTotal(items: Array<{ price: number }>): number {
  var total = 0;
  for (var j = 0; j < items.length; j++) {
    total = total + items[j].price;
  }
  return total;
}

// Legacy callback pattern
function fetchData(callback: (err: Error | null, result?: { data: string }) => void): void {
  setTimeout(() => {
    callback(null, { data: 'sample data' });
  }, 500);
}

// Using the legacy callback
fetchData((err, result) => {
  if (err) {
    console.error('Error:', err);
  } else if (result) {
    console.log('Data:', result.data);
  }
});
