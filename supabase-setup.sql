-- =====================================================
-- NeurallEmpire Supabase Database Schema
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- Users Table (extends Supabase auth.users)
-- =====================================================
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    company VARCHAR(100),
    job_title VARCHAR(100),
    phone VARCHAR(20),
    country VARCHAR(50),

    -- Subscription Information
    subscription_plan VARCHAR(20) DEFAULT 'none' CHECK (subscription_plan IN ('none', 'conqueror', 'emperor', 'overlord')),
    subscription_status VARCHAR(20) DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'cancelled', 'expired', 'trial')),
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,

    -- Marketing Preferences
    newsletter BOOLEAN DEFAULT false,
    marketing_emails BOOLEAN DEFAULT true,
    sms_updates BOOLEAN DEFAULT false,

    -- Analytics & Tracking
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    referral_source VARCHAR(100),

    -- Lead Scoring
    lead_score INTEGER DEFAULT 50 CHECK (lead_score >= 0 AND lead_score <= 100),
    lead_source VARCHAR(20) DEFAULT 'website' CHECK (lead_source IN ('website', 'social', 'email', 'referral', 'direct', 'other')),

    -- Profile Image
    avatar_url TEXT,

    -- Settings
    theme VARCHAR(10) DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
    notification_email BOOLEAN DEFAULT true,
    notification_push BOOLEAN DEFAULT true,
    notification_sms BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (id)
);

-- =====================================================
-- Contacts Table (Lead Management)
-- =====================================================
CREATE TABLE public.contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Contact Information
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(100),

    -- Message and Requirements
    message TEXT NOT NULL,
    budget VARCHAR(50),
    budget_range VARCHAR(20) DEFAULT 'not-specified' CHECK (budget_range IN ('under-600', '600-1200', '1200-2400', '2400-5000', '5000+', 'not-specified')),

    -- Lead Classification
    lead_source VARCHAR(20) DEFAULT 'website' CHECK (lead_source IN ('website', 'social', 'email', 'referral', 'direct', 'advertisement')),
    lead_type VARCHAR(20) DEFAULT 'inquiry' CHECK (lead_type IN ('inquiry', 'consultation', 'support', 'partnership', 'other')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    lead_score INTEGER DEFAULT 50 CHECK (lead_score >= 0 AND lead_score <= 100),

    -- User Association
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_logged_in_user BOOLEAN DEFAULT false,

    -- Status and Processing
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed', 'spam')),
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,

    -- Follow-up Information
    follow_up_required BOOLEAN DEFAULT true,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    contact_attempts INTEGER DEFAULT 0,

    -- Technical Information
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    -- Geolocation
    location_country VARCHAR(50),
    location_region VARCHAR(50),
    location_city VARCHAR(50),
    location_timezone VARCHAR(50),

    -- Email Integration
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    email_template VARCHAR(50),
    email_delivered BOOLEAN DEFAULT false,
    email_opened BOOLEAN DEFAULT false,
    email_clicked BOOLEAN DEFAULT false,

    -- Tags and Categories
    tags TEXT[], -- PostgreSQL array for tags
    category VARCHAR(20) DEFAULT 'other' CHECK (category IN ('enterprise', 'smb', 'startup', 'individual', 'agency', 'other')),

    -- Conversion Tracking
    converted_to_sale BOOLEAN DEFAULT false,
    conversion_date TIMESTAMP WITH TIME ZONE,
    conversion_value DECIMAL(10,2),
    conversion_plan VARCHAR(20),

    -- Quality Metrics
    response_time INTEGER, -- Time to first response in minutes
    resolution_time INTEGER, -- Time to resolution in minutes
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Contact Notes Table
-- =====================================================
CREATE TABLE public.contact_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'note' CHECK (note_type IN ('call', 'email', 'meeting', 'note', 'follow-up')),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Payments Table
-- =====================================================
CREATE TABLE public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Payment Identification
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    signature TEXT,

    -- User and Plan Information
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('conqueror', 'emperor', 'overlord')),
    plan_name VARCHAR(100),
    plan_description TEXT,
    agent_count INTEGER,

    -- Amount and Currency
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD' CHECK (currency IN ('USD', 'INR', 'EUR', 'GBP')),
    original_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0 CHECK (tax_amount >= 0),

    -- Payment Gateway Information
    gateway VARCHAR(20) DEFAULT 'razorpay' CHECK (gateway IN ('razorpay', 'stripe', 'paypal', 'manual')),
    gateway_payment_id VARCHAR(100),
    gateway_order_id VARCHAR(100),
    gateway_response JSONB,

    -- Payment Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'disputed')),
    payment_method VARCHAR(20) DEFAULT 'card' CHECK (payment_method IN ('card', 'upi', 'netbanking', 'wallet', 'bank_transfer', 'crypto', 'other')),

    -- Customer Information
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_company VARCHAR(100),

    -- Billing Information
    billing_street VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(50),

    -- Subscription Information
    is_recurring BOOLEAN DEFAULT false,
    subscription_interval VARCHAR(20) DEFAULT 'monthly' CHECK (subscription_interval IN ('monthly', 'quarterly', 'annually', 'one-time')),
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    subscription_id VARCHAR(100),

    -- Important Dates
    paid_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Refund Information
    refund_amount DECIMAL(10,2) DEFAULT 0 CHECK (refund_amount >= 0),
    refund_reason TEXT,
    refund_id VARCHAR(100),
    refunded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    refund_status VARCHAR(20) DEFAULT 'none' CHECK (refund_status IN ('none', 'pending', 'processed', 'failed')),

    -- Discount and Coupon Information
    coupon_code VARCHAR(50),
    coupon_description TEXT,
    coupon_discount_type VARCHAR(20) DEFAULT 'none' CHECK (coupon_discount_type IN ('percentage', 'fixed', 'none')),
    coupon_discount_value DECIMAL(10,2),
    coupon_applied_amount DECIMAL(10,2),

    -- Technical Information
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',

    -- Fraud Detection
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    fraud_flags TEXT[],
    is_manual_review BOOLEAN DEFAULT false,

    -- Invoice Information
    invoice_number VARCHAR(50),
    invoice_url TEXT,
    invoice_sent_at TIMESTAMP WITH TIME ZONE,
    invoice_download_count INTEGER DEFAULT 0,

    -- Webhook Information
    webhook_processed BOOLEAN DEFAULT false,
    webhook_attempts INTEGER DEFAULT 0,
    webhook_last_attempt TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Payment Notes Table
