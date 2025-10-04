const { RtcTokenBuilder, RtcRole } = require('agora-token');

// Try to load environment variables (if dotenv is available)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, use environment variables directly
}

const appId = process.env.AGORA_APP_ID;
const appCertificate = process.env.AGORA_APP_CERTIFICATE;

console.log('Testing Agora Token Generation');
console.log('=================================\n');

// Check if credentials are set
if (!appId || !appCertificate) {
  console.error('❌ ERROR: Missing Agora credentials!');
  console.error('Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE in your .env file\n');
  process.exit(1);
}

console.log('✅ Agora App ID found:', appId.substring(0, 8) + '...');
console.log('✅ Agora App Certificate found:', appCertificate.substring(0, 8) + '...\n');

// Test token generation
const channelName = 'test_channel_123';
const uid = 12345;
const role = RtcRole.PUBLISHER;
const expirationTimeInSeconds = 3600; // 1 hour

try {
  console.log('Generating token with parameters:');
  console.log('  Channel:', channelName);
  console.log('  UID:', uid);
  console.log('  Role:', role === RtcRole.PUBLISHER ? 'PUBLISHER' : 'SUBSCRIBER');
  console.log('  Expires in:', expirationTimeInSeconds, 'seconds (1 hour)');
  console.log('');

  // RtcTokenBuilder2 takes 7 parameters:
  // appId, appCertificate, channelName, uid, role, tokenExpire, privilegeExpire
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    role,
    expirationTimeInSeconds,  // Token expiration in seconds
    expirationTimeInSeconds   // Privilege expiration in seconds
  );

  console.log('✅ Token generated successfully!');
  console.log('Token:', token);
  console.log('Token length:', token.length);
  console.log('Token prefix:', token.substring(0, 10) + '...\n');

  console.log('=================================');
  console.log('✅ All tests passed!');
  console.log('Your Agora configuration is correct.\n');

} catch (error) {
  console.error('❌ ERROR: Failed to generate token');
  console.error('Error message:', error.message);
  console.error('\nPlease check:');
  console.error('1. AGORA_APP_ID is correct (32-character hex string)');
  console.error('2. AGORA_APP_CERTIFICATE is correct (32-character hex string)');
  console.error('3. Both values are from the same project in Agora Console\n');
  process.exit(1);
}

