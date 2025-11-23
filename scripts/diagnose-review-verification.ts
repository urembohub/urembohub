import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseReviewVerification(
  clientEmail: string,
  productName: string,
  retailerEmail: string
) {
  try {
    console.log('\n=== Review Verification Diagnosis ===\n');
    console.log(`Client: ${clientEmail}`);
    console.log(`Product: ${productName}`);
    console.log(`Retailer: ${retailerEmail}\n`);

    // 1. Find the client
    const client = await prisma.profile.findUnique({
      where: { email: clientEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    if (!client) {
      console.error(`❌ Client not found: ${clientEmail}`);
      return;
    }

    console.log(`✅ Client found: ${client.fullName} (ID: ${client.id})`);

    // 2. Find the retailer
    const retailer = await prisma.profile.findUnique({
      where: { email: retailerEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        businessName: true,
      },
    });

    if (!retailer) {
      console.error(`❌ Retailer not found: ${retailerEmail}`);
      return;
    }

    console.log(`✅ Retailer found: ${retailer.businessName || retailer.fullName} (ID: ${retailer.id})\n`);

    // 3. Find the product
    const product = await prisma.product.findFirst({
      where: {
        name: {
          contains: productName,
          mode: 'insensitive',
        },
        retailerId: retailer.id,
      },
      select: {
        id: true,
        name: true,
        retailerId: true,
        manufacturerId: true,
      },
    });

    if (!product) {
      console.error(`❌ Product not found: ${productName} for retailer ${retailerEmail}`);
      return;
    }

    console.log(`✅ Product found: ${product.name} (ID: ${product.id})\n`);

    // 4. Check regular orders
    console.log('=== Checking Regular Orders ===');
    const orders = await prisma.order.findMany({
      where: {
        userId: client.id,
        retailerId: retailer.id,
      },
      include: {
        orderItems: {
          where: {
            productId: product.id,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${orders.length} orders from this client to this retailer\n`);

    if (orders.length > 0) {
      for (const order of orders) {
        console.log(`\n--- Order ID: ${order.id} ---`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Payment Status: ${order.paymentStatus}`);
        console.log(`  Total Amount: ${order.totalAmount} ${order.currency}`);
        console.log(`  Created At: ${order.createdAt}`);
        console.log(`  Order Items Count: ${order.orderItems.length}`);

        if (order.orderItems.length > 0) {
          console.log(`  ✅ Order contains the product!`);
          order.orderItems.forEach((item) => {
            console.log(`    - Product: ${item.product.name} (Qty: ${item.quantity})`);
          });

          // Check if order qualifies for review
          const validStatuses = ['completed', 'delivered', 'confirmed', 'processing', 'paid'];
          const validPaymentStatuses = ['completed', 'paid', 'processing', 'enterprise_pending'];
          
          const hasValidStatus = validStatuses.includes(order.status);
          const hasValidPaymentStatus = order.paymentStatus && validPaymentStatuses.includes(order.paymentStatus);

          console.log(`  Status Check: ${hasValidStatus ? '✅' : '❌'} (${order.status})`);
          console.log(`  Payment Status Check: ${hasValidPaymentStatus ? '✅' : '❌'} (${order.paymentStatus || 'null'})`);

          if (hasValidStatus && hasValidPaymentStatus) {
            console.log(`  ✅✅✅ This order SHOULD qualify for review!`);
          } else {
            console.log(`  ❌ This order does NOT qualify for review`);
            if (!hasValidStatus) {
              console.log(`    - Status must be one of: ${validStatuses.join(', ')}`);
            }
            if (!hasValidPaymentStatus) {
              console.log(`    - Payment status must be one of: ${validPaymentStatuses.join(', ')}`);
            }
          }
        } else {
          console.log(`  ❌ Order does NOT contain the product`);
        }
      }
    } else {
      console.log('❌ No orders found from this client to this retailer');
    }

    // 5. Check manufacturer orders (if applicable)
    console.log('\n=== Checking Manufacturer Orders ===');
    const manufacturerOrders = await prisma.manufacturerOrder.findMany({
      where: {
        retailerId: client.id, // Note: retailerId in manufacturerOrder is the retailer who ordered
        productId: product.id,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${manufacturerOrders.length} manufacturer orders\n`);

    if (manufacturerOrders.length > 0) {
      for (const order of manufacturerOrders) {
        console.log(`\n--- Manufacturer Order ID: ${order.id} ---`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Payment Status: ${order.paymentStatus}`);
        console.log(`  Total Amount: ${order.totalAmount} ${order.currency}`);
        console.log(`  Created At: ${order.createdAt}`);

        const validStatuses = ['completed', 'delivered'];
        const hasValidStatus = validStatuses.includes(order.status);
        const hasValidPaymentStatus = order.paymentStatus === 'paid';

        console.log(`  Status Check: ${hasValidStatus ? '✅' : '❌'} (${order.status})`);
        console.log(`  Payment Status Check: ${hasValidPaymentStatus ? '✅' : '❌'} (${order.paymentStatus || 'null'})`);

        if (hasValidStatus && hasValidPaymentStatus) {
          console.log(`  ✅✅✅ This manufacturer order SHOULD qualify for review!`);
        } else {
          console.log(`  ❌ This manufacturer order does NOT qualify for review`);
        }
      }
    }

    // 6. Summary
    console.log('\n=== Summary ===');
    const validStatuses = ['completed', 'delivered', 'confirmed', 'processing', 'paid'];
    const validPaymentStatuses = ['completed', 'paid', 'processing', 'enterprise_pending'];
    
    const qualifyingOrders = orders.filter(order => {
      if (order.orderItems.length === 0) return false;
      const hasValidStatus = validStatuses.includes(order.status);
      const hasValidPaymentStatus = order.paymentStatus && validPaymentStatuses.includes(order.paymentStatus);
      return hasValidStatus && hasValidPaymentStatus;
    });

    const qualifyingManufacturerOrders = manufacturerOrders.filter(order => {
      const validManufacturerStatuses = ['completed', 'delivered', 'processing'];
      const validManufacturerPaymentStatuses = ['paid', 'processing', 'enterprise_pending'];
      return validManufacturerStatuses.includes(order.status) && 
             order.paymentStatus && validManufacturerPaymentStatuses.includes(order.paymentStatus);
    });

    console.log(`Qualifying regular orders: ${qualifyingOrders.length}`);
    console.log(`Qualifying manufacturer orders: ${qualifyingManufacturerOrders.length}`);

    if (qualifyingOrders.length > 0 || qualifyingManufacturerOrders.length > 0) {
      console.log('\n✅✅✅ Client SHOULD be able to review this product!');
    } else {
      console.log('\n❌❌❌ Client CANNOT review this product - no qualifying orders found');
    }

  } catch (error) {
    console.error('Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get arguments from command line
const clientEmail = process.argv[2];
const productName = process.argv[3];
const retailerEmail = process.argv[4];

if (!clientEmail || !productName || !retailerEmail) {
  console.error('Usage: ts-node scripts/diagnose-review-verification.ts <client_email> <product_name> <retailer_email>');
  console.error('Example: ts-node scripts/diagnose-review-verification.ts client@test.com test8 rettest@test.com');
  process.exit(1);
}

diagnoseReviewVerification(clientEmail, productName, retailerEmail);

