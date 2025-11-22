import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRestockAPI() {
  console.log('🧪 Testing Restock API Endpoints\n');

  try {
    // Find a retailer
    const retailer = await prisma.profile.findFirst({
      where: { role: 'retailer' },
      select: {
        id: true,
        email: true,
        businessName: true,
      },
    });

    if (!retailer) {
      console.log('❌ No retailer found');
      return;
    }

    console.log('✅ Retailer found:', retailer);
    console.log('');

    // Simulate what getAllAvailableManufacturerProducts does
    console.log('🔍 Testing getAllAvailableManufacturerProducts logic...');
    
    const manufacturerProfiles = await prisma.profile.findMany({
      where: { role: 'manufacturer' },
      select: {
        id: true,
        email: true,
        businessName: true,
      },
    });

    const manufacturerIds = manufacturerProfiles.map(p => p.id);
    console.log(`🏭 Found ${manufacturerIds.length} manufacturers:`, manufacturerProfiles.map(p => ({ id: p.id, email: p.email })));
    console.log('');

    const whereClause: any = {
      isActive: true,
      manufacturerId: { 
        not: null,
        in: manufacturerIds,
      },
      NOT: {
        retailerId: retailer.id,
      },
    };

    console.log('📋 Query where clause:', JSON.stringify(whereClause, null, 2));
    console.log('');

    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        sku: true,
        manufacturerId: true,
        retailerId: true,
        stockQuantity: true,
        isActive: true,
      },
    });

    console.log(`✅ Found ${products.length} products:`);
    products.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name}`);
      console.log(`      - manufacturerId: ${p.manufacturerId}`);
      console.log(`      - retailerId: ${p.retailerId}`);
      console.log(`      - Stock: ${p.stockQuantity}`);
      console.log('');
    });

    if (products.length === 0) {
      console.log('⚠️ No products found with the query');
      console.log('');
      console.log('🔍 Debugging: Checking all manufacturer products...');
      const allManufacturerProducts = await prisma.product.findMany({
        where: {
          manufacturerId: { not: null },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          manufacturerId: true,
          retailerId: true,
        },
      });
      console.log(`Found ${allManufacturerProducts.length} products with manufacturerId set:`);
      allManufacturerProducts.forEach(p => {
        console.log(`  - ${p.name}: manufacturerId=${p.manufacturerId}, retailerId=${p.retailerId}`);
      });
      console.log('');
      console.log(`Current retailer ID: ${retailer.id}`);
      console.log('Products excluded because retailerId matches:', allManufacturerProducts.filter(p => p.retailerId === retailer.id).length);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRestockAPI();

