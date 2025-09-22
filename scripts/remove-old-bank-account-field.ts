import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeOldBankAccountField() {
  console.log('🗑️ Removing old "Bank Account Details" field from onboarding requirements...');
  
  try {
    // Find and delete the old "Bank Account Details" field
    const deletedRequirements = await prisma.onboardingRequirement.deleteMany({
      where: {
        label: 'Bank Account Details',
        fieldType: 'textarea'
      }
    });
    
    console.log(`✅ Deleted ${deletedRequirements.count} old "Bank Account Details" requirements`);
    
    // Also check for any other payment-related textarea fields that might be duplicates
    const remainingPaymentFields = await prisma.onboardingRequirement.findMany({
      where: {
        isPaymentRelated: true,
        fieldType: 'textarea'
      }
    });
    
    console.log('📋 Remaining payment-related textarea fields:', remainingPaymentFields.map(f => ({
      id: f.id,
      label: f.label,
      role: f.role,
      fieldType: f.fieldType
    })));
    
  } catch (error) {
    console.error('❌ Error removing old bank account field:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeOldBankAccountField();
