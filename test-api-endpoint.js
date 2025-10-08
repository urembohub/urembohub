const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Mock JWT verification for testing
app.use((req, res, next) => {
  // Skip auth for testing
  req.user = { id: 'test-admin', role: 'admin' };
  next();
});

// Import the escrow service logic
const { EscrowService } = require('./dist/src/escrow/escrow.service');

async function testEscrowEndpoint() {
  try {
    console.log('🔍 Testing escrow stats endpoint...\n');
    
    // Create a mock escrow service
    const escrowService = new EscrowService(prisma);
    
    // Test the getEscrowStats method
    const stats = await escrowService.getEscrowStats();
    
    console.log('Escrow stats from service:');
    console.log(JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('Error testing escrow endpoint:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEscrowEndpoint();




