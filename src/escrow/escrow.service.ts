import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { PaystackService } from '../paystack/paystack.service';
import { EscrowStatus, ActionType } from '@prisma/client';

export interface CreateEscrowData {
  orderId: string;
  serviceId: string;
  vendorId: string;
  customerId?: string;
  amount: number;
  currency?: string;
  paystackReference?: string;
  createdBy?: string;
}

export interface EscrowActionData {
  escrowId: string;
  actionType: ActionType;
  performedBy?: string;
  reason?: string;
  metadata?: any;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
    private paystackService: PaystackService,
  ) {}

  /**
   * Create a new escrow for a service payment
   */
  async createEscrow(data: CreateEscrowData) {
    try {
      console.log('🔒 [ESCROW] Creating escrow for service payment...');
      console.log('🔒 [ESCROW] Order ID:', data.orderId);
      console.log('🔒 [ESCROW] Service ID:', data.serviceId);
      console.log('🔒 [ESCROW] Vendor ID:', data.vendorId);
      console.log('🔒 [ESCROW] Amount:', data.amount);

      // Calculate auto-release date (48 hours from now)
      const autoReleaseDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      
      const escrow = await this.prisma.serviceEscrow.create({
        data: {
          orderId: data.orderId,
          serviceId: data.serviceId,
          vendorId: data.vendorId,
          customerId: data.customerId,
          amount: data.amount,
          currency: data.currency || 'KES',
          paystackReference: data.paystackReference,
          autoReleaseDate,
          createdBy: data.createdBy,
          status: EscrowStatus.pending,
        },
        include: {
          order: {
            include: {
              user: {
                select: {
                  email: true,
                  fullName: true,
                  businessName: true,
                }
              }
            }
          },
          service: {
            include: {
              vendor: {
                select: {
                  email: true,
                  fullName: true,
                  businessName: true,
                  paystackSubaccountId: true,
                  paystackSubaccountVerified: true,
                }
              }
            }
          },
          vendor: {
            select: {
              email: true,
              fullName: true,
              businessName: true,
              paystackSubaccountId: true,
              paystackSubaccountVerified: true,
            }
          },
          customer: {
            select: {
              email: true,
              fullName: true,
              businessName: true,
            }
          }
        }
      });

      // Log the creation action
      await this.logAction({
        escrowId: escrow.id,
        actionType: ActionType.created,
        performedBy: data.createdBy,
        metadata: {
          orderId: data.orderId,
          serviceId: data.serviceId,
          amount: data.amount,
          autoReleaseDate: autoReleaseDate.toISOString(),
        }
      });

      // Send notifications
      await this.sendEscrowCreatedNotifications(escrow);

      console.log('✅ [ESCROW] Escrow created successfully:', escrow.id);
      return escrow;
    } catch (error) {
      console.error('❌ [ESCROW] Failed to create escrow:', error);
      throw error;
    }
  }

  /**
   * Start service (vendor marks service as started)
   */
  async startService(escrowId: string, vendorId: string) {
    try {
      console.log('🚀 [ESCROW] Starting service...');
      console.log('🚀 [ESCROW] Escrow ID:', escrowId);
      console.log('🚀 [ESCROW] Vendor ID:', vendorId);

      const escrow = await this.prisma.serviceEscrow.findFirst({
        where: {
          id: escrowId,
          vendorId: vendorId,
          status: EscrowStatus.pending,
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      if (!escrow) {
        throw new NotFoundException('Escrow not found or not in pending status');
      }

      const updatedEscrow = await this.prisma.serviceEscrow.update({
        where: { id: escrowId },
        data: { status: EscrowStatus.in_progress },
        include: {
          service: true,
          customer: true,
          vendor: true,
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  fullName: true,
                },
              },
            },
            select: {
              id: true,
              customerEmail: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  fullName: true,
                },
              },
            },
          },
        }
      });

      // Log the action
      await this.logAction({
        escrowId,
        actionType: ActionType.service_started,
        performedBy: vendorId,
        metadata: {
          serviceName: escrow.service.name,
          startedAt: new Date().toISOString(),
        }
      });

      // Send notifications
      await this.sendServiceStartedNotifications(updatedEscrow);

      console.log('✅ [ESCROW] Service started successfully');
      return updatedEscrow;
    } catch (error) {
      console.error('❌ [ESCROW] Failed to start service:', error);
      throw error;
    }
  }

  /**
   * Vendor initiates service completion - generates code and sends email to customer
   */
  async completeService(escrowId: string, vendorId: string) {
    try {
      console.log('✅ [ESCROW] Initiating service completion...');
      console.log('✅ [ESCROW] Escrow ID:', escrowId);
      console.log('✅ [ESCROW] Vendor ID:', vendorId);

      const escrow = await this.prisma.serviceEscrow.findFirst({
        where: {
          id: escrowId,
          vendorId: vendorId,
          status: EscrowStatus.in_progress,
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
          order: {
            include: {
              user: true, // Get customer from order
            },
          },
        }
      });

      if (!escrow) {
        throw new NotFoundException('Escrow not found or not in progress');
      }

      // Generate a 6-digit verification code
      const completionCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Code expires in 24 hours

      // Save the code to the escrow
      const updatedEscrow = await this.prisma.serviceEscrow.update({
        where: { id: escrowId },
        data: {
          completionCode,
          completionCodeExpiresAt: expiresAt,
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
          order: {
            include: {
              user: true,
            },
          },
        }
      });

      // Get customer email - try from escrow.customer first, then from order.user, then from order.customerEmail
      let customerEmail: string | null = null;
      let customerName: string = 'Customer';

      if (escrow.customer && escrow.customer.email) {
        customerEmail = escrow.customer.email;
        customerName = escrow.customer.fullName || escrow.customer.businessName || 'Customer';
        console.log('📧 [ESCROW] Found customer from escrow.customer:', customerEmail);
      } else if (escrow.order?.user && escrow.order.user.email) {
        customerEmail = escrow.order.user.email;
        customerName = escrow.order.user.fullName || escrow.order.user.businessName || 'Customer';
        console.log('📧 [ESCROW] Found customer from order.user:', customerEmail);
      } else if (escrow.order?.customerEmail) {
        customerEmail = escrow.order.customerEmail;
        customerName = 'Customer'; // We don't have the name from customerEmail field
        console.log('📧 [ESCROW] Found customer email from order.customerEmail:', customerEmail);
      }

      // Send completion code email to customer
      if (customerEmail) {
        console.log('📧 [ESCROW] Attempting to send completion code email to:', customerEmail);
        try {
          const emailResult = await this.emailService.sendCustomerServiceCompletionCodeEmail({
            customerEmail,
            customerName,
            serviceName: escrow.service.name,
            vendorName: escrow.vendor.fullName || escrow.vendor.businessName || 'Vendor',
            completionCode,
            expiresAt,
          });
          console.log('📧 [ESCROW] Email send result:', emailResult);
        } catch (emailError) {
          console.error('❌ [ESCROW] Error sending completion code email:', emailError);
          // Don't throw - we still want to save the code even if email fails
        }
      } else {
        console.warn('⚠️ [ESCROW] No customer email found. Escrow customer:', escrow.customer, 'Order user:', escrow.order?.user, 'Order customerEmail:', escrow.order?.customerEmail);
      }

      // Log the action
      await this.logAction({
        escrowId,
        actionType: ActionType.service_completed,
        performedBy: vendorId,
        metadata: {
          serviceName: escrow.service.name,
          completionCodeGenerated: true,
          codeExpiresAt: expiresAt.toISOString(),
        }
      });

      console.log('✅ [ESCROW] Completion code generated and email sent');
      return {
        ...updatedEscrow,
        message: 'Verification code sent to customer. Please ask customer for the code to complete the service.',
      };
    } catch (error) {
      console.error('❌ [ESCROW] Failed to initiate service completion:', error);
      throw error;
    }
  }

  /**
   * Vendor verifies completion code and completes service
   */
  async verifyAndCompleteService(escrowId: string, vendorId: string, verificationCode: string) {
    try {
      console.log('✅ [ESCROW] Verifying completion code...');
      console.log('✅ [ESCROW] Escrow ID:', escrowId);
      console.log('✅ [ESCROW] Vendor ID:', vendorId);

      const escrow = await this.prisma.serviceEscrow.findFirst({
        where: {
          id: escrowId,
          vendorId: vendorId,
          status: EscrowStatus.in_progress,
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      if (!escrow) {
        throw new NotFoundException('Escrow not found or not in progress');
      }

      // Check if code exists and matches
      if (!escrow.completionCode) {
        throw new NotFoundException('No completion code found. Please initiate service completion first.');
      }

      if (escrow.completionCode !== verificationCode) {
        throw new Error('Invalid verification code. Please check the code and try again.');
      }

      // Check if code has expired
      if (escrow.completionCodeExpiresAt && new Date() > escrow.completionCodeExpiresAt) {
        throw new Error('Verification code has expired. Please initiate service completion again.');
      }

      // Code is valid - complete the service
      const updatedEscrow = await this.prisma.serviceEscrow.update({
        where: { id: escrowId },
        data: {
          status: EscrowStatus.completed,
          completionCode: null, // Clear the code after use
          completionCodeExpiresAt: null,
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      // Log the action
      await this.logAction({
        escrowId,
        actionType: ActionType.service_completed,
        performedBy: vendorId,
        metadata: {
          serviceName: escrow.service.name,
          verified: true,
          completedAt: new Date().toISOString(),
        }
      });

      // Send notifications
      await this.sendServiceCompletedNotifications(updatedEscrow);

      console.log('✅ [ESCROW] Service completed successfully after code verification');
      return updatedEscrow;
    } catch (error) {
      console.error('❌ [ESCROW] Failed to verify and complete service:', error);
      throw error;
    }
  }

  /**
   * Customer approves service (releases funds to vendor)
   */
  async approveService(escrowId: string, customerId: string) {
    try {
      console.log('👍 [ESCROW] Customer approving service...');
      console.log('👍 [ESCROW] Escrow ID:', escrowId);
      console.log('👍 [ESCROW] Customer ID:', customerId);

      const escrow = await this.prisma.serviceEscrow.findFirst({
        where: {
          id: escrowId,
          customerId: customerId,
          status: EscrowStatus.completed,
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      if (!escrow) {
        throw new NotFoundException('Escrow not found or not in completed status');
      }

      // Release funds to vendor
      await this.releaseFunds(escrowId, customerId);

      console.log('✅ [ESCROW] Service approved and funds released');
      return escrow;
    } catch (error) {
      console.error('❌ [ESCROW] Failed to approve service:', error);
      throw error;
    }
  }

  /**
   * Customer disputes service
   */
  async disputeService(escrowId: string, customerId: string, reason: string) {
    try {
      console.log('⚠️ [ESCROW] Customer disputing service...');
      console.log('⚠️ [ESCROW] Escrow ID:', escrowId);
      console.log('⚠️ [ESCROW] Customer ID:', customerId);
      console.log('⚠️ [ESCROW] Reason:', reason);

      const escrow = await this.prisma.serviceEscrow.findFirst({
        where: {
          id: escrowId,
          customerId: customerId,
          status: EscrowStatus.completed,
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      if (!escrow) {
        throw new NotFoundException('Escrow not found or not in completed status');
      }

      const updatedEscrow = await this.prisma.serviceEscrow.update({
        where: { id: escrowId },
        data: {
          status: EscrowStatus.disputed,
          disputeReason: reason,
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      // Log the action
      await this.logAction({
        escrowId,
        actionType: ActionType.customer_disputed,
        performedBy: customerId,
        reason,
        metadata: {
          serviceName: escrow.service.name,
          disputedAt: new Date().toISOString(),
        }
      });

      // Send notifications
      await this.sendDisputeNotifications(updatedEscrow);

      console.log('✅ [ESCROW] Service disputed successfully');
      return updatedEscrow;
    } catch (error) {
      console.error('❌ [ESCROW] Failed to dispute service:', error);
      throw error;
    }
  }

  /**
   * Admin releases funds manually
   */
  async adminReleaseFunds(escrowId: string, adminId: string, reason?: string) {
    try {
      console.log('👨‍💼 [ESCROW] Admin releasing funds...');
      console.log('👨‍💼 [ESCROW] Escrow ID:', escrowId);
      console.log('👨‍💼 [ESCROW] Admin ID:', adminId);

      const escrow = await this.prisma.serviceEscrow.findUnique({
        where: { id: escrowId },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      if (!escrow) {
        throw new NotFoundException('Escrow not found');
      }

      if (escrow.status === EscrowStatus.released) {
        throw new Error('Funds already released');
      }

      // Check if vendor has a Paystack sub-account
      if (!escrow.vendor.paystackSubaccountId) {
        throw new Error('Vendor does not have a Paystack sub-account set up. Please set up sub-account first.');
      }

      // Initiate Paystack payout
      const payoutResult = await this.paystackService.transferToSubaccount(
        escrow.vendor.paystackSubaccountId,
        Number(escrow.amount),
        reason || `Escrow release for service: ${escrow.service.name}`,
        `escrow_${escrowId}_${Date.now()}`
      );

      if (!payoutResult.success) {
        throw new Error(`Payout failed: ${payoutResult.message}`);
      }

      // Update escrow with payout details
      const updatedEscrow = await this.prisma.serviceEscrow.update({
        where: { id: escrowId },
        data: {
          status: EscrowStatus.released,
          releasedAt: new Date(),
          adminNotes: reason,
          holdReference: payoutResult.data?.transferCode, // Store transfer code
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      // Log the action
      await this.logAction({
        escrowId,
        actionType: ActionType.admin_released,
        performedBy: adminId,
        reason,
        metadata: {
          serviceName: escrow.service.name,
          releasedAt: new Date().toISOString(),
          amount: escrow.amount,
          transferCode: payoutResult.data?.transferCode,
          payoutStatus: payoutResult.data?.status,
        }
      });

      // Send notifications
      await this.sendFundsReleasedNotifications(updatedEscrow);

      console.log('✅ [ESCROW] Admin released funds successfully with Paystack payout');
      return updatedEscrow;
    } catch (error) {
      console.error('❌ [ESCROW] Failed to release funds:', error);
      throw error;
    }
  }

  /**
   * Admin refunds customer
   */
  async adminRefundCustomer(escrowId: string, adminId: string, reason: string) {
    try {
      console.log('💰 [ESCROW] Admin refunding customer...');
      console.log('💰 [ESCROW] Escrow ID:', escrowId);
      console.log('💰 [ESCROW] Admin ID:', adminId);
      console.log('💰 [ESCROW] Reason:', reason);

      const escrow = await this.prisma.serviceEscrow.findUnique({
        where: { id: escrowId },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      if (!escrow) {
        throw new NotFoundException('Escrow not found');
      }

      const updatedEscrow = await this.prisma.serviceEscrow.update({
        where: { id: escrowId },
        data: {
          status: EscrowStatus.refunded,
          releasedAt: new Date(),
          adminNotes: reason,
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      // Log the action
      await this.logAction({
        escrowId,
        actionType: ActionType.admin_refunded,
        performedBy: adminId,
        reason,
        metadata: {
          serviceName: escrow.service.name,
          refundedAt: new Date().toISOString(),
        }
      });

      // Send notifications
      await this.sendRefundNotifications(updatedEscrow);

      console.log('✅ [ESCROW] Customer refunded successfully');
      return updatedEscrow;
    } catch (error) {
      console.error('❌ [ESCROW] Failed to refund customer:', error);
      throw error;
    }
  }

  /**
   * Process auto-release for expired escrows
   */
  async processAutoRelease() {
    try {
      console.log('⏰ [ESCROW] Processing auto-release for expired escrows...');

      const expiredEscrows = await this.prisma.serviceEscrow.findMany({
        where: {
          status: EscrowStatus.completed,
          autoReleaseDate: {
            lte: new Date()
          }
        },
        include: {
          service: true,
          customer: true,
          vendor: true,
        }
      });

      console.log(`⏰ [ESCROW] Found ${expiredEscrows.length} expired escrows`);

      for (const escrow of expiredEscrows) {
        try {
          await this.releaseFunds(escrow.id, 'system', 'Auto-released after 48 hours');
          console.log(`✅ [ESCROW] Auto-released escrow: ${escrow.id}`);
        } catch (error) {
          console.error(`❌ [ESCROW] Failed to auto-release escrow ${escrow.id}:`, error);
        }
      }

      console.log('✅ [ESCROW] Auto-release processing completed');
    } catch (error) {
      console.error('❌ [ESCROW] Failed to process auto-release:', error);
      throw error;
    }
  }

  /**
   * Private method to release funds
   */
  private async releaseFunds(escrowId: string, releasedBy: string, reason?: string) {
    const escrow = await this.prisma.serviceEscrow.update({
      where: { id: escrowId },
      data: {
        status: EscrowStatus.released,
        releasedAt: new Date(),
        adminNotes: reason,
      },
      include: {
        service: true,
        customer: true,
        vendor: true,
      }
    });

    // Log the action
    await this.logAction({
      escrowId,
      actionType: releasedBy === 'system' ? ActionType.auto_released : ActionType.admin_released,
      performedBy: releasedBy,
      reason,
      metadata: {
        serviceName: escrow.service.name,
        releasedAt: new Date().toISOString(),
        amount: escrow.amount,
      }
    });

    // Send notifications
    await this.sendFundsReleasedNotifications(escrow);
  }

  /**
   * Log an escrow action
   */
  private async logAction(data: EscrowActionData) {
    try {
      await this.prisma.escrowAction.create({
        data: {
          escrowId: data.escrowId,
          actionType: data.actionType,
          performedBy: data.performedBy,
          reason: data.reason,
          metadata: data.metadata,
        }
      });
    } catch (error) {
      console.error('❌ [ESCROW] Failed to log action:', error);
    }
  }

  /**
   * Send escrow created notifications
   */
  private async sendEscrowCreatedNotifications(escrow: any) {
    try {
      // Notify vendor
      if (escrow.vendor?.email) {
        await this.emailService.sendVendorEscrowCreatedEmail({
          vendorEmail: escrow.vendor.email,
          vendorName: escrow.vendor.fullName || escrow.vendor.businessName,
          serviceName: escrow.service.name,
          amount: escrow.amount,
          currency: escrow.currency,
          autoReleaseDate: escrow.autoReleaseDate,
        });
      }

      // Notify customer
      if (escrow.customer?.email) {
        await this.emailService.sendCustomerEscrowCreatedEmail({
          customerEmail: escrow.customer.email,
          customerName: escrow.customer.fullName || escrow.customer.businessName,
          serviceName: escrow.service.name,
          amount: escrow.amount,
          currency: escrow.currency,
          autoReleaseDate: escrow.autoReleaseDate,
        });
      }

      // Notify admin
      await this.emailService.sendAdminEscrowCreatedEmail({
        serviceName: escrow.service.name,
        vendorName: escrow.vendor.fullName || escrow.vendor.businessName,
        customerName: escrow.customer?.fullName || escrow.customer?.businessName || 'Guest',
        amount: escrow.amount,
        currency: escrow.currency,
        autoReleaseDate: escrow.autoReleaseDate,
      });
    } catch (error) {
      console.error('❌ [ESCROW] Failed to send escrow created notifications:', error);
    }
  }

  /**
   * Send service started notifications
   */
  private async sendServiceStartedNotifications(escrow: any) {
    try {
      console.log('📧 [ESCROW] Sending service started notifications...');
      console.log('📧 [ESCROW] Escrow ID:', escrow.id);
      
      // Get customer email from multiple sources (priority order)
      let customerEmail: string | null = null;
      let customerName: string = 'Customer';
      
      if (escrow.customer?.email) {
        customerEmail = escrow.customer.email;
        customerName = escrow.customer.fullName || escrow.customer.businessName || 'Customer';
        console.log('📧 [ESCROW] Found customer from escrow.customer:', customerEmail);
      } else if (escrow.order?.user?.email) {
        customerEmail = escrow.order.user.email;
        customerName = escrow.order.user.fullName || 'Customer';
        console.log('📧 [ESCROW] Found customer from order.user:', customerEmail);
      } else if (escrow.order?.customerEmail) {
        customerEmail = escrow.order.customerEmail;
        customerName = customerEmail.split('@')[0] || 'Customer';
        console.log('📧 [ESCROW] Found customer email from order.customerEmail:', customerEmail);
      }
      
      // Notify customer
      if (customerEmail) {
        console.log('📧 [ESCROW] Sending service started email to:', customerEmail);
        const emailResult = await this.emailService.sendCustomerServiceStartedEmail({
          customerEmail,
          customerName,
          serviceName: escrow.service?.name || 'Service',
          vendorName: escrow.vendor?.fullName || escrow.vendor?.businessName || 'Vendor',
        });
        console.log('✅ [ESCROW] Service started email sent successfully:', emailResult);
      } else {
        console.warn('⚠️ [ESCROW] No customer email found for service started notification');
        console.warn('⚠️ [ESCROW] Escrow customer:', escrow.customer);
        console.warn('⚠️ [ESCROW] Order user:', escrow.order?.user);
        console.warn('⚠️ [ESCROW] Order customerEmail:', escrow.order?.customerEmail);
      }
    } catch (error) {
      console.error('❌ [ESCROW] Failed to send service started notifications:', error);
      console.error('❌ [ESCROW] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
  }

  /**
   * Send service completed notifications
   */
  private async sendServiceCompletedNotifications(escrow: any) {
    try {
      // Notify customer
      if (escrow.customer?.email) {
        await this.emailService.sendCustomerServiceCompletedEmail({
          customerEmail: escrow.customer.email,
          customerName: escrow.customer.fullName || escrow.customer.businessName,
          serviceName: escrow.service.name,
          vendorName: escrow.vendor.fullName || escrow.vendor.businessName,
          escrowId: escrow.id,
        });
      }
    } catch (error) {
      console.error('❌ [ESCROW] Failed to send service completed notifications:', error);
    }
  }

  /**
   * Send dispute notifications
   */
  private async sendDisputeNotifications(escrow: any) {
    try {
      // Notify admin
      await this.emailService.sendAdminDisputeNotificationEmail({
        serviceName: escrow.service.name,
        vendorName: escrow.vendor.fullName || escrow.vendor.businessName,
        customerName: escrow.customer?.fullName || escrow.customer?.businessName || 'Guest',
        disputeReason: escrow.disputeReason,
        escrowId: escrow.id,
        amount: escrow.amount,
        currency: escrow.currency,
      });

      // Notify vendor
      if (escrow.vendor?.email) {
        await this.emailService.sendVendorDisputeNotificationEmail({
          vendorEmail: escrow.vendor.email,
          vendorName: escrow.vendor.fullName || escrow.vendor.businessName,
          serviceName: escrow.service.name,
          disputeReason: escrow.disputeReason,
          escrowId: escrow.id,
        });
      }
    } catch (error) {
      console.error('❌ [ESCROW] Failed to send dispute notifications:', error);
    }
  }

  /**
   * Send funds released notifications
   */
  private async sendFundsReleasedNotifications(escrow: any) {
    try {
      // Notify vendor
      if (escrow.vendor?.email) {
        await this.emailService.sendVendorFundsReleasedEmail({
          vendorEmail: escrow.vendor.email,
          vendorName: escrow.vendor.fullName || escrow.vendor.businessName,
          serviceName: escrow.service.name,
          amount: escrow.amount,
          currency: escrow.currency,
        });
      }

      // Notify customer
      if (escrow.customer?.email) {
        await this.emailService.sendCustomerFundsReleasedEmail({
          customerEmail: escrow.customer.email,
          customerName: escrow.customer.fullName || escrow.customer.businessName,
          serviceName: escrow.service.name,
          amount: escrow.amount,
          currency: escrow.currency,
        });
      }
    } catch (error) {
      console.error('❌ [ESCROW] Failed to send funds released notifications:', error);
    }
  }

  /**
   * Send refund notifications
   */
  private async sendRefundNotifications(escrow: any) {
    try {
      // Notify customer
      if (escrow.customer?.email) {
        await this.emailService.sendCustomerRefundEmail({
          customerEmail: escrow.customer.email,
          customerName: escrow.customer.fullName || escrow.customer.businessName,
          serviceName: escrow.service.name,
          amount: escrow.amount,
          currency: escrow.currency,
          reason: escrow.adminNotes,
        });
      }

      // Notify vendor
      if (escrow.vendor?.email) {
        await this.emailService.sendVendorRefundNotificationEmail({
          vendorEmail: escrow.vendor.email,
          vendorName: escrow.vendor.fullName || escrow.vendor.businessName,
          serviceName: escrow.service.name,
          amount: escrow.amount,
          currency: escrow.currency,
          reason: escrow.adminNotes,
        });
      }
    } catch (error) {
      console.error('❌ [ESCROW] Failed to send refund notifications:', error);
    }
  }

  /**
   * Get escrow by ID
   */
  async getEscrowById(escrowId: string) {
    return await this.prisma.serviceEscrow.findUnique({
      where: { id: escrowId },
      include: {
        order: true,
        service: {
          include: {
            vendor: {
              select: {
                id: true,
                email: true,
                fullName: true,
                businessName: true,
              }
            }
          }
        },
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
            paystackSubaccountId: true,
            paystackSubaccountVerified: true,
          }
        },
        customer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
            paystackSubaccountId: true,
            paystackSubaccountVerified: true,
          }
        },
        actions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Get escrows by vendor
   */
  async getEscrowsByVendor(vendorId: string, status?: EscrowStatus) {
    const where: any = { vendorId };
    if (status) {
      where.status = status;
    }

    console.log(`[ESCROW_SERVICE] getEscrowsByVendor called for vendorId: ${vendorId}, status: ${status || 'all'}`);
    console.log(`[ESCROW_SERVICE] Query where clause:`, JSON.stringify(where, null, 2));

    const escrows = await this.prisma.serviceEscrow.findMany({
      where,
      include: {
        service: true,
        customer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
            paystackSubaccountId: true,
            paystackSubaccountVerified: true,
          }
        },
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[ESCROW_SERVICE] Found ${escrows.length} escrows for vendor ${vendorId}`);
    if (escrows.length > 0) {
      console.log(`[ESCROW_SERVICE] Sample escrow vendor IDs:`, escrows.slice(0, 3).map(e => ({
        escrowId: e.id,
        vendorId: e.vendorId,
        status: e.status,
        amount: e.amount
      })));
    }

    return escrows;
  }

  /**
   * Get escrows by customer
   */
  async getEscrowsByCustomer(customerId: string, status?: EscrowStatus) {
    const where: any = { customerId };
    if (status) {
      where.status = status;
    }

    return await this.prisma.serviceEscrow.findMany({
      where,
      include: {
        service: {
          include: {
            vendor: {
              select: {
                id: true,
                email: true,
                fullName: true,
                businessName: true,
              }
            }
          }
        },
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
            paystackSubaccountId: true,
            paystackSubaccountVerified: true,
          }
        },
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get all escrows for admin
   */
  async getAllEscrows(status?: EscrowStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return await this.prisma.serviceEscrow.findMany({
      where,
      include: {
        service: true,
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
            paystackSubaccountId: true,
            paystackSubaccountVerified: true,
          }
        },
        customer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            businessName: true,
            paystackSubaccountId: true,
            paystackSubaccountVerified: true,
          }
        },
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get escrow statistics for a vendor
   */
  async getVendorEscrowStats(vendorId: string) {
    try {
      console.log(`[ESCROW_SERVICE] getVendorEscrowStats called for vendorId: ${vendorId}`);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        totalEscrowBalance,
        pendingEscrows,
        inProgressEscrows,
        completedEscrows,
        releasedEscrows,
        disputedEscrows,
        releasedToday,
        totalReleased,
        totalPending,
      ] = await Promise.all([
        // Total escrow balance (pending + in_progress + completed)
        this.prisma.serviceEscrow.aggregate({
          where: {
            vendorId,
            status: {
              in: [EscrowStatus.pending, EscrowStatus.in_progress, EscrowStatus.completed],
            },
          },
          _sum: {
            amount: true,
          },
        }),
        
        // Pending escrows count
        this.prisma.serviceEscrow.count({
          where: {
            vendorId,
            status: EscrowStatus.pending,
          },
        }),
        
        // In progress escrows count
        this.prisma.serviceEscrow.count({
          where: {
            vendorId,
            status: EscrowStatus.in_progress,
          },
        }),
        
        // Completed escrows count
        this.prisma.serviceEscrow.count({
          where: {
            vendorId,
            status: EscrowStatus.completed,
          },
        }),
        
        // Released escrows count
        this.prisma.serviceEscrow.count({
          where: {
            vendorId,
            status: EscrowStatus.released,
          },
        }),
        
        // Disputed escrows count
        this.prisma.serviceEscrow.count({
          where: {
            vendorId,
            status: EscrowStatus.disputed,
          },
        }),
        
        // Released today amount
        this.prisma.serviceEscrow.aggregate({
          where: {
            vendorId,
            status: EscrowStatus.released,
            releasedAt: {
              gte: today,
              lt: tomorrow,
            },
          },
          _sum: {
            amount: true,
          },
        }),
        
        // Total released amount
        this.prisma.serviceEscrow.aggregate({
          where: {
            vendorId,
            status: EscrowStatus.released,
          },
          _sum: {
            amount: true,
          },
        }),
        
        // Total pending amount
        this.prisma.serviceEscrow.aggregate({
          where: {
            vendorId,
            status: EscrowStatus.pending,
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      const stats = {
        totalEscrowBalance: Number(totalEscrowBalance._sum.amount) || 0,
        pendingEscrows,
        inProgressEscrows,
        completedEscrows,
        releasedEscrows,
        disputedEscrows,
        releasedToday: Number(releasedToday._sum.amount) || 0,
        totalReleased: Number(totalReleased._sum.amount) || 0,
        totalPending: Number(totalPending._sum.amount) || 0,
      };

      console.log(`[ESCROW_SERVICE] Stats for vendor ${vendorId}:`, stats);
      return stats;
    } catch (error) {
      console.error('❌ [ESCROW_SERVICE] Error in getVendorEscrowStats:', error);
      throw error;
    }
  }

  /**
   * Get escrow statistics (admin only)
   */
  async getEscrowStats() {
    try {
      console.log('🔍 [ESCROW_SERVICE] getEscrowStats called');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      console.log('🔍 [ESCROW_SERVICE] Today:', today);
      console.log('🔍 [ESCROW_SERVICE] Tomorrow:', tomorrow);

      const [
        totalEscrowAmount,
        pendingEscrows,
        completedEscrows,
        disputedEscrows,
        releasedToday,
        autoReleasePending,
      ] = await Promise.all([
        // Total escrow amount (pending + in_progress + completed)
        this.prisma.serviceEscrow.aggregate({
          where: {
            status: {
              in: [EscrowStatus.pending, EscrowStatus.in_progress, EscrowStatus.completed],
            },
          },
          _sum: {
            amount: true,
          },
        }),
        
        // Pending escrows count
        this.prisma.serviceEscrow.count({
          where: {
            status: EscrowStatus.pending,
          },
        }),
        
        // Completed escrows count
        this.prisma.serviceEscrow.count({
          where: {
            status: EscrowStatus.completed,
          },
        }),
        
        // Disputed escrows count
        this.prisma.serviceEscrow.count({
          where: {
            status: EscrowStatus.disputed,
          },
        }),
        
        // Released today count
        this.prisma.serviceEscrow.count({
          where: {
            status: EscrowStatus.released,
            releasedAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        
        // Auto-release pending count (completed escrows with auto-release date in the past)
        this.prisma.serviceEscrow.count({
          where: {
            status: EscrowStatus.completed,
            autoReleaseDate: {
              lte: new Date(),
            },
          },
        }),
      ]);

      console.log('🔍 [ESCROW_SERVICE] Raw results:');
      console.log('  totalEscrowAmount:', totalEscrowAmount);
      console.log('  pendingEscrows:', pendingEscrows);
      console.log('  completedEscrows:', completedEscrows);
      console.log('  disputedEscrows:', disputedEscrows);
      console.log('  releasedToday:', releasedToday);
      console.log('  autoReleasePending:', autoReleasePending);

      const result = {
        totalEscrowAmount: Number(totalEscrowAmount._sum.amount) || 0,
        pendingEscrows,
        completedEscrows,
        disputedEscrows,
        releasedToday,
        autoReleasePending,
      };

      console.log('🔍 [ESCROW_SERVICE] Final result:', result);
      return result;
    } catch (error) {
      console.error('❌ [ESCROW_SERVICE] Error in getEscrowStats:', error);
      throw error;
    }
  }
}