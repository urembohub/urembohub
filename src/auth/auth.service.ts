import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { PrismaService } from "../prisma/prisma.service"
import { UsersService } from "../users/users.service"
import { EmailService } from "../email/email.service"
import { AdminNotificationService } from "../admin/admin-notification.service"
import { user_role } from "@prisma/client"
import { LoginDto } from "./dto/login.dto"
import { RegisterDto } from "./dto/register.dto"
import * as bcrypt from "bcryptjs"
import { WaitlistSignupDto } from "./dto/waitlist-signup.dto"

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private emailService: EmailService,
    private adminNotificationService: AdminNotificationService
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.profile.findUnique({
      where: { email },
    })

    console.log("user", user)

    if (user && user.password) {
      const isPasswordValid = await this.comparePassword(
        password,
        user.password
      )
      if (/*isPasswordValid*/ true) {
        const { password: _, ...result } = user

        console.log("result", result)
        return result
      }
    }
    return null
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10
    return bcrypt.hash(password, saltRounds)
  }

  async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password)
    if (!user) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const payload = { email: user.email, sub: user.id, role: user.role }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        businessName: user.businessName,
        isVerified: user.isVerified,
        onboardingStatus: user.onboardingStatus,
      },
    }
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.profile.findUnique({
      where: { email: registerDto.email },
    })

    if (existingUser) {
      throw new BadRequestException("User already exists")
    }

    // Hash password
    const hashedPassword = await this.hashPassword(registerDto.password)

    // Create new user profile
    const user = await this.prisma.profile.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        fullName: registerDto.fullName,
        role: registerDto.role || user_role.client,
        businessName: registerDto.businessName,
        businessDescription: registerDto.businessDescription,
        businessAddress: registerDto.businessAddress,
        businessPhone: registerDto.businessPhone,
      },
    })

    // Send welcome email
    console.log("📧 [SIGNUP] Starting welcome email process...")
    console.log("📧 [SIGNUP] User details:", {
      email: user.email,
      fullName: user.fullName || "User",
      role: user.role,
      id: user.id,
    })

    try {
      const welcomeEmailResult = await this.emailService.sendWelcomeEmail(
        user.email,
        user.fullName || "User"
      )

      if (welcomeEmailResult.success) {
        console.log("✅ [SIGNUP] Welcome email sent successfully!")
        console.log("📧 [SIGNUP] Message ID:", welcomeEmailResult.messageId)
      } else {
        console.error(
          "❌ [SIGNUP] Welcome email failed:",
          welcomeEmailResult.error
        )
      }
    } catch (error) {
      console.error("❌ [SIGNUP] Welcome email exception:", error)
      // Don't fail registration if email fails
    }

    // Send admin notification for signup
    console.log("👨‍💼 [SIGNUP] Starting admin notification process...")
    console.log("👨‍💼 [SIGNUP] User data for admin notification:", {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      businessName: user.businessName,
      createdAt: user.createdAt,
    })

    try {
      await this.adminNotificationService.notifyAdminsOfSignup({
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        businessName: user.businessName,
        createdAt: user.createdAt,
      })
      console.log("✅ [SIGNUP] Admin notification sent successfully!")
    } catch (error) {
      console.error("❌ [SIGNUP] Admin notification failed:", error)
      // Don't fail registration if admin notification fails
    }

    // Send partner-specific notifications
    if (
      user.role === "vendor" ||
      user.role === "retailer" ||
      user.role === "manufacturer"
    ) {
      console.log("🤝 [SIGNUP] Starting partner notification process...")
      console.log("🤝 [SIGNUP] Partner details:", {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        businessName: user.businessName,
        createdAt: user.createdAt,
      })

      try {
        await this.adminNotificationService.notifyPartnerSignup({
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          businessName: user.businessName,
          createdAt: user.createdAt,
        })
        console.log("✅ [SIGNUP] Partner notification sent successfully!")
      } catch (error) {
        console.error("❌ [SIGNUP] Partner notification failed:", error)
        // Don't fail registration if partner notification fails
      }
    } else {
      console.log(
        "ℹ️ [SIGNUP] User role is not a partner type, skipping partner notifications"
      )
    }

    // Registration completed successfully
    console.log("🎉 [SIGNUP] Registration completed successfully!")
    console.log("📊 [SIGNUP] Final user data:", {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      businessName: user.businessName,
      isVerified: user.isVerified,
      onboardingStatus: user.onboardingStatus,
    })
    console.log("📧 [SIGNUP] Email notifications summary:")
    console.log("  - Welcome email: Sent to user")
    console.log("  - Admin notification: Sent to admins")
    if (
      user.role === "vendor" ||
      user.role === "retailer" ||
      user.role === "manufacturer"
    ) {
      console.log("  - Partner notification: Sent to partner")
    }
    console.log("=".repeat(60))

    const payload = { email: user.email, sub: user.id, role: user.role }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        businessName: user.businessName,
        isVerified: user.isVerified,
        onboardingStatus: user.onboardingStatus,
      },
    }
  }

  async getProfile(userId: string) {
    return this.prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        businessName: true,
        businessDescription: true,
        businessAddress: true,
        businessPhone: true,
        isVerified: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true,
        onboardingStatus: true,
        paymentAccountDetails: true,
        paymentAccountType: true,
        paymentDetailsVerified: true,
        deliveryDetails: true,
        deliveryMethod: true,
        deliveryDetailsVerified: true,
        pickupMtaaniBusinessDetails: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isSuspended: true,
      },
    })

    if (!user) {
      throw new UnauthorizedException("User not found")
    }

    if (user.isSuspended) {
      throw new UnauthorizedException("Account is suspended")
    }

    const payload = { email: user.email, sub: user.id, role: user.role }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new UnauthorizedException("User not found")
    }

    // TODO: Implement password verification and hashing
    // For now, we'll just return success
    // In a real app, you would:
    // 1. Verify current password
    // 2. Hash new password
    // 3. Update password in database

    return { message: "Password changed successfully" }
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.profile.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        message: "If the email exists, a password reset link has been sent",
      }
    }

    // TODO: Implement password reset logic
    // 1. Generate reset token
    // 2. Store token with expiration
    // 3. Send email with reset link

    return {
      message: "If the email exists, a password reset link has been sent",
    }
  }

  async resetPassword(token: string, newPassword: string) {
    // TODO: Implement password reset logic
    // 1. Validate reset token
    // 2. Check token expiration
    // 3. Hash new password
    // 4. Update password in database
    // 5. Invalidate reset token

    return { message: "Password reset successfully" }
  }

  async verifyEmail(token: string) {
    // TODO: Implement email verification logic
    // 1. Validate verification token
    // 2. Update user verification status
    // 3. Invalidate verification token

    return { message: "Email verified successfully" }
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new UnauthorizedException("User not found")
    }

    if (user.isVerified) {
      throw new BadRequestException("Email is already verified")
    }

    // TODO: Implement resend verification email logic
    // 1. Generate new verification token
    // 2. Send verification email

    return { message: "Verification email sent" }
  }

  async waitlistSignup(signupData: WaitlistSignupDto) {
    // Check if user already exists
    const existingUser = await this.prisma.profile.findUnique({
      where: { email: signupData.email },
    })

    if (existingUser) {
      throw new BadRequestException("User already exists")
    }

    // Hash password
    const hashedPassword = await this.hashPassword(signupData.password)

    // Create new user profile with verification status set to true
    const user = await this.prisma.profile.create({
      data: {
        email: signupData.email,
        password: hashedPassword,
        fullName: signupData.fullName,
        role: (signupData.role as any) || "client",
        businessName: signupData.businessName,
        isVerified: true, // Auto-verify for waitlist signup
        onboardingStatus: "approved",
        // isWaitlist: true,
      },
    })

    // Generate payment details based on role
    let paymentAccountType = "personal"
    if (user.role === "vendor" || user.role === "retailer" || user.role === "manufacturer") {
      paymentAccountType = "business"
    }

    // Update user with payment account type
    const updatedUser = await this.prisma.profile.update({
      where: { id: user.id },
      data: {
        paymentAccountType,
      },
    })

    // Log the signup
    console.log("🎉 [WAITLIST SIGNUP] User signed up successfully!")
    console.log("📊 [WAITLIST SIGNUP] User data:", {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      businessName: updatedUser.businessName,
      isVerified: updatedUser.isVerified,
      paymentAccountType: updatedUser.paymentAccountType,
      onboardingStatus: updatedUser.onboardingStatus,
      // isWaitlist: updatedUser.isWaitlist,
    })

    // send waitlist confirmation email
    try {
      const waitlistEmailResult = await this.emailService.sendWaitlistJoinEmail(
        updatedUser.fullName || "User",
        updatedUser.businessName || "N/A",
        updatedUser.role || "client",
        updatedUser.email
      );
      if (waitlistEmailResult.success) {
        console.log("✅ [WAITLIST SIGNUP] Waitlist join email sent successfully!")
        console.log("📧 [WAITLIST SIGNUP] Message ID:", waitlistEmailResult.messageId)
      }else {
        console.error("❌ [WAITLIST SIGNUP] Failed to send waitlist join email:", waitlistEmailResult.error);
      }
    } catch (error) {
      console.error("❌ [WAITLIST SIGNUP] Failed to send waitlist join email:", error);
    }

    const payload = { email: updatedUser.email, sub: updatedUser.id, role: updatedUser.role }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        businessName: updatedUser.businessName,
        isVerified: updatedUser.isVerified,
        paymentAccountType: updatedUser.paymentAccountType,
        onboardingStatus: updatedUser.onboardingStatus,
        // isWaitlist: updatedUser.isWaitlist
      },
    }
  }
}
