import { generateBaseEmailHTML } from './base-template';

// Vendor Escrow Created Email
export function getVendorEscrowCreatedTemplate(data: {
  vendorEmail: string;
  vendorName: string;
  serviceName: string;
  amount: number;
  currency: string;
  autoReleaseDate: Date;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'Payment Received - Service Ready to Begin',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #2c3e50; margin-bottom: 20px;">🎉 Payment Received!</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          Great news! A customer has paid for your service and the funds are now held in escrow.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Service Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Amount:</strong> ${data.currency} ${data.amount.toLocaleString()}</p>
          <p><strong>Customer:</strong> ${data.vendorName}</p>
          <p><strong>Auto-release Date:</strong> ${data.autoReleaseDate.toLocaleDateString()} at ${data.autoReleaseDate.toLocaleTimeString()}</p>
        </div>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #27ae60; margin-bottom: 10px;">⏰ Important Timeline</h4>
          <p style="margin: 5px 0;">• <strong>Now:</strong> Start providing your service</p>
          <p style="margin: 5px 0;">• <strong>When Complete:</strong> Mark service as completed</p>
          <p style="margin: 5px 0;">• <strong>48 Hours:</strong> Funds will be automatically released to you</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          The funds are safely held in escrow and will be released to you once the service is completed and approved by the customer, or automatically after 48 hours.
        </p>
      </div>
    `,
    variables: {
      logo_url: logoUrl,
      company_name: 'Urembo Hub',
      support_email: 'support@urembohub.com',
      base_url: process.env.FRONTEND_URL || 'http://localhost:8080'
    }
  });
}

// Customer Escrow Created Email
export function getCustomerEscrowCreatedTemplate(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  amount: number;
  currency: string;
  autoReleaseDate: Date;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'Payment Confirmed - Service Booked',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #2c3e50; margin-bottom: 20px;">✅ Payment Confirmed!</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          Your payment has been received and is safely held in escrow. Your service is now booked!
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Service Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Amount Paid:</strong> ${data.currency} ${data.amount.toLocaleString()}</p>
          <p><strong>Auto-release Date:</strong> ${data.autoReleaseDate.toLocaleDateString()} at ${data.autoReleaseDate.toLocaleTimeString()}</p>
        </div>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #1976d2; margin-bottom: 10px;">🛡️ Your Money is Protected</h4>
          <p style="margin: 5px 0;">• Funds are held securely in escrow</p>
          <p style="margin: 5px 0;">• You can approve or dispute the service</p>
          <p style="margin: 5px 0;">• Automatic release after 48 hours if no action taken</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          You'll receive notifications when the service starts and completes. You can then approve the service to release payment to the vendor, or dispute if there are any issues.
        </p>
      </div>
    `,
    variables: {
      logo_url: logoUrl,
      company_name: 'Urembo Hub',
      support_email: 'support@urembohub.com',
      base_url: process.env.FRONTEND_URL || 'http://localhost:8080'
    }
  });
}

// Admin Escrow Created Email
export function getAdminEscrowCreatedTemplate(data: {
  serviceName: string;
  vendorName: string;
  customerName: string;
  amount: number;
  currency: string;
  autoReleaseDate: Date;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'New Service Escrow Created',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #2c3e50; margin-bottom: 20px;">🔒 New Escrow Created</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          A new service escrow has been created and requires monitoring.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Escrow Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Vendor:</strong> ${data.vendorName}</p>
          <p><strong>Customer:</strong> ${data.customerName}</p>
          <p><strong>Amount:</strong> ${data.currency} ${data.amount.toLocaleString()}</p>
          <p><strong>Auto-release Date:</strong> ${data.autoReleaseDate.toLocaleDateString()} at ${data.autoReleaseDate.toLocaleTimeString()}</p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #856404; margin-bottom: 10px;">⚠️ Admin Action Required</h4>
          <p style="margin: 5px 0;">• Monitor the escrow for disputes</p>
          <p style="margin: 5px 0;">• Funds will auto-release in 48 hours</p>
          <p style="margin: 5px 0;">• Be ready to intervene if needed</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          You can monitor and manage this escrow from the admin dashboard.
        </p>
      </div>
    `
  });
}

// Customer Service Started Email
export function getCustomerServiceStartedTemplate(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  vendorName: string;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'Service Started',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #2c3e50; margin-bottom: 20px;">🚀 Service Started!</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          Great news! The vendor has started working on your service.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Service Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Vendor:</strong> ${data.vendorName}</p>
          <p><strong>Status:</strong> In Progress</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          You'll be notified when the service is completed. You can then approve it to release payment to the vendor.
        </p>
      </div>
    `
  });
}

