import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkVendorSubaccount() {
  console.log('🔍 [VENDOR_SUBACCOUNT_CHECK] ===========================================');
  console.log('🔍 [VENDOR_SUBACCOUNT_CHECK] Checking Vendor Subaccount Status');
  console.log('🔍 [VENDOR_SUBACCOUNT_CHECK] ===========================================\n');

  const prisma = new PrismaService();
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  const paystackBaseUrl = 'https://api.paystack.co';

  if (!paystackSecretKey) {
    console.error('❌ PAYSTACK_SECRET_KEY is not configured!');
    process.exit(1);
  }

  try {
    // Find vendor by email
    const vendorEmail = 'vendor@test.com';
    console.log(`📧 Looking for vendor: ${vendorEmail}\n`);

    const vendor = await prisma.profile.findUnique({
      where: { email: vendorEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        businessName: true,
        role: true,
        paystackSubaccountId: true,
        paystackSubaccountStatus: true,
        paystackSubaccountVerified: true,
        paystackSubaccountCreatedAt: true,
        paystackBusinessName: true,
        paystackSettlementBank: true,
        paystackAccountNumber: true,
        paystackPrimaryContactEmail: true,
        paystackPrimaryContactName: true,
      },
    });

    if (!vendor) {
      console.error(`❌ Vendor not found: ${vendorEmail}`);
      process.exit(1);
    }

    console.log('✅ Vendor found:');
    console.log(`   ID: ${vendor.id}`);
    console.log(`   Name: ${vendor.fullName || 'N/A'}`);
    console.log(`   Business Name: ${vendor.businessName || 'N/A'}`);
    console.log(`   Role: ${vendor.role}`);
    console.log('');

    // Check database subaccount info
    console.log('📊 Database Subaccount Info:');
    console.log(`   Subaccount ID: ${vendor.paystackSubaccountId || '❌ NOT SET'}`);
    console.log(`   Status: ${vendor.paystackSubaccountStatus || '❌ NOT SET'}`);
    console.log(`   Verified: ${vendor.paystackSubaccountVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created At: ${vendor.paystackSubaccountCreatedAt || '❌ NOT SET'}`);
    console.log(`   Business Name: ${vendor.paystackBusinessName || '❌ NOT SET'}`);
    console.log(`   Settlement Bank: ${vendor.paystackSettlementBank || '❌ NOT SET'}`);
    console.log(`   Account Number: ${vendor.paystackAccountNumber || '❌ NOT SET'}`);
    console.log(`   Primary Contact Email: ${vendor.paystackPrimaryContactEmail || '❌ NOT SET'}`);
    console.log(`   Primary Contact Name: ${vendor.paystackPrimaryContactName || '❌ NOT SET'}`);
    console.log('');

    // If no subaccount ID in database
    if (!vendor.paystackSubaccountId) {
      console.log('❌ [RESULT] Vendor does NOT have a subaccount ID in the database');
      console.log('   Action Required: Vendor needs to complete onboarding to create a Paystack subaccount');
      process.exit(1);
    }

    // Verify subaccount exists in Paystack
    console.log('🔍 Verifying subaccount with Paystack API...');
    console.log(`   Subaccount ID: ${vendor.paystackSubaccountId}\n`);

    try {
      const response = await axios.get(
        `${paystackBaseUrl}/subaccount/${vendor.paystackSubaccountId}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
          },
        }
      );

      if (response.data.status && response.data.data) {
        const subaccount = response.data.data;
        console.log('✅ [RESULT] Subaccount EXISTS in Paystack:');
        console.log(`   Subaccount Code: ${subaccount.subaccount_code}`);
        console.log(`   Business Name: ${subaccount.business_name || 'N/A'}`);
        console.log(`   Settlement Bank: ${subaccount.settlement_bank || 'N/A'}`);
        console.log(`   Account Number: ${subaccount.account_number || 'N/A'}`);
        console.log(`   Percentage Charge: ${subaccount.percentage_charge || 'N/A'}%`);
        console.log(`   Primary Contact Email: ${subaccount.primary_contact_email || 'N/A'}`);
        console.log(`   Primary Contact Name: ${subaccount.primary_contact_name || 'N/A'}`);
        console.log(`   Active: ${subaccount.active ? '✅ Yes' : '❌ No'}`);
        console.log(`   Is Verified: ${subaccount.is_verified ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created At: ${subaccount.createdAt || 'N/A'}`);
        console.log('');

        // Check if subaccount is active and verified
        if (subaccount.active && subaccount.is_verified) {
          console.log('✅ [FINAL STATUS] Subaccount is VALID and can be used for payments');
        } else {
          console.log('⚠️ [FINAL STATUS] Subaccount exists but is NOT active or verified');
          console.log(`   Active: ${subaccount.active}`);
          console.log(`   Verified: ${subaccount.is_verified}`);
        }
      } else {
        console.log('❌ [RESULT] Paystack API returned unsuccessful response');
        console.log(`   Status: ${response.data.status}`);
        console.log(`   Message: ${response.data.message || 'N/A'}`);
      }
    } catch (error: any) {
      if (error.response) {
        console.log('❌ [RESULT] Subaccount NOT FOUND in Paystack:');
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.message || 'N/A'}`);
        console.log(`   Code: ${error.response.data?.code || 'N/A'}`);
        console.log('');
        console.log('⚠️ [ACTION REQUIRED]');
        console.log('   The subaccount ID in the database does not exist in Paystack.');
        console.log('   This could mean:');
        console.log('   1. The subaccount was deleted from Paystack');
        console.log('   2. The subaccount ID is incorrect');
        console.log('   3. The subaccount was never created');
        console.log('');
        console.log('   Solution: Vendor needs to complete onboarding again to create a new subaccount');
      } else {
        console.error('❌ Error checking Paystack:', error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkVendorSubaccount()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });

