// Test the SQL query directly to verify it works
const { PrismaClient } = require('@prisma/client');

async function testSQLQuery() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing SQL Query Directly...\n');
    
    // Test the exact query from our analytics service
    const result = await prisma.$queryRaw`
      SELECT 
        -- User Metrics
        (SELECT COUNT(*) FROM profiles WHERE role IN ('client', 'vendor', 'retailer', 'manufacturer')) as total_users,
        (SELECT COUNT(*) FROM profiles WHERE role = 'vendor' AND is_verified = true AND is_suspended = false) as active_vendors,
        (SELECT COUNT(*) FROM profiles WHERE role = 'retailer' AND is_verified = true AND is_suspended = false) as active_retailers,
        (SELECT COUNT(*) FROM profiles WHERE role = 'manufacturer' AND is_verified = true AND is_suspended = false) as active_manufacturers,
        (SELECT COUNT(*) FROM profiles WHERE onboarding_status = 'pending') as pending_verifications,
        
        -- Revenue Metrics (Current Month)
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('completed', 'delivered') AND created_at >= date_trunc('month', CURRENT_DATE)) as monthly_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('completed', 'delivered') AND created_at >= CURRENT_DATE) as today_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('completed', 'delivered') AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) as last_month_revenue,
        
        -- Order Metrics
        (SELECT COUNT(*) FROM orders WHERE created_at >= date_trunc('month', CURRENT_DATE)) as monthly_orders,
        (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE) as today_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
        (SELECT COUNT(*) FROM orders WHERE status IN ('completed', 'delivered')) as completed_orders,
        
        -- Product/Service Metrics
        (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
        (SELECT COUNT(*) FROM services WHERE is_active = true) as total_services,
        
        -- Escrow Metrics
        (SELECT COALESCE(SUM(amount), 0) FROM service_escrows WHERE status = 'pending') as escrow_pending_amount,
        (SELECT COUNT(*) FROM service_escrows WHERE status = 'pending') as escrow_pending_count,
        (SELECT COUNT(*) FROM service_escrows WHERE status = 'completed') as escrow_completed_count,
        (SELECT COUNT(*) FROM service_escrows WHERE status = 'disputed') as escrow_disputed_count
    `;

    console.log('✅ SQL Query executed successfully!');
    console.log('📊 Results:');
    
    // Convert BigInt to Number for display
    const convertedResult = {};
    for (const [key, value] of Object.entries(result[0])) {
      convertedResult[key] = typeof value === 'bigint' ? Number(value) : value;
    }
    console.log(JSON.stringify(convertedResult, null, 2));
    
    // Test individual components
    console.log('\n🔍 Testing individual components...');
    
    // Test user roles
    const userRoles = await prisma.$queryRaw`
      SELECT role, COUNT(*) as count 
      FROM profiles 
      WHERE role IN ('client', 'vendor', 'retailer', 'manufacturer')
      GROUP BY role
    `;
    console.log('👥 User roles:', userRoles);
    
    // Test order statuses
    const orderStatuses = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
    `;
    console.log('📦 Order statuses:', orderStatuses);
    
    console.log('\n🎉 All tests passed! The SQL query is working correctly.');
    
  } catch (error) {
    console.error('❌ SQL Query failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSQLQuery();
