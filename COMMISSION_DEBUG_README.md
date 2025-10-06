# Commission System Debug Guide

This guide helps you debug commission charging issues on your staging server.

## Quick Start

1. **Set environment variables** (optional):
   ```bash
   export API_BASE_URL="https://api.urembohub.com/api"
   export AUTH_TOKEN="your-jwt-token-here"
   ```

2. **Run all tests**:
   ```bash
   node run-commission-tests.js
   ```

3. **Run individual tests**:
   ```bash
   node debug-commission-system.js
   node test-commission-integration.js
   node test-commission-payment-flow.js
   node test-real-payment-flow.js
   node check-commission-logs.js
   ```

## Test Scripts Overview

### 1. `debug-commission-system.js`
**Purpose**: Basic commission system functionality test
**What it tests**:
- Commission settings retrieval
- Commission calculation API
- Recent orders and payment status
- Commission transactions
- Database connectivity

**Use when**: You want a quick overview of the commission system status

### 2. `test-commission-integration.js`
**Purpose**: Commission integration and settings test
**What it tests**:
- Commission settings configuration
- Missing settings detection and creation
- Commission calculation accuracy
- Order processing status
- Commission transaction creation

**Use when**: You suspect configuration issues

### 3. `test-commission-payment-flow.js`
**Purpose**: Payment flow and commission processing test
**What it tests**:
- Payment initialization
- Payment callback simulation
- Commission transaction creation
- Commission processing
- Analytics and reporting

**Use when**: You want to test the complete payment flow

### 4. `test-real-payment-flow.js`
**Purpose**: Test with real payment data
**What it tests**:
- Finds actual paid orders
- Checks for corresponding commission transactions
- Tests commission calculation with real data
- Analyzes payment details

**Use when**: You have real payment data to test with

### 5. `check-commission-logs.js`
**Purpose**: Analyze commission system logs and issues
**What it tests**:
- Commission settings status
- Recent orders analysis
- Commission transactions analysis
- Database connectivity
- Issue diagnosis

**Use when**: You want a detailed analysis of the commission system

## Common Issues and Solutions

### Issue 1: No Commission Settings
**Symptoms**: Commission settings endpoint returns empty array
**Solution**: 
```bash
# Create default commission settings
curl -X POST https://api.urembohub.com/api/commission/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"role": "retailer", "commissionRate": 8.0, "isActive": true}'
```

### Issue 2: Commission Transactions Not Created
**Symptoms**: Paid orders exist but no commission transactions
**Possible causes**:
- Commission processing not called during payment callback
- Commission service not properly injected
- Database connection issues
- Paystack integration problems

**Solution**: Check server logs for detailed error messages

### Issue 3: Commission Calculations Wrong
**Symptoms**: Commission amounts don't match expected values
**Solution**: Verify commission settings and calculation logic

### Issue 4: Payment Callback Not Working
**Symptoms**: Payments succeed but commissions aren't processed
**Solution**: Check Paystack webhook configuration and callback endpoint

## Debugging Steps

1. **Run the test suite**:
   ```bash
   node run-commission-tests.js
   ```

2. **Check specific issues**:
   ```bash
   # Check commission settings
   node debug-commission-system.js
   
   # Check real payment data
   node test-real-payment-flow.js
   
   # Analyze logs and issues
   node check-commission-logs.js
   ```

3. **Review server logs** for detailed error messages

4. **Test with a new payment** transaction

5. **Verify Paystack integration** is working correctly

## Environment Variables

- `API_BASE_URL`: Your API base URL (default: https://api.urembohub.com/api)
- `AUTH_TOKEN`: JWT token for authenticated requests (optional)

## Expected Results

### Healthy Commission System
- ✅ Commission settings configured for all roles
- ✅ Commission calculations working correctly
- ✅ Paid orders have corresponding commission transactions
- ✅ Commission analytics working
- ✅ Database connectivity working

### Unhealthy Commission System
- ❌ No commission settings
- ❌ Commission calculations failing
- ❌ Paid orders without commission transactions
- ❌ Commission analytics failing
- ❌ Database connectivity issues

## Next Steps After Testing

1. **Fix configuration issues** identified by tests
2. **Check server logs** for detailed error messages
3. **Test with a new payment** transaction
4. **Verify Paystack integration** is working
5. **Monitor commission processing** in real-time

## Support

If you continue to have issues after running these tests:

1. Check the server logs for detailed error messages
2. Verify your Paystack integration is working
3. Ensure all required environment variables are set
4. Check that the commission service is properly injected
5. Verify database connectivity and permissions

## Test Script Dependencies

All test scripts require:
- Node.js
- axios package
- Network access to your API server
- Valid API endpoints

Install dependencies:
```bash
npm install axios
```
