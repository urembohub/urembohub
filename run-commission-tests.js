const { exec } = require('child_process');
const path = require('path');

console.log('🧪 Commission System Test Suite');
console.log('================================\n');

const tests = [
  {
    name: 'Commission System Debug',
    file: 'debug-commission-system.js',
    description: 'Basic commission system functionality test'
  },
  {
    name: 'Commission Integration Test',
    file: 'test-commission-integration.js',
    description: 'Commission integration and settings test'
  },
  {
    name: 'Commission Payment Flow Test',
    file: 'test-commission-payment-flow.js',
    description: 'Payment flow and commission processing test'
  },
  {
    name: 'Real Payment Flow Test',
    file: 'test-real-payment-flow.js',
    description: 'Test with real payment data'
  },
  {
    name: 'Commission Log Checker',
    file: 'check-commission-logs.js',
    description: 'Analyze commission system logs and issues'
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n🚀 Running ${test.name}`);
    console.log('='.repeat(50));
    console.log(`Description: ${test.description}`);
    console.log('');

    const testPath = path.join(__dirname, test.file);
    const child = exec(`node "${testPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.log(`❌ ${test.name} failed`);
        console.log('Error:', error.message);
        if (stderr) {
          console.log('Stderr:', stderr);
        }
        resolve({ success: false, error: error.message });
      } else {
        console.log(`✅ ${test.name} completed`);
        resolve({ success: true, output: stdout });
      }
    });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}

async function main() {
  console.log('Starting commission system test suite...\n');
  console.log('Make sure you have set the following environment variables:');
  console.log('- API_BASE_URL (default: https://api.urembohub.com/api)');
  console.log('- AUTH_TOKEN (optional, for authenticated requests)');
  console.log('');

  const results = [];

  for (const test of tests) {
    const result = await runTest(test);
    results.push({ ...test, ...result });
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎯 Test Suite Summary');
  console.log('=====================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\nFailed tests:');
    failed.forEach(test => {
      console.log(`  ❌ ${test.name}: ${test.error}`);
    });
  }
  
  console.log('\nNext steps:');
  console.log('1. Review the test results above');
  console.log('2. Fix any issues identified');
  console.log('3. Check server logs for detailed error messages');
  console.log('4. Test with a real payment transaction');
  console.log('5. Verify Paystack integration is working');
}

main().catch(console.error);
