-- =============================================
-- NeurallEmpire Initial Database Schema
-- Migration: 20241001000000_initial_schema
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USER PROFILES TABLE
-- =============================================

CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    company VARCHAR(100),
    phone VARCHAR(20),
    country VARCHAR(3) DEFAULT 'US',
    job_title VARCHAR(100),

    -- Subscription and billing
    subscription_plan VARCHAR(20) DEFAULT 'none' CHECK (subscription_plan IN ('none', 'starter', 'professional', 'enterprise')),
    subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'active', 'cancelled', 'past_due')),
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,

    -- Marketing and analytics
    newsletter BOOLEAN DEFAULT false,
    referral_source VARCHAR(100) DEFAULT 'direct',
    lead_score INTEGER DEFAULT 0,
    lead_status VARCHAR(20) DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),

    -- Usage tracking
    login_count INTEGER DEFAULT 0,
    last_login TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONTACTS TABLE (Lead Generation)
-- =============================================

CREATE TABLE public.contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Contact information
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(100),
    message TEXT,
    budget VARCHAR(50),

    -- Lead classification
    lead_score INTEGER DEFAULT 0,
    lead_status VARCHAR(20) DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    -- User association
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_logged_in_user BOOLEAN DEFAULT false,

    -- Follow-up tracking
    next_follow_up TIMESTAMPTZ,
    follow_up_count INTEGER DEFAULT 0,

    -- Analytics and tracking
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYMENTS TABLE
-- =============================================

CREATE TABLE public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Payment identification
    payment_id VARCHAR(100) UNIQUE NOT NULL, -- External payment ID (Razorpay, Stripe, etc.)
    transaction_id VARCHAR(100),

    -- User and contact association
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_method VARCHAR(50), -- 'razorpay', 'stripe', 'paypal', etc.

    -- Product/service details
    product_name VARCHAR(200),
    product_description TEXT,
    subscription_plan VARCHAR(20),

    -- Analytics
    ip_address INET,
    user_agent TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONTACT NOTES TABLE (CRM functionality)
-- =============================================

CREATE TABLE public.contact_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Note content
    note TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'general' CHECK (note_type IN ('general', 'call', 'email', 'meeting', 'follow_up')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(
    p_budget TEXT,
    p_company TEXT,
    p_message TEXT,
    p_is_logged_in BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    budget_amount INTEGER;
BEGIN
    -- Base score for any submission
    score := 10;

    -- Budget scoring
    IF p_budget IS NOT NULL AND p_budget != '' THEN
        -- Extract numeric value from budget string
        budget_amount := COALESCE(
            (regexp_matches(p_budget, '\d+'))[1]::INTEGER,
            0
        );

        CASE
            WHEN budget_amount >= 10000 THEN score := score + 50;
            WHEN budget_amount >= 5000 THEN score := score + 35;
            WHEN budget_amount >= 1000 THEN score := score + 20;
            WHEN budget_amount >= 500 THEN score := score + 10;
            ELSE score := score + 5;
        END CASE;
    END IF;

    -- Company scoring
    IF p_company IS NOT NULL AND LENGTH(p_company) > 2 THEN
        score := score + 15;
    END IF;

    -- Message quality scoring
    IF p_message IS NOT NULL THEN
        CASE
            WHEN LENGTH(p_message) > 200 THEN score := score + 20;
            WHEN LENGTH(p_message) > 100 THEN score := score + 15;
            WHEN LENGTH(p_message) > 50 THEN score := score + 10;
            ELSE score := score + 5;
        END CASE;
    END IF;

    -- Logged in user bonus
    IF p_is_logged_in THEN
        score := score + 25;
    END IF;

    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate lead score on contact insert
CREATE OR REPLACE FUNCTION auto_calculate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.lead_score := calculate_lead_score(
        NEW.budget,
        NEW.company,
        NEW.message,
        NEW.is_logged_in_user
    );

    -- Set priority based on score
    IF NEW.lead_score >= 80 THEN
        NEW.priority := 'urgent';
    ELSIF NEW.lead_score >= 60 THEN
        NEW.priority := 'high';
    ELSIF NEW.lead_score >= 40 THEN
        NEW.priority := 'medium';
    ELSE
        NEW.priority := 'low';
    END IF;

    -- Set next follow-up date
    NEW.next_follow_up := CASE
        WHEN NEW.priority = 'urgent' THEN NOW() + INTERVAL '1 hour'
        WHEN NEW.priority = 'high' THEN NOW() + INTERVAL '4 hours'
        WHEN NEW.priority = 'medium' THEN NOW() + INTERVAL '1 day'
        ELSE NOW() + INTERVAL '3 days'
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_contact_lead_score
    BEFORE INSERT OR UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION auto_calculate_lead_score();

-- Function to increment login count
CREATE OR REPLACE FUNCTION increment_login_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.last_login IS DISTINCT FROM NEW.last_login THEN
        NEW.login_count := COALESCE(OLD.login_count, 0) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_login_count
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION increment_login_count();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Contacts: Users can view their own contact submissions
CREATE POLICY "Users can view own contacts" ON public.contacts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert contacts" ON public.contacts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own contacts" ON public.contacts
    FOR UPDATE USING (auth.uid() = user_id);

-- Payments: Users can view their own payments
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert payments" ON public.payments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update payments" ON public.payments
    FOR UPDATE WITH CHECK (true);

-- Contact notes: Users can view and add notes to their contacts
CREATE POLICY "Users can view contact notes" ON public.contact_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = contact_notes.contact_id
            AND contacts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert contact notes" ON public.contact_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contacts
            WHERE contacts.id = contact_notes.contact_id
            AND contacts.user_id = auth.uid()
        )
    );

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (id);
CREATE INDEX idx_user_profiles_subscription ON public.user_profiles USING btree (subscription_plan, subscription_status);
CREATE INDEX idx_user_profiles_lead_score ON public.user_profiles USING btree (lead_score DESC);

-- Contacts indexes
CREATE INDEX idx_contacts_email ON public.contacts USING btree (email);
CREATE INDEX idx_contacts_lead_score ON public.contacts USING btree (lead_score DESC);
CREATE INDEX idx_contacts_status ON public.contacts USING btree (lead_status);
CREATE INDEX idx_contacts_priority ON public.contacts USING btree (priority);
CREATE INDEX idx_contacts_follow_up ON public.contacts USING btree (next_follow_up);
CREATE INDEX idx_contacts_created_at ON public.contacts USING btree (created_at DESC);
CREATE INDEX idx_contacts_user_id ON public.contacts USING btree (user_id);

-- Payments indexes
CREATE INDEX idx_payments_user_id ON public.payments USING btree (user_id);
CREATE INDEX idx_payments_status ON public.payments USING btree (status);
CREATE INDEX idx_payments_payment_id ON public.payments USING btree (payment_id);
CREATE INDEX idx_payments_created_at ON public.payments USING btree (created_at DESC);

-- Contact notes indexes
CREATE INDEX idx_contact_notes_contact_id ON public.contact_notes USING btree (contact_id);
CREATE INDEX idx_contact_notes_created_at ON public.contact_notes USING btree (created_at DESC);

-- =============================================
-- INITIAL DATA (OPTIONAL)
-- =============================================

-- You can add any initial data here if needed

-- =============================================
-- MIGRATION COMPLETE
-- =============================================