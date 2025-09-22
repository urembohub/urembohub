import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearFakeSubaccount() {
  try {
    console.log('🧹 Clearing fake sub-account ID...');
    
    const result = await prisma.profile.updateMany({
      where: {
        paystackSubaccountId: 'ACCT_test_retailer_123'
      },
      data: {
        paystackSubaccountId: null,
        paystackSubaccountStatus: null,
        paystackSubaccountCreatedAt: null
      }
    });
    
    console.log(`✅ Updated ${result.count} records`);
    
    // Check the retailer's current status
    const retailer = await prisma.profile.findFirst({
      where: { email: 'retailer@test.com' },
      select: { 
        email: true, 
        paystackSubaccountId: true,
        paystackSubaccountStatus: true 
      }
    });
    
    console.log('📊 Retailer status after cleanup:');
    console.log(`   Email: ${retailer?.email}`);
    console.log(`   Sub-account ID: ${retailer?.paystackSubaccountId || 'None'}`);
    console.log(`   Status: ${retailer?.paystackSubaccountStatus || 'None'}`);
    
  } catch (error) {
    console.error('❌ Error clearing fake sub-account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearFakeSubaccount();