-- =====================================================
CREATE TABLE public.payment_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'general' CHECK (note_type IN ('payment', 'refund', 'dispute', 'general')),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- User Profiles Indexes
CREATE INDEX idx_user_profiles_subscription_plan ON public.user_profiles(subscription_plan);
CREATE INDEX idx_user_profiles_lead_score ON public.user_profiles(lead_score DESC);
CREATE INDEX idx_user_profiles_created_at ON public.user_profiles(created_at DESC);

-- Contacts Indexes
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_priority ON public.contacts(priority);
CREATE INDEX idx_contacts_lead_score ON public.contacts(lead_score DESC);
CREATE INDEX idx_contacts_created_at ON public.contacts(created_at DESC);
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_follow_up_date ON public.contacts(follow_up_date);
CREATE INDEX idx_contacts_status_priority ON public.contacts(status, priority);

-- Payments Indexes
CREATE UNIQUE INDEX idx_payments_payment_id ON public.payments(payment_id);
CREATE UNIQUE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_gateway ON public.payments(gateway);
CREATE INDEX idx_payments_plan ON public.payments(plan);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX idx_payments_next_billing_date ON public.payments(next_billing_date);

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate lead score for contacts
CREATE OR REPLACE FUNCTION calculate_contact_lead_score()
RETURNS TRIGGER AS $$
BEGIN
    DECLARE
        score INTEGER := 50;
        budget_value INTEGER;
    BEGIN
        -- Budget scoring
        IF NEW.budget IS NOT NULL THEN
            budget_value := CAST(regexp_replace(NEW.budget, '[^\d]', '', 'g') AS INTEGER);
            IF budget_value >= 2400 THEN
                score := score + 30;
            ELSIF budget_value >= 1200 THEN
                score := score + 20;
            ELSIF budget_value >= 600 THEN
                score := score + 10;
            END IF;
        END IF;

        -- Company provided
        IF NEW.company IS NOT NULL AND LENGTH(TRIM(NEW.company)) > 0 THEN
            score := score + 15;
        END IF;

        -- Phone provided
        IF NEW.phone IS NOT NULL AND LENGTH(TRIM(NEW.phone)) > 0 THEN
            score := score + 10;
        END IF;

        -- Message length and quality
        IF NEW.message IS NOT NULL AND LENGTH(NEW.message) > 50 THEN
            score := score + 5;
        END IF;

        IF NEW.message IS NOT NULL AND LOWER(NEW.message) LIKE '%urgent%' THEN
            score := score + 10;
        END IF;

        -- User association
        IF NEW.is_logged_in_user THEN
            score := score + 20;
        END IF;

        -- Set priority based on score
        IF score >= 90 THEN
            NEW.priority := 'urgent';
        ELSIF score >= 75 THEN
            NEW.priority := 'high';
        ELSIF score >= 60 THEN
            NEW.priority := 'medium';
        ELSE
            NEW.priority := 'low';
        END IF;

        NEW.lead_score := LEAST(score, 100);

        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contact lead scoring
