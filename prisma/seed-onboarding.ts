import { PrismaClient, user_role, onboarding_field_type } from "@prisma/client"

const prisma = new PrismaClient()

// Onboarding requirements data
const onboardingRequirementsData = {
  [user_role.vendor]: [
    {
      label: "Business License Number",
      fieldType: onboarding_field_type.text,
      isMandatory: true,
      description: "Provide your business license registration number",
      placeholder: "e.g., BL123456789",
      position: 1,
      isPaymentRelated: false,
      validationRules: {
        minLength: 5,
        maxLength: 50,
        pattern: "^[A-Z0-9]+$",
        required: true,
      },
    },
    {
      label: "Business Address",
      fieldType: onboarding_field_type.text,
      isMandatory: true,
      description: "Complete business address for verification",
      placeholder: "Street, City, Country",
      position: 2,
      isPaymentRelated: false,
      validationRules: {
        minLength: 10,
        maxLength: 200,
        required: true,
      },
    },
    {
      label: "Business Description",
      fieldType: onboarding_field_type.textarea,
      isMandatory: true,
      description: "Describe your business and services offered",
      placeholder: "Tell us about your business...",
      position: 3,
      isPaymentRelated: false,
      validationRules: {
        minLength: 50,
        maxLength: 1000,
        required: true,
      },
    },
    {
      label: "Identity Document",
      fieldType: onboarding_field_type.file,
      isMandatory: true,
      description: "Upload a copy of your national ID or passport",
      placeholder: null,
      position: 4,
      isPaymentRelated: false,
      validationRules: {
        fileTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxSize: "5MB",
        required: true,
      },
    },
    {
      label: "Business Registration Certificate",
      fieldType: onboarding_field_type.file,
      isMandatory: true,
      description: "Upload your business registration certificate",
      placeholder: null,
      position: 5,
      isPaymentRelated: false,
      validationRules: {
        fileTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxSize: "10MB",
        required: true,
      },
    },
    {
      label: "Tax Identification Number",
      fieldType: onboarding_field_type.text,
      isMandatory: true,
      description: "Provide your tax identification number",
      placeholder: "e.g., TIN123456789",
      position: 6,
      isPaymentRelated: true,
      validationRules: {
        minLength: 8,
        maxLength: 20,
        pattern: "^[A-Z0-9]+$",
        required: true,
      },
    },
    {
      label: "Bank Account Details",
      fieldType: onboarding_field_type.textarea,
      isMandatory: true,
      description: "Provide your bank account details for payments",
      placeholder: "Bank Name, Account Number, Account Holder Name",
      position: 7,
      isPaymentRelated: true,
      validationRules: {
        minLength: 20,
        maxLength: 500,
        required: true,
      },
    },
    {
      label: "Service Categories",
      fieldType: onboarding_field_type.select,
      isMandatory: false,
      description: "Select the main service categories you offer",
      placeholder: null,
      selectOptions: {
        options: [
          "Beauty & Cosmetics",
          "Skincare",
          "Hair Care",
          "Body Care",
          "Health & Wellness",
          "Fashion Accessories",
          "Nail Art",
          "Makeup Services",
          "Spa Services",
          "Massage Therapy",
          "Aromatherapy",
          "Other",
        ],
        multiple: true,
        minSelections: 1,
        maxSelections: 5,
      },
      position: 8,
      isPaymentRelated: false,
    },
    {
      label: "Years of Experience",
      fieldType: onboarding_field_type.select,
      isMandatory: false,
      description: "How many years of experience do you have?",
      placeholder: null,
      selectOptions: {
        options: [
          "Less than 1 year",
          "1-2 years",
          "3-5 years",
          "6-10 years",
          "More than 10 years",
        ],
        multiple: false,
      },
      position: 9,
      isPaymentRelated: false,
    },
  ],

  [user_role.retailer]: [
    {
      label: "Store License Number",
      fieldType: onboarding_field_type.text,
      isMandatory: true,
      description: "Provide your retail store license number",
      placeholder: "e.g., SL123456789",
      position: 1,
      isPaymentRelated: false,
      validationRules: {
        minLength: 5,
        maxLength: 50,
        pattern: "^[A-Z0-9]+$",
        required: true,
      },
    },
    {
      label: "Store Address",
      fieldType: onboarding_field_type.text,
      isMandatory: true,
      description: "Physical store address for verification",
      placeholder: "Street, City, Country",
      position: 2,
      isPaymentRelated: false,
      validationRules: {
        minLength: 10,
        maxLength: 200,
        required: true,
      },
    },
    {
      label: "Business Registration Certificate",
      fieldType: onboarding_field_type.file,
      isMandatory: true,
      description: "Upload business registration certificate",
      placeholder: null,
      position: 3,
      isPaymentRelated: false,
      validationRules: {
        fileTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxSize: "10MB",
        required: true,
      },
    },
    {
      label: "Product Categories",
      fieldType: onboarding_field_type.select,
      isMandatory: false,
      description: "Main product categories you will sell",
      placeholder: null,
      selectOptions: {
        options: [
          "Beauty & Cosmetics",
          "Skincare",
          "Hair Care",
          "Body Care",
          "Health & Wellness",
          "Fashion Accessories",
          "Fragrances",
          "Tools & Accessories",
          "Professional Products",
          "Organic & Natural",
          "Luxury Brands",
          "Other",
        ],
        multiple: true,
        minSelections: 1,
        maxSelections: 8,
      },
      position: 4,
      isPaymentRelated: false,
    },
    {
      label: "Store Photos",
      fieldType: onboarding_field_type.file,
      isMandatory: false,
      description: "Upload photos of your retail store (optional)",
      placeholder: null,
      position: 5,
      isPaymentRelated: false,
      validationRules: {
        fileTypes: ["image/jpeg", "image/png"],
        maxSize: "5MB",
        maxFiles: 5,
      },
    },
    {
      label: "Tax Identification Number",
      fieldType: onboarding_field_type.text,
      isMandatory: true,
      description: "Provide your tax identification number",
      placeholder: "e.g., TIN123456789",
      position: 6,
      isPaymentRelated: true,
      validationRules: {
        minLength: 8,
        maxLength: 20,
        pattern: "^[A-Z0-9]+$",
        required: true,
      },
    },
    {
      label: "Bank Account Details",
      fieldType: onboarding_field_type.textarea,
      isMandatory: true,
      description: "Provide your bank account details for payments",
      placeholder: "Bank Name, Account Number, Account Holder Name",
      position: 7,
      isPaymentRelated: true,
      validationRules: {
        minLength: 20,
        maxLength: 500,
        required: true,
      },
    },
    {
      label: "Inventory Management System",
      fieldType: onboarding_field_type.select,
      isMandatory: false,
      description: "Do you have an inventory management system?",
      placeholder: null,
      selectOptions: {
        options: [
          "Yes, I have a system",
          "No, I manage manually",
          "Planning to implement one",
          "Use basic spreadsheet",
          "Use specialized software",
        ],
        multiple: false,
      },
      position: 8,
      isPaymentRelated: false,
    },
    {
      label: "Store Size",
      fieldType: onboarding_field_type.select,
      isMandatory: false,
      description: "What is the size of your retail store?",
      placeholder: null,
      selectOptions: {
        options: [
          "Small (under 500 sq ft)",
          "Medium (500-1500 sq ft)",
          "Large (1500-3000 sq ft)",
          "Very Large (over 3000 sq ft)",
          "Online only",
        ],
        multiple: false,
      },
      position: 9,
      isPaymentRelated: false,
    },
    {
      label: "Delivery Method",
      fieldType: onboarding_field_type.select,
      isMandatory: true,
      description: "Choose how you want to handle product deliveries",
      placeholder: "Select delivery method",
      selectOptions: {
        options: [
          "Pick Up Mtaani Agent Drop-off",
          "Self Delivery",
          "Other Delivery Service",
        ],
        multiple: false,
      },
      position: 10,
      isPaymentRelated: false,
    },
    {
      label: "Delivery Area",
      fieldType: onboarding_field_type.select,
      isMandatory: true,
      description: "Select the area where you want to drop off packages",
      placeholder: "Choose your area",
      selectOptions: {
        options: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"],
        multiple: false,
      },
      position: 11,
      isPaymentRelated: false,
    },
    {
      label: "Delivery Location",
      fieldType: onboarding_field_type.select,
      isMandatory: true,
      description: "Select the specific location within your chosen area",
      placeholder: "Choose your location",
      selectOptions: {
        options: ["CBD", "Westlands", "Karen", "Runda", "Kilimani"],
        multiple: false,
      },
      position: 12,
      isPaymentRelated: false,
    },
    {
      label: "Preferred Agent",
      fieldType: onboarding_field_type.select,
      isMandatory: true,
      description: "Select your preferred Pick Up Mtaani agent",
      placeholder: "Choose your agent",
      selectOptions: {
        options: [
          "Agent 001 - John Doe",
          "Agent 002 - Jane Smith",
          "Agent 003 - Mike Johnson",
          "Agent 004 - Sarah Wilson",
          "Agent 005 - David Brown",
        ],
        multiple: false,
      },
      position: 13,
      isPaymentRelated: false,
    },
  ],

  [user_role.manufacturer]: [
    {
      label: "Manufacturing License",
      fieldType: onboarding_field_type.text,
      isMandatory: true,
      description: "Manufacturing license registration number",
      placeholder: "e.g., ML123456789",
      position: 1,
      isPaymentRelated: false,
      validationRules: {
        minLength: 5,
        maxLength: 50,
        pattern: "^[A-Z0-9]+$",
        required: true,
      },
    },
    {
      label: "Factory Address",
      fieldType: onboarding_field_type.text,
      isMandatory: true,
      description: "Complete factory/manufacturing facility address",
      placeholder: "Street, City, Country",
      position: 2,
      isPaymentRelated: false,
      validationRules: {
        minLength: 10,
        maxLength: 200,
        required: true,
      },
    },
    {
      label: "Quality Certifications",
      fieldType: onboarding_field_type.file,
      isMandatory: false,
      description: "Upload quality management certificates (ISO, etc.)",
      placeholder: null,
      position: 3,
      isPaymentRelated: false,
      validationRules: {
        fileTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxSize: "10MB",
      },
    },
    {
      label: "Product Categories",
      fieldType: onboarding_field_type.textarea,
      isMandatory: true,
      description: "List the product categories you manufacture",
      placeholder: "Cosmetics, Skincare, etc.",
      position: 4,
      isPaymentRelated: false,
      validationRules: {
        minLength: 20,
        maxLength: 500,
        required: true,
      },
    },
    {
      label: "Production Capacity",
      fieldType: onboarding_field_type.text,
      isMandatory: false,
      description: "What is your monthly production capacity?",
      placeholder: "e.g., 10,000 units per month",
      position: 5,
      isPaymentRelated: false,
      validationRules: {
        minLength: 5,
        maxLength: 100,
      },
    },
    {
      label: "Factory Photos",
      fieldType: onboarding_field_type.file,
      isMandatory: false,
      description: "Upload photos of your manufacturing facility (optional)",
      placeholder: null,
      position: 6,
      isPaymentRelated: false,
      validationRules: {
        fileTypes: ["image/jpeg", "image/png"],
        maxSize: "5MB",
        maxFiles: 10,
      },
    },
    {
      label: "Tax Identification Number",
      fieldType: onboarding_field_type.text,
      isMandatory: true,
      description: "Provide your tax identification number",
      placeholder: "e.g., TIN123456789",
      position: 7,
      isPaymentRelated: true,
      validationRules: {
        minLength: 8,
        maxLength: 20,
        pattern: "^[A-Z0-9]+$",
        required: true,
      },
    },
    {
      label: "Bank Account Details",
      fieldType: onboarding_field_type.textarea,
      isMandatory: true,
      description: "Provide your bank account details for payments",
      placeholder: "Bank Name, Account Number, Account Holder Name",
      position: 8,
      isPaymentRelated: true,
      validationRules: {
        minLength: 20,
        maxLength: 500,
        required: true,
      },
    },
    {
      label: "Export License",
      fieldType: onboarding_field_type.file,
      isMandatory: false,
      description: "Upload export license if you export products (optional)",
      placeholder: null,
      position: 9,
      isPaymentRelated: false,
      validationRules: {
        fileTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxSize: "10MB",
      },
    },
    {
      label: "Environmental Compliance",
      fieldType: onboarding_field_type.select,
      isMandatory: false,
      description: "Do you have environmental compliance certificates?",
      placeholder: null,
      selectOptions: {
        options: [
          "Yes, I have certificates",
          "No, but I follow regulations",
          "In the process of obtaining",
          "Not applicable to my business",
        ],
        multiple: false,
      },
      position: 10,
      isPaymentRelated: false,
    },
    {
      label: "Manufacturing Standards",
      fieldType: onboarding_field_type.select,
      isMandatory: false,
      description: "What manufacturing standards do you follow?",
      placeholder: null,
      selectOptions: {
        options: [
          "ISO 9001 (Quality Management)",
          "ISO 14001 (Environmental)",
          "ISO 45001 (Occupational Health)",
          "GMP (Good Manufacturing Practice)",
          "FDA Guidelines",
          "CE Marking",
          "Other International Standards",
          "Local Standards Only",
        ],
        multiple: true,
        maxSelections: 5,
      },
      position: 11,
      isPaymentRelated: false,
    },
  ],
}

