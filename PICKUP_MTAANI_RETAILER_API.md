# 📦 Pick Up Mtaani Retailer Package API

## Overview

This API allows retailers to view their shipping packages with **real-time status** from Pick Up Mtaani while maintaining retailer-specific filtering.

### How It Works:

```
┌─────────────────────────────────────────────────────────┐
│  1. Our Database                                        │
│     - Knows which packages belong to which retailer     │
│     - Stores order and package associations             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  2. Pick Up Mtaani API                                  │
│     - Provides real-time package status                │
│     - Returns ALL business packages                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  3. Merge & Filter                                      │
│     - Match packages by ID                              │
│     - Filter by retailerId                              │
│     - Return retailer-specific data with live status    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📡 API Endpoints

### 1. Get Current Retailer's Packages

**Endpoint:** `GET /api/pickup-mtaani/retailer/packages`

**Description:** Returns all packages for the authenticated retailer with real-time status.

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**

```json
[
  {
    // From our database
    "orderId": "ef1a76ed-cc94-4960-95a7-b0177f21e3b4",
    "retailerId": "1c94646f-88af-46b3-be29-bf7e6fb297bd",
    "retailerName": "Wekesa Bizz",
    "packageValue": 5050,
    "packageName": "Order ef1a76ed - 2 items",
    "customerName": "Test Client",
    "customerPhone": "+254712345678",
    "items": [
      {
        "productId": "prod_123",
        "productName": "Lip Serum",
        "quantity": 1,
        "price": 1650
      },
      {
        "productId": "prod_456",
        "productName": "Brushes",
        "quantity": 1,
        "price": 3400
      }
    ],

    // From Pick Up Mtaani (real-time)
    "packageId": 926079,
    "receiptNo": "PMT-CLA-5135",
    "deliveryFee": 2,
    "senderAgentId": 1295,
    "receiverAgentId": 783,
    "status": "in_transit", // ✨ Real-time status from Pick Up Mtaani
    "createdAt": "2025-10-11T09:36:35.659Z",
    "updatedAt": "2025-10-11T10:30:00.000Z",

    // Order context
    "orderCreatedAt": "2025-10-11T09:35:00.000Z",
    "orderStatus": "confirmed",
    "paymentStatus": "paid"
  }
]
```

**Usage Example:**

```typescript
// Frontend - Retailer Dashboard
const fetchMyPackages = async () => {
  const response = await fetch("/api/pickup-mtaani/retailer/packages", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const packages = await response.json()
  return packages
}
```

---

### 2. Get Packages for Specific Retailer (Admin)

**Endpoint:** `GET /api/pickup-mtaani/retailer/:retailerId/packages`

**Description:** Admin endpoint to view packages for any retailer.

**Parameters:**

- `retailerId` (path) - The retailer's user ID

**Headers:**

```
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Response:** Same as endpoint #1

**Usage Example:**

```bash
curl -X GET \
  'http://localhost:3000/api/pickup-mtaani/retailer/1c94646f-88af-46b3-be29-bf7e6fb297bd/packages' \
  -H 'Authorization: Bearer ADMIN_TOKEN'
```

---

### 3. Get Package by Receipt Number

**Endpoint:** `GET /api/pickup-mtaani/package/:receiptNo`

**Description:** Get detailed package information by receipt number.

**Parameters:**

- `receiptNo` (path) - The Pick Up Mtaani receipt number (e.g., "PMT-CLA-5135")

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 926079,
    "createdAt": "2025-10-11T09:36:35.659Z",
    "customerName": "Test Client",
    "customerPhoneNumber": "+254712345678",
    "packageName": "Order ef1a76ed - 2 items",
    "state": "in_transit",
    "receipt_no": "PMT-CLA-5135",
    "receieverAgentID_id": 783,
    "senderAgentID_id": 1295,
    "businessId_id": 60583,
    "delivery_fee": 2,
    "type": "agent"
  }
}
```

---

### 4. Get All Packages (Admin/Debug)

**Endpoint:** `GET /api/pickup-mtaani/packages/all`

**Description:** Get all business packages from Pick Up Mtaani (no filtering).

**Headers:**

```
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Response:**

```json
{
  "success": true,
  "count": 15,
  "data": [
    // Array of all Pick Up Mtaani packages
  ]
}
```

---

## 🎨 Frontend Implementation Example

### React Component for Retailer Dashboard

