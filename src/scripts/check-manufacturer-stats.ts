import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkManufacturerStats(email: string) {
  try {
    console.log(`\n🔍 Checking stats for manufacturer: ${email}\n`);

    // Find manufacturer by email
    const manufacturer = await prisma.profile.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        businessName: true,
        role: true,
      },
    });

    if (!manufacturer) {
      console.error(`❌ Manufacturer not found with email: ${email}`);
      return;
    }

    if (manufacturer.role !== 'manufacturer') {
      console.error(`❌ User ${email} is not a manufacturer. Role: ${manufacturer.role}`);
      return;
    }

    console.log(`✅ Found manufacturer: ${manufacturer.businessName || manufacturer.fullName} (${manufacturer.id})\n`);

    // 1. Total Products
    const totalProducts = await prisma.product.count({
      where: { manufacturerId: manufacturer.id },
    });

    const activeProducts = await prisma.product.count({
      where: {
        manufacturerId: manufacturer.id,
        isActive: true,
      },
    });

    console.log('📦 PRODUCTS:');
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   Active Products: ${activeProducts}\n`);

    // 2. Manufacturer Orders
    const manufacturerOrders = await prisma.manufacturerOrder.findMany({
      where: { manufacturerId: manufacturer.id },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        retailerId: true,
      },
    });

    const totalOrders = manufacturerOrders.length;
    const pendingOrders = manufacturerOrders.filter(o => o.status === 'pending').length;
    
    // Calculate revenue from non-cancelled orders
    const totalRevenue = manufacturerOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    // Today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRevenue = manufacturerOrders
      .filter(o => {
        const orderDate = new Date(o.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime() && o.status !== 'cancelled';
      })
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    console.log('🛒 MANUFACTURER ORDERS:');
    console.log(`   Total Orders: ${totalOrders}`);
    console.log(`   Pending Orders: ${pendingOrders}`);
    console.log(`   Total Revenue: KSh ${totalRevenue.toFixed(2)}`);
    console.log(`   Today Revenue: KSh ${todayRevenue.toFixed(2)}`);
    console.log(`   Order Statuses:`, {
      pending: manufacturerOrders.filter(o => o.status === 'pending').length,
      confirmed: manufacturerOrders.filter(o => o.status === 'confirmed').length,
      processing: manufacturerOrders.filter(o => o.status === 'processing').length,
      shipped: manufacturerOrders.filter(o => o.status === 'shipped').length,
      delivered: manufacturerOrders.filter(o => o.status === 'delivered').length,
      cancelled: manufacturerOrders.filter(o => o.status === 'cancelled').length,
    });
    console.log('');

    // 3. Total Customers (unique retailers)
    const uniqueRetailers = new Set(
      manufacturerOrders
        .map(o => o.retailerId)
        .filter(Boolean)
    );

    const totalCustomers = uniqueRetailers.size;

    // New customers this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const newCustomersThisMonth = new Set(
      manufacturerOrders
        .filter(o => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= thisMonth;
        })
        .map(o => o.retailerId)
        .filter(Boolean)
    ).size;

    console.log('👥 CUSTOMERS (Retailers):');
    console.log(`   Total Customers: ${totalCustomers}`);
    console.log(`   New This Month: ${newCustomersThisMonth}`);
    console.log(`   Unique Retailer IDs:`, Array.from(uniqueRetailers).slice(0, 5));
    console.log('');

    // 4. Check if there are any regular orders (not manufacturer orders)
    const regularOrders = await prisma.order.findMany({
      where: {
        OR: [
          { manufacturerId: manufacturer.id },
          { userId: manufacturer.id },
        ],
      },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
    });

    if (regularOrders.length > 0) {
      console.log('⚠️  Found regular orders (not manufacturer orders):');
      console.log(`   Count: ${regularOrders.length}`);
      console.log(`   Total Amount: KSh ${regularOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0).toFixed(2)}`);
      console.log('');
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log('   Total Revenue:', `KSh ${totalRevenue.toFixed(2)}`);
    console.log('   Total Orders:', totalOrders);
    console.log('   Total Products:', totalProducts);
    console.log('   Total Customers:', totalCustomers);
    console.log('');

  } catch (error) {
    console.error('❌ Error checking manufacturer stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2] || 'manu@test.com';

checkManufacturerStats(email);

