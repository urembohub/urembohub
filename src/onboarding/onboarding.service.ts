import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { EmailService } from "../email/email.service"
import { OnboardingHistoryService } from "./onboarding-history.service"
import { AdminNotificationService } from "../admin/admin-notification.service"
import {
  user_role,
  onboarding_status,
  onboarding_field_type,
} from "@prisma/client"
import { CreateRequirementDto } from "./dto/create-requirement.dto"
import { UpdateRequirementDto } from "./dto/update-requirement.dto"
import { SubmitRequirementDto } from "./dto/submit-requirement.dto"
import { ReviewSubmissionDto } from "./dto/review-submission.dto"
import { BulkSubmitDto } from "./dto/bulk-submit.dto"
import { 
  SaveRequirementsStepDto, 
  SaveBusinessInfoStepDto, 
  SavePaymentDetailsStepDto, 
  SaveDeliveryDetailsStepDto,
  StepDataResponseDto 
} from "./dto/save-step.dto"

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private onboardingHistoryService: OnboardingHistoryService,
    private adminNotificationService: AdminNotificationService
  ) {}

  // Requirements Management
  async createRequirement(createRequirementDto: CreateRequirementDto) {
    return this.prisma.onboardingRequirement.create({
      data: {
        role: createRequirementDto.role,
        label: createRequirementDto.label,
        fieldType: createRequirementDto.fieldType,
        isMandatory: createRequirementDto.isMandatory ?? true,
        description: createRequirementDto.description,
        placeholder: createRequirementDto.placeholder,
        selectOptions: createRequirementDto.selectOptions,
        position: createRequirementDto.position ?? 0,
        isActive: createRequirementDto.isActive ?? true,
        isPaymentRelated: createRequirementDto.isPaymentRelated ?? false,
        validationRules: createRequirementDto.validationRules,
      },
    })
  }

  async getAllRequirements() {
    return this.prisma.onboardingRequirement.findMany({
      orderBy: [{ role: "asc" }, { position: "asc" }],
    })
  }

  async getRequirementsByRole(role: user_role) {
    return this.prisma.onboardingRequirement.findMany({
      where: {
        role,
        isActive: true,
      },
      orderBy: { position: "asc" },
    })
  }

  async getRequirementById(id: string) {
    const requirement = await this.prisma.onboardingRequirement.findUnique({
      where: { id },
    })

    if (!requirement) {
      throw new NotFoundException("Onboarding requirement not found")
    }

    return requirement
  }

  async updateRequirement(
    id: string,
    updateRequirementDto: UpdateRequirementDto
  ) {
    const requirement = await this.getRequirementById(id)

    return this.prisma.onboardingRequirement.update({
      where: { id },
      data: {
        role: updateRequirementDto.role,
        label: updateRequirementDto.label,
        fieldType: updateRequirementDto.fieldType,
        isMandatory: updateRequirementDto.isMandatory,
        description: updateRequirementDto.description,
        placeholder: updateRequirementDto.placeholder,
        selectOptions: updateRequirementDto.selectOptions,
        position: updateRequirementDto.position,
        isActive: updateRequirementDto.isActive,
        isPaymentRelated: updateRequirementDto.isPaymentRelated,
        validationRules: updateRequirementDto.validationRules,
      },
    })
  }

  async deleteRequirement(id: string) {
    await this.getRequirementById(id)

    return this.prisma.onboardingRequirement.delete({
      where: { id },
    })
  }

  // Save delivery details directly to Profile table (mirrors savePaymentDetails pattern)
  async saveDeliveryDetails(userId: string, deliveryDataJson: string) {
    try {
      const deliveryData = JSON.parse(deliveryDataJson)
      console.log("🚚 Saving delivery details to Profile:", {
        userId,
        deliveryData,
      })

      // First check if profile exists
      const existingProfile = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: {
          id: true,
          deliveryMethod: true,
          deliveryDetails: true,
        },
      })

      console.log("🔍 Existing profile before update:", existingProfile)

      const updatedProfile = await this.prisma.profile.update({
        where: { id: userId },
        data: {
          deliveryMethod: deliveryData.deliveryMethod,
          deliveryDetails: deliveryData,
          deliveryDetailsVerified: false, // Reset verification when details change
        },
      })

      console.log("✅ Delivery details saved successfully:", {
        id: updatedProfile.id,
        deliveryMethod: updatedProfile.deliveryMethod,
        deliveryDetails: updatedProfile.deliveryDetails,
      })

      // Create a mock submission for consistency with the frontend
      // Flatten the delivery data structure to match frontend expectations
      const deliveryDetails = deliveryData.deliveryDetails as any || {}
      
      // Check if data is already flattened (has areaId, agentId, etc. at top level)
      const isAlreadyFlattened = deliveryDetails.areaId || deliveryDetails.agentId || deliveryDetails.areaName
      
      let flattenedDeliveryData
      if (isAlreadyFlattened) {
        // Data is already flattened, use as is
        flattenedDeliveryData = {
          deliveryMethod: deliveryData.deliveryMethod,
          ...deliveryDetails
        }
      } else {
        // Data is double-nested, extract from nested deliveryDetails
        const nestedDetails = deliveryDetails.deliveryDetails || {}
        flattenedDeliveryData = {
          deliveryMethod: deliveryData.deliveryMethod,
          ...nestedDetails
        }
      }
      
      const mockSubmission = {
        id: "delivery_details_" + Date.now(),
        userId,
        requirementId: "delivery_details",
        value: JSON.stringify(flattenedDeliveryData),
        fileUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        requirement: {
          id: "delivery_details",
          label: "Delivery Details",
          fieldType: "delivery_details",
          isMandatory: false,
        },
      }

      return mockSubmission
    } catch (error) {
      console.error("❌ Failed to save delivery details:", error)
      throw new Error("Failed to save delivery details: " + error.message)
    }
  }

  // Save payment details directly to Profile table
  async savePaymentDetails(userId: string, paymentDataJson: string) {
    try {
      const paymentData = JSON.parse(paymentDataJson)
      console.log("💳 Saving payment details to Profile:", {
        userId,
        paymentData,
      })

      // First check if profile exists
      const existingProfile = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: {
          id: true,
          paymentAccountType: true,
          paymentAccountDetails: true,
        },
      })

      console.log("🔍 Existing profile before update:", existingProfile)

      const updatedProfile = await this.prisma.profile.update({
        where: { id: userId },
        data: {
          paymentAccountType: paymentData.accountType,
          paymentAccountDetails: paymentData.accountDetails,
          paymentDetailsVerified: false, // Reset verification when details change
        },
      })

      console.log("✅ Payment details saved successfully:", {
        id: updatedProfile.id,
        paymentAccountType: updatedProfile.paymentAccountType,
        paymentAccountDetails: updatedProfile.paymentAccountDetails,
      })

      // Create a mock submission for consistency with the frontend
      const mockSubmission = {
        id: "payment_details_" + Date.now(),
        userId,
        requirementId: "payment_details",
        value: paymentDataJson,
        fileUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        requirement: {
          id: "payment_details",
          label: "Payment Details",
          fieldType: "payment_details",
          isMandatory: true,
        },
      }

      return mockSubmission
    } catch (error) {
      console.error("❌ Failed to save payment details:", error)
      throw new Error("Failed to save payment details: " + error.message)
    }
  }

  // Submissions Management
  async submitRequirement(
    userId: string,
    submitRequirementDto: SubmitRequirementDto
  ) {
    console.log("📝 submitRequirement called with:", {
      userId,
      requirementId: submitRequirementDto.requirementId,
    })

    // Special handling for payment details - save directly to Profile table
    if (submitRequirementDto.requirementId === "payment_details") {
      console.log("💳 Payment details detected, calling savePaymentDetails")
      return this.savePaymentDetails(userId, submitRequirementDto.value)
    }

    // Special handling for delivery details - save to OnboardingSubmission with special ID
    if (submitRequirementDto.requirementId === "delivery_details") {
      console.log("🚚 Delivery details detected, saving to submissions")
      return this.saveDeliveryDetails(userId, submitRequirementDto.value)
    }

    // Verify requirement exists and is active
    const requirement = await this.prisma.onboardingRequirement.findFirst({
      where: {
        id: submitRequirementDto.requirementId,
        isActive: true,
      },
    })

    if (!requirement) {
      throw new NotFoundException(
        "Onboarding requirement not found or inactive"
      )
    }

    // Check if user has already submitted for this requirement
    const existingSubmission =
      await this.prisma.onboardingSubmission.findUnique({
        where: {
          userId_requirementId: {
            userId,
            requirementId: submitRequirementDto.requirementId,
          },
        },
      })

    let submission
    if (existingSubmission) {
      // Update existing submission
      submission = await this.prisma.onboardingSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          value: submitRequirementDto.value,
          fileUrl: submitRequirementDto.fileUrl,
        },
      })
    } else {
      // Create new submission
      submission = await this.prisma.onboardingSubmission.create({
        data: {
          userId,
          requirementId: submitRequirementDto.requirementId,
          value: submitRequirementDto.value,
          fileUrl: submitRequirementDto.fileUrl,
        },
      })
    }

    // Log submission history
    await this.onboardingHistoryService.logSubmission(
      userId,
      submitRequirementDto.requirementId,
      requirement.fieldType,
      !!submitRequirementDto.fileUrl,
      submitRequirementDto.value
    )

    return submission
  }

  async bulkSubmitRequirements(userId: string, bulkSubmitDto: BulkSubmitDto) {
    const results = []
    let hasSuccessfulSubmissions = false

    for (const submission of bulkSubmitDto.submissions) {
      try {
        const result = await this.submitRequirement(userId, submission)
        results.push({ success: true, data: result })
        hasSuccessfulSubmissions = true
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          requirementId: submission.requirementId,
        })
      }
    }

    // Check if all requirements are completed and update status
    if (hasSuccessfulSubmissions) {
      const user = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: { 
          onboardingStatus: true, 
          role: true,
          businessName: true,
          businessPhone: true,
          pickupMtaaniBusinessDetails: true,
          paymentAccountType: true,
          paymentAccountDetails: true,
          paystackSubaccountId: true,
          deliveryMethod: true,
          deliveryDetails: true
        },
      })

      if (user) {
        // Comprehensive validation before submission
        const validationResult = await this.validateCompleteOnboarding(userId, user)
        
        if (!validationResult.isValid) {
          console.warn(`⚠️ [ONBOARDING] Validation failed for user ${userId}:`, validationResult.errors)
          return {
            success: false,
            error: 'Incomplete onboarding requirements',
            details: validationResult.errors,
            results
          }
        }

        // If all validations pass, update status to submitted
        const oldStatus = user.onboardingStatus
        const newStatus = "submitted"

        const updatedUser = await this.prisma.profile.update({
          where: { id: userId },
          data: { onboardingStatus: newStatus },
        })

        // Log status change
        await this.onboardingHistoryService.logStatusChange(
          userId,
          oldStatus,
          newStatus,
          "All onboarding requirements completed and validated"
        )

        // Send admin notification for new submission (queued, non-blocking)
        console.log("📧 [ONBOARDING] Queuing admin notification for new submission...")
        this.adminNotificationService.notifyAdminsOfOnboardingSubmission(
          {
            businessName: updatedUser.businessName,
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            role: updatedUser.role,
            submittedAt: new Date().toLocaleDateString(),
          }
        ).then(() => {
          console.log("✅ [ONBOARDING] Admin notification queued successfully!")
        }).catch((error) => {
          console.error(
            "❌ [ONBOARDING] Failed to queue admin notification:",
            error
          )
          // Don't fail the submission if admin notification fails
        })

        console.log(`✅ [ONBOARDING] User ${userId} onboarding completed successfully`)
      }
    }

    return {
      success: true,
      results
    }
  }

  async getUserSubmissions(userId: string) {
    console.log(`📋 Backend: getUserSubmissions called for user: ${userId}`)

    const submissions = await this.prisma.onboardingSubmission.findMany({
      where: { userId },
      include: {
        requirement: true,
      },
      orderBy: { createdAt: "desc" },
    })

    console.log(
      `📋 Backend: Found ${submissions.length} regular submissions for user ${userId}`
    )

    // Get payment details from Profile table
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: {
        paymentAccountType: true,
        paymentAccountDetails: true,
        paymentDetailsVerified: true,
      },
    })

    console.log("💳 Backend: Profile payment details:", profile)

    // Add payment details as a submission if they exist
    if (profile?.paymentAccountType && profile?.paymentAccountDetails) {
      const paymentData = {
        accountType: profile.paymentAccountType,
        accountDetails: profile.paymentAccountDetails,
      }

      console.log(
        "💳 Backend: Creating payment submission with data:",
        paymentData
      )

      const paymentSubmission = {
        id: "payment_details_" + userId,
        userId,
        requirementId: "payment_details",
        value: JSON.stringify(paymentData),
        fileUrl: null,
        createdAt: new Date(), // Use current date as we don't have the original creation date
        updatedAt: new Date(),
        requirement: {
          id: "payment_details",
          role: "retailer" as any, // Default role for payment details
          label: "Payment Details",
          fieldType: "payment_details" as any,
          isMandatory: true,
          description: "Payment information for receiving payouts",
          placeholder: "Select payment method",
          selectOptions: null,
          position: 999,
          isActive: true,
          isPaymentRelated: true,
          validationRules: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      // Add payment submission to the beginning of the array
      submissions.unshift(paymentSubmission)
      console.log(
        "✅ Backend: Added payment details submission from Profile. Total submissions now:",
        submissions.length
      )
    } else {
      console.log(
        "❌ Backend: No payment details found in Profile. Profile data:",
        {
          hasAccountType: !!profile?.paymentAccountType,
          hasAccountDetails: !!profile?.paymentAccountDetails,
          accountType: profile?.paymentAccountType,
          accountDetails: profile?.paymentAccountDetails,
        }
      )
    }

    // Get delivery details from Profile table (mirrors payment details pattern)
    const deliveryProfile = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: {
        deliveryMethod: true,
        deliveryDetails: true,
        deliveryDetailsVerified: true,
      },
    })

    console.log("🚚 Backend: Profile delivery details:", deliveryProfile)

    // Add delivery details as a submission if they exist
    if (deliveryProfile?.deliveryMethod && deliveryProfile?.deliveryDetails) {
      console.log(
        "🚚 Backend: Creating delivery submission with data:",
        deliveryProfile.deliveryDetails
      )

      // Flatten the delivery data structure to match frontend expectations
      const deliveryDetails = deliveryProfile.deliveryDetails as any || {}
      console.log("🚚 Backend: Raw delivery details from profile:", deliveryDetails)
      
      // Check if data is already flattened (has areaId, agentId, etc. at top level)
      const isAlreadyFlattened = deliveryDetails.areaId || deliveryDetails.agentId || deliveryDetails.areaName
      
      let flattenedDeliveryData
      if (isAlreadyFlattened) {
        // Data is already flattened, use as is
        flattenedDeliveryData = {
          deliveryMethod: deliveryProfile.deliveryMethod,
          ...deliveryDetails
        }
      } else {
        // Data is double-nested, extract from nested deliveryDetails
        const nestedDetails = deliveryDetails.deliveryDetails || {}
        flattenedDeliveryData = {
          deliveryMethod: deliveryProfile.deliveryMethod,
          ...nestedDetails
        }
      }
      
      console.log("🚚 Backend: Flattened delivery data:", flattenedDeliveryData)

      const deliverySubmission = {
        id: "delivery_details_" + userId,
        userId,
        requirementId: "delivery_details",
        value: JSON.stringify(flattenedDeliveryData),
        fileUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        requirement: {
          id: "delivery_details",
          role: "retailer" as any,
          label: "Delivery Details",
          fieldType: "delivery_details" as any,
          isMandatory: false,
          description: "Delivery preferences for Pick Up Mtaani",
          placeholder: "Select delivery preferences",
          selectOptions: null,
          position: 998,
          isActive: true,
          isPaymentRelated: false,
          validationRules: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      // Add delivery submission to the array
      submissions.unshift(deliverySubmission)
      console.log(
        "✅ Backend: Added delivery details submission from Profile. Total submissions now:",
        submissions.length
      )
    } else {
      console.log("❌ Backend: No delivery details found in Profile")
    }

    return submissions
  }

  async getUserSubmissionByRequirement(userId: string, requirementId: string) {
    return this.prisma.onboardingSubmission.findUnique({
      where: {
        userId_requirementId: {
          userId,
          requirementId,
        },
      },
      include: {
        requirement: true,
      },
    })
  }

  async getSubmissionById(id: string) {
    const submission = await this.prisma.onboardingSubmission.findUnique({
      where: { id },
      include: {
        requirement: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            businessName: true,
          },
        },
      },
    })

    if (!submission) {
      throw new NotFoundException("Onboarding submission not found")
    }

    return submission
  }

  // Reviews Management
  async createReview(
    adminId: string,
    reviewSubmissionDto: ReviewSubmissionDto
  ) {
    // Verify user exists
    const user = await this.prisma.profile.findUnique({
      where: { id: reviewSubmissionDto.userId },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    const oldStatus = user.onboardingStatus

    // Create review
    const review = await this.prisma.onboardingReview.create({
      data: {
        userId: reviewSubmissionDto.userId,
        adminId,
        status: reviewSubmissionDto.status,
        notes: reviewSubmissionDto.notes,
        rejectionReason: reviewSubmissionDto.rejectionReason,
      },
    })

    // Update user's onboarding status
    await this.prisma.profile.update({
      where: { id: reviewSubmissionDto.userId },
      data: {
        onboardingStatus: reviewSubmissionDto.status,
      },
    })

    // Log admin action based on status
    if (reviewSubmissionDto.status === "approved") {
      await this.onboardingHistoryService.logApproval(
        reviewSubmissionDto.userId,
        adminId,
        reviewSubmissionDto.notes
      )
    } else if (reviewSubmissionDto.status === "rejected") {
      await this.onboardingHistoryService.logRejection(
        reviewSubmissionDto.userId,
        adminId,
        reviewSubmissionDto.rejectionReason || "No reason provided"
      )
    } else if (reviewSubmissionDto.status === "revision_requested") {
      await this.onboardingHistoryService.logRevisionRequest(
        reviewSubmissionDto.userId,
        adminId,
        reviewSubmissionDto.notes || "Additional information required"
      )
    }

    // Log status change
    await this.onboardingHistoryService.logStatusChange(
      reviewSubmissionDto.userId,
      oldStatus,
      reviewSubmissionDto.status,
      `Admin action: ${reviewSubmissionDto.status}`
    )

    return review
  }

  async getUserReviews(userId: string) {
    return this.prisma.onboardingReview.findMany({
      where: { userId },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async getAllReviews() {
    return this.prisma.onboardingReview.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            businessName: true,
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async getReviewById(id: string) {
    const review = await this.prisma.onboardingReview.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            businessName: true,
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    })

    if (!review) {
      throw new NotFoundException("Onboarding review not found")
    }

    return review
  }

  // Onboarding Status Management
  async updateUserOnboardingStatus(
    userId: string,
    status: onboarding_status,
    adminId: string,
    notes?: string,
    rejectionReason?: string
  ) {
    // Verify user exists
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    // Update user status
    const updatedUser = await this.prisma.profile.update({
      where: { id: userId },
      data: {
        onboardingStatus: status,
      },
    })

    // Create review record
    const review = await this.prisma.onboardingReview.create({
      data: {
        userId,
        adminId,
        status,
        notes,
        rejectionReason,
      },
    })

    // Send appropriate email based on status
    try {
      if (status === onboarding_status.approved) {
        console.log("📧 [ONBOARDING] Sending profile approved email...")
        console.log("📧 [ONBOARDING] User email:", user.email)
        console.log("📧 [ONBOARDING] User name:", user.fullName || "User")

        const emailResult = await this.emailService.sendProfileApprovedEmail(
          user.email,
          user.fullName || "User"
        )

        console.log("📧 [ONBOARDING] Email result:", emailResult)

        if (emailResult.success) {
          console.log(
            "✅ [ONBOARDING] Profile approved email sent successfully!"
          )
        } else {
          console.log("❌ [ONBOARDING] Email failed:", emailResult.error)
        }
      } else if (status === onboarding_status.rejected) {
        console.log("📧 [ONBOARDING] Sending profile rejected email...")
        await this.emailService.sendProfileRejectedEmail(
          user.email,
          user.fullName || "User",
          rejectionReason || "Profile requirements not met"
        )
        console.log("✅ [ONBOARDING] Profile rejected email sent successfully!")
      } else if (status === onboarding_status.revision_requested) {
        console.log("📧 [ONBOARDING] Sending revision request email...")
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080"
        const resubmissionUrl = `${frontendUrl}/onboarding`

        await this.emailService.sendOnboardingRevisionRequestEmail(
          user.email,
          user.fullName || "User",
          notes || "Additional information required for verification",
          resubmissionUrl
        )
        console.log("✅ [ONBOARDING] Revision request email sent successfully!")
      }
    } catch (error) {
      console.error(
        "❌ [ONBOARDING] Failed to send onboarding status email:",
        error
      )
      // Don't fail the status update if email fails
    }

    return {
      user: updatedUser,
      review,
    }
  }

  // Dashboard and Analytics
  async getOnboardingStats() {
    const totalUsers = await this.prisma.profile.count()
    const usersByStatus = await this.prisma.profile.groupBy({
      by: ["onboardingStatus"],
      _count: {
        onboardingStatus: true,
      },
    })

    const requirementsByRole = await this.prisma.onboardingRequirement.groupBy({
      by: ["role"],
      _count: {
        role: true,
      },
      where: {
        isActive: true,
      },
    })

    const pendingReviews = await this.prisma.onboardingReview.count({
      where: {
        status: onboarding_status.submitted,
      },
    })

    return {
      totalUsers,
      usersByStatus,
      requirementsByRole,
      pendingReviews,
    }
  }

  async getUsersByOnboardingStatus(status: onboarding_status) {
    return this.prisma.profile.findMany({
      where: {
        onboardingStatus: status,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        businessName: true,
        onboardingStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async getIncompleteSubmissions(userId: string) {
    // Get user's role
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    // Get all active requirements for user's role
    const requirements = await this.prisma.onboardingRequirement.findMany({
      where: {
        role: user.role,
        isActive: true,
        isMandatory: true,
      },
      orderBy: { position: "asc" },
    })

    // Get user's submissions
    const submissions = await this.prisma.onboardingSubmission.findMany({
      where: { userId },
    })

    // Find incomplete requirements
    const submittedRequirementIds = submissions.map((s) => s.requirementId)
    const incompleteRequirements = requirements.filter(
      (req) => !submittedRequirementIds.includes(req.id)
    )

    return {
      totalRequirements: requirements.length,
      completedRequirements: submissions.length,
      incompleteRequirements,
      completionPercentage:
        requirements.length > 0
          ? (submissions.length / requirements.length) * 100
          : 0,
    }
  }

  // Validation helpers
  async validateSubmission(
    userId: string,
    requirementId: string,
    value?: string,
    fileUrl?: string
  ) {
    const requirement = await this.getRequirementById(requirementId)

    // Check if user has permission to submit for this requirement
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role !== requirement.role) {
      throw new ForbiddenException("User role does not match requirement role")
    }

    // Validate based on field type
    if (requirement.fieldType === onboarding_field_type.file && !fileUrl) {
      throw new BadRequestException(
        "File upload is required for this field type"
      )
    }

    if (requirement.fieldType !== onboarding_field_type.file && !value) {
      throw new BadRequestException("Value is required for this field type")
    }

    // Apply validation rules if present
    if (requirement.validationRules) {
      // TODO: Implement custom validation logic based on validationRules
    }

    return true
  }

  async getUserHistory(userId: string) {
    return this.onboardingHistoryService.getUserHistory(userId);
  }

  /**
   * Save Pickup Mtaani business details to user profile
   */
  async getPickupMtaaniBusiness(userId: string) {
    try {
      const user = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: { pickupMtaaniBusinessDetails: true }
      })

      if (user?.pickupMtaaniBusinessDetails) {
        return {
          success: true,
          data: user.pickupMtaaniBusinessDetails
        }
      }

      return {
        success: true,
        data: null
      }
    } catch (error) {
      console.error('Error getting Pickup Mtaani business details:', error)
      return {
        success: false,
        error: 'Failed to get business details'
      }
    }
  }

  async savePickupMtaaniBusiness(userId: string, businessData: {
    businessId: number
    businessName: string
    phoneNumber: string
    categoryId: number
    categoryName: string
  }) {
    try {
      // Update user profile with Pickup Mtaani business details
      const updatedUser = await this.prisma.profile.update({
        where: { id: userId },
        data: {
          pickupMtaaniBusinessDetails: {
            id: businessData.businessId,
            name: businessData.businessName,
            phoneNumber: businessData.phoneNumber,
            categoryId: businessData.categoryId,
            categoryName: businessData.categoryName,
            createdAt: new Date().toISOString(),
          }
        }
      })

      return {
        success: true,
        data: updatedUser
      }
    } catch (error) {
      console.error('Error saving Pickup Mtaani business details:', error)
      return {
        success: false,
        error: 'Failed to save business details'
      }
    }
  }

  /**
   * Get onboarding settings
   */
  async getOnboardingSettings() {
    try {
      let settings = await this.prisma.onboardingSettings.findFirst()
      
      if (!settings) {
        // Create default settings if none exist
        settings = await this.prisma.onboardingSettings.create({
          data: {
            useMultiStepForm: false
          }
        })
      }

      return {
        success: true,
        data: settings
      }
    } catch (error) {
      console.error('Error fetching onboarding settings:', error)
      return {
        success: false,
        error: 'Failed to fetch settings'
      }
    }
  }

  /**
   * Update onboarding settings
   */
  async updateOnboardingSettings(settingsData: { useMultiStepForm: boolean }) {
    try {
      let settings = await this.prisma.onboardingSettings.findFirst()
      
      if (!settings) {
        settings = await this.prisma.onboardingSettings.create({
          data: settingsData
        })
      } else {
        settings = await this.prisma.onboardingSettings.update({
          where: { id: settings.id },
          data: settingsData
        })
      }

      return {
        success: true,
        data: settings
      }
    } catch (error) {
      console.error('Error updating onboarding settings:', error)
      return {
        success: false,
        error: 'Failed to update settings'
      }
    }
  }

  /**
   * Validate retailer's Pickup Mtaani business ID
   * @param userProfile User profile data
   * @returns Validation result with business ID or error message
   */
  private validateRetailerBusinessId(userProfile: any): { valid: boolean; businessId?: string; error?: string } {
    try {
      // Check if pickupMtaaniBusinessDetails exists
      if (!userProfile.pickupMtaaniBusinessDetails) {
        return {
          valid: false,
          error: 'Retailer has not completed Pickup Mtaani business setup'
        }
      }

      const businessDetails = userProfile.pickupMtaaniBusinessDetails
      
      // Check for businessId or id field
      const businessId = businessDetails.businessId || businessDetails.id
      
      if (!businessId) {
        return {
          valid: false,
          error: 'Pickup Mtaani business ID not found in retailer profile'
        }
      }

      // Validate business ID format (should be a number)
      if (typeof businessId !== 'number' && !/^\d+$/.test(String(businessId))) {
        return {
          valid: false,
          error: 'Invalid Pickup Mtaani business ID format'
        }
      }

      return {
        valid: true,
        businessId: String(businessId)
      }
    } catch (error) {
      console.error('Error validating retailer business ID:', error)
      return {
        valid: false,
        error: 'Error validating Pickup Mtaani business ID'
      }
    }
  }

  /**
   * Comprehensive validation of complete onboarding
   */
  private async validateCompleteOnboarding(userId: string, userProfile: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      console.log(`🔍 [VALIDATION] Starting comprehensive validation for user ${userId}`)

      // 1. Validate mandatory requirements
      const requirements = await this.prisma.onboardingRequirement.findMany({
        where: {
          role: userProfile.role as any,
          isActive: true,
        },
      })

      const submissions = await this.prisma.onboardingSubmission.findMany({
        where: { userId },
      })

      const mandatoryRequirements = requirements.filter(req => req.isMandatory)
      const completedMandatory = mandatoryRequirements.filter(req =>
        submissions.some(sub => sub.requirementId === req.id && (sub.value || sub.fileUrl))
      )

      if (completedMandatory.length !== mandatoryRequirements.length) {
        errors.push(`Missing ${mandatoryRequirements.length - completedMandatory.length} mandatory requirements`)
      }

      // 2. Validate payment details (required for all users)
      if (!userProfile.paymentAccountType) {
        errors.push('Payment account type is required')
      }
      if (!userProfile.paymentAccountDetails || Object.keys(userProfile.paymentAccountDetails).length === 0) {
        errors.push('Payment account details are required')
      }
      if (!userProfile.paystackSubaccountId) {
        errors.push('Paystack sub-account must be created')
      }

      // 3. Validate retailer-specific requirements
      if (userProfile.role === 'retailer') {
        // Business information
        if (!userProfile.businessName) {
          errors.push('Business name is required for retailers')
        }
        if (!userProfile.businessPhone) {
          errors.push('Business phone is required for retailers')
        }

        // Pickup Mtaani business ID
        const businessIdValidation = this.validateRetailerBusinessId(userProfile)
        if (!businessIdValidation.valid) {
          errors.push(businessIdValidation.error || 'Pickup Mtaani business setup is incomplete')
        }

        // Delivery details
        if (!userProfile.deliveryMethod) {
          errors.push('Delivery method is required for retailers')
        }
        if (!userProfile.deliveryDetails || Object.keys(userProfile.deliveryDetails).length === 0) {
          errors.push('Delivery details are required for retailers')
        }
      }

      console.log(`🔍 [VALIDATION] Validation complete for user ${userId}:`, {
        isValid: errors.length === 0,
        errorCount: errors.length,
        errors: errors
      })

      return {
        isValid: errors.length === 0,
        errors
      }
    } catch (error) {
      console.error('❌ [VALIDATION] Error during validation:', error)
      return {
        isValid: false,
        errors: ['Validation error occurred']
      }
    }
  }

  /**
   * Reset onboarding status for a user
   * @param userId User ID
   * @param status New status to set
   */
  async resetOnboardingStatus(userId: string, status: string) {
    try {
      console.log(`🔄 [ONBOARDING] Resetting status for user ${userId} to: ${status}`)
      
      const updatedUser = await this.prisma.profile.update({
        where: { id: userId },
        data: { 
          onboardingStatus: status as any
        }
      })

      console.log(`✅ [ONBOARDING] Status reset successfully for user ${userId}`)
      
      return {
        success: true,
        data: updatedUser
      }
    } catch (error) {
      console.error('❌ [ONBOARDING] Error resetting onboarding status:', error)
      return {
        success: false,
        error: 'Failed to reset onboarding status'
      }
    }
  }

  // Step-level save methods
  async saveRequirementsStep(userId: string, dto: SaveRequirementsStepDto) {
    try {
      console.log(`💾 [STEP] Saving requirements step for user ${userId}`)
      
      // Save each requirement individually
      const results = []
      for (const [requirementId, value] of Object.entries(dto.requirements)) {
        const submission = await this.submitRequirement(userId, {
          requirementId,
          value: typeof value === 'string' ? value : undefined,
          fileUrl: typeof value === 'string' && value.startsWith('http') ? value : undefined
        })
        results.push(submission)
      }
      
      console.log(`✅ [STEP] Requirements step saved for user ${userId}`)
      return { success: true, data: results }
    } catch (error) {
      console.error('❌ [STEP] Error saving requirements step:', error)
      throw error
    }
  }

  async saveBusinessInfoStep(userId: string, dto: SaveBusinessInfoStepDto) {
    try {
      console.log(`💾 [STEP] Saving business info step for user ${userId}`)
      
      const businessDetails = {
        businessId: dto.pickupMtaaniBusinessId,
        businessName: dto.pickupMtaaniBusinessName,
        categoryId: dto.categoryId,
        categoryName: dto.categoryName,
        phoneNumber: dto.phoneNumber
      }
      
      const updatedUser = await this.prisma.profile.update({
        where: { id: userId },
        data: {
          businessName: dto.businessName,
          businessPhone: dto.phoneNumber,
          pickupMtaaniBusinessDetails: businessDetails
        }
      })
      
      console.log(`✅ [STEP] Business info step saved for user ${userId}`)
      return { success: true, data: updatedUser }
    } catch (error) {
      console.error('❌ [STEP] Error saving business info step:', error)
      throw error
    }
  }

  async savePaymentDetailsStep(userId: string, dto: SavePaymentDetailsStepDto) {
    try {
      console.log(`💾 [STEP] Saving payment details step for user ${userId}`)
      
      const updatedUser = await this.prisma.profile.update({
        where: { id: userId },
        data: {
          paymentAccountType: dto.paymentAccountType,
          paymentAccountDetails: dto.paymentAccountDetails,
          paystackSubaccountId: dto.paystackSubaccountId
        }
      })
      
      console.log(`✅ [STEP] Payment details step saved for user ${userId}`)
      return { success: true, data: updatedUser }
    } catch (error) {
      console.error('❌ [STEP] Error saving payment details step:', error)
      throw error
    }
  }

  async saveDeliveryDetailsStep(userId: string, dto: SaveDeliveryDetailsStepDto) {
    try {
      console.log(`💾 [STEP] Saving delivery details step for user ${userId}`)
      
      const updatedUser = await this.prisma.profile.update({
        where: { id: userId },
        data: {
          deliveryMethod: dto.deliveryMethod,
          deliveryDetails: dto.deliveryDetails
        }
      })
      
      console.log(`✅ [STEP] Delivery details step saved for user ${userId}`)
      return { success: true, data: updatedUser }
    } catch (error) {
      console.error('❌ [STEP] Error saving delivery details step:', error)
      throw error
    }
  }

  async getAllStepData(userId: string): Promise<StepDataResponseDto> {
    try {
      console.log(`📋 [STEP] Fetching all step data for user ${userId}`)
      
      // Get user profile with all relevant data
      const profile = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: {
          role: true,
          businessName: true,
          businessPhone: true,
          pickupMtaaniBusinessDetails: true,
          paymentAccountType: true,
          paymentAccountDetails: true,
          paystackSubaccountId: true,
          deliveryMethod: true,
          deliveryDetails: true
        }
      })

      if (!profile) {
        throw new NotFoundException('User profile not found')
      }

      // Get requirements submissions
      const submissions = await this.prisma.onboardingSubmission.findMany({
        where: { userId },
        include: { requirement: true }
      })

      // Build requirements object
      const requirements: Record<string, any> = {}
      submissions.forEach(sub => {
        requirements[sub.requirementId] = sub.fileUrl || sub.value
      })

      // Build response
      const response: StepDataResponseDto = {
        requirements,
        completedSteps: [],
        currentStep: 1
      }

      // Check which steps are completed
      const hasRequirements = Object.keys(requirements).length > 0
      if (hasRequirements) {
        response.completedSteps.push(1)
      }

      // Business info step (retailers only)
      if (profile.role === 'retailer') {
        const businessDetails = profile.pickupMtaaniBusinessDetails as any
        const hasBusinessInfo = profile.businessName && 
          profile.businessPhone && 
          businessDetails?.businessId
        if (hasBusinessInfo) {
          response.completedSteps.push(2)
          response.businessInfo = {
            businessName: profile.businessName,
            phoneNumber: profile.businessPhone,
            categoryId: businessDetails?.categoryId || 0,
            categoryName: businessDetails?.categoryName || '',
            pickupMtaaniBusinessId: businessDetails?.businessId,
            pickupMtaaniBusinessName: businessDetails?.businessName
          }
        }
      }

      // Payment details step
      const hasPaymentDetails = profile.paymentAccountType && 
        profile.paymentAccountDetails && 
        profile.paystackSubaccountId
      if (hasPaymentDetails) {
        const paymentStep = profile.role === 'retailer' ? 3 : 2
        response.completedSteps.push(paymentStep)
        response.paymentDetails = {
          paymentAccountType: profile.paymentAccountType,
          paymentAccountDetails: profile.paymentAccountDetails,
          paystackSubaccountId: profile.paystackSubaccountId
        }
      }

      // Delivery details step (retailers only)
      if (profile.role === 'retailer') {
        const hasDeliveryDetails = profile.deliveryMethod && profile.deliveryDetails
        if (hasDeliveryDetails) {
          response.completedSteps.push(4)
          response.deliveryDetails = {
            deliveryMethod: profile.deliveryMethod,
            deliveryDetails: profile.deliveryDetails
          }
        }
      }

      // Determine current step
      const totalSteps = profile.role === 'retailer' ? 5 : 3
      response.currentStep = Math.min(response.completedSteps.length + 1, totalSteps)

      console.log(`✅ [STEP] Step data fetched for user ${userId}:`, {
        completedSteps: response.completedSteps,
        currentStep: response.currentStep,
        role: profile.role
      })

      return response
    } catch (error) {
      console.error('❌ [STEP] Error fetching step data:', error)
      throw error
    }
  }
}
