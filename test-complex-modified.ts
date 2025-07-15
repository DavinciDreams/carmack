// Test file with higher complexity to trigger AST mode
const globalCounter = 0;
const isReady = false;
const userName = 'default';

function processComplexData(input: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!input) {
      reject('Invalid input');
      return;
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (var i = 0; i < input.length; i++) {
      const item = input[i];

      if (item === null) {
        errors.push('Null item at index ' + i);
        continue;
      }

      if (item.type === 'special') {
        const processed = processSpecialItem(item);
        if (processed !== null) {
          results.push(processed);
        } else {
          errors.push('Failed to process special item');
        }
      } else if (item.type === 'normal') {
        const processed = processNormalItem(item);
        results.push(processed);
      } else {
        errors.push('Unknown item type: ' + item.type);
      }
    }

    if (errors.length > 0) {
      console.error(' Processing completed with errors:', errors);
      resolve({ results, errors });
    } else {
      resolve({ results });
    }
  });
}

function processSpecialItem(item: any): any {
  const config = getConfig();
  const validator = getValidator();

  if (validator.validate(item) === false) {
    return null;
  }

  const transformed = {
    id: item.id,
    value: item.value * config.multiplier,
    timestamp: Date.now(),
  };

  return transformed;
}

function processNormalItem(item: any): any {
  const result = {
    id: item.id,
    value: item.value,
    processed: true,
  };

  return result;
}

function getConfig(): any {
  return {
    multiplier: 2,
    threshold: 100,
  };
}

function getValidator(): any {
  return {
    validate: (item: any) => {
      if (item === null) return false;
      if (item.value === undefined) return false;
      if (item.id === null) return false;
      return true;
    },
  };
}

// Legacy callback pattern that should be converted
function fetchUserData(userId: number, callback: (err: Error | null, data?: any) => void): void {
  setTimeout(() => {
    if (userId === 0) {
      callback(new Error('Invalid user ID'));
    } else {
      callback(null, { id: userId, name: 'User ' + userId });
    }
  }, 1000);
}

// Using the callback
fetchUserData(123, (err, data) => {
  if (err) {
    console.error(' ' + err.message);
  } else {
    console.log('Data:', data);
  }
});

export { processComplexData, processSpecialItem, processNormalItem };
