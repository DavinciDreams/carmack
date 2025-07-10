// Test file with var issues that the system should fix
const appCounter = 0;
const systemReady = false;
const currentUser = 'default';

function processData() {
  const localData = 'test';
  const dataCount = 0;

  for (var i = 0; i < 10; i++) {
    if (localData === 'test') {
      dataCount++;
    }
  }

  return dataCount;
}

// Some equality issues to fix
if (currentUser === 'admin') {
  console.log('Admin user');
}

const dataItems = [1, 2, 3];
for (var j = 0; j < dataItems.length; j++) {
  if (dataItems[j] === 2) {
    console.log('Found 2');
  }
}