// Customer Service Completed Email
export function getCustomerServiceCompletedTemplate(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  vendorName: string;
  escrowId: string;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'Service Completed - Action Required',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #2c3e50; margin-bottom: 20px;">✅ Service Completed!</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          The vendor has marked your service as completed. Please review and take action.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Service Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Vendor:</strong> ${data.vendorName}</p>
          <p><strong>Status:</strong> Completed</p>
        </div>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #27ae60; margin-bottom: 10px;">🎯 Next Steps</h4>
          <p style="margin: 5px 0;">• <strong>Approve:</strong> If satisfied, approve to release payment</p>
          <p style="margin: 5px 0;">• <strong>Dispute:</strong> If not satisfied, dispute with reason</p>
          <p style="margin: 5px 0;">• <strong>Auto-release:</strong> Payment will auto-release in 48 hours</p>
        </div>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/escrow/${data.escrowId}" 
             style="background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px;">
            Review Service
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If you don't take any action, the payment will be automatically released to the vendor after 48 hours.
        </p>
      </div>
    `
  });
}

// Admin Dispute Notification Email
export function getAdminDisputeNotificationTemplate(data: {
  serviceName: string;
  vendorName: string;
  customerName: string;
  disputeReason: string;
  escrowId: string;
  amount: number;
  currency: string;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'Service Dispute - Admin Action Required',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Service Dispute</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          A customer has disputed a service and requires immediate admin attention.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Dispute Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Vendor:</strong> ${data.vendorName}</p>
          <p><strong>Customer:</strong> ${data.customerName}</p>
          <p><strong>Amount:</strong> ${data.currency} ${data.amount.toLocaleString()}</p>
          <p><strong>Dispute Reason:</strong> ${data.disputeReason}</p>
        </div>
        
        <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #721c24; margin-bottom: 10px;">🚨 Immediate Action Required</h4>
          <p style="margin: 5px 0;">• Review the dispute details</p>
          <p style="margin: 5px 0;">• Contact both parties if needed</p>
          <p style="margin: 5px 0;">• Make a decision: Release funds or Refund customer</p>
        </div>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/admin/escrow/${data.escrowId}" 
             style="background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Review Dispute
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          Please resolve this dispute as soon as possible to maintain platform trust.
        </p>
      </div>
    `
  });
}

