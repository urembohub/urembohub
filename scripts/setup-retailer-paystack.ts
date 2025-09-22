import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupRetailerPaystack() {
  try {
    console.log('🔧 Setting up retailer with Paystack sub-account data...');

    // Get the test retailer
    const retailer = await prisma.profile.findFirst({
      where: { 
        role: 'retailer',
        email: 'retailer@test.com'
      }
    });

    if (!retailer) {
      throw new Error('Test retailer not found');
    }

    console.log(`📦 Found retailer: ${retailer.email}`);

    // Clear any test sub-account data - retailer needs to complete proper onboarding
    const updatedRetailer = await prisma.profile.update({
      where: { id: retailer.id },
      data: {
        paystackSubaccountId: null, // No sub-account until proper onboarding
        paystackBusinessName: 'Test Beauty Store',
        paystackSettlementBank: '26', // Access Bank Kenya
        paystackAccountNumber: '1234567890',
        paystackPrimaryContactEmail: 'retailer@test.com',
        paystackPrimaryContactName: 'Test Retailer',
        paystackPrimaryContactPhone: '+254700000000',
        paystackCommissionRate: 0.05, // 5% commission
        paystackSubaccountCreatedAt: null,
        paystackSubaccountStatus: null,
      }
    });

    console.log('✅ Retailer updated with Paystack data:');
    console.log(`   Sub-account ID: ${updatedRetailer.paystackSubaccountId}`);
    console.log(`   Business Name: ${updatedRetailer.paystackBusinessName}`);
    console.log(`   Settlement Bank: ${updatedRetailer.paystackSettlementBank}`);
    console.log(`   Account Number: ${updatedRetailer.paystackAccountNumber}`);
    console.log(`   Commission Rate: ${updatedRetailer.paystackCommissionRate}`);

    console.log('🎉 Retailer Paystack setup completed!');

  } catch (error) {
    console.error('❌ Error setting up retailer Paystack:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupRetailerPaystack();
