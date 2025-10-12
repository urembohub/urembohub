# 📦 Pick Up Mtaani Integration - Retailer Shipping

## Overview

This integration enables automatic shipping package creation for **RETAILER product orders** via the Pick Up Mtaani delivery API. Package creation happens automatically after successful payment confirmation.

**Important:** This integration is ONLY for retailers selling physical products. Vendors selling services use the escrow system instead.

---

## 🔑 Environment Variables

Add these variables to your `backend/.env` file:

```bash
# Pick Up Mtaani Configuration
PICKUP_MTAANI_API_KEY=8XD70DT5lJTY5p6NEqTqhNyQAT6XIOJ4XjBny3QvpOFzLyRDZ8jYJsp23I36zjnk
PICKUP_MTAANI_BUSINESS_ID=60583
PICKUP_MTAANI_BASE_URL=https://staging7.dev.pickupmtaani.com/api/v1
```

### Variable Details:

- **PICKUP_MTAANI_API_KEY**: Your Pick Up Mtaani API authentication key
- **PICKUP_MTAANI_BUSINESS_ID**: Your business ID registered with Pick Up Mtaani
- **PICKUP_MTAANI_BASE_URL**: API base URL (staging or production)

---

## 🔄 How It Works

### Automatic Package Creation Flow:

```
1. Customer completes payment via Paystack ✅
2. Paystack webhook confirms payment ✅
3. Order status updated to 'confirmed' ✅
4. 📦 Pick Up Mtaani packages created (NEW!) ✅
   - Groups products by retailer
   - Creates one package per retailer
   - Stores package tracking info
5. Escrow created for service payments ✅
6. Commission transactions processed ✅
7. Notifications sent ✅
```

### Package Creation Logic:

```typescript
For each order after payment confirmation:
  1. Check if order has product items (retailer orders)
  2. If no products → Skip (services-only order)
  3. If has products:
     a. Group products by retailerId
     b. For each retailer:
        - Check retailer has shipping details configured
        - Check client has shipping details configured
        - Get sender agent ID (retailer)
        - Get receiver agent ID (client)
        - Calculate package value
        - Call Pick Up Mtaani API
        - Store package reference in order
```

---

## 📋 Prerequisites

### Retailers Must Configure:

Retailers must set up their shipping details in their profile:

```json
{
  "deliveryMethod": "Pick Up Mtaani Agent Drop-off",
  "areaId": "2",
  "areaName": "Mombasa",
  "locationId": "123",
  "locationName": "BAKARANI-KISAUNI",
  "agentId": "1295",
  "agentName": "Zen Pharmaceuticals"
}
```

**Without this configuration, packages cannot be created for their orders.**

### Clients Must Configure:

Clients must set up their delivery details in their profile:

```json
{
  "deliveryMethod": "Pick Up Mtaani Agent Drop-off",
  "areaId": "1",
  "areaName": "Nairobi",
  "locationId": "253",
  "locationName": "RONGAI",
  "agentId": "783",
  "agentName": "Xtreme media Tuskys"
}
```

**Without this configuration, no packages can be created.**

---

## 💾 Data Storage

Package tracking information is stored in the `Order.shippingAddress` JSON field:

```typescript
{
  // Existing client delivery details
  deliveryMethod: "Pick Up Mtaani Agent Drop-off",
  areaName: "Nairobi",
  locationName: "RONGAI",
  agentId: "783",
  agentName: "Xtreme media Tuskys",

  // NEW: Pick Up Mtaani package tracking
  pickupMtaaniPackages: [
    {
      retailerId: "retailer_abc123",
      retailerName: "Beauty Store Kenya",
      packageId: 926079,
      receiptNo: "PMT-CLA-5135",
      deliveryFee: 2,
      senderAgentId: 1295,
      receiverAgentId: 783,
      packageValue: 1650,
      packageName: "Order abc12345 - 3 items",
      status: "request",
      createdAt: "2025-10-11T09:36:35.659Z",
      items: [
        {
          productId: "prod_123",
          productName: "Lip Serum",
          quantity: 1,
          price: 1650
        }
      ]
    }
    // More packages if multiple retailers
  ]
}
```

---

## 🎯 API Reference

### Create Package Endpoint

**Endpoint:** `POST /api/v1/packages/agent-agent?b_id={businessId}`

**Headers:**

```json
{
  "accept": "application/json",
  "apiKey": "YOUR_API_KEY",
  "Content-Type": "application/json"
}
```

**Request Body:**

```json
{
  "receieverAgentID_id": 669,
  "senderAgentID_id": 1295,
  "packageValue": 500,
  "customerName": "Ben",
  "packageName": "Sweets",
  "customerPhoneNumber": "0745021806",
  "paymentOption": "vendor",
  "on_delivery_balance": 0
}
```

**Response:**

```json
{
  "message": "Package created successfully",
  "data": {
    "id": 926079,
    "createdAt": "2025-10-11T09:36:35.659Z",
    "customerName": "Ben",
    "customerPhoneNumber": "0745021806",
    "packageName": "Sweets",
    "state": "request",
    "receipt_no": "PMT-CLA-5135",
    "receieverAgentID_id": 669,
    "senderAgentID_id": 1295,
    "businessId_id": 60583,
    "delivery_fee": 2,
    "type": "agent"
  }
}
```

