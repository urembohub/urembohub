-- Add service escrow system
-- Migration: 20250921120000_add_service_escrow.sql

-- Create escrow status enum
CREATE TYPE escrow_status AS ENUM (
  'pending',           -- Payment received, waiting for service
  'in_progress',       -- Service being provided
  'completed',         -- Service completed, waiting for customer approval
  'released',          -- Funds released to vendor
  'disputed',          -- Customer disputes service quality
  'refunded',          -- Funds refunded to customer
  'expired'            -- Auto-released due to timeout
);

-- Create action type enum
CREATE TYPE action_type AS ENUM (
  'created',
  'service_started',
  'service_completed',
  'customer_approved',
  'customer_disputed',
  'admin_released',
  'admin_refunded',
  'auto_released',
  'dispute_resolved'
);

-- Create service escrows table
CREATE TABLE service_escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  status escrow_status DEFAULT 'pending',
  paystack_reference VARCHAR(255),
  hold_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  released_at TIMESTAMP,
  auto_release_date TIMESTAMP NOT NULL, -- 48 hours from creation
  dispute_reason TEXT,
  admin_notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create escrow actions log table
CREATE TABLE escrow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES service_escrows(id) ON DELETE CASCADE,
  action_type action_type NOT NULL,
  performed_by UUID REFERENCES profiles(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_service_escrows_order_id ON service_escrows(order_id);
CREATE INDEX idx_service_escrows_vendor_id ON service_escrows(vendor_id);
CREATE INDEX idx_service_escrows_customer_id ON service_escrows(customer_id);
CREATE INDEX idx_service_escrows_status ON service_escrows(status);
CREATE INDEX idx_service_escrows_auto_release_date ON service_escrows(auto_release_date);
CREATE INDEX idx_escrow_actions_escrow_id ON escrow_actions(escrow_id);
CREATE INDEX idx_escrow_actions_action_type ON escrow_actions(action_type);

-- Add RLS policies for service escrows
ALTER TABLE service_escrows ENABLE ROW LEVEL SECURITY;

-- Allow backend service role to manage all escrows
CREATE POLICY "Service role can manage escrows" 
ON service_escrows FOR ALL 
USING (true);

-- Allow vendors to view their own escrows
CREATE POLICY "Vendors can view their escrows" 
ON service_escrows FOR SELECT 
USING (vendor_id = auth.uid());

-- Allow customers to view their own escrows
CREATE POLICY "Customers can view their escrows" 
ON service_escrows FOR SELECT 
USING (customer_id = auth.uid());

-- Add RLS policies for escrow actions
ALTER TABLE escrow_actions ENABLE ROW LEVEL SECURITY;

-- Allow backend service role to manage all escrow actions
CREATE POLICY "Service role can manage escrow actions" 
ON escrow_actions FOR ALL 
USING (true);

-- Allow users to view actions for their escrows
CREATE POLICY "Users can view their escrow actions" 
ON escrow_actions FOR SELECT 
USING (
  escrow_id IN (
    SELECT id FROM service_escrows 
    WHERE vendor_id = auth.uid() OR customer_id = auth.uid()
  )
);
