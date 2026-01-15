import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from '../email.service';
import { EmailJobData } from '../email-queue.service';

@Processor('email-notifications')
export class EmailNotificationProcessor {
  private readonly logger = new Logger(EmailNotificationProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send-email')
  async handleEmailNotification(job: Job<EmailJobData>) {
    const { type, recipientEmail, recipientName, data } = job.data;

    this.logger.log(`📧 Processing email job: ${type} for ${recipientEmail} (Job ID: ${job.id})`);

    try {
      let result;

      switch (type) {
        case 'onboarding_submission':
          result = await this.handleOnboardingSubmission(data);
          break;
        case 'waitlist_signup':
          result = await this.handleWaitlistSignup(data);
          break;
        case 'onboarding_approval':
          result = await this.handleOnboardingApproval(data);
          break;
        case 'onboarding_rejection':
          result = await this.handleOnboardingRejection(data);
          break;
        case 'order_notification':
          result = await this.handleOrderNotification(data);
          break;
        case 'payment_notification':
          result = await this.handlePaymentNotification(data);
          break;
        default:
          throw new Error(`Unknown email type: ${type}`);
      }

      this.logger.log(`✅ Email sent successfully: ${type} to ${recipientEmail} (Job ID: ${job.id})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to send email: ${type} to ${recipientEmail} (Job ID: ${job.id})`, error.stack);
      throw error;
    }
  }

  private async handleOnboardingSubmission(data: {
    businessName: string;
    fullName: string;
    email: string;
    role: string;
    submittedAt: string;
  }) {
    // Get admin emails
    const adminEmails = ['admin@urembohub.com'];
    
    const results = [];
    for (const adminEmail of adminEmails) {
      try {
        const result = await this.emailService.sendAdminOnboardingSubmissionEmail(adminEmail, {
          businessName: data.businessName,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
          submittedAt: data.submittedAt,
        });
        
        results.push({ email: adminEmail, success: true, result });
        this.logger.log(`✅ Onboarding submission notification sent to ${adminEmail}`);
      } catch (error) {
        this.logger.error(`❌ Failed to send onboarding submission notification to ${adminEmail}:`, error);
        results.push({ email: adminEmail, success: false, error: error.message });
      }
    }

    return results;
  }

  private async handleOnboardingApproval(data: {
    recipientEmail: string;
    recipientName: string;
    businessName: string;
  }) {
    return await this.emailService.sendProfileApprovedEmail(
      data.recipientEmail,
      data.recipientName
    );
  }

  private async handleOnboardingRejection(data: {
    recipientEmail: string;
    recipientName: string;
    businessName: string;
    rejectionReason: string;
  }) {
    return await this.emailService.sendProfileRejectedEmail(
      data.recipientEmail,
      data.recipientName,
      data.rejectionReason
    );
  }

  private async handleWaitlistSignup(data: {
    fullName: string;
    businessName: string;
    role: string;
    email: string;
  }) {
    return await this.emailService.sendWaitlistJoinEmail(
      data.fullName,
      data.businessName,
      data.role,
      data.email
    );
  }

  private async handleOrderNotification(data: any) {
    // Implement order notification logic
    this.logger.log('Order notification not implemented yet');
    return { success: true, message: 'Order notification not implemented' };
  }

  private async handlePaymentNotification(data: any) {
    // Implement payment notification logic
    this.logger.log('Payment notification not implemented yet');
    return { success: true, message: 'Payment notification not implemented' };
  }
}
