import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function clearProductCategories() {
  console.log("🧹 Clearing all product categories and subcategories...")

  try {
    // First, let's see what we have
    const allCategories = await prisma.productCategory.findMany({
      orderBy: { level: "asc" },
    })

    console.log(`📊 Found ${allCategories.length} categories to delete:`)
    allCategories.forEach((cat) => {
      console.log(`   - ${cat.name} (Level ${cat.level}, ID: ${cat.id})`)
    })

    if (allCategories.length === 0) {
      console.log("✅ No categories found. Database is already clean.")
      return
    }

    // Delete all categories (Prisma will handle foreign key constraints)
    // We need to delete in the correct order to avoid foreign key issues
    console.log("\n🗑️  Deleting categories...")

    // First, delete all subcategories (level 2 and above)
    const subcategories = allCategories.filter((cat) => cat.level > 1)
    if (subcategories.length > 0) {
      console.log(`   Deleting ${subcategories.length} subcategories...`)
      await prisma.productCategory.deleteMany({
        where: {
          level: { gt: 1 },
        },
      })
      console.log("   ✅ Subcategories deleted")
    }

    // Then delete all root categories (level 1)
    const rootCategories = allCategories.filter((cat) => cat.level === 1)
    if (rootCategories.length > 0) {
      console.log(`   Deleting ${rootCategories.length} root categories...`)
      await prisma.productCategory.deleteMany({
        where: {
          level: 1,
        },
      })
      console.log("   ✅ Root categories deleted")
    }

    // Verify deletion
    const remainingCategories = await prisma.productCategory.count()
    if (remainingCategories === 0) {
      console.log("\n🎉 Successfully cleared all product categories!")
      console.log("✅ Database is now clean and ready for fresh data.")
    } else {
      console.log(
        `\n⚠️  Warning: ${remainingCategories} categories still remain.`
      )
    }
  } catch (error) {
    console.error("❌ Error clearing product categories:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  clearProductCategories()
    .then(() => {
      console.log("\n✨ Clear operation completed!")
      process.exit(0)
    })
    .catch((error) => {
      console.error("💥 Clear operation failed:", error)
      process.exit(1)
    })
}

export { clearProductCategories }



