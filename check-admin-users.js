const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminUsers() {
  try {
    console.log('🔍 Checking admin users...\n');
    
    // Check for admin users
    const adminUsers = await prisma.profile.findMany({
      where: {
        role: 'admin'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        businessName: true,
        createdAt: true
      }
    });
    
    console.log(`Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.fullName}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Business: ${user.businessName || 'N/A'}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log('  ---');
    });
    
    // Check all users and their roles
    const allUsers = await prisma.profile.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        businessName: true
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\nRecent users (${allUsers.length}):`);
    allUsers.forEach(user => {
      console.log(`  ${user.email} - ${user.role} - ${user.fullName}`);
    });
    
  } catch (error) {
    console.error('Error checking admin users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUsers();




