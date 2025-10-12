import { PrismaClient, user_role, onboarding_field_type } from "@prisma/client"

const prisma = new PrismaClient()

// Using a fixed UUID so we can hardcode it in the app
const DELIVERY_REQUIREMENT_ID = "00000000-0000-0000-0000-000000000001"

async function setupDeliveryRequirement() {
  try {
    console.log("🚚 Setting up delivery details requirement...")

    // Check if it already exists
    const existing = await prisma.onboardingRequirement.findUnique({
      where: { id: DELIVERY_REQUIREMENT_ID },
    })

    if (existing) {
      console.log("✅ Delivery requirement already exists!")
      console.log("   ID:", existing.id)
      console.log("   Label:", existing.label)
      console.log("   Role:", existing.role)
      return existing
    }

    // Create the requirement with a known ID
    const requirement = await prisma.onboardingRequirement.create({
      data: {
        id: DELIVERY_REQUIREMENT_ID,
        role: user_role.retailer,
        label: "Delivery Details",
        fieldType: onboarding_field_type.textarea,
        isMandatory: false, // Optional since it's handled separately in the UI
        description: "Configure your delivery preferences for Pick Up Mtaani",
        placeholder: "Delivery preferences will be configured automatically",
        position: 999, // Put it at the end
        isActive: true,
      },
    })

    console.log("✅ Delivery requirement created successfully!")
    console.log("   ID:", requirement.id)
    console.log("   Label:", requirement.label)
    console.log("   Role:", requirement.role)
    console.log("\n💡 Use this ID in your code:")
    console.log(`   const DELIVERY_REQUIREMENT_ID = "${DELIVERY_REQUIREMENT_ID}"`)

    return requirement
  } catch (error) {
    console.error("❌ Error creating delivery requirement:", error)
    throw error
  } finally {
    await prisma.$disconnect()
    console.log("\n🔌 Database connection closed")
  }
}

setupDeliveryRequirement()
  .then(() => {
    console.log("\n✨ Setup complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Setup failed:", error)
    process.exit(1)
  })

