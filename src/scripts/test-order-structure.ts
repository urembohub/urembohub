import { PrismaService } from '../prisma/prisma.service';

async function testOrderStructure() {
  console.log('🧪 [ORDER_STRUCTURE] Testing Order Structure for Services');
  console.log('🧪 [ORDER_STRUCTURE] ===========================================');

  const prisma = new PrismaService();

  try {
    // Find an existing order with service appointments
    const order = await prisma.order.findFirst({
      where: {
        serviceAppointments: {
          some: {}
        }
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                retailer: {
                  select: {
                    id: true,
                    email: true,
                    fullName: true,
                    businessName: true,
                    role: true,
                    paystackSubaccountId: true,
                  }
                }
              }
            }
          }
        },
        serviceAppointments: {
          include: {
            service: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    email: true,
                    fullName: true,
                    businessName: true,
                    role: true,
                    paystackSubaccountId: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      console.log('❌ [ORDER_STRUCTURE] No orders with service appointments found');
      return;
    }

    console.log('✅ [ORDER_STRUCTURE] Found order:', order.id);
    console.log('🧪 [ORDER_STRUCTURE] Order structure:');
    console.log('  - Order Items (products):', order.orderItems.length);
    console.log('  - Service Appointments:', order.serviceAppointments.length);
    
    if (order.orderItems.length > 0) {
      console.log('  - First Product Retailer:', order.orderItems[0]?.product?.retailer?.email);
    }
    
    if (order.serviceAppointments.length > 0) {
      console.log('  - First Service Vendor:', order.serviceAppointments[0]?.service?.vendor?.email);
      console.log('  - Vendor Subaccount:', order.serviceAppointments[0]?.service?.vendor?.paystackSubaccountId);
    }

    // Test the logic from calculateCommission
    console.log('🧪 [ORDER_STRUCTURE] Testing calculateCommission logic:');
    
    let partner = null;
    let partnerType = '';

    // Check if this is a product order (retailer)
    if (order.orderItems.length > 0 && order.orderItems[0]?.product?.retailer) {
      partner = order.orderItems[0].product.retailer;
      partnerType = 'retailer';
      console.log('  - Detected as PRODUCT order (retailer)');
    }
    // Check if this is a service order (vendor)
    else if (order.serviceAppointments?.length > 0 && order.serviceAppointments[0]?.service?.vendor) {
      partner = order.serviceAppointments[0].service.vendor;
      partnerType = 'vendor';
      console.log('  - Detected as SERVICE order (vendor)');
    }

    if (partner) {
      console.log('  - Partner Type:', partnerType);
      console.log('  - Partner Email:', partner.email);
      console.log('  - Partner Subaccount:', partner.paystackSubaccountId);
    } else {
      console.log('  - ❌ No partner found!');
    }

    console.log('✅ [ORDER_STRUCTURE] Order structure test completed!');

  } catch (error) {
    console.error('❌ [ORDER_STRUCTURE] Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testOrderStructure().catch(console.error);
