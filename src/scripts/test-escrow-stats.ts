import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EscrowService } from '../escrow/escrow.service';
import { EmailService } from '../email/email.service';
import { PaystackService } from '../paystack/paystack.service';

async function testEscrowStats() {
  console.log('🧪 Testing Escrow Stats Endpoint...\n');

  // Initialize services
  const configService = new ConfigService();
  const prisma = new PrismaService(configService);
  const emailService = new EmailService(configService);
  const paystackService = new PaystackService(configService, prisma);
  const escrowService = new EscrowService(prisma, emailService, configService, paystackService);

  try {
    // Test escrow stats
    console.log('📊 Fetching escrow statistics...');
    const stats = await escrowService.getEscrowStats();
    
    console.log('✅ Escrow stats retrieved successfully:');
    console.log('   Total Escrow Amount:', stats.totalEscrowAmount);
    console.log('   Pending Escrows:', stats.pendingEscrows);
    console.log('   Completed Escrows:', stats.completedEscrows);
    console.log('   Disputed Escrows:', stats.disputedEscrows);
    console.log('   Released Today:', stats.releasedToday);
    console.log('   Auto-Release Pending:', stats.autoReleasePending);

    console.log('\n🎉 Escrow stats test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testEscrowStats().catch(console.error);
