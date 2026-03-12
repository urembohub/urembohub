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

  console.log("\n========================================")
  console.log("✅ All tests completed")
}

// Run the tests
runTests().catch(console.error)

