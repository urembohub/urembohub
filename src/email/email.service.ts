import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { generateBaseEmailHTML } from './templates/base-template';
import { 
  getWelcomeTemplate, 
  getVerificationTemplate, 
  getPasswordResetTemplate, 
  getPasswordChangedTemplate, 
  getSuspiciousLoginTemplate 
} from './templates/auth-templates';
import { 
  getAccountCreatedTemplate, 
  getProfileApprovedTemplate, 
  getProfileRejectedTemplate, 
  getPaymentMissingTemplate, 
  getKycUpdateTemplate 
} from './templates/onboarding-templates';
import { 
  getNewOrderTemplate, 
  getOrderAcceptedTemplate, 
  getOrderShippedTemplate, 
  getOrderDeliveredTemplate 
} from './templates/order-templates';
import { 
  getBookingConfirmedClientTemplate, 
  getBookingConfirmedVendorTemplate, 
  getBookingReminderTemplate 
} from './templates/booking-templates';
import { 
  getPaymentSuccessfulTemplate, 
  getPaymentFailedTemplate 
} from './templates/payment-templates';
import {
  getVendorEscrowCreatedTemplate,
  getCustomerEscrowCreatedTemplate,
  getAdminEscrowCreatedTemplate,
  getCustomerServiceStartedTemplate,
  getCustomerServiceCompletedTemplate,
  getAdminDisputeNotificationTemplate,
  getVendorDisputeNotificationTemplate,
  getVendorFundsReleasedTemplate,
  getCustomerFundsReleasedTemplate,
  getCustomerRefundTemplate,
  getVendorRefundNotificationTemplate,
} from './templates/escrow-templates';

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not found in environment variables');
    }
    this.resend = new Resend(apiKey);
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from || 'Urembo Hub <noreply@urembohub.com>',
        to: [options.to],
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo || 'support@urembohub.com',
      });

      if (error) {
        this.logger.error('Failed to send email:', error);
        return { success: false, error: error.message };
      }

      this.logger.log(`Email sent successfully to ${options.to}, message ID: ${data?.id}`);
      return { success: true, messageId: data?.id };
    } catch (error) {
      this.logger.error('Email service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Authentication Emails
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getWelcomeTemplate(userName);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendVerificationEmail(userEmail: string, userName: string, verificationUrl: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getVerificationTemplate(userName, verificationUrl);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendPasswordResetEmail(userEmail: string, userName: string, resetUrl: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getPasswordResetTemplate(userName, resetUrl);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendPasswordChangedEmail(userEmail: string, userName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getPasswordChangedTemplate(userName);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendSuspiciousLoginEmail(userEmail: string, userName: string, loginIp: string, location?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getSuspiciousLoginTemplate(userName, loginIp, location);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  // Onboarding Emails
  async sendAccountCreatedEmail(userEmail: string, userName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getAccountCreatedTemplate(userName);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendProfileApprovedEmail(userEmail: string, userName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getProfileApprovedTemplate(userName);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendProfileRejectedEmail(userEmail: string, userName: string, reason: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getProfileRejectedTemplate(userName, reason);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendPaymentMissingEmail(userEmail: string, userName: string, setupUrl?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getPaymentMissingTemplate(userName, setupUrl);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendKycUpdateEmail(userEmail: string, userName: string, status: string, reason?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getKycUpdateTemplate(userName, status, reason);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendOnboardingRevisionRequestEmail(userEmail: string, userName: string, adminNotes: string, resubmissionUrl?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getOnboardingRevisionRequestTemplate(userName, adminNotes, resubmissionUrl);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  // Order Emails
  async sendNewOrderEmail(vendorEmail: string, vendorName: string, orderId: string, orderData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getNewOrderTemplate(vendorName, orderId, orderData);
    return this.sendEmail({
      to: vendorEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendOrderAcceptedEmail(customerEmail: string, customerName: string, orderId: string, orderData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getOrderAcceptedTemplate(customerName, orderId, orderData);
    return this.sendEmail({
      to: customerEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendOrderShippedEmail(customerEmail: string, customerName: string, orderId: string, trackingNumber?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getOrderShippedTemplate(customerName, orderId, trackingNumber);
    return this.sendEmail({
      to: customerEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendOrderDeliveredEmail(customerEmail: string, customerName: string, orderId: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getOrderDeliveredTemplate(customerName, orderId);
    return this.sendEmail({
      to: customerEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  // Booking Emails
  async sendBookingConfirmedClientEmail(clientEmail: string, clientName: string, bookingData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getBookingConfirmedClientTemplate(clientName, bookingData);
    return this.sendEmail({
      to: clientEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendBookingConfirmedVendorEmail(vendorEmail: string, vendorName: string, bookingData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getBookingConfirmedVendorTemplate(vendorName, bookingData);
    return this.sendEmail({
      to: vendorEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendBookingReminderEmail(clientEmail: string, clientName: string, bookingData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getBookingReminderTemplate(clientName, bookingData);
    return this.sendEmail({
      to: clientEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  // Payment Emails
  async sendPaymentSuccessfulEmail(userEmail: string, userName: string, paymentData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getPaymentSuccessfulTemplate(userName, paymentData);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendPaymentFailedEmail(userEmail: string, userName: string, paymentData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = getPaymentFailedTemplate(userName, paymentData);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  // Admin Emails
  async sendDisputePendingEmail(adminEmail: string, disputeId: string, disputeData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getDisputePendingTemplate(disputeId, disputeData);
    return this.sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendHighValueOrderEmail(adminEmail: string, orderId: string, orderData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getHighValueOrderTemplate(orderId, orderData);
    return this.sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendAdminSignupNotificationEmail(adminEmail: string, userData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getAdminSignupNotificationTemplate(userData);
    return this.sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendAdminTicketNotificationEmail(adminEmail: string, ticketData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getAdminTicketNotificationTemplate(ticketData);
    return this.sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendAdminSaleNotificationEmail(adminEmail: string, saleData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getAdminSaleNotificationTemplate(saleData);
    return this.sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendAdminCartNotificationEmail(adminEmail: string, cartData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getAdminCartNotificationTemplate(cartData);
    return this.sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendAdminOnboardingSubmissionEmail(adminEmail: string, submissionData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getAdminOnboardingSubmissionTemplate(submissionData);
    return this.sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendPasswordResetOTPEmail(userEmail: string, userName: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getPasswordResetOTPTemplate(userName, otp);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendPartnerSignupNotificationEmail(partnerEmail: string, partnerName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getPartnerSignupNotificationTemplate(partnerName);
    return this.sendEmail({
      to: partnerEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendPartnerApprovalEmail(partnerEmail: string, partnerName: string, approved: boolean, reason?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getPartnerApprovalTemplate(partnerName, approved, reason);
    return this.sendEmail({
      to: partnerEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  // Retailer Emails
  async sendRetailerNewOrderEmail(retailerEmail: string, retailerName: string, orderId: string, orderData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getRetailerNewOrderTemplate(retailerName, orderId, orderData);
    return this.sendEmail({
      to: retailerEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendRetailerPaymentEmail(retailerEmail: string, retailerName: string, paymentData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getRetailerPaymentTemplate(retailerName, paymentData);
    return this.sendEmail({
      to: retailerEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  // Manufacturer Emails
  async sendManufacturerNewOrderEmail(manufacturerEmail: string, manufacturerName: string, orderId: string, orderData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getManufacturerNewOrderTemplate(manufacturerName, orderId, orderData);
    return this.sendEmail({
      to: manufacturerEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendManufacturerPaymentEmail(manufacturerEmail: string, manufacturerName: string, paymentData: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getManufacturerPaymentTemplate(manufacturerName, paymentData);
    return this.sendEmail({
      to: manufacturerEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  // Email Templates
  private getWelcomeTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Welcome to Urembo Hub!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Welcome to Urembo Hub!</h1>
          <p>Hi ${userName},</p>
          <p>Thank you for joining our beauty marketplace. We're excited to have you on board!</p>
          <p>Get started by exploring our services and products.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://urembohub.com" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
          </div>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getVerificationTemplate(userName: string, verificationUrl: string): EmailTemplate {
    return {
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Verify Your Email</h1>
          <p>Hi ${userName},</p>
          <p>Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getPasswordResetTemplate(userName: string, resetUrl: string): EmailTemplate {
    return {
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Reset Your Password</h1>
          <p>Hi ${userName},</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getPasswordChangedTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Password Changed Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #28a745; text-align: center;">Password Changed</h1>
          <p>Hi ${userName},</p>
          <p>Your password has been successfully changed.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getSuspiciousLoginTemplate(userName: string, loginIp: string, location?: string): EmailTemplate {
    return {
      subject: 'Security Alert: Unusual Login Activity',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc3545; text-align: center;">Security Alert</h1>
          <p>Hi ${userName},</p>
          <p>We detected unusual login activity on your account:</p>
          <ul>
            <li><strong>IP Address:</strong> ${loginIp}</li>
            <li><strong>Location:</strong> ${location || 'Unknown'}</li>
          </ul>
          <p>If this wasn't you, please secure your account immediately.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getAccountCreatedTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Account Created Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Account Created</h1>
          <p>Hi ${userName},</p>
          <p>Your business account has been created successfully!</p>
          <p>Complete your profile to start accepting bookings and orders.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getProfileApprovedTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Congratulations! Your Profile is Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #28a745; text-align: center;">Profile Approved!</h1>
          <p>Hi ${userName},</p>
          <p>Great news! Your business profile has been approved.</p>
          <p>You can now start accepting bookings and orders from customers.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getProfileRejectedTemplate(userName: string, reason: string): EmailTemplate {
    return {
      subject: 'Profile Review Update Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc3545; text-align: center;">Profile Update Required</h1>
          <p>Hi ${userName},</p>
          <p>Your profile needs some updates before approval:</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please update your profile and resubmit for review.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getPaymentMissingTemplate(userName: string, setupUrl?: string): EmailTemplate {
    return {
      subject: 'Payment Setup Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ffc107; text-align: center;">Payment Setup Required</h1>
          <p>Hi ${userName},</p>
          <p>To start receiving payments, please set up your payment details.</p>
          ${setupUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${setupUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Setup Payment</a>
            </div>
          ` : ''}
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getKycUpdateTemplate(userName: string, status: string, reason?: string): EmailTemplate {
    return {
      subject: 'KYC Documents Status Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">KYC Status Update</h1>
          <p>Hi ${userName},</p>
          <p>Your KYC documents have been reviewed:</p>
          <p><strong>Status:</strong> ${status}</p>
          ${reason ? `<p><strong>Note:</strong> ${reason}</p>` : ''}
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getNewOrderTemplate(vendorName: string, orderId: string, orderData: any): EmailTemplate {
    return {
      subject: 'New Order Received',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">New Order Received</h1>
          <p>Hi ${vendorName},</p>
          <p>You have received a new order:</p>
          <ul>
            <li><strong>Order ID:</strong> ${orderId}</li>
            <li><strong>Order Number:</strong> ${orderData.order_number || 'N/A'}</li>
            <li><strong>Total:</strong> ${orderData.total_amount || 'N/A'}</li>
            <li><strong>Date:</strong> ${orderData.created_at || new Date().toLocaleDateString()}</li>
          </ul>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getOrderAcceptedTemplate(customerName: string, orderId: string, orderData: any): EmailTemplate {
    return {
      subject: 'Order Confirmed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #28a745; text-align: center;">Order Confirmed</h1>
          <p>Hi ${customerName},</p>
          <p>Your order has been accepted and confirmed:</p>
          <ul>
            <li><strong>Order ID:</strong> ${orderId}</li>
            <li><strong>Order Number:</strong> ${orderData.order_number || 'N/A'}</li>
            <li><strong>Total:</strong> ${orderData.total_amount || 'N/A'}</li>
          </ul>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getOrderShippedTemplate(customerName: string, orderId: string, trackingNumber?: string): EmailTemplate {
    return {
      subject: 'Order Shipped',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #007bff; text-align: center;">Order Shipped</h1>
          <p>Hi ${customerName},</p>
          <p>Your order has been shipped:</p>
          <ul>
            <li><strong>Order ID:</strong> ${orderId}</li>
            <li><strong>Tracking Number:</strong> ${trackingNumber || 'N/A'}</li>
          </ul>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getOrderDeliveredTemplate(customerName: string, orderId: string): EmailTemplate {
    return {
      subject: 'Order Delivered',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #28a745; text-align: center;">Order Delivered</h1>
          <p>Hi ${customerName},</p>
          <p>Your order has been delivered:</p>
          <ul>
            <li><strong>Order ID:</strong> ${orderId}</li>
          </ul>
          <p>Thank you for your business!</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getBookingConfirmedClientTemplate(clientName: string, bookingData: any): EmailTemplate {
    return {
      subject: 'Booking Confirmed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #28a745; text-align: center;">Booking Confirmed</h1>
          <p>Hi ${clientName},</p>
          <p>Your booking has been confirmed:</p>
          <ul>
            <li><strong>Service:</strong> ${bookingData.service_name || 'N/A'}</li>
            <li><strong>Vendor:</strong> ${bookingData.vendor_name || 'N/A'}</li>
            <li><strong>Date:</strong> ${bookingData.appointment_date || 'N/A'}</li>
            <li><strong>Time:</strong> ${bookingData.appointment_time || 'N/A'}</li>
            <li><strong>Amount:</strong> ${bookingData.booking_amount || 'N/A'}</li>
          </ul>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getBookingConfirmedVendorTemplate(vendorName: string, bookingData: any): EmailTemplate {
    return {
      subject: 'New Booking Received',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">New Booking Received</h1>
          <p>Hi ${vendorName},</p>
          <p>You have received a new booking:</p>
          <ul>
            <li><strong>Service:</strong> ${bookingData.service_name || 'N/A'}</li>
            <li><strong>Client:</strong> ${bookingData.client_name || 'N/A'}</li>
            <li><strong>Date:</strong> ${bookingData.appointment_date || 'N/A'}</li>
            <li><strong>Time:</strong> ${bookingData.appointment_time || 'N/A'}</li>
            <li><strong>Amount:</strong> ${bookingData.booking_amount || 'N/A'}</li>
          </ul>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getBookingReminderTemplate(clientName: string, bookingData: any): EmailTemplate {
    return {
      subject: 'Appointment Reminder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ffc107; text-align: center;">Appointment Reminder</h1>
          <p>Hi ${clientName},</p>
          <p>This is a reminder for your upcoming appointment:</p>
          <ul>
            <li><strong>Service:</strong> ${bookingData.service_name || 'N/A'}</li>
            <li><strong>Vendor:</strong> ${bookingData.vendor_name || 'N/A'}</li>
            <li><strong>Date:</strong> ${bookingData.appointment_date || 'N/A'}</li>
            <li><strong>Time:</strong> ${bookingData.appointment_time || 'N/A'}</li>
          </ul>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getPaymentSuccessfulTemplate(userName: string, paymentData: any): EmailTemplate {
    return {
      subject: 'Payment Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #28a745; text-align: center;">Payment Successful</h1>
          <p>Hi ${userName},</p>
          <p>Your payment has been processed successfully:</p>
          <ul>
            <li><strong>Amount:</strong> ${paymentData.amount || 'N/A'}</li>
            <li><strong>Currency:</strong> ${paymentData.currency || 'N/A'}</li>
            <li><strong>Method:</strong> ${paymentData.payment_method || 'N/A'}</li>
            <li><strong>Transaction ID:</strong> ${paymentData.transaction_id || 'N/A'}</li>
          </ul>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getPaymentFailedTemplate(userName: string, paymentData: any): EmailTemplate {
    return {
      subject: 'Payment Failed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc3545; text-align: center;">Payment Failed</h1>
          <p>Hi ${userName},</p>
          <p>Your payment could not be processed:</p>
          <ul>
            <li><strong>Amount:</strong> ${paymentData.amount || 'N/A'}</li>
            <li><strong>Currency:</strong> ${paymentData.currency || 'N/A'}</li>
            <li><strong>Method:</strong> ${paymentData.payment_method || 'N/A'}</li>
            <li><strong>Transaction ID:</strong> ${paymentData.transaction_id || 'N/A'}</li>
          </ul>
          <p>Please try again or use a different payment method.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getDisputePendingTemplate(disputeId: string, disputeData: any): EmailTemplate {
    return {
      subject: 'New Dispute Requires Review',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc3545; text-align: center;">New Dispute Alert</h1>
          <p>A new dispute requires your attention:</p>
          <ul>
            <li><strong>Dispute ID:</strong> ${disputeId}</li>
            <li><strong>Type:</strong> ${disputeData.dispute_type || 'N/A'}</li>
            <li><strong>Description:</strong> ${disputeData.reason || 'N/A'}</li>
            <li><strong>Order ID:</strong> ${disputeData.order_id || 'N/A'}</li>
            <li><strong>Amount:</strong> ${disputeData.amount || 'N/A'}</li>
          </ul>
          <p>Please review and take appropriate action.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getHighValueOrderTemplate(orderId: string, orderData: any): EmailTemplate {
    return {
      subject: 'High-Value Order Alert',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ffc107; text-align: center;">High-Value Order Alert</h1>
          <p>A high-value order has been placed:</p>
          <ul>
            <li><strong>Order ID:</strong> ${orderId}</li>
            <li><strong>Order Number:</strong> ${orderData.order_number || 'N/A'}</li>
            <li><strong>Amount:</strong> ${orderData.payment_amount || 'N/A'}</li>
            <li><strong>Customer:</strong> ${orderData.user_name || 'N/A'}</li>
            <li><strong>Vendor:</strong> ${orderData.vendor_name || 'N/A'}</li>
            <li><strong>Date:</strong> ${orderData.order_date || 'N/A'}</li>
          </ul>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getAdminSignupNotificationTemplate(userData: any): EmailTemplate {
    return {
      subject: `New ${userData.role} Signup - ${userData.fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #007bff; text-align: center;">New User Signup</h1>
          <p>A new user has signed up:</p>
          <ul>
            <li><strong>Name:</strong> ${userData.fullName || 'N/A'}</li>
            <li><strong>Email:</strong> ${userData.email || 'N/A'}</li>
            <li><strong>Role:</strong> ${userData.role || 'N/A'}</li>
            <li><strong>Business Name:</strong> ${userData.businessName || 'N/A'}</li>
            <li><strong>Signup Date:</strong> ${userData.createdAt || new Date().toLocaleDateString()}</li>
          </ul>
          <p>Please review their profile and approve if necessary.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getAdminTicketNotificationTemplate(ticketData: any): EmailTemplate {
    return {
      subject: `New Support Ticket - ${ticketData.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc3545; text-align: center;">New Support Ticket</h1>
          <p>A new support ticket has been raised:</p>
          <ul>
            <li><strong>Ticket ID:</strong> ${ticketData.id || 'N/A'}</li>
            <li><strong>Subject:</strong> ${ticketData.subject || 'N/A'}</li>
            <li><strong>Priority:</strong> ${ticketData.priority || 'N/A'}</li>
            <li><strong>Category:</strong> ${ticketData.category || 'N/A'}</li>
            <li><strong>User:</strong> ${ticketData.userName || 'N/A'} (${ticketData.userEmail || 'N/A'})</li>
            <li><strong>Description:</strong> ${ticketData.description || 'N/A'}</li>
            <li><strong>Created:</strong> ${ticketData.createdAt || new Date().toLocaleDateString()}</li>
          </ul>
          <p>Please review and respond to this ticket.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getAdminSaleNotificationTemplate(saleData: any): EmailTemplate {
    return {
      subject: `New Sale - ${saleData.amount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #28a745; text-align: center;">New Sale Completed</h1>
          <p>A new sale has been completed:</p>
          <ul>
            <li><strong>Transaction ID:</strong> ${saleData.transactionId || 'N/A'}</li>
            <li><strong>Amount:</strong> ${saleData.amount || 'N/A'}</li>
            <li><strong>Currency:</strong> ${saleData.currency || 'N/A'}</li>
            <li><strong>Customer:</strong> ${saleData.customerName || 'N/A'}</li>
            <li><strong>Vendor:</strong> ${saleData.vendorName || 'N/A'}</li>
            <li><strong>Commission:</strong> ${saleData.commission || 'N/A'}</li>
            <li><strong>Date:</strong> ${saleData.createdAt || new Date().toLocaleDateString()}</li>
          </ul>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getAdminCartNotificationTemplate(cartData: any): EmailTemplate {
    return {
      subject: `Order Added to Cart - ${cartData.totalAmount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ffc107; text-align: center;">Order Added to Cart</h1>
          <p>An order has been added to cart:</p>
          <ul>
            <li><strong>Customer:</strong> ${cartData.customerName || 'N/A'}</li>
            <li><strong>Email:</strong> ${cartData.customerEmail || 'N/A'}</li>
            <li><strong>Total Amount:</strong> ${cartData.totalAmount || 'N/A'}</li>
            <li><strong>Items Count:</strong> ${cartData.itemsCount || 'N/A'}</li>
            <li><strong>Vendor:</strong> ${cartData.vendorName || 'N/A'}</li>
            <li><strong>Date:</strong> ${cartData.createdAt || new Date().toLocaleDateString()}</li>
          </ul>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getPasswordResetOTPTemplate(userName: string, otp: string): EmailTemplate {
    return {
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc3545; text-align: center;">Password Reset OTP</h1>
          <p>Hi ${userName},</p>
          <p>You requested to reset your password. Use the following OTP to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #f8f9fa; border: 2px solid #dc3545; padding: 20px; border-radius: 10px; display: inline-block;">
              <h2 style="color: #dc3545; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
            </div>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getPartnerSignupNotificationTemplate(partnerName: string): EmailTemplate {
    return {
      subject: 'Partnership Request Under Review',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ffc107; text-align: center;">Partnership Request Received</h1>
          <p>Hi ${partnerName},</p>
          <p>Thank you for your interest in partnering with Urembo Hub!</p>
          <p>Your partnership request has been received and is currently under review by our team.</p>
          <p>We will notify you once the review is complete, typically within 2-3 business days.</p>
          <p>In the meantime, you can complete your profile setup to expedite the process.</p>
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getPartnerApprovalTemplate(partnerName: string, approved: boolean, reason?: string): EmailTemplate {
    const isApproved = approved;
    const color = isApproved ? '#28a745' : '#dc3545';
    const title = isApproved ? 'Partnership Approved!' : 'Partnership Request Update';
    
    return {
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: ${color}; text-align: center;">${title}</h1>
          <p>Hi ${partnerName},</p>
          ${isApproved ? `
            <p>Congratulations! Your partnership request has been approved.</p>
            <p>You can now start using all the features available to partners on our platform.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://urembohub.com/partner-dashboard" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Access Partner Dashboard</a>
            </div>
          ` : `
            <p>Thank you for your interest in partnering with Urembo Hub.</p>
            <p>Unfortunately, we cannot approve your partnership request at this time.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>You may reapply in the future once you have addressed the concerns mentioned above.</p>
          `}
          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getAdminOnboardingSubmissionTemplate(submissionData: any): EmailTemplate {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const verificationUrl = `${frontendUrl}/admin?tab=verification`;
    
    return {
      subject: `New Onboarding Submission - ${submissionData.businessName || submissionData.fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #007bff; text-align: center;">New Onboarding Submission</h1>
          <p>A new business account has submitted their onboarding requirements for review:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 16px 0; color: #333;">Business Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Business Name:</td>
                <td style="padding: 8px 0; color: #666;">${submissionData.businessName || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Contact Person:</td>
                <td style="padding: 8px 0; color: #666;">${submissionData.fullName || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Email:</td>
                <td style="padding: 8px 0; color: #666;">${submissionData.email || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Role:</td>
                <td style="padding: 8px 0; color: #666;">${submissionData.role || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Submission Date:</td>
                <td style="padding: 8px 0; color: #666;">${submissionData.submittedAt || new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; color: #1976d2;">Action Required</h3>
            <p style="margin: 0;">Please review the submitted documents and business information to approve or request additional details.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Review Submission
            </a>
          </div>

          <p style="color: #666; font-size: 14px; text-align: center;">
            This submission requires your attention within 48 hours for optimal user experience.
          </p>

          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getOnboardingRevisionRequestTemplate(userName: string, adminNotes: string, resubmissionUrl?: string): EmailTemplate {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const defaultResubmissionUrl = resubmissionUrl || `${frontendUrl}/onboarding`;
    
    return {
      subject: 'Onboarding Review - Additional Information Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ffc107; text-align: center;">Additional Information Required</h1>
          <p>Hi <strong>${userName}</strong>,</p>
          
          <p>Thank you for submitting your business onboarding information. Our team has reviewed your submission and requires some additional details to complete the verification process.</p>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; color: #856404;">Reviewer Notes</h3>
            <p style="margin: 0; color: #856404; line-height: 1.6;">${adminNotes}</p>
          </div>

          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; color: #2e7d32;">Next Steps</h3>
            <ol style="margin: 0; padding-left: 20px; color: #2e7d32;">
              <li style="margin-bottom: 8px;">Review the feedback above</li>
              <li style="margin-bottom: 8px;">Update your submission with the requested information</li>
              <li style="margin-bottom: 8px;">Resubmit for review</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${defaultResubmissionUrl}" style="background: #ffc107; color: #333; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Update Submission
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            <strong>Note:</strong> Please ensure all requested information is provided accurately. Incomplete submissions may result in further delays.
          </p>

          <p>If you have any questions about the requirements, please don't hesitate to contact our support team.</p>

          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getRetailerNewOrderTemplate(retailerName: string, orderId: string, orderData: any): EmailTemplate {
    return {
      subject: 'New Order Received - Retailer',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #28a745; text-align: center;">New Order Received</h1>
          <p>Hi <strong>${retailerName}</strong>,</p>
          
          <p>You have received a new order for your retail products. Please review the details below:</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 16px 0; color: #333;">Order Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Order ID:</td>
                <td style="padding: 8px 0; color: #666;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Order Number:</td>
                <td style="padding: 8px 0; color: #666;">${orderData.order_number || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Customer:</td>
                <td style="padding: 8px 0; color: #666;">${orderData.customer_name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Total Amount:</td>
                <td style="padding: 8px 0; color: #666; font-weight: 600;">$${orderData.total_amount || '0.00'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Order Date:</td>
                <td style="padding: 8px 0; color: #666;">${orderData.order_date || new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; color: #2e7d32;">Next Steps</h3>
            <ol style="margin: 0; padding-left: 20px; color: #2e7d32;">
              <li style="margin-bottom: 8px;">Review the order details</li>
              <li style="margin-bottom: 8px;">Prepare the products for shipment</li>
              <li style="margin-bottom: 8px;">Update order status when ready</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://urembohub.com/retailer/orders" style="background: #28a745; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              View Order Details
            </a>
          </div>

          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getRetailerPaymentTemplate(retailerName: string, paymentData: any): EmailTemplate {
    const isSuccessful = paymentData.status === 'successful' || paymentData.status === 'completed';
    const color = isSuccessful ? '#28a745' : '#dc3545';
    const title = isSuccessful ? 'Payment Received' : 'Payment Issue';
    
    return {
      subject: `${title} - Retailer`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: ${color}; text-align: center;">${title}</h1>
          <p>Hi <strong>${retailerName}</strong>,</p>
          
          ${isSuccessful ? `
            <p>Great news! You have received a payment for your retail order.</p>
          ` : `
            <p>There was an issue with a payment for your retail order. Please review the details below.</p>
          `}

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 16px 0; color: #333;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Payment ID:</td>
                <td style="padding: 8px 0; color: #666;">${paymentData.payment_id || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Order ID:</td>
                <td style="padding: 8px 0; color: #666;">${paymentData.order_id || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Amount:</td>
                <td style="padding: 8px 0; color: #666; font-weight: 600;">$${paymentData.amount || '0.00'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Status:</td>
                <td style="padding: 8px 0; color: ${color}; font-weight: 600;">${paymentData.status || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Date:</td>
                <td style="padding: 8px 0; color: #666;">${paymentData.date || new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          ${!isSuccessful ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 12px 0; color: #856404;">Issue Details</h3>
              <p style="margin: 0; color: #856404;">${paymentData.error_message || 'Please contact support for assistance.'}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://urembohub.com/retailer/payments" style="background: ${color}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              View Payment Details
            </a>
          </div>

          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getManufacturerNewOrderTemplate(manufacturerName: string, orderId: string, orderData: any): EmailTemplate {
    return {
      subject: 'New Order Received - Manufacturer',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #007bff; text-align: center;">New Order Received</h1>
          <p>Hi <strong>${manufacturerName}</strong>,</p>
          
          <p>You have received a new order for your manufactured products. Please review the details below:</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 16px 0; color: #333;">Order Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Order ID:</td>
                <td style="padding: 8px 0; color: #666;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Order Number:</td>
                <td style="padding: 8px 0; color: #666;">${orderData.order_number || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Customer:</td>
                <td style="padding: 8px 0; color: #666;">${orderData.customer_name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Total Amount:</td>
                <td style="padding: 8px 0; color: #666; font-weight: 600;">$${orderData.total_amount || '0.00'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Order Date:</td>
                <td style="padding: 8px 0; color: #666;">${orderData.order_date || new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; color: #1976d2;">Next Steps</h3>
            <ol style="margin: 0; padding-left: 20px; color: #1976d2;">
              <li style="margin-bottom: 8px;">Review the order details</li>
              <li style="margin-bottom: 8px;">Check product availability</li>
              <li style="margin-bottom: 8px;">Begin manufacturing process if needed</li>
              <li style="margin-bottom: 8px;">Update order status when ready</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://urembohub.com/manufacturer/orders" style="background: #007bff; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              View Order Details
            </a>
          </div>

          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  private getManufacturerPaymentTemplate(manufacturerName: string, paymentData: any): EmailTemplate {
    const isSuccessful = paymentData.status === 'successful' || paymentData.status === 'completed';
    const color = isSuccessful ? '#28a745' : '#dc3545';
    const title = isSuccessful ? 'Payment Received' : 'Payment Issue';
    
    return {
      subject: `${title} - Manufacturer`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: ${color}; text-align: center;">${title}</h1>
          <p>Hi <strong>${manufacturerName}</strong>,</p>
          
          ${isSuccessful ? `
            <p>Great news! You have received a payment for your manufactured products order.</p>
          ` : `
            <p>There was an issue with a payment for your manufactured products order. Please review the details below.</p>
          `}

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 16px 0; color: #333;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Payment ID:</td>
                <td style="padding: 8px 0; color: #666;">${paymentData.payment_id || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Order ID:</td>
                <td style="padding: 8px 0; color: #666;">${paymentData.order_id || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Amount:</td>
                <td style="padding: 8px 0; color: #666; font-weight: 600;">$${paymentData.amount || '0.00'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Status:</td>
                <td style="padding: 8px 0; color: ${color}; font-weight: 600;">${paymentData.status || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">Date:</td>
                <td style="padding: 8px 0; color: #666;">${paymentData.date || new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          ${!isSuccessful ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 12px 0; color: #856404;">Issue Details</h3>
              <p style="margin: 0; color: #856404;">${paymentData.error_message || 'Please contact support for assistance.'}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://urembohub.com/manufacturer/payments" style="background: ${color}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              View Payment Details
            </a>
          </div>

          <p>Best regards,<br>The Urembo Hub Team</p>
        </div>
      `
    };
  }

  // ==================== ESCROW EMAIL METHODS ====================

  /**
   * Send vendor escrow created email
   */
  async sendVendorEscrowCreatedEmail(data: {
    vendorEmail: string;
    vendorName: string;
    serviceName: string;
    amount: number;
    currency: string;
    autoReleaseDate: Date;
  }) {
    try {
      const template = getVendorEscrowCreatedTemplate(data);
      await this.sendEmail({
        to: data.vendorEmail,
        subject: `Payment Received - ${data.serviceName} Ready to Begin`,
        html: template,
      });
      console.log(`✅ [EMAIL] Vendor escrow created email sent to: ${data.vendorEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send vendor escrow created email:`, error);
    }
  }

  /**
   * Send customer escrow created email
   */
  async sendCustomerEscrowCreatedEmail(data: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    amount: number;
    currency: string;
    autoReleaseDate: Date;
  }) {
    try {
      const template = getCustomerEscrowCreatedTemplate(data);
      await this.sendEmail({
        to: data.customerEmail,
        subject: `Payment Confirmed - ${data.serviceName} Booked`,
        html: template,
      });
      console.log(`✅ [EMAIL] Customer escrow created email sent to: ${data.customerEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send customer escrow created email:`, error);
    }
  }

  /**
   * Send admin escrow created email
   */
  async sendAdminEscrowCreatedEmail(data: {
    serviceName: string;
    vendorName: string;
    customerName: string;
    amount: number;
    currency: string;
    autoReleaseDate: Date;
  }) {
    try {
      const template = getAdminEscrowCreatedTemplate(data);
      const adminEmail = this.configService.get('ADMIN_EMAIL') || 'admin@urembohub.com';
      await this.sendEmail({
        to: adminEmail,
        subject: `New Service Escrow Created - ${data.serviceName}`,
        html: template,
      });
      console.log(`✅ [EMAIL] Admin escrow created email sent to: ${adminEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send admin escrow created email:`, error);
    }
  }

  /**
   * Send customer service started email
   */
  async sendCustomerServiceStartedEmail(data: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    vendorName: string;
  }) {
    try {
      const template = getCustomerServiceStartedTemplate(data);
      await this.sendEmail({
        to: data.customerEmail,
        subject: `Service Started - ${data.serviceName}`,
        html: template,
      });
      console.log(`✅ [EMAIL] Customer service started email sent to: ${data.customerEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send customer service started email:`, error);
    }
  }

  /**
   * Send customer service completed email
   */
  async sendCustomerServiceCompletedEmail(data: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    vendorName: string;
    escrowId: string;
  }) {
    try {
      const template = getCustomerServiceCompletedTemplate(data);
      await this.sendEmail({
        to: data.customerEmail,
        subject: `Service Completed - Action Required - ${data.serviceName}`,
        html: template,
      });
      console.log(`✅ [EMAIL] Customer service completed email sent to: ${data.customerEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send customer service completed email:`, error);
    }
  }

  /**
   * Send admin dispute notification email
   */
  async sendAdminDisputeNotificationEmail(data: {
    serviceName: string;
    vendorName: string;
    customerName: string;
    disputeReason: string;
    escrowId: string;
    amount: number;
    currency: string;
  }) {
    try {
      const template = getAdminDisputeNotificationTemplate(data);
      const adminEmail = this.configService.get('ADMIN_EMAIL') || 'admin@urembohub.com';
      await this.sendEmail({
        to: adminEmail,
        subject: `URGENT: Service Dispute - ${data.serviceName}`,
        html: template,
      });
      console.log(`✅ [EMAIL] Admin dispute notification email sent to: ${adminEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send admin dispute notification email:`, error);
    }
  }

  /**
   * Send vendor dispute notification email
   */
  async sendVendorDisputeNotificationEmail(data: {
    vendorEmail: string;
    vendorName: string;
    serviceName: string;
    disputeReason: string;
    escrowId: string;
  }) {
    try {
      const template = getVendorDisputeNotificationTemplate(data);
      await this.sendEmail({
        to: data.vendorEmail,
        subject: `Service Disputed - ${data.serviceName}`,
        html: template,
      });
      console.log(`✅ [EMAIL] Vendor dispute notification email sent to: ${data.vendorEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send vendor dispute notification email:`, error);
    }
  }

  /**
   * Send vendor funds released email
   */
  async sendVendorFundsReleasedEmail(data: {
    vendorEmail: string;
    vendorName: string;
    serviceName: string;
    amount: number;
    currency: string;
  }) {
    try {
      const template = getVendorFundsReleasedTemplate(data);
      await this.sendEmail({
        to: data.vendorEmail,
        subject: `Payment Released - ${data.serviceName}`,
        html: template,
      });
      console.log(`✅ [EMAIL] Vendor funds released email sent to: ${data.vendorEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send vendor funds released email:`, error);
    }
  }

  /**
   * Send customer funds released email
   */
  async sendCustomerFundsReleasedEmail(data: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    amount: number;
    currency: string;
  }) {
    try {
      const template = getCustomerFundsReleasedTemplate(data);
      await this.sendEmail({
        to: data.customerEmail,
        subject: `Service Completed - ${data.serviceName}`,
        html: template,
      });
      console.log(`✅ [EMAIL] Customer funds released email sent to: ${data.customerEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send customer funds released email:`, error);
    }
  }

  /**
   * Send customer refund email
   */
  async sendCustomerRefundEmail(data: {
    customerEmail: string;
    customerName: string;
    serviceName: string;
    amount: number;
    currency: string;
    reason: string;
  }) {
    try {
      const template = getCustomerRefundTemplate(data);
      await this.sendEmail({
        to: data.customerEmail,
        subject: `Refund Processed - ${data.serviceName}`,
        html: template,
      });
      console.log(`✅ [EMAIL] Customer refund email sent to: ${data.customerEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send customer refund email:`, error);
    }
  }

  /**
   * Send vendor refund notification email
   */
  async sendVendorRefundNotificationEmail(data: {
    vendorEmail: string;
    vendorName: string;
    serviceName: string;
    amount: number;
    currency: string;
    reason: string;
  }) {
    try {
      const template = getVendorRefundNotificationTemplate(data);
      await this.sendEmail({
        to: data.vendorEmail,
        subject: `Service Refunded - ${data.serviceName}`,
        html: template,
      });
      console.log(`✅ [EMAIL] Vendor refund notification email sent to: ${data.vendorEmail}`);
    } catch (error) {
      console.error(`❌ [EMAIL] Failed to send vendor refund notification email:`, error);
    }
  }
}
