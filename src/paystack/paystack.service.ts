import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubaccountDto, UpdateSubaccountDto, SubaccountResponseDto } from './dto/create-subaccount.dto';
import axios from 'axios';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!this.paystackSecretKey) {
      this.logger.error('PAYSTACK_SECRET_KEY is not configured');
    }
  }

  /**
   * Test Paystack API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await axios.get(`${this.paystackBaseUrl}/bank`, {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.status) {
        this.logger.log('Paystack API connection successful');
        return {
          success: true,
          message: 'Paystack API connection successful',
          data: {
            banksCount: response.data.data?.length || 0,
            message: response.data.message
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Paystack API connection failed'
        };
      }
    } catch (error) {
      this.logger.error('Paystack API connection failed:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to connect to Paystack API'
      };
    }
  }

  /**
   * Get list of banks for sub-account creation (Kenyan banks only)
   */
  async getBanks(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      // Fetch banks with country filter for Kenya
      const response = await axios.get(`${this.paystackBaseUrl}/bank?country=Kenya`, {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.status) {
        // Filter for Kenyan banks and sort alphabetically
        const kenyanBanks = response.data.data
          .filter((bank: any) => bank.country === 'Kenya')
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

        this.logger.log(`Found ${kenyanBanks.length} Kenyan banks from Paystack API`);
        
        // If we found Kenyan banks, return them
        if (kenyanBanks.length > 0) {
          return {
            success: true,
            data: kenyanBanks
          };
        }
      }
      
      // Fallback: Return a curated list of major Kenyan banks
      this.logger.log('Using fallback list of Kenyan banks');
      const fallbackKenyanBanks = [
        { id: 1, name: 'Absa Bank Kenya PLC', code: '03', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 2, name: 'Bank of Africa Kenya Limited', code: '04', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 3, name: 'Bank of Baroda (Kenya) Limited', code: '05', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 4, name: 'Citibank N.A. Kenya', code: '06', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 5, name: 'Cooperative Bank of Kenya Limited', code: '11', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 6, name: 'Credit Bank Limited', code: '12', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 7, name: 'Diamond Trust Bank Kenya Limited', code: '13', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 8, name: 'Ecobank Kenya Limited', code: '14', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 9, name: 'Equity Bank Kenya Limited', code: '15', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 10, name: 'Family Bank Limited', code: '16', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 11, name: 'First Community Bank', code: '17', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 12, name: 'Guardian Bank Limited', code: '18', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 13, name: 'GTBank Kenya Limited', code: '19', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 14, name: 'Housing Finance Company of Kenya', code: '20', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 15, name: 'I&M Bank Limited', code: '21', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 16, name: 'Jamii Bora Bank Limited', code: '22', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 17, name: 'KCB Bank Kenya Limited', code: '23', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 18, name: 'Mayfair Bank Limited', code: '25', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 19, name: 'Middle East Bank Kenya Limited', code: '26', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 20, name: 'Mombasa County Investment Cooperative', code: '27', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 21, name: 'National Bank of Kenya Limited', code: '28', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 22, name: 'NCBA Bank Kenya PLC', code: '29', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 23, name: 'Paramount Universal Bank Limited', code: '30', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 24, name: 'Prime Bank Limited', code: '31', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 25, name: 'SBM Bank Kenya Limited', code: '32', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 26, name: 'Standard Chartered Bank Kenya Limited', code: '33', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 27, name: 'Stanbic Bank Kenya Limited', code: '34', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 28, name: 'Trans National Bank Limited', code: '35', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 29, name: 'United Bank for Africa Kenya Limited', code: '36', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 30, name: 'Victoria Commercial Bank Limited', code: '37', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 31, name: 'Windsor Bank Limited', code: '38', country: 'Kenya', currency: 'KES', type: 'nuban' }
      ];

      return {
        success: true,
        data: fallbackKenyanBanks
      };

    } catch (error) {
      this.logger.error('Failed to fetch banks from Paystack API:', error.response?.data || error.message);
      
      // Fallback: Return a curated list of major Kenyan banks
      this.logger.log('Using fallback list of Kenyan banks due to API error');
      const fallbackKenyanBanks = [
        { id: 1, name: 'Absa Bank Kenya PLC', code: '03', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 2, name: 'Bank of Africa Kenya Limited', code: '04', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 3, name: 'Cooperative Bank of Kenya Limited', code: '11', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 4, name: 'Diamond Trust Bank Kenya Limited', code: '13', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 5, name: 'Equity Bank Kenya Limited', code: '15', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 6, name: 'Family Bank Limited', code: '16', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 7, name: 'I&M Bank Limited', code: '21', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 8, name: 'KCB Bank Kenya Limited', code: '23', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 9, name: 'NCBA Bank Kenya PLC', code: '29', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 10, name: 'Standard Chartered Bank Kenya Limited', code: '33', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 11, name: 'Stanbic Bank Kenya Limited', code: '34', country: 'Kenya', currency: 'KES', type: 'nuban' },
        { id: 12, name: 'United Bank for Africa Kenya Limited', code: '36', country: 'Kenya', currency: 'KES', type: 'nuban' }
      ];

      return {
        success: true,
        data: fallbackKenyanBanks
      };
    }
  }

  /**
   * Create a Paystack sub-account for a retailer
   */
  async createSubaccount(userId: string, createSubaccountDto: CreateSubaccountDto): Promise<SubaccountResponseDto> {
    try {
      this.logger.log(`🔍 [SUBACCOUNT_CREATE] Starting sub-account creation for user: ${userId}`);
      this.logger.log(`🔍 [SUBACCOUNT_CREATE] CreateSubaccountDto:`, JSON.stringify(createSubaccountDto, null, 2));
      
      // Get user profile
      const user = await this.prisma.profile.findUnique({
        where: { id: userId }
      });

      if (!user) {
        this.logger.error(`❌ [SUBACCOUNT_CREATE] User not found: ${userId}`);
        throw new NotFoundException('User not found');
      }

      this.logger.log(`🔍 [SUBACCOUNT_CREATE] User found:`, {
        id: user.id,
        email: user.email,
        role: user.role,
        currentPaystackSubaccountId: user.paystackSubaccountId
      });

      // Check if user already has an active subaccount
      if (user.paystackSubaccountId) {
        this.logger.log(`🔍 [SUBACCOUNT_CREATE] User already has sub-account ID: ${user.paystackSubaccountId}`);
        try {
          // Verify if the sub-account still exists and is active in Paystack
          this.logger.log(`🔍 [SUBACCOUNT_CREATE] Verifying existing sub-account with Paystack...`);
          const existingSubaccount = await this.getSubaccount(userId);
          if (existingSubaccount) {
            this.logger.warn(`⚠️ [SUBACCOUNT_CREATE] User already has an active Paystack subaccount: ${existingSubaccount.subaccountCode}`);
            throw new BadRequestException('User already has an active Paystack subaccount');
          }
        } catch (error) {
          // If sub-account doesn't exist in Paystack, clear the database record
          this.logger.warn(`⚠️ [SUBACCOUNT_CREATE] Sub-account ${user.paystackSubaccountId} not found in Paystack, clearing database record`);
          await this.prisma.profile.update({
            where: { id: userId },
            data: { paystackSubaccountId: null }
          });
          this.logger.log(`✅ [SUBACCOUNT_CREATE] Cleared orphaned sub-account record from database`);
        }
      }

      // Get commission rate from CommissionSettings or use default
      const commissionSettings = await this.prisma.commissionSettings.findUnique({
        where: { role: user.role }
      });

      const commissionRate = createSubaccountDto.percentageCharge || 
        (commissionSettings?.commissionRate ? Number(commissionSettings.commissionRate) : 5.0);

      // Prepare Paystack payload
      const paystackPayload = {
        business_name: createSubaccountDto.businessName,
        settlement_bank: createSubaccountDto.settlementBank,
        account_number: createSubaccountDto.accountNumber,
        percentage_charge: commissionRate,
        primary_contact_email: createSubaccountDto.primaryContactEmail,
        primary_contact_name: createSubaccountDto.primaryContactName,
        primary_contact_phone: createSubaccountDto.primaryContactPhone || null,
        description: createSubaccountDto.description || `${user.role} account for ${createSubaccountDto.businessName}`,
        metadata: {
          user_id: userId,
          role: user.role,
          created_via: "backend_api"
        }
      };

      this.logger.log(`🔍 [SUBACCOUNT_CREATE] Paystack payload prepared:`, JSON.stringify(paystackPayload, null, 2));

      // Call Paystack API
      this.logger.log(`🔍 [SUBACCOUNT_CREATE] Calling Paystack API to create sub-account...`);
      const response = await axios.post(
        `${this.paystackBaseUrl}/subaccount`,
        paystackPayload,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`🔍 [SUBACCOUNT_CREATE] Paystack API response:`, JSON.stringify(response.data, null, 2));

      if (!response.data.status) {
        this.logger.error(`❌ [SUBACCOUNT_CREATE] Paystack API failed:`, response.data.message);
        throw new BadRequestException(response.data.message || 'Failed to create subaccount');
      }

      const subaccount = response.data.data;
      this.logger.log(`✅ [SUBACCOUNT_CREATE] Paystack sub-account created successfully:`, {
        subaccountCode: subaccount.subaccount_code,
        businessName: subaccount.business_name,
        settlementBank: subaccount.settlement_bank,
        accountNumber: subaccount.account_number
      });

      // Update user profile with subaccount data
      this.logger.log(`🔍 [SUBACCOUNT_CREATE] Updating user profile in database...`);
      const updateData = {
        paystackSubaccountId: subaccount.subaccount_code,
        paystackSubaccountVerified: subaccount.is_verified,
        // Temporarily comment out fields that need Prisma client regeneration
        // paystackCommissionRate: commissionRate,
        // paystackSubaccountCreatedAt: new Date(),
        // paystackSubaccountUpdatedAt: new Date(),
        // paystackSubaccountStatus: 'active',
        // paystackSettlementBank: createSubaccountDto.settlementBank,
        // paystackAccountNumber: createSubaccountDto.accountNumber,
        // paystackBusinessName: createSubaccountDto.businessName,
        // paystackPrimaryContactEmail: createSubaccountDto.primaryContactEmail,
        // paystackPrimaryContactName: createSubaccountDto.primaryContactName,
        // paystackPrimaryContactPhone: createSubaccountDto.primaryContactPhone,
      };
      
      this.logger.log(`🔍 [SUBACCOUNT_CREATE] Database update data:`, JSON.stringify(updateData, null, 2));
      
      await this.prisma.profile.update({
        where: { id: userId },
        data: updateData,
      });

      this.logger.log(`✅ [SUBACCOUNT_CREATE] Successfully updated user profile with sub-account: ${subaccount.subaccount_code}`);

      return {
        subaccountCode: subaccount.subaccount_code,
        businessName: subaccount.business_name,
        settlementBank: subaccount.settlement_bank,
        accountNumber: subaccount.account_number,
        isVerified: subaccount.is_verified,
        primaryContactEmail: subaccount.primary_contact_email,
        primaryContactName: subaccount.primary_contact_name,
        primaryContactPhone: subaccount.primary_contact_phone,
        percentageCharge: subaccount.percentage_charge,
        description: subaccount.description,
        createdAt: new Date(subaccount.created_at),
        updatedAt: new Date(subaccount.updated_at),
      };

    } catch (error) {
      this.logger.error(`❌ [SUBACCOUNT_CREATE] Error creating sub-account for user ${userId}:`, error);
      this.logger.error(`❌ [SUBACCOUNT_CREATE] Error details:`, {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to create subaccount. Please check your details and try again.');
    }
  }

  /**
   * Get sub-account information for a user
   */
  async getSubaccount(userId: string): Promise<SubaccountResponseDto | null> {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: {
        paystackSubaccountId: true,
        paystackSubaccountVerified: true,
        // Temporarily comment out fields that need Prisma client regeneration
        // paystackCommissionRate: true,
        // paystackSubaccountCreatedAt: true,
        // paystackSubaccountUpdatedAt: true,
        // paystackSubaccountStatus: true,
        // paystackSettlementBank: true,
        // paystackAccountNumber: true,
        // paystackBusinessName: true,
        // paystackPrimaryContactEmail: true,
        // paystackPrimaryContactName: true,
        // paystackPrimaryContactPhone: true,
      }
    });

    if (!user || !user.paystackSubaccountId) {
      return null;
    }

    return {
      subaccountCode: user.paystackSubaccountId,
      businessName: '', // user.paystackBusinessName || '',
      settlementBank: '', // user.paystackSettlementBank || '',
      accountNumber: '', // user.paystackAccountNumber || '',
      isVerified: user.paystackSubaccountVerified || false,
      primaryContactEmail: '', // user.paystackPrimaryContactEmail || '',
      primaryContactName: '', // user.paystackPrimaryContactName || '',
      primaryContactPhone: undefined, // user.paystackPrimaryContactPhone || undefined,
      percentageCharge: 0, // user.paystackCommissionRate || 0,
      createdAt: new Date(), // user.paystackSubaccountCreatedAt || new Date(),
      updatedAt: new Date(), // user.paystackSubaccountUpdatedAt || new Date(),
    };
  }

  /**
   * Update sub-account information
   */
  async updateSubaccount(userId: string, updateSubaccountDto: UpdateSubaccountDto): Promise<SubaccountResponseDto> {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId }
    });

    if (!user || !user.paystackSubaccountId) {
      throw new NotFoundException('Subaccount not found');
    }

    try {
      // Prepare update payload for Paystack
      const updatePayload: any = {};
      
      if (updateSubaccountDto.businessName) updatePayload.business_name = updateSubaccountDto.businessName;
      if (updateSubaccountDto.settlementBank) updatePayload.settlement_bank = updateSubaccountDto.settlementBank;
      if (updateSubaccountDto.accountNumber) updatePayload.account_number = updateSubaccountDto.accountNumber;
      if (updateSubaccountDto.percentageCharge !== undefined) updatePayload.percentage_charge = updateSubaccountDto.percentageCharge;
      if (updateSubaccountDto.primaryContactEmail) updatePayload.primary_contact_email = updateSubaccountDto.primaryContactEmail;
      if (updateSubaccountDto.primaryContactName) updatePayload.primary_contact_name = updateSubaccountDto.primaryContactName;
      if (updateSubaccountDto.primaryContactPhone) updatePayload.primary_contact_phone = updateSubaccountDto.primaryContactPhone;
      if (updateSubaccountDto.description) updatePayload.description = updateSubaccountDto.description;

      // Call Paystack API to update subaccount
      const response = await axios.put(
        `${this.paystackBaseUrl}/subaccount/${user.paystackSubaccountId}`,
        updatePayload,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        throw new BadRequestException(response.data.message || 'Failed to update subaccount');
      }

      const subaccount = response.data.data;

      // Update local database
      await this.prisma.profile.update({
        where: { id: userId },
        data: {
          paystackSubaccountVerified: subaccount.is_verified,
          // Temporarily comment out fields that need Prisma client regeneration
          // paystackCommissionRate: updateSubaccountDto.percentageCharge || user.paystackCommissionRate,
          // paystackSubaccountUpdatedAt: new Date(),
          // paystackSettlementBank: updateSubaccountDto.settlementBank || user.paystackSettlementBank,
          // paystackAccountNumber: updateSubaccountDto.accountNumber || user.paystackAccountNumber,
          // paystackBusinessName: updateSubaccountDto.businessName || user.paystackBusinessName,
          // paystackPrimaryContactEmail: updateSubaccountDto.primaryContactEmail || user.paystackPrimaryContactEmail,
          // paystackPrimaryContactName: updateSubaccountDto.primaryContactName || user.paystackPrimaryContactName,
          // paystackPrimaryContactPhone: updateSubaccountDto.primaryContactPhone || user.paystackPrimaryContactPhone,
        },
      });

      this.logger.log(`Successfully updated Paystack subaccount: ${user.paystackSubaccountId}`);

      return {
        subaccountCode: subaccount.subaccount_code,
        businessName: subaccount.business_name,
        settlementBank: subaccount.settlement_bank,
        accountNumber: subaccount.account_number,
        isVerified: subaccount.is_verified,
        primaryContactEmail: subaccount.primary_contact_email,
        primaryContactName: subaccount.primary_contact_name,
        primaryContactPhone: subaccount.primary_contact_phone,
        percentageCharge: subaccount.percentage_charge,
        description: subaccount.description,
        createdAt: new Date(subaccount.created_at),
        updatedAt: new Date(subaccount.updated_at),
      };

    } catch (error) {
      this.logger.error('Failed to update Paystack subaccount:', error.response?.data || error.message);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to update subaccount. Please try again.');
    }
  }

  /**
   * Delete/deactivate sub-account
   */
  async deleteSubaccount(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId }
    });

    if (!user || !user.paystackSubaccountId) {
      throw new NotFoundException('Subaccount not found');
    }

    try {
      // Call Paystack API to deactivate subaccount
      const response = await axios.delete(
        `${this.paystackBaseUrl}/subaccount/${user.paystackSubaccountId}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        throw new BadRequestException(response.data.message || 'Failed to delete subaccount');
      }

      // Update local database - clear the sub-account ID
      await this.prisma.profile.update({
        where: { id: userId },
        data: {
          paystackSubaccountId: null, // Clear the sub-account ID
          // Temporarily comment out fields that need Prisma client regeneration
          // paystackSubaccountStatus: 'deleted',
          // paystackSubaccountUpdatedAt: new Date(),
        },
      });

      this.logger.log(`Successfully deleted Paystack subaccount: ${user.paystackSubaccountId}`);

      return { message: 'Subaccount deleted successfully' };

    } catch (error) {
      this.logger.error('Failed to delete Paystack subaccount:', error.response?.data || error.message);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to delete subaccount. Please try again.');
    }
  }

  /**
   * Clear orphaned sub-account record from database
   */
  async clearOrphanedSubaccount(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId }
    });

    if (!user || !user.paystackSubaccountId) {
      throw new NotFoundException('No sub-account record found');
    }

    // Clear the sub-account ID from database
    await this.prisma.profile.update({
      where: { id: userId },
      data: { paystackSubaccountId: null }
    });

    this.logger.log(`Cleared orphaned sub-account record for user: ${userId}`);
    return { message: 'Orphaned sub-account record cleared successfully' };
  }

  /**
   * Transfer funds to vendor sub-account (payout)
   */
  async transferToSubaccount(
    subaccountCode: string, 
    amount: number, 
    reason: string,
    reference?: string
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      this.logger.log(`💰 [PAYOUT] Starting payout to sub-account: ${subaccountCode}`);
      this.logger.log(`💰 [PAYOUT] Amount: ${amount}, Reason: ${reason}`);

      // Check if we're in development mode or if Paystack account is starter
      const isDevelopment = this.configService.get('NODE_ENV') === 'development';
      const isStarterAccount = this.paystackSecretKey.includes('sk_test_');

      if (isDevelopment || isStarterAccount) {
        this.logger.warn(`⚠️ [PAYOUT] Using mock transfer for development/starter account`);
        this.logger.warn(`⚠️ [PAYOUT] Real transfer requires Registered Business account`);
        
        // Mock successful transfer
        const mockTransferCode = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mockReference = reference || `mock_payout_${Date.now()}`;
        
        this.logger.log(`✅ [PAYOUT] Mock transfer successful:`, {
          transferCode: mockTransferCode,
          reference: mockReference,
          amount: amount
        });

        return {
          success: true,
          data: {
            transferCode: mockTransferCode,
            reference: mockReference,
            amount: amount,
            status: 'success',
            createdAt: new Date().toISOString()
          },
          message: 'Mock transfer completed (upgrade to Registered Business for real transfers)'
        };
      }

      const transferPayload = {
        source: 'balance',
        amount: Math.round(amount * 100), // Convert to kobo (cents)
        recipient: subaccountCode,
        reason: reason,
        reference: reference || `payout_${Date.now()}`,
        currency: 'KES'
      };

      this.logger.log(`💰 [PAYOUT] Transfer payload:`, JSON.stringify(transferPayload, null, 2));

      const response = await axios.post(
        `${this.paystackBaseUrl}/transfer`,
        transferPayload,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`💰 [PAYOUT] Paystack transfer response:`, JSON.stringify(response.data, null, 2));

      if (!response.data.status) {
        this.logger.error(`❌ [PAYOUT] Paystack transfer failed:`, response.data.message);
        return {
          success: false,
          message: response.data.message || 'Transfer failed'
        };
      }

      this.logger.log(`✅ [PAYOUT] Transfer successful:`, {
        transferCode: response.data.data.transfer_code,
        reference: response.data.data.reference,
        amount: response.data.data.amount
      });

      return {
        success: true,
        data: {
          transferCode: response.data.data.transfer_code,
          reference: response.data.data.reference,
          amount: response.data.data.amount,
          status: response.data.data.status,
          createdAt: response.data.data.created_at
        },
        message: 'Transfer initiated successfully'
      };

    } catch (error) {
      this.logger.error(`❌ [PAYOUT] Error transferring to sub-account:`, error.response?.data || error.message);
      
      // If it's a starter account error, provide helpful message
      if (error.response?.data?.message?.includes('starter business')) {
        return {
          success: false,
          message: 'Paystack account needs to be upgraded to Registered Business to enable transfers. Using mock transfer for now.'
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to transfer funds'
      };
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transferCode: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/transfer/${transferCode}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        return {
          success: false,
          message: response.data.message || 'Failed to get transfer status'
        };
      }

      return {
        success: true,
        data: response.data.data,
        message: 'Transfer status retrieved successfully'
      };

    } catch (error) {
      this.logger.error(`❌ [PAYOUT] Error getting transfer status:`, error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get transfer status'
      };
    }
  }

  /**
   * Get all transfers
   */
  async getTransfers(page: number = 1, perPage: number = 50): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/transfer?page=${page}&perPage=${perPage}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        return {
          success: false,
          message: response.data.message || 'Failed to get transfers'
        };
      }

      return {
        success: true,
        data: response.data.data,
        message: 'Transfers retrieved successfully'
      };

    } catch (error) {
      this.logger.error(`❌ [PAYOUT] Error getting transfers:`, error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get transfers'
      };
    }
  }
}
