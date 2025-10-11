const axios = require("axios")

const BASE_URL = "http://localhost:3000/api"

// Test data
const testCategories = {
  rootCategory1: {
    name: "Beauty Products",
    description: "Main beauty products category",
    level: 1,
    position: 1,
    isActive: true,
  },
  rootCategory2: {
    name: "Hair Care",
    description: "Hair care products category",
    level: 1,
    position: 2,
    isActive: true,
  },
  subcategory1: {
    name: "Shampoos",
    description: "Hair shampoos subcategory",
    level: 2,
    position: 1,
    isActive: true,
  },
  subcategory2: {
    name: "Conditioners",
    description: "Hair conditioners subcategory",
    level: 2,
    position: 2,
    isActive: true,
  },
  subcategory3: {
    name: "Face Creams",
    description: "Face cream products subcategory",
    level: 2,
    position: 1,
    isActive: true,
  },
}

let createdCategories = {}

async function testNestedCategories() {
  console.log("🧪 Starting Nested Categories API Test\n")

  try {
    // Step 1: Create root categories
    console.log("📝 Step 1: Creating root categories...")

    const root1Response = await axios.post(
      `${BASE_URL}/product-categories`,
      testCategories.rootCategory1
    )
    createdCategories.root1 = root1Response.data
    console.log(
      "✅ Created root category 1:",
      createdCategories.root1.name,
      "(ID:",
      createdCategories.root1.id,
      ")"
    )

    const root2Response = await axios.post(
      `${BASE_URL}/product-categories`,
      testCategories.rootCategory2
    )
    createdCategories.root2 = root2Response.data
    console.log(
      "✅ Created root category 2:",
      createdCategories.root2.name,
      "(ID:",
      createdCategories.root2.id,
      ")"
    )

    // Step 2: Create subcategories under root1
    console.log("\n📝 Step 2: Creating subcategories under root category 1...")

    const sub1Data = {
      ...testCategories.subcategory1,
      parentId: createdCategories.root1.id,
    }
    const sub1Response = await axios.post(
      `${BASE_URL}/product-categories`,
      sub1Data
    )
    createdCategories.sub1 = sub1Response.data
    console.log(
      "✅ Created subcategory 1:",
      createdCategories.sub1.name,
      "(ID:",
      createdCategories.sub1.id,
      ", Level:",
      createdCategories.sub1.level,
      ", Parent:",
      createdCategories.sub1.parentId,
      ")"
    )

    const sub2Data = {
      ...testCategories.subcategory2,
      parentId: createdCategories.root1.id,
    }
    const sub2Response = await axios.post(
      `${BASE_URL}/product-categories`,
      sub2Data
    )
    createdCategories.sub2 = sub2Response.data
    console.log(
      "✅ Created subcategory 2:",
      createdCategories.sub2.name,
      "(ID:",
      createdCategories.sub2.id,
      ", Level:",
      createdCategories.sub2.level,
      ", Parent:",
      createdCategories.sub2.parentId,
      ")"
    )

    // Step 3: Create subcategory under root2
    console.log("\n📝 Step 3: Creating subcategory under root category 2...")

    const sub3Data = {
      ...testCategories.subcategory3,
      parentId: createdCategories.root2.id,
    }
    const sub3Response = await axios.post(
      `${BASE_URL}/product-categories`,
      sub3Data
    )
    createdCategories.sub3 = sub3Response.data
    console.log(
      "✅ Created subcategory 3:",
      createdCategories.sub3.name,
      "(ID:",
      createdCategories.sub3.id,
      ", Level:",
      createdCategories.sub3.level,
      ", Parent:",
      createdCategories.sub3.parentId,
      ")"
    )

    // Step 4: Test fetching all active categories
    console.log("\n📋 Step 4: Fetching all active categories...")
    const allCategoriesResponse = await axios.get(
      `${BASE_URL}/product-categories/active`
    )
    const allCategories = allCategoriesResponse.data
    console.log("✅ Fetched", allCategories.length, "active categories")

    // Display the hierarchy
    console.log("\n🌳 Category Hierarchy:")
    displayHierarchy(allCategories)

    // Step 5: Test fetching categories by level
    console.log("\n📊 Step 5: Testing level-based queries...")

    const level1Response = await axios.get(
      `${BASE_URL}/product-categories/level/1`
    )
    const level1Categories = level1Response.data
    console.log("✅ Level 1 categories:", level1Categories.length)
    level1Categories.forEach((cat) =>
      console.log(`   - ${cat.name} (ID: ${cat.id})`)
    )

    const level2Response = await axios.get(
      `${BASE_URL}/product-categories/level/2`
    )
    const level2Categories = level2Response.data
    console.log("✅ Level 2 categories:", level2Categories.length)
    level2Categories.forEach((cat) =>
      console.log(`   - ${cat.name} (ID: ${cat.id}, Parent: ${cat.parentId})`)
    )

    // Step 6: Test fetching child categories
    console.log("\n👶 Step 6: Testing child category queries...")

    const children1Response = await axios.get(
      `${BASE_URL}/product-categories/${createdCategories.root1.id}/children`
    )
    const children1 = children1Response.data
    console.log(
      `✅ Children of ${createdCategories.root1.name}:`,
      children1.length
    )
    children1.forEach((child) =>
      console.log(`   - ${child.name} (Level: ${child.level})`)
    )

    const children2Response = await axios.get(
      `${BASE_URL}/product-categories/${createdCategories.root2.id}/children`
    )
    const children2 = children2Response.data
    console.log(
      `✅ Children of ${createdCategories.root2.name}:`,
      children2.length
    )
    children2.forEach((child) =>
      console.log(`   - ${child.name} (Level: ${child.level})`)
    )

    // Step 7: Test root categories endpoint
    console.log("\n🌱 Step 7: Testing root categories endpoint...")
    const rootCategoriesResponse = await axios.get(
      `${BASE_URL}/product-categories/root`
    )
    const rootCategories = rootCategoriesResponse.data
    console.log("✅ Root categories:", rootCategories.length)
    rootCategories.forEach((cat) =>
      console.log(`   - ${cat.name} (ID: ${cat.id})`)
    )

    // Step 8: Test category stats
    console.log("\n📈 Step 8: Testing category statistics...")
    const statsResponse = await axios.get(
      `${BASE_URL}/product-categories/stats`
    )
    const stats = statsResponse.data
    console.log("✅ Category Statistics:")
    console.log(`   - Total: ${stats.total}`)
    console.log(`   - Active: ${stats.active}`)
    console.log(`   - Inactive: ${stats.inactive}`)
    console.log(`   - Level 1: ${stats.level1}`)
    console.log(`   - Level 2: ${stats.level2}`)

    console.log(
      "\n🎉 All tests passed! Nested categories API is working correctly."
    )
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message)
    if (error.response?.data) {
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      )
    }
    process.exit(1)
  }
}

