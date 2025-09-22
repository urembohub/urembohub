/**
 * Enhanced Onboarding Email Templates
 * Beautiful, modern templates for user onboarding process
 */

import { generateBaseEmailHTML } from './base-template';

export const getAccountCreatedTemplate = (userName: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Congratulations <strong>${userName}</strong>! 🎉</p>
      
      <p class="text-body">Your Urembo Hub account has been successfully created. You're now part of our vibrant community of beauty professionals and customers.</p>
      
      <div class="highlight-box">
        <h3 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Next Steps</h3>
        <ol style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
          <li style="margin-bottom: 8px;">Complete your profile setup</li>
          <li style="margin-bottom: 8px;">Verify your email address</li>
          <li style="margin-bottom: 8px;">Add your business information (if applicable)</li>
          <li style="margin-bottom: 8px;">Upload required documents for verification</li>
          <li style="margin-bottom: 8px;">Start exploring our marketplace</li>
        </ol>
      </div>
      
      <p class="text-body">Our team will review your profile and get back to you within 24-48 hours. In the meantime, feel free to explore our platform and get familiar with all the features.</p>
    </div>
  `;

  return {
    subject: `Account Created Successfully - Welcome to Urembo Hub!`,
    html: generateBaseEmailHTML({
      title: `Account Created Successfully!`,
      preheader: `Your Urembo Hub account is ready. Complete your profile to get started.`,
      content,
      cta_button: {
        text: 'Complete Profile',
        url: 'https://urembohub.com/onboarding',
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

export const getProfileApprovedTemplate = (userName: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Great news <strong>${userName}</strong>! 🎉</p>
      
      <p class="text-body">Your profile has been approved by our team. You're now officially part of the Urembo Hub community and can start using all our features.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-success">Profile Approved</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">What you can do now:</h3>
        <ul style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
          <li style="margin-bottom: 8px;">Browse and book beauty services</li>
          <li style="margin-bottom: 8px;">Connect with beauty professionals</li>
          <li style="margin-bottom: 8px;">Access exclusive deals and offers</li>
          <li style="margin-bottom: 8px;">Leave reviews and ratings</li>
          <li style="margin-bottom: 8px;">Manage your appointments</li>
        </ul>
      </div>
      
      <p class="text-body">Welcome to the Urembo Hub family! We're excited to see what beautiful experiences you'll create with us.</p>
    </div>
  `;

  return {
    subject: `Profile Approved - Welcome to Urembo Hub!`,
    html: generateBaseEmailHTML({
      title: `Profile Approved! 🎉`,
      preheader: `Your profile has been approved. Start exploring our marketplace.`,
      content,
      cta_button: {
        text: 'Explore Marketplace',
        url: 'https://urembohub.com/marketplace',
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

export const getProfileRejectedTemplate = (userName: string, reason: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${userName}</strong>,</p>
      
      <p class="text-body">Thank you for your interest in joining Urembo Hub. After reviewing your profile, we need some additional information before we can approve your account.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-warning">Action Required</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Reason for Review:</h3>
        <p style="margin: 0; color: hsl(var(--foreground)); background: hsl(var(--muted)); padding: 12px; border-radius: 6px; border-left: 4px solid hsl(var(--destructive));">
          ${reason}
        </p>
      </div>
      
      <p class="text-body">Please update your profile with the required information and resubmit for review. Our team will review your updated profile within 24-48 hours.</p>
      
      <p class="text-body">If you have any questions about the review process or need assistance, please don't hesitate to contact our support team.</p>
    </div>
  `;

  return {
    subject: `Profile Review Required - Urembo Hub`,
    html: generateBaseEmailHTML({
      title: `Profile Review Required`,
      preheader: `Additional information needed to approve your profile.`,
      content,
      cta_button: {
        text: 'Update Profile',
        url: 'https://urembohub.com/profile/edit',
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

export const getPaymentMissingTemplate = (userName: string, setupUrl?: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${userName}</strong>,</p>
      
      <p class="text-body">To complete your Urembo Hub setup and start receiving payments, you need to add your payment information.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-info">Payment Setup Required</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Why add payment info?</h3>
        <ul style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
          <li style="margin-bottom: 8px;">Receive payments for your services</li>
          <li style="margin-bottom: 8px;">Process customer bookings</li>
          <li style="margin-bottom: 8px;">Access advanced features</li>
          <li style="margin-bottom: 8px;">Get paid faster and securely</li>
        </ul>
      </div>
      
      <p class="text-body">Setting up your payment information is quick, secure, and takes just a few minutes. We use industry-standard encryption to protect your financial data.</p>
    </div>
  `;

  return {
    subject: `Complete Your Payment Setup - Urembo Hub`,
    html: generateBaseEmailHTML({
      title: `Payment Setup Required`,
      preheader: `Add your payment information to start receiving payments.`,
      content,
      cta_button: {
        text: 'Setup Payment',
        url: setupUrl || 'https://urembohub.com/payment/setup',
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

export const getKycUpdateTemplate = (userName: string, status: string, reason?: string) => {
  const statusConfig = {
    approved: { badge: 'status-success', text: 'KYC Approved', color: 'success' },
    pending: { badge: 'status-warning', text: 'KYC Pending', color: 'warning' },
    rejected: { badge: 'status-danger', text: 'KYC Rejected', color: 'danger' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${userName}</strong>,</p>
      
      <p class="text-body">Your KYC (Know Your Customer) verification status has been updated.</p>
      
      <div class="highlight-box">
        <span class="status-badge ${config.badge}">${config.text}</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Status Update:</h3>
        <p style="margin: 0; color: hsl(var(--foreground));">
          ${reason || `Your KYC verification is now ${status}.`}
        </p>
      </div>
      
      ${status === 'approved' ? `
      <p class="text-body">Great! Your identity has been verified. You now have full access to all Urembo Hub features and can process payments without restrictions.</p>
      ` : status === 'rejected' ? `
      <p class="text-body">We need additional documentation to complete your KYC verification. Please upload the required documents and resubmit for review.</p>
      ` : `
      <p class="text-body">Your KYC verification is being processed. We'll notify you once the review is complete, usually within 24-48 hours.</p>
      `}
    </div>
  `;

  return {
    subject: `KYC Status Update - Urembo Hub`,
    html: generateBaseEmailHTML({
      title: `KYC Status Update`,
      preheader: `Your identity verification status has been updated.`,
      content,
      cta_button: status === 'rejected' ? {
        text: 'Upload Documents',
        url: 'https://urembohub.com/kyc/upload',
        style: 'warning'
      } : status === 'approved' ? {
        text: 'View Dashboard',
        url: 'https://urembohub.com/dashboard',
        style: 'success'
      } : undefined,
      variables: {
        company_name: 'Urembo Hub',
        support_email: 'support@urembohub.com',
        base_url: 'https://urembohub.com',
        logo_url: `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000'}/uploads/assets/logo.png`
      }
    })
  };
};
