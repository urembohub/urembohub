import { PrismaService } from '../prisma/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { PaystackService } from '../paystack/paystack.service';

async function testEscrowAPI() {
  try {
    console.log('🔍 Testing escrow stats API...\n');

    // Initialize services
    const configService = new ConfigService();
    const prisma = new PrismaService(configService);
    const emailService = new EmailService(configService);
    const paystackService = new PaystackService(configService, prisma);
    const escrowService = new EscrowService(prisma, emailService, configService, paystackService);

    // Test the getEscrowStats method
    console.log('📊 Testing getEscrowStats()...');
    const stats = await escrowService.getEscrowStats();
    
    console.log('✅ Escrow Stats API Response:');
    console.log(JSON.stringify(stats, null, 2));

    // Check if the stats match what we expect
    console.log('\n🔍 Verification:');
    console.log(`Total escrow amount: ${stats.totalEscrowAmount}`);
    console.log(`Pending escrows: ${stats.pendingEscrows}`);
    console.log(`Completed escrows: ${stats.completedEscrows}`);
    console.log(`Disputed escrows: ${stats.disputedEscrows}`);
    console.log(`Released today: ${stats.releasedToday}`);
    console.log(`Auto-release pending: ${stats.autoReleasePending}`);

    if (stats.totalEscrowAmount > 0) {
      console.log('\n✅ Escrow stats are working correctly!');
      console.log('The admin dashboard should show this data.');
    } else {
      console.log('\n❌ Escrow stats show 0 - there might be an issue');
    }

  } catch (error) {
    console.error('❌ Error testing escrow API:', error);
  } finally {
    process.exit(0);
  }
}

testEscrowAPI();
