/**
 * Enhanced Authentication Email Templates
 * Beautiful, modern templates that match the frontend design system
 */

import { generateBaseEmailHTML } from './base-template';

export const getWelcomeTemplate = (userName: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Welcome to Urembo Hub, <strong>${userName}</strong>! 🎉</p>
      
      <p class="text-body">We're thrilled to have you join our community of beauty professionals and customers. Your account has been successfully created and you're ready to start your journey with us.</p>
      
      <div class="highlight-box">
        <h3 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">What's Next?</h3>
        <ul style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
          <li style="margin-bottom: 8px;">Complete your profile setup</li>
          <li style="margin-bottom: 8px;">Explore our marketplace</li>
          <li style="margin-bottom: 8px;">Connect with beauty professionals</li>
          <li style="margin-bottom: 8px;">Book your first appointment</li>
        </ul>
      </div>
      
      <p class="text-body">If you have any questions or need assistance, our support team is here to help you every step of the way.</p>
    </div>
  `;

  return {
    subject: `Welcome to Urembo Hub, ${userName}! 🎉`,
    html: generateBaseEmailHTML({
      title: `Welcome to Urembo Hub!`,
      preheader: `Your account has been created successfully. Start exploring our beauty marketplace.`,
      content,
      cta_button: {
        text: 'Get Started',
        url: 'https://urembohub.com/dashboard',
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

// Join waitlist template to welcome user.
export const getWaitlistJoinTemplate = (fullName: string, businessName: string, role: string, email: string, message?: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${fullName || 'there'}</strong>,</p>
      <p class="text-body">Welcome to Urembo Hub! We're excited to have you join our waitlist and be part of the future of beauty in Kenya.</p>
      <p class="text-body">As a ${role}, you'll be able to:</p>
      <ul style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
        <li style="margin-bottom: 8px;">Sell beauty products directly to customers</li>
        <li style="margin-bottom: 8px;">Book beauty services for your customers</li>
        <li style="margin-bottom: 8px;">Access exclusive features and tools</li>
        <li style="margin-bottom: 8px;">Get early access to new features</li>
      </ul>
      <p class="text-body">To explore how Urembo Hub is making Kenya smarter with beauty products and services, please visit our demo app:</p>
      <div class="highlight-box">
        <h3 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Next Steps</h3>
        <ul style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
          <li style="margin-bottom: 8px;"><strong>Use your email:</strong> ${email}</li>
          <li style="margin-bottom: 8px;"><strong>Password:</strong> (Same as your account password)</li>
          <li style="margin-bottom: 8px;"><strong>Link:</strong> https://demo.urembohub.com</li>
        </ul>
      </div>
      ${message ? `<p class="text-body">Message from us: ${message}</p>` : ''}
      <p class="text-body">If you have any questions or need assistance, feel free to reach out to our support team. We're here to help you succeed!</p>
    </div>
  `;
  return {
    subject: `Welcome to Urembo Hub Waitlist, ${fullName || 'there'}!`,
    html: generateBaseEmailHTML({
      title: `Welcome to Urembo Hub Waitlist!`,
      preheader: `Thank you for joining our waitlist. Explore our demo app to see how Urembo Hub is transforming beauty in Kenya.`,
      content,
      cta_button: {
        text: 'Visit Demo App',
        url: 'https://demo.urembohub.com',
        style: 'primary'
      },
      variables: {
        company_name: 'Urembo Hub',
        support_email: 'support@urembohub.com',
        base_url: 'https://urembohub.com',
        logo_url: `${process.env.API_URL || process.env.BASE_URL || 'http://localhost:3001'}/uploads/assets/logo.png`
      }
    })
  };
};

