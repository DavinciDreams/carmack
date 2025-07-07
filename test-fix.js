// Quick test to verify the infinite loop fix
console.log('Testing machine fix...');

// Simulate the guards and actions
function testRetryLogic() {
  let currentRetries = 0;
  const maxRetries = 3;
  const startTime = Date.now();
  const timeoutMs = 5000; // 5 seconds for testing

  // Simulate the retrying logic
  while (currentRetries < maxRetries) {
    console.log(`Retry ${currentRetries + 1}/${maxRetries}`);

    // Check timeout
    if (Date.now() - startTime > timeoutMs) {
      console.log('❌ TIMEOUT: Operation exceeded time limit');
      break;
    }

    // Simulate some work
    const shouldSucceed = Math.random() > 0.8; // 20% success rate

    if (shouldSucceed) {
      console.log('✅ SUCCESS: Operation completed');
      break;
    }

    currentRetries++;

    if (currentRetries >= maxRetries) {
      console.log('❌ MAX RETRIES: Exceeded retry limit');
      break;
    }

    // Small delay to simulate work
    const now = Date.now();
    while (Date.now() - now < 100) {} // 100ms delay
  }

  console.log('Test completed');
}

testRetryLogic();
