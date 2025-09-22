import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestProducts() {
  try {
    console.log('🌱 Creating test products...');

    // Get a retailer user
    const retailer = await prisma.profile.findFirst({
      where: { role: 'retailer' }
    });

    if (!retailer) {
      throw new Error('No retailer found. Please run the seed script first.');
    }

    // Create product categories first
    const categories = [
      { name: 'Skincare', slug: 'skincare', description: 'Skincare products', level: 1, position: 1 },
      { name: 'Hair Care', slug: 'hair-care', description: 'Hair care products', level: 1, position: 2 },
      { name: 'Makeup', slug: 'makeup', description: 'Makeup products', level: 1, position: 3 },
      { name: 'Body Care', slug: 'body-care', description: 'Body care products', level: 1, position: 4 },
    ];

    console.log('📂 Creating product categories...');
    for (const category of categories) {
      await prisma.productCategory.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      });
    }

    // Get the categories
    const skincareCategory = await prisma.productCategory.findUnique({
      where: { slug: 'skincare' }
    });

    const hairCategory = await prisma.productCategory.findUnique({
      where: { slug: 'hair-care' }
    });

    const makeupCategory = await prisma.productCategory.findUnique({
      where: { slug: 'makeup' }
    });

    // Create test products
    const products = [
      {
        name: 'Vitamin C Serum',
        description: 'Brightening vitamin C serum for glowing skin',
        price: 2500,
        currency: 'KES',
        categoryId: skincareCategory?.id || null,
        retailerId: retailer.id,
        sku: 'VC-SERUM-001',
        stockQuantity: 50,
        isActive: true,
        createdByRole: 'retailer' as const,
        imageUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400',
        tags: ['skincare', 'vitamin-c', 'serum'],
      },
      {
        name: 'Hydrating Face Moisturizer',
        description: 'Deep hydrating moisturizer for all skin types',
        price: 1800,
        currency: 'KES',
        categoryId: skincareCategory?.id || null,
        retailerId: retailer.id,
        sku: 'HFM-001',
        stockQuantity: 30,
        isActive: true,
        createdByRole: 'retailer' as const,
        imageUrl: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=400',
        tags: ['skincare', 'moisturizer', 'hydrating'],
      },
      {
        name: 'Argan Oil Hair Mask',
        description: 'Nourishing argan oil hair mask for damaged hair',
        price: 3200,
        currency: 'KES',
        categoryId: hairCategory?.id || null,
        retailerId: retailer.id,
        sku: 'AOHM-001',
        stockQuantity: 25,
        isActive: true,
        createdByRole: 'retailer' as const,
        imageUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400',
        tags: ['hair-care', 'argan-oil', 'mask'],
      },
      {
        name: 'Matte Lipstick Set',
        description: 'Set of 3 long-lasting matte lipsticks',
        price: 4500,
        currency: 'KES',
        categoryId: makeupCategory?.id || null,
        retailerId: retailer.id,
        sku: 'MLS-001',
        stockQuantity: 15,
        isActive: true,
        createdByRole: 'retailer' as const,
        imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
        tags: ['makeup', 'lipstick', 'matte'],
      },
      {
        name: 'Body Lotion with Shea Butter',
        description: 'Rich body lotion with shea butter for smooth skin',
        price: 1200,
        currency: 'KES',
        categoryId: skincareCategory?.id || null,
        retailerId: retailer.id,
        sku: 'BL-SB-001',
        stockQuantity: 40,
        isActive: true,
        createdByRole: 'retailer' as const,
        imageUrl: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=400',
        tags: ['body-care', 'lotion', 'shea-butter'],
      },
    ];

    console.log('📦 Creating test products...');
    for (const product of products) {
      await prisma.product.create({
        data: product,
      });
      console.log(`✅ Created product: ${product.name}`);
    }

    console.log('🎉 Test products created successfully!');
    console.log(`📊 Created ${products.length} products for retailer: ${retailer.email}`);

  } catch (error) {
    console.error('❌ Error creating test products:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestProducts();
