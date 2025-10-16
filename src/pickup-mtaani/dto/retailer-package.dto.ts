export interface RetailerPackageDto {
  // From our database
  orderId: string
  retailerId: string
  retailerName: string
  businessId?: string
  packageValue: number
  packageName: string
  customerName: string
  customerPhone: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
  }>

  // From Pick Up Mtaani
  packageId: number
  receiptNo: string
  deliveryFee: number
  senderAgentId: number
  receiverAgentId: number
  status: string // current status from Pick Up Mtaani
  createdAt: string
  updatedAt?: string
  trackingLink?: string // tracking link from Pick Up Mtaani

  // Order details
  orderCreatedAt: string
  orderStatus: string
  paymentStatus: string
}

export interface PackageStatusUpdate {
  packageId: number
  receiptNo: string
  status: string
  updatedAt: string
}

