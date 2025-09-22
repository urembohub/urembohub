# Backend Email Testing Guide

This guide explains how to test all email functionality in the Urembo Hub backend using NestJS and Resend.

## 📧 Available Email Types

The backend supports 6 main categories of emails:

### 1. Authentication Emails (5 types)
- **Welcome** - New user welcome email
- **Email Verification** - Account verification
- **Password Reset** - Password reset instructions
- **Password Changed** - Password change confirmation
- **Suspicious Login** - Security alert for unusual activity

### 2. Onboarding Emails (5 types)
- **Account Created** - Business account creation confirmation
- **Profile Approved** - Business profile approval notification
- **Profile Rejected** - Business profile rejection with reasons
- **Payment Missing** - Reminder to setup payment details
- **KYC Update** - KYC document verification status updates

### 3. Order Emails (4 types)
- **New Order** - New order notification for vendors
- **Order Accepted** - Order acceptance confirmation
- **Order Shipped** - Shipment notification with tracking
- **Order Delivered** - Delivery confirmation

### 4. Booking Emails (3 types)
- **Booking Confirmed (Client)** - Service booking confirmation
- **Booking Confirmed (Vendor)** - New booking notification for vendors
- **Booking Reminder** - Appointment reminder

### 5. Payment Emails (2 types)
- **Payment Successful** - Payment success confirmation
- **Payment Failed** - Payment failure notification

### 6. Admin Emails (2 types)
- **Dispute Pending** - New dispute requiring admin review
- **High-Value Order** - High-value order monitoring alert

## 🚀 How to Test Emails

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the backend root with:
   ```env
   RESEND_API_KEY=your_resend_api_key_here
   DATABASE_URL="postgresql://user:password@localhost:5432/urembo_hub"
   JWT_SECRET="your_jwt_secret_key_here"
   ```

### Test Commands

**Test all emails:**
```bash
npm run test:emails
```

**Test specific categories:**
```bash
# Authentication emails
npm run test:emails:auth

# Onboarding emails (includes KYC)
npm run test:emails:onboarding

# Order emails
npm run test:emails:orders

# Booking emails
npm run test:emails:bookings

# Payment emails
npm run test:emails:payments

# Admin emails (includes disputePending)
npm run test:emails:admin
```

## 📧 What You'll Receive

After running the tests, check `benardogutu65@gmail.com` for:

- **Authentication:** 5 emails (welcome, verification, password reset, etc.)
- **Onboarding:** 5 emails (account created, profile approved/rejected, KYC updates, etc.)
- **Orders:** 4 emails (new order, accepted, shipped, delivered)
- **Bookings:** 3 emails (client confirmed, vendor confirmed, reminder)
- **Payments:** 2 emails (successful, failed)
- **Admin:** 2 emails (dispute pending, high value order)

**Total: 21+ test emails**

## 🎯 Your Specific Requests

### Test disputePending email:
```bash
npm run test:emails:admin
```

### Test kycUpdate email:
```bash
npm run test:emails:onboarding
```

## 🔧 Configuration

### Environment Variables

Make sure these are set in your `.env` file:

```env
# Required for email functionality
RESEND_API_KEY=re_your_api_key_here

# Database (required for NestJS context)
DATABASE_URL="postgresql://user:password@localhost:5432/urembo_hub"

# JWT (required for NestJS context)
JWT_SECRET="your_jwt_secret_key_here"
```

### Email Service Configuration

The email service is configured in `src/email/email.service.ts`:

- **From Email:** `noreply@urembohub.com`
- **From Name:** `Urembo Hub`
- **Reply To:** `support@urembohub.com`

## 🔍 Troubleshooting

### Common Issues

1. **"RESEND_API_KEY not found"**
   - Check that `RESEND_API_KEY` is set in your `.env` file
   - Make sure the API key starts with `re_`

2. **"Database connection failed"**
   - Ensure your database is running
   - Check the `DATABASE_URL` in your `.env` file

3. **"Module not found" errors**
   - Run `npm install` to install dependencies
   - Make sure you're in the backend directory

4. **Emails not received**
   - Check spam/junk folder
   - Verify email address is correct
   - Check Resend dashboard for delivery status

### Debug Mode

To see detailed logs, set the log level in your environment:

```env
LOG_LEVEL=debug
```

## 📊 Expected Output

```
🚀 Starting Backend Email Testing Suite
📧 Test emails will be sent to: benardogutu65@gmail.com
============================================================

🔐 Testing Authentication Emails...
  📧 Sending welcome email...
  ✅ Welcome email sent successfully: abc123
  📧 Sending email verification...
  ✅ Email verification sent successfully: def456
...

🎉 All email tests completed successfully!
⏱️  Total time: 15.23 seconds
📧 Check your inbox at benardogutu65@gmail.com for all test emails
============================================================
```

## 🏗️ Architecture

The email system is built with:

- **NestJS** - Framework for the email service
- **Resend** - Email delivery service
- **TypeScript** - Type safety and better development experience
- **Modular Design** - Easy to extend and maintain

### File Structure

```
src/
├── email/
│   ├── email.service.ts    # Main email service
│   └── email.module.ts     # Email module
├── scripts/
│   └── test-emails.ts      # Email testing script
└── app.module.ts           # Updated to include EmailModule
```

## 🚀 Quick Start

1. **Setup:**
   ```bash
   cd urembo-backend
   npm install
   ```

2. **Configure:**
   ```bash
   # Create .env file with your Resend API key
   echo "RESEND_API_KEY=re_your_api_key_here" > .env
   ```

3. **Test:**
   ```bash
   # Test all emails
   npm run test:emails
   
   # Test specific emails
   npm run test:emails:admin      # Includes disputePending
   npm run test:emails:onboarding # Includes kycUpdate
   ```

That's it! You're ready to test all email functionality from the backend. 🎉
