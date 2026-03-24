-- Supabase SQL Schema for Client Portal
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'User'), COALESCE(NEW.raw_user_meta_data->>'role', 'client'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ORGANIZATION USERS (membership)
-- ============================================
CREATE TABLE IF NOT EXISTS organization_users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CLIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    primary_contact_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'past')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('proposal', 'agreement', 'invoice', 'letter')),
    source TEXT NOT NULL DEFAULT 'native' CHECK (source IN ('native', 'imported')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TEMPLATE VERSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS template_versions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    variables JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, version_number)
);

ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROPOSALS
-- ============================================
CREATE TABLE IF NOT EXISTS proposals (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES templates(id),
    template_version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    resolved_content TEXT,
    total_amount DECIMAL(10, 2),
    public_token TEXT UNIQUE,
    sent_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    proposal_id INTEGER REFERENCES proposals(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PHASES
-- ============================================
CREATE TABLE IF NOT EXISTS phases (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'complete')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE phases ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MILESTONES
-- ============================================
CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'complete')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MILESTONE ACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS milestone_actions (
    id SERIAL PRIMARY KEY,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('upload', 'sign', 'approve', 'schedule', 'pay')),
    title TEXT NOT NULL,
    description TEXT,
    requirements JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE milestone_actions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES templates(id),
    template_version INTEGER,
    type TEXT NOT NULL CHECK (type IN ('proposal', 'agreement', 'invoice', 'letter')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'paid')),
    resolved_content TEXT,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FILES
-- ============================================
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    storage_key TEXT UNIQUE NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RAW TEMPLATE UPLOADS
-- ============================================
CREATE TABLE IF NOT EXISTS raw_template_uploads (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('proposal', 'agreement', 'invoice', 'letter')),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE raw_template_uploads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ARTIFACTS
-- ============================================
CREATE TABLE IF NOT EXISTS artifacts (
    id SERIAL PRIMARY KEY,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('agreement', 'report', 'asset', 'proposal')),
    name TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'client' CHECK (visibility IN ('client', 'internal')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ARTIFACT FILES
-- ============================================
CREATE TABLE IF NOT EXISTS artifact_files (
    id SERIAL PRIMARY KEY,
    artifact_id INTEGER NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(artifact_id, version)
);

ALTER TABLE artifact_files ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id),
    milestone_action_id INTEGER REFERENCES milestone_actions(id),
    invoice_number TEXT UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ============================================
-- REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    artifact_id INTEGER REFERENCES artifacts(id),
    title TEXT NOT NULL,
    period TEXT,
    content TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Organizations: Users can see orgs they belong to
CREATE POLICY "Users can view their organizations"
    ON organizations FOR SELECT
    USING (
        owner_id = auth.uid() OR
        id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid())
    );

CREATE POLICY "Owners can update their organizations"
    ON organizations FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Organization Users
CREATE POLICY "Users can view their org memberships"
    ON organization_users FOR SELECT
    USING (
        user_id = auth.uid() OR
        organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    );

CREATE POLICY "Org owners can manage memberships"
    ON organization_users FOR ALL
    USING (
        organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    );

-- Clients: Org members can view clients
CREATE POLICY "Org members can view clients"
    ON clients FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage clients"
    ON clients FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role = 'admin'
            UNION
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    );

-- Projects: Org members and linked clients can view
CREATE POLICY "Users can view relevant projects"
    ON projects FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
        OR
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage projects"
    ON projects FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role = 'admin'
            UNION
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    );

-- Proposals, Templates, Phases, Milestones, Documents, Invoices, Reports
-- Follow similar patterns based on organization membership

CREATE POLICY "Org members can view templates"
    ON templates FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage templates"
    ON templates FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role = 'admin'
            UNION
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    );

-- Template versions inherit from templates
CREATE POLICY "Users can view template versions"
    ON template_versions FOR SELECT
    USING (
        template_id IN (
            SELECT id FROM templates WHERE organization_id IN (
                SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                UNION
                SELECT id FROM organizations WHERE owner_id = auth.uid()
            )
        )
    );

