// All Required details(fields from prisma schema only) to bypass On-Boarding process for demo Users
/*
This is the schema reference for all fields.
 result {
 |-----------------------------------------------------
 |   role: 'manufacturer',
 |   businessName: "miniroot's Business",
 |   businessDescription: null,
 |   businessAddress: null,
 |   businessPhone: null,
 |   isVerified: true,
 |------------------------------------------------------
 |   onboardingStatus: 'revision_requested',
 |   paymentAccountDetails: null,
 |   paymentAccountType: 'business',
 |   paymentDetailsVerified: false,
 |------------------------------------------------------
 |   paystackSubaccountId: null,
 |   paystackSubaccountVerified: false,
 |   paystackAccountNumber: null,
 |   paystackBusinessName: null,
 |   paystackCommissionRate: null,
 |   paystackPrimaryContactEmail: null,
 |   paystackPrimaryContactName: null,
 |   paystackPrimaryContactPhone: null,
 |   paystackSettlementBank: null,
 |   paystackSubaccountCreatedAt: null,
 |   paystackSubaccountStatus: null,
 |   paystackSubaccountUpdatedAt: null,
 |-------------------------------------------------------
 |   deliveryDetails: null,
 |   deliveryDetailsVerified: false,
 |   deliveryMethod: null,
 |   pickupMtaaniBusinessDetails: null
 |--------------------------------------------------------
 | }
*/

export const details = {
    businessLicenceNumber: 'DLN-987654321',
    taxIdentificationNumber: 'TIN-123456789',
    businessRegistrationDocumentUrl: 'https://example.com/docs/business-registration.pdf',
    businessLogoUrl: 'https://example.com/images/business-logo.png',
    bankName: 'Equity Bank',
    bankAccountNumber: '1234567890',
    bankAccountName: 'Business Int. inc',
    bankBranchCode: '001',
    deliveryPartner: 'Pickup Mtaani',
    deliveryAccountNumber: 'DEL-123456',
    deliveryMethod: 'Standard',
    
};

/*
Backend: Profile payment details: {

paymentAccountType: 'business',

paymentAccountDetails: null,

paymentDetailsVerified: false

}

❌ Backend: No payment details found in Profile. Profile data: {

hasAccountType: true,

hasAccountDetails: false,

accountType: 'business',

accountDetails: null

}

🚚 Backend: Profile delivery details: {

deliveryMethod: null,

deliveryDetails: null,

deliveryDetailsVerified: false

}


// Found schemas
 onboardingStatus                 onboarding_status?         @map("onboarding_status")
  paymentAccountDetails            Json?                      @map("payment_account_details")
  paymentAccountType               String?                    @map("payment_account_type")
  paymentDetailsVerified           Boolean?                   @default(false) @map("payment_details_verified")
  paystackSubaccountId             String?                    @map("paystack_subaccount_id")
  paystackSubaccountVerified       Boolean?                   @default(false) @map("paystack_subaccount_verified")
  
  
  */
