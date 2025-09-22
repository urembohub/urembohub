import { PrismaService } from '../prisma/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { PaystackService } from '../paystack/paystack.service';

async function testEscrowAPIEndpoint() {
  try {
    console.log('🔍 Testing escrow stats API endpoint...\n');

    // Initialize services
    const configService = new ConfigService();
    const prisma = new PrismaService(configService);
    const emailService = new EmailService(configService);
    const paystackService = new PaystackService(configService, prisma);
    const escrowService = new EscrowService(prisma, emailService, configService, paystackService);

    // Test the getEscrowStats method
    console.log('📊 Testing getEscrowStats()...');
    const stats = await escrowService.getEscrowStats();
    
    console.log('✅ Escrow Stats Response:');
    console.log(JSON.stringify(stats, null, 2));

    // Test if the API endpoint would work
    console.log('\n🌐 Testing API endpoint simulation...');
    
    // Simulate what the frontend would receive
    const apiResponse = {
      success: true,
      data: stats,
      error: null
    };

    console.log('✅ API Response (what frontend receives):');
    console.log(JSON.stringify(apiResponse, null, 2));

    // Check if the data is correct
    if (stats.totalEscrowAmount > 0) {
      console.log('\n✅ SUCCESS: Escrow stats are working correctly!');
      console.log(`Total escrow amount: ${stats.totalEscrowAmount}`);
      console.log(`Pending escrows: ${stats.pendingEscrows}`);
      console.log('The admin dashboard should show this data.');
    } else {
      console.log('\n❌ ISSUE: Escrow stats show 0 - there might be a problem');
    }

  } catch (error) {
    console.error('❌ Error testing escrow API:', error);
  } finally {
    process.exit(0);
  }
}

testEscrowAPIEndpoint();