-- Proposals
CREATE POLICY "Users can view relevant proposals"
    ON proposals FOR SELECT
    USING (
        client_id IN (
            SELECT id FROM clients WHERE 
                user_id = auth.uid() OR
                organization_id IN (
                    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                    UNION
                    SELECT id FROM organizations WHERE owner_id = auth.uid()
                )
        )
    );

-- Phases
CREATE POLICY "Users can view relevant phases"
    ON phases FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM projects WHERE
                organization_id IN (
                    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                    UNION
                    SELECT id FROM organizations WHERE owner_id = auth.uid()
                )
                OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
        )
    );

-- Milestones
CREATE POLICY "Users can view relevant milestones"
    ON milestones FOR SELECT
    USING (
        phase_id IN (
            SELECT id FROM phases WHERE project_id IN (
                SELECT id FROM projects WHERE
                    organization_id IN (
                        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                        UNION
                        SELECT id FROM organizations WHERE owner_id = auth.uid()
                    )
                    OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
            )
        )
    );

-- Milestone Actions
CREATE POLICY "Users can view relevant milestone actions"
    ON milestone_actions FOR SELECT
    USING (
        milestone_id IN (
            SELECT id FROM milestones WHERE phase_id IN (
                SELECT id FROM phases WHERE project_id IN (
                    SELECT id FROM projects WHERE
                        organization_id IN (
                            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                            UNION
                            SELECT id FROM organizations WHERE owner_id = auth.uid()
                        )
                        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
                )
            )
        )
    );

-- Documents
CREATE POLICY "Users can view relevant documents"
    ON documents FOR SELECT
    USING (
        client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
        OR
        project_id IN (
            SELECT id FROM projects WHERE organization_id IN (
                SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                UNION
                SELECT id FROM organizations WHERE owner_id = auth.uid()
            )
        )
    );

-- Files
CREATE POLICY "Users can view files they uploaded"
    ON files FOR SELECT
    USING (uploaded_by = auth.uid());

CREATE POLICY "Users can upload files"
    ON files FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Invoices
CREATE POLICY "Users can view relevant invoices"
    ON invoices FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM projects WHERE
                organization_id IN (
                    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                    UNION
                    SELECT id FROM organizations WHERE owner_id = auth.uid()
                )
                OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
        )
    );

-- Reports
CREATE POLICY "Users can view relevant reports"
    ON reports FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM projects WHERE
                organization_id IN (
                    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                    UNION
                    SELECT id FROM organizations WHERE owner_id = auth.uid()
                )
                OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
        )
    );

-- Artifacts and Artifact Files follow milestone visibility
CREATE POLICY "Users can view relevant artifacts"
    ON artifacts FOR SELECT
    USING (
        milestone_id IN (
            SELECT id FROM milestones WHERE phase_id IN (
                SELECT id FROM phases WHERE project_id IN (
                    SELECT id FROM projects WHERE
                        organization_id IN (
                            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                            UNION
                            SELECT id FROM organizations WHERE owner_id = auth.uid()
                        )
                        OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
                )
            )
        )
    );

CREATE POLICY "Users can view artifact files"
    ON artifact_files FOR SELECT
    USING (
        artifact_id IN (SELECT id FROM artifacts)
    );

-- Raw template uploads
CREATE POLICY "Admins can view raw uploads"
    ON raw_template_uploads FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND role = 'admin'
            UNION
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_org_users_user_id ON organization_users(user_id);
CREATE INDEX idx_org_users_org_id ON organization_users(organization_id);
CREATE INDEX idx_clients_org_id ON clients(organization_id);
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_projects_org_id ON projects(organization_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_phases_project_id ON phases(project_id);
CREATE INDEX idx_milestones_phase_id ON milestones(phase_id);
CREATE INDEX idx_milestone_actions_milestone_id ON milestone_actions(milestone_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_proposals_client_id ON proposals(client_id);