---

## 🚨 Error Handling

### The system handles these scenarios gracefully:

1. **Services-Only Orders**
   - ✅ Skips package creation
   - ✅ Order completes successfully
   - ✅ Escrow created for services

2. **Client Missing Shipping Details**
   - ❌ Logs error
   - ✅ Order completes successfully
   - ⚠️ Admin notified to follow up

3. **Retailer Missing Shipping Details**
   - ⚠️ Logs warning
   - ✅ Skips that retailer's package
   - ✅ Creates packages for other retailers
   - ⚠️ Retailer notified to configure shipping

4. **API Failures**
   - ❌ Logs detailed error
   - ✅ Order completes successfully
   - ✅ Payment not reversed
   - ⚠️ Package can be created manually

**Critical:** Package creation failures do NOT fail the payment process. Orders remain valid and can be fulfilled manually if needed.

---

## 📊 Multi-Retailer Example

### Scenario: Order with 3 retailers

```
Cart:
  - Product A from Retailer 1 (KES 500)
  - Product B from Retailer 1 (KES 300)
  - Product C from Retailer 2 (KES 700)
  - Product D from Retailer 3 (KES 400)

Result:
  - Package 1: Retailer 1 → Client (Value: KES 800)
  - Package 2: Retailer 2 → Client (Value: KES 700)
  - Package 3: Retailer 3 → Client (Value: KES 400)

Total: 3 packages, 3 receipt numbers
```

Each retailer ships independently via their configured agent.

---

## 🧪 Testing

### Test Scenarios:

1. **Single Retailer Order**

   ```bash
   - Add 1 product to cart
   - Complete payment
   - Check order.shippingAddress for package
   ```

2. **Multi-Retailer Order**

   ```bash
   - Add products from 3 different retailers
   - Complete payment
   - Verify 3 packages created
   ```

3. **Mixed Order (Products + Services)**

   ```bash
   - Add products + book service
   - Complete payment
   - Verify packages for products only
   - Verify escrow for service
   ```

4. **Missing Configuration**
   ```bash
   - Order without retailer shipping details
   - Check logs for warning
   - Verify order still completes
   ```

---

## 📝 Logs

The integration provides detailed logging:

```
📦 [PICKUP_MTAANI] CREATING SHIPPING PACKAGES FOR RETAILERS
📦 [PICKUP_MTAANI] Order ID: abc123
📦 [PICKUP_MTAANI] Found 5 product item(s) to ship
📦 [PICKUP_MTAANI] Grouped items into 2 retailer(s)
📦 [PICKUP_MTAANI] Processing package 1/2
📦 [PICKUP_MTAANI] Retailer: Beauty Store Kenya
✅ [PICKUP_MTAANI] Package created: PMT-CLA-5135
```

Look for these logs in your backend console when testing.

---

## 🔮 Future Enhancements

### Planned Features:

1. **Package Status Tracking**
   - Webhook from Pick Up Mtaani
   - Update order status on delivery
   - Notify customer

2. **Manual Package Creation**
   - Admin/Retailer can create packages manually
   - For orders where auto-creation failed

3. **Delivery Analytics**
   - Track delivery times
   - Monitor failed deliveries
   - Retailer performance metrics

4. **Bulk Operations**
   - Create multiple packages at once
   - Batch delivery scheduling

---

## 🆘 Troubleshooting

### Issue: No packages created

**Check:**

- ✅ Order has product items?
- ✅ Client has deliveryDetails configured?
- ✅ Retailer has deliveryDetails configured?
- ✅ Environment variables set correctly?
- ✅ Pick Up Mtaani API accessible?

### Issue: Some packages created, some failed

**Reason:** Likely some retailers missing shipping configuration

**Solution:**

- Check logs for specific retailer warnings
- Notify retailers to configure shipping
- Create packages manually via admin panel (future)

### Issue: API timeout

**Reason:** Pick Up Mtaani API slow/unavailable

**Impact:** Order completes, package creation can be retried

**Solution:**

- Check PICKUP_MTAANI_BASE_URL
- Verify network connectivity
- Contact Pick Up Mtaani support

---

## 📞 Support

For issues with:

- **Integration code:** Check backend logs
- **Pick Up Mtaani API:** Contact Pick Up Mtaani support
- **Missing configuration:** Guide users to profile settings

---

## ✅ Implementation Checklist

- [x] Create PickupMtaaniService
- [x] Create PickupMtaaniModule
- [x] Update PaymentsService with package creation
- [x] Update PaymentsModule imports
- [x] Register PickupMtaaniModule in AppModule
- [x] Add environment variables
- [ ] Test single retailer order
- [ ] Test multi-retailer order
- [ ] Test mixed order (products + services)
- [ ] Test error scenarios
- [ ] Update UI to display package tracking

---

**Last Updated:** October 11, 2025  
**Version:** 1.0.0

