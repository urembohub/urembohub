import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EmailQueueService } from '../email/email-queue.service';

@Injectable()
export class AdminNotificationService {
  private readonly logger = new Logger(AdminNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private emailQueueService: EmailQueueService,
  ) {}

  async getAdminEmails(): Promise<string[]> {
    try {
      const admins = await this.prisma.profile.findMany({
        where: {
          role: 'admin',
          isVerified: true,
        },
        select: {
          email: true,
        },
      });

      return admins.map(admin => admin.email);
    } catch (error) {
      this.logger.error('Error fetching admin emails:', error);
      return [];
    }
  }

  async notifyAdminsOfSignup(userData: any): Promise<void> {
    try {
      console.log('👨‍💼 [ADMIN] Starting admin signup notification process...');
      const adminEmails = await this.getAdminEmails();
      
      if (adminEmails.length === 0) {
        console.warn('⚠️ [ADMIN] No admin emails found for signup notification');
        this.logger.warn('No admin emails found for signup notification');
        return;
      }

      console.log('👨‍💼 [ADMIN] Found admin emails:', adminEmails);
      console.log('👨‍💼 [ADMIN] Sending notifications to admins for user:', userData.email);

      // Send notification to all admins
      const promises = adminEmails.map(async (adminEmail, index) => {
        console.log(`📧 [ADMIN] Sending notification ${index + 1}/${adminEmails.length} to: ${adminEmail}`);
        const result = await this.emailService.sendAdminSignupNotificationEmail(adminEmail, userData);
        
        if (result.success) {
          console.log(`✅ [ADMIN] Notification sent successfully to ${adminEmail} (ID: ${result.messageId})`);
        } else {
          console.error(`❌ [ADMIN] Notification failed to ${adminEmail}:`, result.error);
        }
        
        return result;
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      
      console.log(`📊 [ADMIN] Admin notification summary: ${successCount}/${adminEmails.length} successful`);
      this.logger.log(`Signup notification sent to ${adminEmails.length} admins for user: ${userData.email}`);
    } catch (error) {
      console.error('❌ [ADMIN] Error sending signup notification to admins:', error);
      this.logger.error('Error sending signup notification to admins:', error);
    }
  }

  async notifyAdminsOfTicket(ticketData: any): Promise<void> {
    try {
      const adminEmails = await this.getAdminEmails();
      
      if (adminEmails.length === 0) {
        this.logger.warn('No admin emails found for ticket notification');
        return;
      }

      // Send notification to all admins
      const promises = adminEmails.map(adminEmail => 
        this.emailService.sendAdminTicketNotificationEmail(adminEmail, ticketData)
      );

      await Promise.all(promises);
      this.logger.log(`Ticket notification sent to ${adminEmails.length} admins for ticket: ${ticketData.id}`);
    } catch (error) {
      this.logger.error('Error sending ticket notification to admins:', error);
    }
  }

  async notifyAdminsOfSale(saleData: any): Promise<void> {
    try {
      const adminEmails = await this.getAdminEmails();
      
      if (adminEmails.length === 0) {
        this.logger.warn('No admin emails found for sale notification');
        return;
      }

      // Send notification to all admins
      const promises = adminEmails.map(adminEmail => 
        this.emailService.sendAdminSaleNotificationEmail(adminEmail, saleData)
      );

      await Promise.all(promises);
      this.logger.log(`Sale notification sent to ${adminEmails.length} admins for sale: ${saleData.transactionId}`);
    } catch (error) {
      this.logger.error('Error sending sale notification to admins:', error);
    }
  }

  async notifyAdminsOfCartAddition(cartData: any): Promise<void> {
    try {
      const adminEmails = await this.getAdminEmails();
      
      if (adminEmails.length === 0) {
        this.logger.warn('No admin emails found for cart notification');
        return;
      }

      // Send notification to all admins
      const promises = adminEmails.map(adminEmail => 
        this.emailService.sendAdminCartNotificationEmail(adminEmail, cartData)
      );

      await Promise.all(promises);
      this.logger.log(`Cart notification sent to ${adminEmails.length} admins for cart addition`);
    } catch (error) {
      this.logger.error('Error sending cart notification to admins:', error);
    }
  }

  async notifyPartnerSignup(partnerData: any): Promise<void> {
    try {
      console.log('🤝 [PARTNER] Starting partner signup notification process...');
      console.log('🤝 [PARTNER] Partner data:', partnerData);
      
      // Notify admins
      console.log('🤝 [PARTNER] Step 1: Notifying admins...');
      await this.notifyAdminsOfSignup(partnerData);

      // Notify partner
      console.log('🤝 [PARTNER] Step 2: Notifying partner...');
      const partnerEmailResult = await this.emailService.sendPartnerSignupNotificationEmail(
        partnerData.email,
        partnerData.fullName || 'Partner'
      );

      if (partnerEmailResult.success) {
        console.log('✅ [PARTNER] Partner notification sent successfully!');
        console.log('📧 [PARTNER] Message ID:', partnerEmailResult.messageId);
      } else {
        console.error('❌ [PARTNER] Partner notification failed:', partnerEmailResult.error);
      }

      console.log('🎉 [PARTNER] Partner signup notification process completed!');
      this.logger.log(`Partner signup notifications sent for: ${partnerData.email}`);
    } catch (error) {
      console.error('❌ [PARTNER] Error sending partner signup notifications:', error);
      this.logger.error('Error sending partner signup notifications:', error);
    }
  }

  async notifyPartnerApproval(partnerData: any, approved: boolean, reason?: string): Promise<void> {
    try {
      await this.emailService.sendPartnerApprovalEmail(
        partnerData.email,
        partnerData.fullName || 'Partner',
        approved,
        reason
      );

      this.logger.log(`Partner approval notification sent to: ${partnerData.email}, approved: ${approved}`);
    } catch (error) {
      this.logger.error('Error sending partner approval notification:', error);
    }
  }

  async notifyAdminsOfOnboardingSubmission(submissionData: any): Promise<void> {
    try {
      console.log('👨‍💼 [ADMIN] Queuing onboarding submission notification...');
      
      // Queue the email notification instead of sending it immediately
      await this.emailQueueService.addOnboardingSubmissionNotification(submissionData);
      
      console.log('✅ [ADMIN] Onboarding submission notification queued successfully');
      this.logger.log(`Onboarding submission notification queued for user: ${submissionData.email}`);
    } catch (error) {
      console.error('❌ [ADMIN] Error queuing onboarding submission notification:', error);
      this.logger.error('Error queuing onboarding submission notification:', error);
    }
  }
}