// Vendor Dispute Notification Email
export function getVendorDisputeNotificationTemplate(data: {
  vendorEmail: string;
  vendorName: string;
  serviceName: string;
  disputeReason: string;
  escrowId: string;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'Service Disputed - Customer Not Satisfied',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Service Disputed</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          A customer has disputed your service. Please review the details.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Dispute Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Dispute Reason:</strong> ${data.disputeReason}</p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #856404; margin-bottom: 10px;">📋 What Happens Next</h4>
          <p style="margin: 5px 0;">• Admin will review the dispute</p>
          <p style="margin: 5px 0;">• You may be contacted for additional information</p>
          <p style="margin: 5px 0;">• Admin will make a final decision</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          Please ensure you provide quality services to avoid disputes in the future.
        </p>
      </div>
    `
  });
}

// Vendor Funds Released Email
export function getVendorFundsReleasedTemplate(data: {
  vendorEmail: string;
  vendorName: string;
  serviceName: string;
  amount: number;
  currency: string;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'Payment Released - Funds Received',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #27ae60; margin-bottom: 20px;">💰 Payment Released!</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          Congratulations! Your payment has been released and should be in your account shortly.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Payment Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Amount Received:</strong> ${data.currency} ${data.amount.toLocaleString()}</p>
          <p><strong>Status:</strong> Released</p>
        </div>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #27ae60; margin-bottom: 10px;">🎉 Great Job!</h4>
          <p style="margin: 5px 0;">• Service completed successfully</p>
          <p style="margin: 5px 0;">• Customer was satisfied</p>
          <p style="margin: 5px 0;">• Payment released to your account</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          Thank you for providing excellent service! Keep up the great work.
        </p>
      </div>
    `
  });
}

// Customer Funds Released Email
export function getCustomerFundsReleasedTemplate(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  amount: number;
  currency: string;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'Service Completed - Payment Released',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #27ae60; margin-bottom: 20px;">✅ Service Completed!</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          Your service has been completed and payment has been released to the vendor.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Service Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Amount Paid:</strong> ${data.currency} ${data.amount.toLocaleString()}</p>
          <p><strong>Status:</strong> Completed & Paid</p>
        </div>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #27ae60; margin-bottom: 10px;">🎉 Thank You!</h4>
          <p style="margin: 5px 0;">• Service completed successfully</p>
          <p style="margin: 5px 0;">• Payment released to vendor</p>
          <p style="margin: 5px 0;">• Transaction completed</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          We hope you're satisfied with the service! Please consider leaving a review.
        </p>
      </div>
    `
  });
}

// Customer Refund Email
export function getCustomerRefundTemplate(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  amount: number;
  currency: string;
  reason: string;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'Refund Processed - Money Returned',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #3498db; margin-bottom: 20px;">💰 Refund Processed</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          Your refund has been processed and the money has been returned to your account.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Refund Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Amount Refunded:</strong> ${data.currency} ${data.amount.toLocaleString()}</p>
          <p><strong>Reason:</strong> ${data.reason}</p>
          <p><strong>Status:</strong> Refunded</p>
        </div>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #1976d2; margin-bottom: 10px;">🛡️ Your Protection</h4>
          <p style="margin: 5px 0;">• Full refund processed</p>
          <p style="margin: 5px 0;">• Money returned to your account</p>
          <p style="margin: 5px 0;">• No charges for disputed service</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          We apologize for any inconvenience. Thank you for using our platform.
        </p>
      </div>
    `
  });
}

// Vendor Refund Notification Email
export function getVendorRefundNotificationTemplate(data: {
  vendorEmail: string;
  vendorName: string;
  serviceName: string;
  amount: number;
  currency: string;
  reason: string;
}) {
  const logoUrl = `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`;
  
  return generateBaseEmailHTML({
    title: 'Service Refunded - Payment Returned to Customer',
    content: `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #e74c3c; margin-bottom: 20px;">💰 Payment Refunded</h2>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          The customer has been refunded for this service. Please review the details.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">Refund Details</h3>
          <p><strong>Service:</strong> ${data.serviceName}</p>
          <p><strong>Amount Refunded:</strong> ${data.currency} ${data.amount.toLocaleString()}</p>
          <p><strong>Reason:</strong> ${data.reason}</p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #856404; margin-bottom: 10px;">📋 Important Notes</h4>
          <p style="margin: 5px 0;">• Payment has been returned to customer</p>
          <p style="margin: 5px 0;">• Please review your service quality</p>
          <p style="margin: 5px 0;">• Focus on customer satisfaction</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          We encourage you to maintain high service standards to avoid future refunds.
        </p>
      </div>
    `
  });
}