function displayHierarchy(categories) {
  // Group categories by level
  const level1Categories = categories.filter((cat) => cat.level === 1)
  const level2Categories = categories.filter((cat) => cat.level === 2)

  level1Categories.forEach((root) => {
    console.log(`📁 ${root.name} (Level ${root.level})`)

    // Find children of this root category
    const children = level2Categories.filter(
      (child) => child.parentId === root.id
    )
    children.forEach((child) => {
      console.log(`   └── 📄 ${child.name} (Level ${child.level})`)
    })

    if (children.length === 0) {
      console.log("   └── (no subcategories)")
    }
  })
}

// Cleanup function
async function cleanup() {
  console.log("\n🧹 Cleaning up test data...")

  try {
    // Delete in reverse order (subcategories first, then root categories)
    const categoriesToDelete = [
      createdCategories.sub1,
      createdCategories.sub2,
      createdCategories.sub3,
      createdCategories.root1,
      createdCategories.root2,
    ].filter(Boolean)

    for (const category of categoriesToDelete) {
      try {
        await axios.delete(`${BASE_URL}/product-categories/${category.id}`)
        console.log(`✅ Deleted ${category.name}`)
      } catch (error) {
        console.log(
          `⚠️  Could not delete ${category.name}:`,
          error.response?.data?.message || error.message
        )
      }
    }

    console.log("✅ Cleanup completed")
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message)
  }
}

// Handle process termination
process.on("SIGINT", async () => {
  console.log("\n🛑 Process interrupted, cleaning up...")
  await cleanup()
  process.exit(0)
})

// Run the test
testNestedCategories()
  .then(() => {
    console.log("\n✨ Test completed successfully!")
    process.exit(0)
  })
  .catch(async (error) => {
    console.error("\n💥 Test failed:", error.message)
    await cleanup()
    process.exit(1)
  })



