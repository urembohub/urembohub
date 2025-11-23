import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRestockFeature() {
  console.log('🧪 Testing Restock Feature\n');

  try {
    // 1. Find manufacturer by email
    console.log('1️⃣ Finding manufacturer with email: manu@test.com');
    const manufacturer = await prisma.profile.findUnique({
      where: { email: 'manu@test.com' },
      select: {
        id: true,
        email: true,
        businessName: true,
        fullName: true,
        role: true,
      },
    });

    if (!manufacturer) {
      console.log('❌ Manufacturer not found with email: manu@test.com');
      console.log('📋 Available manufacturers:');
      const allManufacturers = await prisma.profile.findMany({
        where: { role: 'manufacturer' },
        select: {
          id: true,
          email: true,
          businessName: true,
        },
        take: 10,
      });
      console.log(allManufacturers);
      return;
    }

    console.log('✅ Manufacturer found:', manufacturer);
    console.log('');

    // 2. Find products with this manufacturer's manufacturerId
    console.log('2️⃣ Finding products with manufacturerId:', manufacturer.id);
    const manufacturerProducts = await prisma.product.findMany({
      where: {
        manufacturerId: manufacturer.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        manufacturerId: true,
        retailerId: true,
        createdByRole: true,
        stockQuantity: true,
        isActive: true,
      },
    });

    console.log(`✅ Found ${manufacturerProducts.length} products for this manufacturer:`);
    manufacturerProducts.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (SKU: ${p.sku || 'N/A'})`);
      console.log(`      - ID: ${p.id}`);
      console.log(`      - manufacturerId: ${p.manufacturerId}`);
      console.log(`      - retailerId: ${p.retailerId}`);
      console.log(`      - createdByRole: ${p.createdByRole}`);
      console.log(`      - stockQuantity: ${p.stockQuantity}`);
      console.log(`      - isActive: ${p.isActive}`);
      console.log('');
    });

    if (manufacturerProducts.length === 0) {
      console.log('⚠️ No products found for this manufacturer');
      console.log('📋 Checking all products with manufacturerId set:');
      const allManufacturerProducts = await prisma.product.findMany({
        where: {
          manufacturerId: { not: null },
        },
        select: {
          id: true,
          name: true,
          manufacturerId: true,
          retailerId: true,
          createdByRole: true,
        },
        take: 10,
      });
      console.log(allManufacturerProducts);
      return;
    }

    // 3. Check for pending orders (reserved stock)
    console.log('3️⃣ Checking reserved stock for manufacturer products');
    for (const product of manufacturerProducts) {
      const reservedOrders = await prisma.manufacturerOrder.aggregate({
        where: {
          productId: product.id,
          status: {
            in: ['pending', 'approved', 'confirmed'],
          },
        },
        _sum: {
          quantity: true,
        },
      });

      const reservedStock = reservedOrders._sum.quantity || 0;
      const availableStock = Math.max(0, product.stockQuantity - reservedStock);

      console.log(`   Product: ${product.name}`);
      console.log(`   - Stock Quantity: ${product.stockQuantity}`);
      console.log(`   - Reserved Stock: ${reservedStock}`);
      console.log(`   - Available Stock: ${availableStock}`);
      console.log('');
    }

    // 4. Find a retailer to test with
    console.log('4️⃣ Finding a retailer for testing');
    const retailer = await prisma.profile.findFirst({
      where: { role: 'retailer' },
      select: {
        id: true,
        email: true,
        businessName: true,
      },
    });

    if (retailer) {
      console.log('✅ Retailer found:', retailer);
      console.log('');
      console.log('5️⃣ Testing query that would be used by getAllAvailableManufacturerProducts');
      
      const testQuery = await prisma.product.findMany({
        where: {
          isActive: true,
          manufacturerId: {
            not: null,
            in: [manufacturer.id],
          },
          NOT: {
            retailerId: retailer.id,
          },
        },
        select: {
          id: true,
          name: true,
          manufacturerId: true,
          stockQuantity: true,
        },
      });

      console.log(`✅ Query found ${testQuery.length} products:`);
      testQuery.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - Stock: ${p.stockQuantity}`);
      });
    } else {
      console.log('⚠️ No retailer found for testing');
    }

    console.log('');
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRestockFeature();



