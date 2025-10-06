const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Commission Test Environment');
console.log('=========================================\n');

async function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`❌ Command failed: ${command}`);
        console.log('Error:', error.message);
        reject(error);
      } else {
        console.log(`✅ Command successful: ${command}`);
        resolve(stdout);
      }
    });
  });
}

async function checkNodeVersion() {
  console.log('1. Checking Node.js version...');
  try {
    const output = await runCommand('node --version');
    console.log(`Node.js version: ${output.trim()}`);
  } catch (error) {
    console.log('❌ Node.js not found. Please install Node.js first.');
    process.exit(1);
  }
}

async function checkNpmVersion() {
  console.log('\n2. Checking npm version...');
  try {
    const output = await runCommand('npm --version');
    console.log(`npm version: ${output.trim()}`);
  } catch (error) {
    console.log('❌ npm not found. Please install npm first.');
    process.exit(1);
  }
}

async function installDependencies() {
  console.log('\n3. Installing dependencies...');
  try {
    await runCommand('npm install axios');
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.log('❌ Failed to install dependencies');
    console.log('Please run: npm install axios');
    process.exit(1);
  }
}

async function checkTestFiles() {
  console.log('\n4. Checking test files...');
  
  const testFiles = [
    'debug-commission-system.js',
    'test-commission-integration.js',
    'test-commission-payment-flow.js',
    'test-real-payment-flow.js',
    'check-commission-logs.js',
    'run-commission-tests.js'
  ];
  
  const missingFiles = [];
  
  for (const file of testFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.log('\n❌ Missing test files:', missingFiles.join(', '));
    console.log('Please ensure all test files are present.');
  } else {
    console.log('\n✅ All test files present');
  }
}

async function createEnvFile() {
  console.log('\n5. Creating environment file...');
  
  const envContent = `# Commission Test Environment Variables
# Copy this file to .env and update with your values

# API Base URL (required)
API_BASE_URL=https://api.urembohub.com/api

# JWT Token for authenticated requests (optional)
AUTH_TOKEN=your-jwt-token-here

# Example usage:
# export API_BASE_URL="https://api.urembohub.com/api"
# export AUTH_TOKEN="your-jwt-token-here"
`;

  const envPath = path.join(__dirname, '.env.example');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env.example file');
    console.log('Copy this file to .env and update with your values');
  } catch (error) {
    console.log('❌ Failed to create .env.example file');
    console.log('Error:', error.message);
  }
}

async function main() {
  try {
    await checkNodeVersion();
    await checkNpmVersion();
    await installDependencies();
    await checkTestFiles();
    await createEnvFile();
    
    console.log('\n🎯 Setup Complete!');
    console.log('==================');
    console.log('Your commission test environment is ready.');
    console.log('\nNext steps:');
    console.log('1. Copy .env.example to .env and update with your values');
    console.log('2. Run the test suite: node run-commission-tests.js');
    console.log('3. Or run individual tests as needed');
    console.log('\nFor more information, see COMMISSION_DEBUG_README.md');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
