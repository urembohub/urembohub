/**
 * Test script for Retailer Package API
 *
 * This script tests the new retailer package endpoints
 * that combine database filtering with Pick Up Mtaani real-time data
 */

const axios = require("axios")

// Configuration
const BASE_URL = "http://localhost:3000"
const RETAILER_TOKEN = "YOUR_RETAILER_JWT_TOKEN" // Replace with actual token

// Test functions
async function testGetRetailerPackages() {
  console.log("\n📦 TEST 1: Get Retailer Packages")
  console.log("================================================")

  try {
    const response = await axios.get(
      `${BASE_URL}/api/pickup-mtaani/retailer/packages`,
      {
        headers: {
          Authorization: `Bearer ${RETAILER_TOKEN}`,
        },
      }
    )

    console.log("✅ SUCCESS")
    console.log(`Found ${response.data.length} packages\n`)

    if (response.data.length > 0) {
      const pkg = response.data[0]
      console.log("Sample Package:")
      console.log(`  Receipt No: ${pkg.receiptNo}`)
      console.log(`  Package ID: ${pkg.packageId}`)
      console.log(`  Status: ${pkg.status} (real-time from Pick Up Mtaani)`)
      console.log(`  Customer: ${pkg.customerName}`)
      console.log(`  Value: KES ${pkg.packageValue}`)
      console.log(`  Delivery Fee: KES ${pkg.deliveryFee}`)
      console.log(`  Items: ${pkg.items.length}`)

      if (pkg.items.length > 0) {
        console.log(`\n  Products in Package:`)
        pkg.items.forEach((item, index) => {
          console.log(
            `    ${index + 1}. ${item.productName} × ${item.quantity} - KES ${item.price}`
          )
        })
      }
    } else {
      console.log("ℹ️  No packages found for this retailer")
    }

    return response.data
  } catch (error) {
    console.log("❌ FAILED")
    if (error.response) {
      console.log(`Status: ${error.response.status}`)
      console.log(`Message: ${error.response.data?.message || "Unknown error"}`)
    } else {
      console.log(`Error: ${error.message}`)
    }
    return null
  }
}

async function testGetPackageByReceipt(receiptNo) {
  console.log("\n📦 TEST 2: Get Package by Receipt Number")
  console.log("================================================")
  console.log(`Receipt No: ${receiptNo}`)

  try {
    const response = await axios.get(
      `${BASE_URL}/api/pickup-mtaani/package/${receiptNo}`,
      {
        headers: {
          Authorization: `Bearer ${RETAILER_TOKEN}`,
        },
      }
    )

    console.log("✅ SUCCESS")
    console.log("\nPackage Details:")
    console.log(JSON.stringify(response.data, null, 2))

    return response.data
  } catch (error) {
    console.log("❌ FAILED")
    if (error.response) {
      console.log(`Status: ${error.response.status}`)
      console.log(`Message: ${error.response.data?.message || "Unknown error"}`)
    } else {
      console.log(`Error: ${error.message}`)
    }
    return null
  }
}

async function testGetAllPackages() {
  console.log("\n📦 TEST 3: Get All Business Packages (Admin)")
  console.log("================================================")

  try {
    const response = await axios.get(
      `${BASE_URL}/api/pickup-mtaani/packages/all`,
      {
        headers: {
          Authorization: `Bearer ${RETAILER_TOKEN}`, // Use admin token in production
        },
      }
    )

    console.log("✅ SUCCESS")
    console.log(`Total packages in business: ${response.data.count}`)

    if (response.data.data.length > 0) {
      console.log("\nFirst 3 packages:")
      response.data.data.slice(0, 3).forEach((pkg, index) => {
        console.log(
          `  ${index + 1}. Receipt: ${pkg.receipt_no} - Status: ${pkg.state}`
        )
      })
    }

    return response.data
  } catch (error) {
    console.log("❌ FAILED")
    if (error.response) {
      console.log(`Status: ${error.response.status}`)
      console.log(`Message: ${error.response.data?.message || "Unknown error"}`)
    } else {
      console.log(`Error: ${error.message}`)
    }
    return null
  }
}

// Main test runner
async function runTests() {
  console.log("🚀 Starting Retailer Package API Tests")
  console.log("========================================\n")

  if (RETAILER_TOKEN === "YOUR_RETAILER_JWT_TOKEN") {
    console.log("⚠️  WARNING: Please set a valid RETAILER_TOKEN in this script")
    console.log("To get a token:")
    console.log("  1. Login as a retailer via POST /auth/login")
    console.log("  2. Copy the JWT token from the response")
    console.log("  3. Replace RETAILER_TOKEN in this script\n")
    return
  }

  // Test 1: Get retailer packages
  const packages = await testGetRetailerPackages()

  // Test 2: Get specific package (if we have one)
  if (packages && packages.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
    await testGetPackageByReceipt(packages[0].receiptNo)
  }

  // Test 3: Get all packages
  await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
  await testGetAllPackages()

  console.log("\n========================================")
  console.log("✅ All tests completed")
}

// Run the tests
runTests().catch(console.error)

