-- ============================================
-- SUPABASE SCHEMA V2 - CLIENT PORTAL
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLEANUP: Drop existing tables if they exist
-- (Remove this section in production)
-- ============================================
DROP TABLE IF EXISTS artifact_files CASCADE;
DROP TABLE IF EXISTS artifacts CASCADE;
DROP TABLE IF EXISTS milestone_actions CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS phases CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS document_templates CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS deliverables CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS organization_users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    avatar_url TEXT,
    company_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'), 
        COALESCE(NEW.raw_user_meta_data->>'role', 'client')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    owner_id UUID NOT NULL REFERENCES profiles(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ORGANIZATION USERS (membership)
-- ============================================
CREATE TABLE organization_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CLIENTS
-- ============================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'past')),
    notes TEXT,
    portal_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DOCUMENT TEMPLATES
-- Core template system for all document types
-- ============================================
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Template metadata
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'welcome',
        'agreement', 
        'invoice',
        'proposal',
        'strategy_call',
        'project_timeline',
        'deliverables',
        'content_guide',
        'monthly_report',
        'competitor_analysis',
        'thank_you',
        'custom'
    )),
    
    -- Template content (Markdown with variables)
    content TEXT NOT NULL,
    
    -- Variables schema (JSON defining available placeholders)
    -- e.g., {"client_name": "string", "project_name": "string", "start_date": "date"}
    variables_schema JSONB DEFAULT '{}',
    
    -- Default variable values
    default_values JSONB DEFAULT '{}',
    
    -- Template settings
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    
    -- Styling
    theme JSONB DEFAULT '{"primaryColor": "#000000", "fontFamily": "Inter"}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    
    -- Project details
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12, 2),
    currency TEXT DEFAULT 'USD',
    
    -- Portal settings
    portal_enabled BOOLEAN DEFAULT TRUE,
    portal_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROJECT DOCUMENTS (instances of templates)
-- ============================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    template_id UUID REFERENCES document_templates(id),
    
    -- Document info
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'welcome',
        'agreement', 
        'invoice',
        'proposal',
        'strategy_call',
        'project_timeline',
        'deliverables',
        'content_guide',
        'monthly_report',
        'competitor_analysis',
        'thank_you',
        'custom'
    )),
    
    -- Resolved content (template with variables filled in)
    content TEXT NOT NULL,
    
    -- Variable values used
    variables JSONB DEFAULT '{}',
    
    -- Document status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'approved', 'rejected')),
    
    -- Tracking
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    signature_data JSONB,
    
    -- Public access
    public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROJECT PHASES (Timeline)
-- ============================================
CREATE TABLE phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
    
    start_date DATE,
    end_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE phases ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MILESTONES (Tasks within phases)
-- ============================================
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    
    -- Status tracking with columns like in the image
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'completed')),
    
    -- Stage progress (Pre-Production, Development, Delivery, Posted)
    pre_production TEXT DEFAULT 'pending' CHECK (pre_production IN ('pending', 'in_progress', 'done')),
    development TEXT DEFAULT 'pending' CHECK (development IN ('pending', 'in_progress', 'done')),
    delivery TEXT DEFAULT 'pending' CHECK (delivery IN ('pending', 'in_progress', 'done')),
    posted TEXT DEFAULT 'pending' CHECK (posted IN ('pending', 'in_progress', 'done', 'na')),
    
    due_date DATE,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id),
    
    -- Invoice details
    invoice_number TEXT NOT NULL,
    
    -- Amounts
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    
    -- Dates
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    
    -- Payment info
    payment_method TEXT,
    payment_link TEXT,
    payment_qr_code TEXT,
    bank_details JSONB,
    
    -- Notes
    notes TEXT,
    terms TEXT,
    
    -- Public access
    public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, invoice_number)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INVOICE ITEMS (Line items)
-- ============================================
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    
    order_index INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DELIVERABLES (Media files for clients)
