import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { PaymentsService, PaystackPaymentData } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('initialize')
  async initializePayment(@Body() paymentData: PaystackPaymentData) {
    return this.paymentsService.initializePayment(paymentData);
  }

  @Post('initialize-group')
  async initializePaymentGroup(@Body() paymentGroupData: any) {
    return this.paymentsService.initializePaymentGroup(paymentGroupData);
  }

  @Get('calculate-splits/:orderId')
  async calculatePaymentSplits(@Param('orderId') orderId: string) {
    return this.paymentsService.calculatePaymentSplits(orderId);
  }

  @Post('process/:orderId')
  async processPayment(
    @Param('orderId') orderId: string,
    @Body() paymentData: PaystackPaymentData
  ) {
    return this.paymentsService.processPayment(orderId, paymentData);
  }

  @Get('verify/:reference')
  async verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  @Post('callback/:reference')
  async handlePaymentCallback(@Param('reference') reference: string) {
    return this.paymentsService.handlePaymentCallback(reference);
  }

  @Post('refund/:orderId')
  async processRefund(
    @Param('orderId') orderId: string,
    @Body() body: { reason: string }
  ) {
    return this.paymentsService.processRefund(orderId, body.reason);
  }

  @Get('stats')
  async getPaymentStats() {
    return this.paymentsService.getPaymentStats();
  }
}
