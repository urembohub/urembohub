/**
 * Enhanced Payment Email Templates
 * Beautiful, modern templates for payment-related communications
 */

import { generateBaseEmailHTML } from './base-template';

export const getPaymentSuccessfulTemplate = (userName: string, paymentData: any) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${userName}</strong>,</p>
      
      <p class="text-body">Your payment has been processed successfully! Thank you for your business.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-success">Payment Successful</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Payment Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Payment ID:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground)); font-family: monospace;">${paymentData.paymentId || paymentData.payment_id || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Amount:</td>
            <td style="padding: 8px 0; color: hsl(var(--price-red)); font-weight: 700; font-size: 18px;">${paymentData.currency || 'KES'} ${paymentData.amount || paymentData.total_amount || '0'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Payment Method:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${paymentData.method || paymentData.paymentMethod || 'Paystack'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Date:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${new Date().toLocaleDateString()}</td>
          </tr>
        </table>
      </div>
      
      <p class="text-body">Your payment has been securely processed and your order is now being prepared. You'll receive updates as your order progresses.</p>
    </div>
  `;

  return {
    subject: `Payment Successful - ${paymentData.currency || 'KES'} ${paymentData.amount || paymentData.total_amount || '0'}`,
    html: generateBaseEmailHTML({
      title: `Payment Successful! 💳`,
      preheader: `Your payment has been processed successfully.`,
      content,
      cta_button: {
        text: 'View Order',
        url: `https://urembohub.com/orders/${paymentData.orderId}`,
        style: 'success'
      },
      variables: {
        company_name: 'Urembo Hub',
        support_email: 'support@urembohub.com',
        base_url: 'https://urembohub.com',
        logo_url: `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`
      }
    })
  };
};

export const getPaymentFailedTemplate = (userName: string, paymentData: any) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${userName}</strong>,</p>
      
      <p class="text-body">We encountered an issue processing your payment. Don't worry - no charges have been made to your account.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-danger">Payment Failed</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Payment Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Payment ID:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground)); font-family: monospace;">${paymentData.paymentId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Amount:</td>
            <td style="padding: 8px 0; color: hsl(var(--price-red)); font-weight: 700; font-size: 18px;">${paymentData.currency} ${paymentData.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Reason:</td>
            <td style="padding: 8px 0; color: hsl(var(--destructive));">${paymentData.reason || 'Payment processing error'}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: hsl(var(--accent)); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 16px; font-weight: 600;">What to do next:</h4>
        <ul style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
          <li style="margin-bottom: 6px;">Check your payment method details</li>
          <li style="margin-bottom: 6px;">Ensure sufficient funds are available</li>
          <li style="margin-bottom: 6px;">Try using a different payment method</li>
          <li style="margin-bottom: 6px;">Contact your bank if the issue persists</li>
        </ul>
      </div>
      
      <p class="text-body">You can retry your payment or contact our support team if you need assistance. Your order will be held for 24 hours while you resolve the payment issue.</p>
    </div>
  `;

  return {
    subject: `Payment Failed - Action Required`,
    html: generateBaseEmailHTML({
      title: `Payment Failed ❌`,
      preheader: `Your payment could not be processed. Please try again.`,
      content,
      cta_button: {
        text: 'Retry Payment',
        url: `https://urembohub.com/payment/retry/${paymentData.paymentId}`,
        style: 'warning'
      },
      variables: {
        company_name: 'Urembo Hub',
        support_email: 'support@urembohub.com',
        base_url: 'https://urembohub.com',
        logo_url: `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`
      }
    })
  };
};