-- ============================================
CREATE TABLE deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('video', 'image', 'document', 'audio', 'archive', 'other')),
    
    -- File info
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    
    -- External links (Google Drive, Dropbox, etc.)
    external_url TEXT,
    external_provider TEXT CHECK (external_provider IN ('google_drive', 'dropbox', 'onedrive', 'other')),
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'delivered', 'approved')),
    
    -- Tracking
    delivered_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STRATEGY CALLS (Booking integration)
-- ============================================
CREATE TABLE strategy_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL DEFAULT 'Strategy Call',
    description TEXT,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 60,
    timezone TEXT DEFAULT 'UTC',
    
    -- Meeting link
    meeting_type TEXT CHECK (meeting_type IN ('google_meet', 'zoom', 'teams', 'other')),
    meeting_url TEXT,
    meeting_id TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled', 'no_show')),
    
    -- Notes
    agenda TEXT,
    notes TEXT,
    recording_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE strategy_calls ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COMPETITOR ANALYSIS
-- ============================================
CREATE TABLE competitor_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id),
    
    title TEXT NOT NULL DEFAULT 'Competitor Analysis',
    analysis_date DATE DEFAULT CURRENT_DATE,
    
    -- Key takeaways
    summary TEXT,
    key_takeaways TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE competitor_analyses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COMPETITORS (Individual competitor entries)
-- ============================================
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES competitor_analyses(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    website TEXT,
    social_handles JSONB DEFAULT '{}',
    
    -- Metrics
    followers INTEGER,
    posting_frequency TEXT,
    content_style TEXT,
    engagement_rate TEXT,
    avg_video_views INTEGER,
    best_performing_content TEXT,
    
    -- Analysis
    strengths TEXT[],
    weaknesses TEXT[],
    opportunities TEXT[],
    
    order_index INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MONTHLY REPORTS
-- ============================================
CREATE TABLE monthly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id),
    
    title TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Metrics
    metrics JSONB DEFAULT '{}',
    
    -- Content sections
    highlights TEXT[],
    challenges TEXT[],
    recommendations TEXT[],
    
    -- Performance data
    performance_data JSONB DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FILES (Generic file storage)
-- ============================================
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- File info
    storage_key TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    
    -- Metadata
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROPOSALS
-- ============================================
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    template_id UUID REFERENCES document_templates(id),
    document_id UUID REFERENCES documents(id),
    
    title TEXT NOT NULL,
    description TEXT,
    
    -- Content
    content TEXT,
    
    -- Pricing
    total_amount DECIMAL(12, 2),
    currency TEXT DEFAULT 'USD',
    
    -- Validity
    valid_until DATE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
    
    -- Tracking
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    
    -- Public access
    public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Organizations
CREATE POLICY "Users can view their orgs" ON organizations FOR SELECT
    USING (owner_id = auth.uid() OR id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));
CREATE POLICY "Owners can update orgs" ON organizations FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Auth users can create orgs" ON organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Organization Users
CREATE POLICY "View org memberships" ON organization_users FOR SELECT
    USING (user_id = auth.uid() OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));
CREATE POLICY "Owners manage memberships" ON organization_users FOR ALL
    USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

-- Clients
CREATE POLICY "Org members view clients" ON clients FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    ));
CREATE POLICY "Admins manage clients" ON clients FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    ));

-- Document Templates
CREATE POLICY "Org members view templates" ON document_templates FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    ));
CREATE POLICY "Admins manage templates" ON document_templates FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    ));

-- Projects
CREATE POLICY "View projects" ON projects FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );
CREATE POLICY "Admins manage projects" ON projects FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    ));

-- Documents
CREATE POLICY "View documents" ON documents FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );
CREATE POLICY "Admins manage documents" ON documents FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    ));

-- Phases
CREATE POLICY "View phases" ON phases FOR SELECT
    USING (project_id IN (SELECT id FROM projects WHERE 
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    ));
CREATE POLICY "Admins manage phases" ON phases FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    )));

-- Milestones
CREATE POLICY "View milestones" ON milestones FOR SELECT
    USING (phase_id IN (SELECT id FROM phases WHERE project_id IN (
        SELECT id FROM projects WHERE 
            organization_id IN (
                SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
            )
            OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )));
