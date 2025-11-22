/**
 * Enhanced Order Email Templates
 * Beautiful, modern templates for order-related communications
 */

import { generateBaseEmailHTML } from './base-template';

// Template for vendor: Order placed and being processed
export const getNewOrderTemplate = (vendorName: string, orderId: string, orderData: any) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${vendorName}</strong>,</p>
      
      <p class="text-body">A new order has been placed and is being processed. A customer has booked your service and is waiting for your confirmation.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-info">Order Placed</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Order Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Order ID:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground)); font-family: monospace;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Total Amount:</td>
            <td style="padding: 8px 0; color: hsl(var(--price-red)); font-weight: 700; font-size: 18px;">${orderData.currency} ${orderData.totalAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Items:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${orderData.items?.length || 0} item(s)</td>
          </tr>
        </table>
      </div>
      
      <p class="text-body">Please review the order details in your dashboard and accept the appointment when ready. The customer will be notified once you confirm.</p>
    </div>
  `;

  return {
    subject: `New Order Placed - ${orderId}`,
    html: generateBaseEmailHTML({
      title: `New Order Placed!`,
      preheader: `A customer has placed an order. Review and accept the appointment in your dashboard.`,
      content,
      cta_button: {
        text: 'Review Order',
        url: `https://urembohub.com/vendor/schedule`,
        style: 'primary'
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

// Template for client: Order received (pending status)
export const getOrderReceivedTemplate = (customerName: string, orderId: string, orderData: any) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${customerName}</strong>,</p>
      
      <p class="text-body">Thank you for your order! We have received your booking request and it is currently pending confirmation.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-info">Order Received</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Order Summary:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Order ID:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground)); font-family: monospace;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Total Amount:</td>
            <td style="padding: 8px 0; color: hsl(var(--price-red)); font-weight: 700; font-size: 18px;">${orderData.currency} ${orderData.totalAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Items:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${orderData.items?.length || 0} item(s)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Status:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">Pending Confirmation</td>
          </tr>
        </table>
      </div>
      
      <p class="text-body">Your order is being processed. Once payment is confirmed and the vendor accepts your appointment, you will receive a confirmation email with your visit details.</p>
      
      <p class="text-body">You can track your order status from your dashboard at any time.</p>
    </div>
  `;

  return {
    subject: `Order Received - ${orderId}`,
    html: generateBaseEmailHTML({
      title: `Order Received! 📦`,
      preheader: `We've received your order and it's being processed.`,
      content,
      cta_button: {
        text: 'Track Order',
        url: `https://urembohub.com/orders/${orderId}`,
        style: 'primary'
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

// Template for client: Order created after payment (awaiting vendor confirmation)
export const getOrderCreatedAfterPaymentTemplate = (customerName: string, orderId: string, orderData: any) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${customerName}</strong>,</p>
      
      <p class="text-body">Great news! Your payment has been processed successfully and your order has been placed. Your order is now waiting for approval.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-info">Order Placed</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Order Summary:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Order ID:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground)); font-family: monospace;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Total Amount:</td>
            <td style="padding: 8px 0; color: hsl(var(--price-red)); font-weight: 700; font-size: 18px;">${orderData.currency} ${orderData.totalAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Items:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${orderData.items?.length || 0} item(s)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Status:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">Waiting for Approval</td>
          </tr>
        </table>
      </div>
      
      <p class="text-body">Your order has been successfully placed and payment has been processed. The vendor will review and approve your order. Once approved, you'll receive a confirmation email with your visit details.</p>
      
      <p class="text-body">You can track your order status from your dashboard at any time.</p>
    </div>
  `;

  return {
    subject: `Order Placed - ${orderId}`,
    html: generateBaseEmailHTML({
      title: `Order Placed! ✅`,
      preheader: `Your payment was successful and your order is waiting for approval.`,
      content,
      cta_button: {
        text: 'Track Order',
        url: `https://urembohub.com/orders/${orderId}`,
        style: 'primary'
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

export const getOrderAcceptedTemplate = (customerName: string, orderId: string, orderData: any) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${customerName}</strong>,</p>
      
      <p class="text-body">Great news! Your order has been accepted by the vendor and is now being processed.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-success">Order Accepted</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Order Summary:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Order ID:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground)); font-family: monospace;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Total Amount:</td>
            <td style="padding: 8px 0; color: hsl(var(--price-red)); font-weight: 700; font-size: 18px;">${orderData.currency} ${orderData.totalAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Status:</td>
            <td style="padding: 8px 0; color: hsl(var(--primary)); font-weight: 600;">Processing</td>
          </tr>
        </table>
      </div>
      
      <p class="text-body">You'll receive updates as your order progresses. You can track your order status anytime from your dashboard.</p>
    </div>
  `;

  return {
    subject: `Order Accepted - ${orderId}`,
    html: generateBaseEmailHTML({
      title: `Order Accepted! 🎉`,
      preheader: `Your order has been accepted and is being processed.`,
      content,
      cta_button: {
        text: 'Track Order',
        url: `https://urembohub.com/orders/${orderId}`,
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

export const getOrderShippedTemplate = (customerName: string, orderId: string, trackingNumber?: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${customerName}</strong>,</p>
      
      <p class="text-body">Exciting news! Your order has been shipped and is on its way to you.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-success">Shipped</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Shipping Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Order ID:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground)); font-family: monospace;">${orderId}</td>
          </tr>
          ${trackingNumber ? `
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Tracking Number:</td>
            <td style="padding: 8px 0; color: hsl(var(--primary)); font-family: monospace; font-weight: 600;">${trackingNumber}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Estimated Delivery:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">3-5 business days</td>
          </tr>
        </table>
      </div>
      
      <p class="text-body">You can track your package using the tracking number above. We'll notify you once it's delivered!</p>
    </div>
  `;

  return {
    subject: `Order Shipped - ${orderId}`,
    html: generateBaseEmailHTML({
      title: `Order Shipped! 📦`,
      preheader: `Your order is on its way. Track it with the provided tracking number.`,
      content,
      cta_button: trackingNumber ? {
        text: 'Track Package',
        url: `https://urembohub.com/tracking/${trackingNumber}`,
        style: 'primary'
      } : {
        text: 'View Order',
        url: `https://urembohub.com/orders/${orderId}`,
        style: 'primary'
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

export const getOrderDeliveredTemplate = (customerName: string, orderId: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${customerName}</strong>,</p>
      
      <p class="text-body">🎉 Your order has been successfully delivered! We hope you love your purchase.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-success">Delivered</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Order Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Order ID:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground)); font-family: monospace;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Delivery Date:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${new Date().toLocaleDateString()}</td>
          </tr>
        </table>
      </div>
      
      <p class="text-body">We'd love to hear about your experience! Please take a moment to rate and review your order. Your feedback helps other customers and our vendors.</p>
    </div>
  `;

  return {
    subject: `Order Delivered - ${orderId}`,
    html: generateBaseEmailHTML({
      title: `Order Delivered! 🎉`,
      preheader: `Your order has been successfully delivered.`,
      content,
      cta_button: {
        text: 'Rate & Review',
        url: `https://urembohub.com/orders/${orderId}/review`,
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