CREATE TRIGGER calculate_contact_lead_score_trigger
    BEFORE INSERT OR UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION calculate_contact_lead_score();

-- Function to set follow-up date based on priority
CREATE OR REPLACE FUNCTION set_contact_follow_up_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.follow_up_date IS NULL AND TG_OP = 'INSERT' THEN
        CASE NEW.priority
            WHEN 'urgent' THEN
                NEW.follow_up_date := NOW() + INTERVAL '2 hours';
            WHEN 'high' THEN
                NEW.follow_up_date := NOW() + INTERVAL '4 hours';
            WHEN 'medium' THEN
                NEW.follow_up_date := NOW() + INTERVAL '1 day';
            WHEN 'low' THEN
                NEW.follow_up_date := NOW() + INTERVAL '3 days';
            ELSE
                NEW.follow_up_date := NOW() + INTERVAL '1 day';
        END CASE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for follow-up date
CREATE TRIGGER set_contact_follow_up_date_trigger
    BEFORE INSERT ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION set_contact_follow_up_date();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_notes ENABLE ROW LEVEL SECURITY;

-- User Profiles - Users can only access their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Contacts - Users can view their own contacts
CREATE POLICY "Users can view own contacts" ON public.contacts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert contacts" ON public.contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Payments - Users can view their own payments
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

-- Contact Notes - Users can view notes for their contacts
CREATE POLICY "Users can view contact notes" ON public.contact_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = contact_notes.contact_id
            AND contacts.user_id = auth.uid()
        )
    );

-- Payment Notes - Users can view notes for their payments
CREATE POLICY "Users can view payment notes" ON public.payment_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.payments
            WHERE payments.id = payment_notes.payment_id
            AND payments.user_id = auth.uid()
        )
    );

-- =====================================================
-- Views for Analytics
-- =====================================================

-- Lead Statistics View
CREATE VIEW public.lead_stats AS
SELECT
    status,
    priority,
    COUNT(*) as count,
    AVG(lead_score) as avg_score,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM public.contacts
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status, priority;

-- Revenue Statistics View
CREATE VIEW public.revenue_stats AS
SELECT
    plan,
    status,
    COUNT(*) as transaction_count,
    SUM(amount) as total_revenue,
    AVG(amount) as avg_transaction_value,
    DATE_TRUNC('month', created_at) as month
FROM public.payments
WHERE status = 'completed'
GROUP BY plan, status, DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- User Activity View
CREATE VIEW public.user_activity AS
SELECT
    up.id,
    up.first_name,
    up.last_name,
    up.subscription_plan,
    up.last_login,
    up.login_count,
    COUNT(c.id) as contact_count,
    COUNT(p.id) as payment_count,
    SUM(p.amount) as total_spent
FROM public.user_profiles up
LEFT JOIN public.contacts c ON up.id = c.user_id
LEFT JOIN public.payments p ON up.id = p.user_id AND p.status = 'completed'
GROUP BY up.id, up.first_name, up.last_name, up.subscription_plan, up.last_login, up.login_count;

-- =====================================================
-- Sample Data for Testing (Optional)
-- =====================================================

-- Insert sample admin user profile (you'll need to create the auth user first)
-- INSERT INTO public.user_profiles (
--     id, first_name, last_name, company, subscription_plan, subscription_status
-- ) VALUES (
--     'your-auth-user-id-here', 'Admin', 'User', 'NeurallEmpire', 'overlord', 'active'
-- );

-- =====================================================
-- Database Setup Complete
-- =====================================================