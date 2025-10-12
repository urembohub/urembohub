const axios = require("axios")

const BASE_URL = "http://localhost:3000/api"

async function testSubcategoryCreation() {
  console.log("🧪 Testing Subcategory Creation Issue\n")

  try {
    // Step 1: Create a root category
    console.log("📝 Step 1: Creating root category...")
    const rootCategory = {
      name: "Test Root Category",
      description: "Test root category for subcategory testing",
      level: 1,
      position: 1,
      isActive: true,
    }

    const rootResponse = await axios.post(
      `${BASE_URL}/product-categories`,
      rootCategory
    )
    const root = rootResponse.data
    console.log(
      "✅ Created root category:",
      root.name,
      "(ID:",
      root.id,
      ", Level:",
      root.level,
      ")"
    )

    // Step 2: Create a subcategory
    console.log("\n📝 Step 2: Creating subcategory...")
    const subcategory = {
      name: "Test Subcategory",
      description: "Test subcategory under root",
      level: 2,
      parentId: root.id,
      position: 1,
      isActive: true,
    }

    console.log(
      "📤 Sending subcategory data:",
      JSON.stringify(subcategory, null, 2)
    )

    const subResponse = await axios.post(
      `${BASE_URL}/product-categories`,
      subcategory
    )
    const sub = subResponse.data
    console.log(
      "✅ Created subcategory:",
      sub.name,
      "(ID:",
      sub.id,
      ", Level:",
      sub.level,
      ", Parent:",
      sub.parentId,
      ")"
    )

    // Step 3: Verify the hierarchy
    console.log("\n🔍 Step 3: Verifying hierarchy...")

    // Fetch all active categories
    const allResponse = await axios.get(`${BASE_URL}/product-categories/active`)
    const allCategories = allResponse.data
    console.log("📋 All active categories:")
    allCategories.forEach((cat) => {
      console.log(
        `   - ${cat.name} (ID: ${cat.id}, Level: ${cat.level}, Parent: ${cat.parentId || "none"})`
      )
    })

    // Check if subcategory is properly linked
    const subcategoryInList = allCategories.find((cat) => cat.id === sub.id)
    if (subcategoryInList) {
      console.log("\n✅ Subcategory found in list:")
      console.log(`   - Name: ${subcategoryInList.name}`)
      console.log(`   - Level: ${subcategoryInList.level}`)
      console.log(`   - Parent ID: ${subcategoryInList.parentId}`)
      console.log(
        `   - Parent Name: ${subcategoryInList.parent?.name || "Not found"}`
      )

      if (
        subcategoryInList.level === 2 &&
        subcategoryInList.parentId === root.id
      ) {
        console.log(
          "🎉 SUCCESS: Subcategory is properly created with correct level and parent!"
        )
      } else {
        console.log("❌ ISSUE: Subcategory level or parent is incorrect!")
        console.log(`   Expected: Level 2, Parent ${root.id}`)
        console.log(
          `   Actual: Level ${subcategoryInList.level}, Parent ${subcategoryInList.parentId}`
        )
      }
    } else {
      console.log("❌ ERROR: Subcategory not found in active categories list!")
    }

    // Step 4: Test child categories endpoint
    console.log("\n👶 Step 4: Testing child categories endpoint...")
    const childrenResponse = await axios.get(
      `${BASE_URL}/product-categories/${root.id}/children`
    )
    const children = childrenResponse.data
    console.log(`📋 Children of ${root.name}:`, children.length)
    children.forEach((child) => {
      console.log(`   - ${child.name} (ID: ${child.id}, Level: ${child.level})`)
    })

    if (children.length > 0 && children[0].id === sub.id) {
      console.log("✅ SUCCESS: Child categories endpoint works correctly!")
    } else {
      console.log("❌ ISSUE: Child categories endpoint not working correctly!")
    }

    // Step 5: Test level-based queries
    console.log("\n📊 Step 5: Testing level-based queries...")

    const level1Response = await axios.get(
      `${BASE_URL}/product-categories/level/1`
    )
    const level1Categories = level1Response.data
    console.log(`📋 Level 1 categories: ${level1Categories.length}`)
    level1Categories.forEach((cat) =>
      console.log(`   - ${cat.name} (ID: ${cat.id})`)
    )

    const level2Response = await axios.get(
      `${BASE_URL}/product-categories/level/2`
    )
    const level2Categories = level2Response.data
    console.log(`📋 Level 2 categories: ${level2Categories.length}`)
    level2Categories.forEach((cat) =>
      console.log(`   - ${cat.name} (ID: ${cat.id}, Parent: ${cat.parentId})`)
    )

    if (level2Categories.some((cat) => cat.id === sub.id)) {
      console.log("✅ SUCCESS: Subcategory appears in level 2 query!")
    } else {
      console.log("❌ ISSUE: Subcategory not found in level 2 query!")
    }

    console.log("\n🎉 Test completed!")

    // Cleanup
    console.log("\n🧹 Cleaning up...")
    try {
      await axios.delete(`${BASE_URL}/product-categories/${sub.id}`)
      console.log("✅ Deleted subcategory")
    } catch (error) {
      console.log(
        "⚠️  Could not delete subcategory:",
        error.response?.data?.message || error.message
      )
    }

    try {
      await axios.delete(`${BASE_URL}/product-categories/${root.id}`)
      console.log("✅ Deleted root category")
    } catch (error) {
      console.log(
        "⚠️  Could not delete root category:",
        error.response?.data?.message || error.message
      )
    }
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

// Run the test
testSubcategoryCreation()