async function seedOnboardingRequirements() {
  console.log("🌱 Starting onboarding requirements seed...")

  try {
    // Clear existing onboarding requirements
    await prisma.onboardingRequirement.deleteMany({})
    console.log("🧹 Cleared existing onboarding requirements")

    let totalCreated = 0

    // Create requirements for each role
    for (const [role, requirements] of Object.entries(
      onboardingRequirementsData
    )) {
      console.log(`📝 Creating requirements for ${role}...`)

      for (const requirement of requirements) {
        await prisma.onboardingRequirement.create({
          data: {
            role: role as user_role,
            label: requirement.label,
            fieldType: requirement.fieldType,
            isMandatory: requirement.isMandatory,
            description: requirement.description,
            placeholder: requirement.placeholder,
            selectOptions: requirement.selectOptions,
            position: requirement.position,
            isActive: true,
            isPaymentRelated: requirement.isPaymentRelated,
            validationRules: requirement.validationRules,
          },
        })
        totalCreated++
      }

      console.log(`✅ Created ${requirements.length} requirements for ${role}`)
    }

    console.log(
      `\n🎉 Successfully created ${totalCreated} onboarding requirements!`
    )

    // Display summary
    const summary = await Promise.all([
      prisma.onboardingRequirement.count({ where: { role: user_role.vendor } }),
      prisma.onboardingRequirement.count({
        where: { role: user_role.retailer },
      }),
      prisma.onboardingRequirement.count({
        where: { role: user_role.manufacturer },
      }),
    ])

    console.log("\n📊 Summary:")
    console.log(`   Vendor requirements: ${summary[0]}`)
    console.log(`   Retailer requirements: ${summary[1]}`)
    console.log(`   Manufacturer requirements: ${summary[2]}`)
    console.log(`   Total requirements: ${summary.reduce((a, b) => a + b, 0)}`)

    // Show some examples
    console.log("\n📋 Sample Requirements:")
    const sampleRequirements = await prisma.onboardingRequirement.findMany({
      take: 3,
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        label: true,
        fieldType: true,
        isMandatory: true,
        isPaymentRelated: true,
      },
    })

    sampleRequirements.forEach((req, index) => {
      console.log(
        `   ${index + 1}. [${req.role}] ${req.label} (${req.fieldType}) ${req.isMandatory ? "Required" : "Optional"} ${req.isPaymentRelated ? "💰" : ""}`
      )
    })
  } catch (error) {
    console.error("❌ Error seeding onboarding requirements:", error)
    throw error
  }
}

// Main execution
async function main() {
  await seedOnboardingRequirements()
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log("🔌 Database connection closed")
  })
