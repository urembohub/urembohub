import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function verifyCleanup() {
  console.log("🔍 Verifying database cleanup...")

  try {
    // Check product categories
    const categoryCount = await prisma.productCategory.count()
    console.log(`📊 Product Categories: ${categoryCount}`)

    if (categoryCount > 0) {
      const remainingCategories = await prisma.productCategory.findMany({
        select: {
          id: true,
          name: true,
          level: true,
          parentId: true,
        },
      })
      console.log("⚠️  Remaining categories:")
      remainingCategories.forEach((cat) => {
        console.log(
          `   - ${cat.name} (Level ${cat.level}, ID: ${cat.id}, Parent: ${cat.parentId || "none"})`
        )
      })
    } else {
      console.log("✅ No product categories found - cleanup successful!")
    }

    // Check for any products that might reference categories
    const productsWithCategories = await prisma.product.count({
      where: {
        OR: [{ categoryId: { not: null } }, { subcategoryId: { not: null } }],
      },
    })

    console.log(
      `📦 Products with category references: ${productsWithCategories}`
    )

    if (productsWithCategories > 0) {
      console.log(
        "⚠️  Some products still reference categories. You may want to:"
      )
      console.log("   1. Update these products to remove category references")
      console.log("   2. Or reassign them to new categories")

      const sampleProducts = await prisma.product.findMany({
        where: {
          OR: [{ categoryId: { not: null } }, { subcategoryId: { not: null } }],
        },
        select: {
          id: true,
          name: true,
          categoryId: true,
          subcategoryId: true,
        },
        take: 5,
      })

      console.log("   Sample products with category references:")
      sampleProducts.forEach((product) => {
        console.log(
          `   - ${product.name} (Category: ${product.categoryId || "none"}, Subcategory: ${product.subcategoryId || "none"})`
        )
      })
    } else {
      console.log("✅ No products reference categories - perfect!")
    }

    console.log("\n🎉 Database cleanup verification completed!")
  } catch (error) {
    console.error("❌ Error verifying cleanup:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  verifyCleanup()
    .then(() => {
      console.log("\n✨ Verification completed!")
      process.exit(0)
    })
    .catch((error) => {
      console.error("💥 Verification failed:", error)
      process.exit(1)
    })
}

export { verifyCleanup }


