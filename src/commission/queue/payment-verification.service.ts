import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PaymentVerificationService {
  private readonly logger = new Logger(PaymentVerificationService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
  }

  /**
   * Verify Paystack payment - simplified version for commission reconciliation
   */
  async verifyPayment(reference: string) {
    try {
      this.logger.log(`Verifying payment: ${reference}`);

      // Call Paystack API to verify
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      if (response.data.status) {
        const paymentData = response.data.data;
        
        this.logger.log(`Payment verified: ${paymentData.status}`);
        
        return {
          success: true,
          data: {
            reference: paymentData.reference,
            status: paymentData.status,
            amount: paymentData.amount / 100,
            currency: paymentData.currency,
            paid_at: paymentData.paid_at,
            customer: {
              email: paymentData.customer.email,
              phone: paymentData.customer.phone,
            },
          }
        };
      } else {
        throw new Error(response.data.message || 'Payment verification failed');
      }
    } catch (error) {
      this.logger.error('Payment verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment verification failed'
      };
    }
  }
}
