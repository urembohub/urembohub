import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkManufacturerShipping() {
  try {
    const email = 'manu@test.com';
    
    console.log(`\n🔍 Checking manufacturer shipping configuration for: ${email}\n`);
    
    // Find manufacturer by email
    const manufacturer = await prisma.profile.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        businessName: true,
        role: true,
        deliveryDetails: true,
        pickupMtaaniBusinessDetails: true,
      },
    });

    if (!manufacturer) {
      console.log(`❌ Manufacturer with email ${email} not found`);
      return;
    }

    console.log(`✅ Manufacturer found:`);
    console.log(`   - ID: ${manufacturer.id}`);
    console.log(`   - Name: ${manufacturer.fullName}`);
    console.log(`   - Business: ${manufacturer.businessName || 'N/A'}`);
    console.log(`   - Role: ${manufacturer.role}\n`);

    // Check deliveryDetails
    console.log(`📦 Delivery Details:`);
    if (!manufacturer.deliveryDetails) {
      console.log(`   ❌ NOT CONFIGURED - deliveryDetails is null/undefined\n`);
    } else {
      const deliveryDetails = typeof manufacturer.deliveryDetails === 'string'
        ? JSON.parse(manufacturer.deliveryDetails)
        : manufacturer.deliveryDetails;
      
      console.log(`   ✅ Configured`);
      console.log(`   📄 Content:`, JSON.stringify(deliveryDetails, null, 2));
      
      // Check for required fields
      const agentId = deliveryDetails?.agentId || deliveryDetails?.deliveryDetails?.agentId;
      if (!agentId) {
        console.log(`   ⚠️  WARNING: agentId not found in deliveryDetails`);
      } else {
        console.log(`   ✅ agentId: ${agentId}`);
      }
      console.log();
    }

    // Check pickupMtaaniBusinessDetails
    console.log(`🏢 Pick Up Mtaani Business Details:`);
    if (!manufacturer.pickupMtaaniBusinessDetails) {
      console.log(`   ❌ NOT CONFIGURED - pickupMtaaniBusinessDetails is null/undefined\n`);
    } else {
      const businessDetails = typeof manufacturer.pickupMtaaniBusinessDetails === 'string'
        ? JSON.parse(manufacturer.pickupMtaaniBusinessDetails)
        : manufacturer.pickupMtaaniBusinessDetails;
      
      console.log(`   ✅ Configured`);
      console.log(`   📄 Content:`, JSON.stringify(businessDetails, null, 2));
      
      // Check for required fields
      const businessId = businessDetails?.businessId || businessDetails?.id;
      if (!businessId) {
        console.log(`   ⚠️  WARNING: businessId not found in pickupMtaaniBusinessDetails`);
      } else {
        console.log(`   ✅ businessId: ${businessId}`);
      }
      console.log();
    }

    // Summary
    console.log(`\n📊 Summary:`);
    const hasDeliveryDetails = !!manufacturer.deliveryDetails;
    const hasBusinessDetails = !!manufacturer.pickupMtaaniBusinessDetails;
    const deliveryDetailsObj = manufacturer.deliveryDetails 
      ? (typeof manufacturer.deliveryDetails === 'string' ? JSON.parse(manufacturer.deliveryDetails) : manufacturer.deliveryDetails)
      : null;
    const hasAgentId = !!(deliveryDetailsObj?.agentId || deliveryDetailsObj?.deliveryDetails?.agentId);
    const businessDetailsObj = manufacturer.pickupMtaaniBusinessDetails
      ? (typeof manufacturer.pickupMtaaniBusinessDetails === 'string' ? JSON.parse(manufacturer.pickupMtaaniBusinessDetails) : manufacturer.pickupMtaaniBusinessDetails)
      : null;
    const hasBusinessId = !!(businessDetailsObj?.businessId || businessDetailsObj?.id);

    console.log(`   - Delivery Details: ${hasDeliveryDetails ? '✅' : '❌'}`);
    console.log(`   - Agent ID: ${hasAgentId ? '✅' : '❌'}`);
    console.log(`   - Business Details: ${hasBusinessDetails ? '✅' : '❌'}`);
    console.log(`   - Business ID: ${hasBusinessId ? '✅' : '❌'}`);

    if (!hasDeliveryDetails || !hasAgentId) {
      console.log(`\n❌ ISSUE: Manufacturer needs to configure deliveryDetails with agentId`);
    }
    if (!hasBusinessDetails || !hasBusinessId) {
      console.log(`\n❌ ISSUE: Manufacturer needs to configure pickupMtaaniBusinessDetails with businessId`);
    }
    if (hasDeliveryDetails && hasAgentId && hasBusinessDetails && hasBusinessId) {
      console.log(`\n✅ All shipping details are properly configured!`);
    }

  } catch (error) {
    console.error('Error checking manufacturer shipping:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkManufacturerShipping();