```typescript
import { useEffect, useState } from 'react';

interface Package {
  orderId: string;
  packageId: number;
  receiptNo: string;
  packageName: string;
  packageValue: number;
  deliveryFee: number;
  status: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
  createdAt: string;
}

export function RetailerPackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/pickup-mtaani/retailer/packages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPackages(data);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading packages...</div>;

  return (
    <div className="packages-container">
      <h2>My Shipping Packages</h2>

      {packages.length === 0 ? (
        <p>No packages yet</p>
      ) : (
        <div className="packages-grid">
          {packages.map((pkg) => (
            <div key={pkg.packageId} className="package-card">
              <div className="package-header">
                <h3>{pkg.receiptNo}</h3>
                <span className={`status-badge status-${pkg.status}`}>
                  {pkg.status}
                </span>
              </div>

              <div className="package-details">
                <p><strong>Package:</strong> {pkg.packageName}</p>
                <p><strong>Value:</strong> KES {pkg.packageValue}</p>
                <p><strong>Delivery Fee:</strong> KES {pkg.deliveryFee}</p>
                <p><strong>Customer:</strong> {pkg.customerName}</p>
                <p><strong>Phone:</strong> {pkg.customerPhone}</p>
                <p><strong>Created:</strong> {new Date(pkg.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="package-items">
                <h4>Items ({pkg.items.length})</h4>
                <ul>
                  {pkg.items.map((item, index) => (
                    <li key={index}>
                      {item.productName} × {item.quantity} - KES {item.price}
                    </li>
                  ))}
                </ul>
              </div>

              <button onClick={() => window.open(`/order/${pkg.orderId}`, '_blank')}>
                View Order
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 📊 Package Status Values

Pick Up Mtaani package statuses:

| Status       | Description                      |
| ------------ | -------------------------------- |
| `request`    | Package created, awaiting pickup |
| `pending`    | Package pending processing       |
| `in_transit` | Package is being delivered       |
| `delivered`  | Package delivered to customer    |
| `cancelled`  | Package cancelled                |
| `failed`     | Delivery failed                  |

---

## 🔄 Data Refresh Strategy

### Real-time Updates

The system provides **near-real-time** status updates:

1. **On Page Load:** Fetches latest data from Pick Up Mtaani
2. **Manual Refresh:** User can refresh to get latest status
3. **Polling (Optional):** Set up periodic refresh every 30-60 seconds

```typescript
// Polling example
useEffect(() => {
  const interval = setInterval(() => {
    fetchPackages()
  }, 30000) // Refresh every 30 seconds

  return () => clearInterval(interval)
}, [])
```

---

## 🎯 Benefits of This Approach

### ✅ Advantages:

1. **Retailer Isolation**
   - Each retailer only sees their packages
   - No data leakage between retailers

2. **Real-time Status**
   - Always shows current package status from Pick Up Mtaani
   - No stale data

3. **Complete Context**
   - Package data + Order data + Product data
   - Full visibility of what's being shipped

4. **Performance**
   - Single API call gets all data
   - Efficient merging on backend

5. **Scalability**
   - Works with any number of retailers
   - Handles multi-retailer orders correctly

---

## 🚀 Implementation Steps

### Backend (Already Complete ✅)

1. ✅ Created `PickupMtaaniController`
2. ✅ Added `getAllBusinessPackages()` method
3. ✅ Added `getPackageByIdentifier()` method
4. ✅ Created retailer-specific filtering logic
5. ✅ Merged database data with Pick Up Mtaani data

### Frontend (Next Steps)

1. Create retailer packages page
2. Add package list component
3. Implement status badges
4. Add refresh functionality
5. Add package details modal
6. Implement filters (by status, date, etc.)

---

## 🧪 Testing

### Test with cURL:

```bash
# Get your packages (as retailer)
curl -X GET \
  'http://localhost:3000/api/pickup-mtaani/retailer/packages' \
  -H 'Authorization: Bearer YOUR_RETAILER_TOKEN'

# Get package by receipt
curl -X GET \
  'http://localhost:3000/api/pickup-mtaani/package/PMT-CLA-5135' \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Get all packages (admin)
curl -X GET \
  'http://localhost:3000/api/pickup-mtaani/packages/all' \
  -H 'Authorization: Bearer ADMIN_TOKEN'
```

---

## 📝 Notes

### Important Points:

1. **Package Association:** Packages are linked to retailers via `Order.shippingAddress.pickupMtaaniPackages[].retailerId`

2. **Multi-Retailer Orders:** If an order has products from multiple retailers, each retailer only sees their portion

3. **Status Updates:** Status comes from Pick Up Mtaani API in real-time, falls back to stored status if API fails

4. **Performance:** The endpoint queries both database and Pick Up Mtaani API, so expect ~1-2 second response time

5. **Error Handling:** If Pick Up Mtaani API fails, returns packages with stored status (graceful degradation)

---

## 🔮 Future Enhancements

### Planned Features:

1. **Webhooks:** Listen for Pick Up Mtaani delivery status updates
2. **Notifications:** Alert retailer when package status changes
3. **Analytics:** Package delivery time, success rates
4. **Bulk Operations:** Create multiple packages at once
5. **Package Tracking Page:** Customer-facing tracking
6. **Print Labels:** Generate shipping labels

---

**Last Updated:** October 11, 2025  
**Version:** 1.0.0

