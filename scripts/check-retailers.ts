import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking retailers and their Paystack sub-account status...\n');

  // Get all retailers
  const retailers = await prisma.profile.findMany({
    where: {
      role: 'retailer'
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      paystackSubaccountId: true,
      paystackBusinessName: true,
      paystackSettlementBank: true,
      paystackAccountNumber: true,
      paystackCommissionRate: true,
      paystackSubaccountStatus: true,
      paystackSubaccountCreatedAt: true,
    }
  });

  console.log(`Found ${retailers.length} retailers:\n`);

  retailers.forEach((retailer, index) => {
    console.log(`${index + 1}. ${retailer.email} (${retailer.fullName})`);
    console.log(`   Sub-account ID: ${retailer.paystackSubaccountId || 'None'}`);
    console.log(`   Business Name: ${retailer.paystackBusinessName || 'None'}`);
    console.log(`   Settlement Bank: ${retailer.paystackSettlementBank || 'None'}`);
    console.log(`   Account Number: ${retailer.paystackAccountNumber || 'None'}`);
    console.log(`   Commission Rate: ${retailer.paystackCommissionRate || 'None'}`);
    console.log(`   Status: ${retailer.paystackSubaccountStatus || 'None'}`);
    console.log(`   Created At: ${retailer.paystackSubaccountCreatedAt || 'None'}`);
    console.log('');
  });

  // Check if any have real Paystack sub-accounts (not test ones)
  const realSubaccounts = retailers.filter(r => 
    r.paystackSubaccountId && 
    !r.paystackSubaccountId.startsWith('ACCT_test_') &&
    !r.paystackSubaccountId.startsWith('ACCT_mock')
  );

  console.log(`\n📊 Summary:`);
  console.log(`   Total retailers: ${retailers.length}`);
  console.log(`   With sub-accounts: ${retailers.filter(r => r.paystackSubaccountId).length}`);
  console.log(`   With real sub-accounts: ${realSubaccounts.length}`);
  console.log(`   With test/mock sub-accounts: ${retailers.filter(r => 
    r.paystackSubaccountId && 
    (r.paystackSubaccountId.startsWith('ACCT_test_') || r.paystackSubaccountId.startsWith('ACCT_mock'))
  ).length}`);

  if (realSubaccounts.length > 0) {
    console.log('\n✅ Retailers with real Paystack sub-accounts:');
    realSubaccounts.forEach(r => {
      console.log(`   - ${r.email}: ${r.paystackSubaccountId}`);
    });
  } else {
    console.log('\n⚠️  No retailers have real Paystack sub-accounts configured.');
    console.log('   All retailers need to complete the onboarding process to create sub-accounts.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error checking retailers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed');
  });
