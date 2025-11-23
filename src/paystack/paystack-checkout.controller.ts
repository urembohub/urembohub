import { Controller, Post, Get, Body, Param, Headers, Logger, Query, Res } from '@nestjs/common';
import { PaystackCheckoutService } from './paystack-checkout.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Controller('paystack/checkout')
export class PaystackCheckoutController {
  private readonly logger = new Logger(PaystackCheckoutController.name);

  constructor(private readonly paystackCheckoutService: PaystackCheckoutService) {}

  /**
   * Initialize Paystack payment
   * POST /paystack/checkout/initialize
   */
  @Post('initialize')
  async initializePayment(@Body() createPaymentDto: CreatePaymentDto) {
    this.logger.log(`Initializing payment for order: ${createPaymentDto.orderId}`);
    return await this.paystackCheckoutService.initializePayment(createPaymentDto);
  }

  /**
   * Verify Paystack payment
   * GET /paystack/checkout/verify/:reference
   */
  @Get('verify/:reference')
  async verifyPayment(@Param('reference') reference: string) {
    this.logger.log(`Verifying payment: ${reference}`);
    return await this.paystackCheckoutService.verifyPayment(reference);
  }

  /**
   * Handle Paystack webhook (POST) and callback (GET)
   * POST /paystack/checkout/webhook - for webhook events
   * GET /paystack/checkout/webhook - for payment callback redirection
   */
  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    this.logger.log('🔔 [WEBHOOK] Received Paystack webhook');
    this.logger.log('🔔 [WEBHOOK] Payload:', JSON.stringify(payload, null, 2));
    this.logger.log('🔔 [WEBHOOK] Signature:', signature);
    this.logger.log('🔔 [WEBHOOK] Timestamp:', new Date().toISOString());
    
    try {
      const result = await this.paystackCheckoutService.handleWebhook(payload, signature);
      this.logger.log('🔔 [WEBHOOK] Webhook processed successfully:', result);
      return result;
    } catch (error) {
      this.logger.error('🔔 [WEBHOOK] Webhook processing failed:', error);
      throw error;
    }
  }

  @Get('webhook')
  async handleCallback(
    @Query('trxref') trxref: string,
    @Query('reference') reference: string,
    @Res() res: any,
  ) {
    this.logger.log(`Payment callback received - trxref: ${trxref}, reference: ${reference}`);
    
    // Redirect to frontend payment success page
    // Check NODE_ENV first - if development, always use localhost
    // Otherwise, use FRONTEND_URL (production/staging)
    const isDevelopment = process.env.NODE_ENV === 'development';
    let frontendUrl: string;
    
    if (isDevelopment) {
      // In development, always use localhost regardless of FRONTEND_URL
      frontendUrl = 'http://localhost:8080';
      this.logger.log(`🌍 [REDIRECT] Development mode detected - using localhost`);
    } else {
      // In production/staging, use FRONTEND_URL or fallback to staging URL
      frontendUrl = process.env.FRONTEND_URL || 'https://staging.urembohub.com';
      this.logger.log(`🌍 [REDIRECT] Production/Staging mode - using configured FRONTEND_URL`);
    }
    
    const redirectUrl = `${frontendUrl}/payment-success?reference=${reference || trxref}`;
    
    this.logger.log(`🌍 [REDIRECT] NODE_ENV: ${process.env.NODE_ENV}`);
    this.logger.log(`🌍 [REDIRECT] Frontend URL: ${frontendUrl}`);
    this.logger.log(`Redirecting to: ${redirectUrl}`);
    return res.redirect(redirectUrl);
  }

  /**
   * Payment callback (redirect from Paystack)
   * GET /paystack/checkout/callback
   */
  @Get('callback')
  async paymentCallback(@Param() params: any) {
    this.logger.log('Payment callback received');
    // This will be handled by the frontend, but we can log it
    return { message: 'Callback received', params };
  }
}