CREATE POLICY "Admins manage milestones" ON milestones FOR ALL
    USING (phase_id IN (SELECT id FROM phases WHERE project_id IN (
        SELECT id FROM projects WHERE organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )));

-- Invoices
CREATE POLICY "View invoices" ON invoices FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );
CREATE POLICY "Admins manage invoices" ON invoices FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    ));

-- Invoice Items
CREATE POLICY "View invoice items" ON invoice_items FOR SELECT
    USING (invoice_id IN (SELECT id FROM invoices WHERE 
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    ));
CREATE POLICY "Admins manage invoice items" ON invoice_items FOR ALL
    USING (invoice_id IN (SELECT id FROM invoices WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    )));

-- Deliverables
CREATE POLICY "View deliverables" ON deliverables FOR SELECT
    USING (project_id IN (SELECT id FROM projects WHERE 
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    ));
CREATE POLICY "Admins manage deliverables" ON deliverables FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    )));

-- Strategy Calls
CREATE POLICY "View strategy calls" ON strategy_calls FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );
CREATE POLICY "Admins manage strategy calls" ON strategy_calls FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    ));

-- Competitor Analyses
CREATE POLICY "View analyses" ON competitor_analyses FOR SELECT
    USING (project_id IN (SELECT id FROM projects WHERE 
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    ));
CREATE POLICY "Admins manage analyses" ON competitor_analyses FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    )));

-- Competitors
CREATE POLICY "View competitors" ON competitors FOR SELECT
    USING (analysis_id IN (SELECT id FROM competitor_analyses WHERE project_id IN (
        SELECT id FROM projects WHERE 
            organization_id IN (
                SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
            )
            OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    )));
CREATE POLICY "Admins manage competitors" ON competitors FOR ALL
    USING (analysis_id IN (SELECT id FROM competitor_analyses WHERE project_id IN (
        SELECT id FROM projects WHERE organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )));

-- Monthly Reports
CREATE POLICY "View reports" ON monthly_reports FOR SELECT
    USING (project_id IN (SELECT id FROM projects WHERE 
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    ));
CREATE POLICY "Admins manage reports" ON monthly_reports FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    )));

-- Files
CREATE POLICY "View own files" ON files FOR SELECT USING (uploaded_by = auth.uid());
CREATE POLICY "Upload files" ON files FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Org members view files" ON files FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    ));

-- Proposals
CREATE POLICY "View proposals" ON proposals FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );
CREATE POLICY "Admins manage proposals" ON proposals FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        UNION SELECT id FROM organizations WHERE owner_id = auth.uid()
    ));

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_org_users_user ON organization_users(user_id);
CREATE INDEX idx_org_users_org ON organization_users(organization_id);
CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_templates_org ON document_templates(organization_id);
CREATE INDEX idx_templates_type ON document_templates(type);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_phases_project ON phases(project_id);
CREATE INDEX idx_milestones_phase ON milestones(phase_id);
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_deliverables_project ON deliverables(project_id);
CREATE INDEX idx_strategy_org ON strategy_calls(organization_id);
CREATE INDEX idx_analyses_project ON competitor_analyses(project_id);
CREATE INDEX idx_reports_project ON monthly_reports(project_id);
CREATE INDEX idx_proposals_org ON proposals(organization_id);
CREATE INDEX idx_proposals_client ON proposals(client_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    prefix TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO next_num FROM invoices WHERE organization_id = org_id;
    prefix := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-';
    RETURN prefix || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to resolve template variables
CREATE OR REPLACE FUNCTION resolve_template(template_content TEXT, variables JSONB)
RETURNS TEXT AS $$
DECLARE
    result TEXT := template_content;
    key TEXT;
    value TEXT;
BEGIN
    FOR key, value IN SELECT * FROM jsonb_each_text(variables)
    LOOP
        result := REPLACE(result, '{{' || key || '}}', COALESCE(value, ''));
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON document_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON deliverables FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON strategy_calls FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON competitor_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON monthly_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
