/**
 * Enhanced Booking Email Templates
 * Beautiful, modern templates for appointment bookings
 */

import { generateBaseEmailHTML } from './base-template';

export const getBookingConfirmedClientTemplate = (clientName: string, bookingData: any) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${clientName}</strong>,</p>
      
      <p class="text-body">Your appointment has been confirmed! We're excited to provide you with an amazing beauty experience.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-success">Confirmed</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Appointment Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Service:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${bookingData.serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Date:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${new Date(bookingData.appointmentDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Time:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${bookingData.startTime} - ${bookingData.endTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Price:</td>
            <td style="padding: 8px 0; color: hsl(var(--price-red)); font-weight: 700; font-size: 18px;">${bookingData.currency} ${bookingData.price}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: hsl(var(--accent)); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 16px; font-weight: 600;">Important Reminders:</h4>
        <ul style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
          <li style="margin-bottom: 6px;">Arrive 10 minutes early for your appointment</li>
          <li style="margin-bottom: 6px;">Bring a valid ID for verification</li>
          <li style="margin-bottom: 6px;">Cancel or reschedule at least 24 hours in advance</li>
          <li style="margin-bottom: 6px;">Contact the salon if you have any questions</li>
        </ul>
      </div>
      
      <p class="text-body">We'll send you a reminder 24 hours before your appointment. We can't wait to see you!</p>
    </div>
  `;

  return {
    subject: `Appointment Confirmed - ${bookingData.serviceName}`,
    html: generateBaseEmailHTML({
      title: `Appointment Confirmed! 📅`,
      preheader: `Your beauty appointment has been confirmed.`,
      content,
      cta_button: {
        text: 'View Appointment',
        url: `https://urembohub.com/appointments/${bookingData.bookingId}`,
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

export const getBookingConfirmedVendorTemplate = (vendorName: string, bookingData: any) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${vendorName}</strong>,</p>
      
      <p class="text-body">You have a new appointment booking! A client has booked your service and is looking forward to their visit.</p>
      
      <div class="highlight-box">
        <span class="status-badge status-info">New Booking</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Booking Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Service:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${bookingData.serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Date:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${new Date(bookingData.appointmentDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Time:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${bookingData.startTime} - ${bookingData.endTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Earnings:</td>
            <td style="padding: 8px 0; color: hsl(var(--price-red)); font-weight: 700; font-size: 18px;">${bookingData.currency} ${bookingData.price}</td>
          </tr>
        </table>
      </div>
      
      <p class="text-body">Please prepare for this appointment and ensure you have all necessary supplies. The client will receive a confirmation email as well.</p>
    </div>
  `;

  return {
    subject: `New Booking - ${bookingData.serviceName}`,
    html: generateBaseEmailHTML({
      title: `New Booking Received!`,
      preheader: `A client has booked your service.`,
      content,
      cta_button: {
        text: 'View Booking',
        url: `https://urembohub.com/vendor/appointments/${bookingData.bookingId}`,
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

export const getBookingReminderTemplate = (clientName: string, bookingData: any) => {
  const content = `
    <div class="content-section">
      <p class="text-body">Hi <strong>${clientName}</strong>,</p>
      
      <p class="text-body">This is a friendly reminder about your upcoming appointment tomorrow. We're looking forward to seeing you!</p>
      
      <div class="highlight-box">
        <span class="status-badge status-info">Reminder</span>
        <h3 style="margin: 12px 0; color: hsl(var(--primary)); font-size: 18px; font-weight: 600;">Appointment Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Service:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${bookingData.serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Date:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${new Date(bookingData.appointmentDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: hsl(var(--foreground));">Time:</td>
            <td style="padding: 8px 0; color: hsl(var(--muted-foreground));">${bookingData.startTime} - ${bookingData.endTime}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: hsl(var(--accent)); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; color: hsl(var(--primary)); font-size: 16px; font-weight: 600;">Quick Reminders:</h4>
        <ul style="margin: 0; padding-left: 20px; color: hsl(var(--foreground));">
          <li style="margin-bottom: 6px;">Arrive 10 minutes early</li>
          <li style="margin-bottom: 6px;">Bring a valid ID</li>
          <li style="margin-bottom: 6px;">Contact us if you need to reschedule</li>
        </ul>
      </div>
      
      <p class="text-body">If you need to cancel or reschedule, please do so as soon as possible. We can't wait to provide you with an amazing experience!</p>
    </div>
  `;

  return {
    subject: `Appointment Reminder - Tomorrow at ${bookingData.startTime}`,
    html: generateBaseEmailHTML({
      title: `Appointment Reminder 📅`,
      preheader: `Your appointment is tomorrow. Don't forget!`,
      content,
      cta_button: {
        text: 'View Appointment',
        url: `https://urembohub.com/appointments/${bookingData.bookingId}`,
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