// Email verification template.
export const getVerificationTemplate = (userName: string, verificationUrl: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${userName}</strong>,</p>
      
      <p class="text-body">Thank you for signing up with Urembo Hub! To complete your registration and secure your account, please verify your email address.</p>
      
      <div class="highlight-box">
        <h3 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Why verify your email?</h3>
        <ul style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
          <li style="margin-bottom: 8px;">Secure your account</li>
          <li style="margin-bottom: 8px;">Receive important updates</li>
          <li style="margin-bottom: 8px;">Access all features</li>
          <li style="margin-bottom: 8px;">Get booking confirmations</li>
        </ul>
      </div>
      
      <p class="text-body">Click the button below to verify your email address. This link will expire in 24 hours for security reasons.</p>
    </div>
  `;

  return {
    subject: `Verify your email address - Urembo Hub`,
    html: generateBaseEmailHTML({
      title: `Verify Your Email Address`,
      preheader: `Complete your registration by verifying your email address.`,
      content,
      cta_button: {
        text: 'Verify Email Address',
        url: verificationUrl,
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

export const getPasswordResetTemplate = (userName: string, resetUrl: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${userName}</strong>,</p>
      
      <p class="text-body">We received a request to reset your password for your Urembo Hub account. If you made this request, click the button below to create a new password.</p>
      
      <div class="highlight-box">
        <h3 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Security Notice</h3>
        <p style="margin: 0; color: hsl(var(--foreground));">
          This password reset link will expire in <strong>1 hour</strong> for your security. 
          If you didn't request this reset, please ignore this email and your password will remain unchanged.
        </p>
      </div>
      
      <p class="text-body">If you're having trouble with the button above, copy and paste the URL below into your web browser:</p>
      <p style="word-break: break-all; color: hsl(var(--muted-foreground)); font-size: 14px; background: hsl(var(--muted)); padding: 12px; border-radius: 6px; margin: 16px 0;">
        ${resetUrl}
      </p>
    </div>
  `;

  return {
    subject: `Reset your password - Urembo Hub`,
    html: generateBaseEmailHTML({
      title: `Reset Your Password`,
      preheader: `Click the link to reset your password securely.`,
      content,
      cta_button: {
        text: 'Reset Password',
        url: resetUrl,
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

export const getPasswordChangedTemplate = (userName: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${userName}</strong>,</p>
      
      <p class="text-body">Your password has been successfully changed for your Urembo Hub account.</p>
      
      <div class="highlight-box">
        <h3 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Account Security</h3>
        <p style="margin: 0; color: hsl(var(--foreground));">
          Your account is now secured with your new password. If you made this change, no further action is required.
        </p>
      </div>
      
      <p class="text-body">If you didn't make this change, please contact our support team immediately at <a href="mailto:support@urembohub.com" style="color: hsl(var(--primary)); text-decoration: none;">support@urembohub.com</a> or click the button below to secure your account.</p>
    </div>
  `;

  return {
    subject: `Password changed successfully - Urembo Hub`,
    html: generateBaseEmailHTML({
      title: `Password Changed Successfully`,
      preheader: `Your account password has been updated.`,
      content,
      cta_button: {
        text: 'Secure My Account',
        url: 'https://urembohub.com/security',
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

export const getSuspiciousLoginTemplate = (userName: string, loginIp: string, location?: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${userName}</strong>,</p>
      
      <p class="text-body">We detected a login to your Urembo Hub account from a new device or location. Here are the details:</p>
      
      <div class="highlight-box">
        <h3 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Login Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">IP Address:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${loginIp}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Location:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${location || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Time:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
      
      <p class="text-body">If this was you, you can safely ignore this email. If you don't recognize this activity, please secure your account immediately.</p>
    </div>
  `;

  return {
    subject: `Suspicious login detected - Urembo Hub`,
    html: generateBaseEmailHTML({
      title: `Suspicious Login Detected`,
      preheader: `We detected a login from a new device or location.`,
      content,
      cta_button: {
        text: 'Secure My Account',
        url: 'https://urembohub.com/security',
        style: 'danger'
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

export const getPasswordResetOTPTemplate = (userName: string, otp: string) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${userName}</strong>,</p>
      
      <p class="text-body">You requested to reset your password for your Urembo Hub account. Use the OTP code below to proceed with resetting your password.</p>
      
      <div class="highlight-box" style="text-align: center; padding: 30px 20px;">
        <h3 style="margin: 0 0 20px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Your Password Reset Code</h3>
        <div style="background: hsl(var(--muted)); border: 3px solid hsl(var(--primary)); padding: 25px; border-radius: 12px; display: inline-block; margin: 20px 0;">
          <div style="font-size: 42px; font-weight: 700; color: hsl(var(--primary)); letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${otp}
          </div>
        </div>
        <p style="margin: 20px 0 0 0; color: hsl(var(--muted-foreground)); font-size: 14px;">
          This code will expire in <strong>10 minutes</strong> for your security.
        </p>
      </div>
      
      <div style="background: hsl(var(--accent)); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 16px; font-weight: 600;">Security Notice</h4>
        <ul style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
          <li style="margin-bottom: 6px;">Never share this code with anyone</li>
          <li style="margin-bottom: 6px;">Urembo Hub will never ask for your OTP</li>
          <li style="margin-bottom: 6px;">If you didn't request this, please ignore this email</li>
        </ul>
      </div>
      
      <p class="text-body">Enter this code in the password reset form to create a new password. If you didn't request a password reset, you can safely ignore this email and your password will remain unchanged.</p>
    </div>
  `;

  return {
    subject: `Password Reset Code - Urembo Hub`,
    html: generateBaseEmailHTML({
      title: `Password Reset Code`,
      preheader: `Use this code to reset your password.`,
      content,
      cta_button: {
        text: 'Reset Password',
        url: 'https://urembohub.com/auth/reset-password',
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