// Test file with var issues that the system should fix
var globalCounter = 0;
var isReady = false;
var userName = 'default';

function processData() {
  var localData = 'test';
  var count = 0;

  for (var i = 0; i < 10; i++) {
    if (localData == 'test') {
      count++;
    }
  }

  return count;
}

// Some equality issues to fix
if (userName == 'admin') {
  console.log('Admin user');
}

var items = [1, 2, 3];
for (var j = 0; j < items.length; j++) {
  if (items[j] == 2) {
    console.log('Found 2');
  }
}
