-- ============================================
-- FIX RLS POLICIES - Run this in Supabase SQL Editor
-- Fixes infinite recursion in organization policies
-- Uses SECURITY DEFINER functions to break circular references
-- ============================================

-- ============================================
-- STEP 1: Create helper functions (SECURITY DEFINER bypasses RLS)
-- These break the circular reference between organizations <-> organization_users
-- ============================================

-- Function to get org IDs where user is a member (bypasses RLS on organization_users)
CREATE OR REPLACE FUNCTION public.get_org_ids_for_user(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM organization_users WHERE user_id = uid;
$$;

-- Function to check if user owns an org (bypasses RLS on organizations)
CREATE OR REPLACE FUNCTION public.is_org_owner(org_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM organizations WHERE id = org_id AND owner_id = uid);
$$;

-- Function to get org IDs owned by user (bypasses RLS on organizations)
CREATE OR REPLACE FUNCTION public.get_owned_org_ids(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM organizations WHERE owner_id = uid;
$$;

-- Function to check user's role in an org (bypasses RLS on organization_users)
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(org_id uuid, uid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM organization_users WHERE organization_id = org_id AND user_id = uid LIMIT 1;
$$;

-- ============================================
-- STEP 2: Drop ALL existing problematic policies
-- ============================================

-- Organizations policies
DROP POLICY IF EXISTS "Users can view their orgs" ON organizations;
DROP POLICY IF EXISTS "Owners can update orgs" ON organizations;
DROP POLICY IF EXISTS "Auth users can create orgs" ON organizations;
DROP POLICY IF EXISTS "owners_view_orgs" ON organizations;
DROP POLICY IF EXISTS "members_view_orgs" ON organizations;
DROP POLICY IF EXISTS "owners_update_orgs" ON organizations;
DROP POLICY IF EXISTS "auth_create_orgs" ON organizations;
DROP POLICY IF EXISTS "owners_delete_orgs" ON organizations;

-- Organization_users policies
DROP POLICY IF EXISTS "View org memberships" ON organization_users;
DROP POLICY IF EXISTS "Owners manage memberships" ON organization_users;
DROP POLICY IF EXISTS "users_view_own_memberships" ON organization_users;
DROP POLICY IF EXISTS "owners_view_memberships" ON organization_users;
DROP POLICY IF EXISTS "owners_insert_memberships" ON organization_users;
DROP POLICY IF EXISTS "owners_update_memberships" ON organization_users;
DROP POLICY IF EXISTS "owners_delete_memberships" ON organization_users;

-- Clients policies
DROP POLICY IF EXISTS "Org members view clients" ON clients;
DROP POLICY IF EXISTS "Admins manage clients" ON clients;
DROP POLICY IF EXISTS "view_clients" ON clients;
DROP POLICY IF EXISTS "manage_clients" ON clients;
DROP POLICY IF EXISTS "update_clients" ON clients;
DROP POLICY IF EXISTS "delete_clients" ON clients;

-- Document templates policies
DROP POLICY IF EXISTS "Org members view templates" ON document_templates;
DROP POLICY IF EXISTS "Admins manage templates" ON document_templates;
DROP POLICY IF EXISTS "view_templates" ON document_templates;
DROP POLICY IF EXISTS "insert_templates" ON document_templates;
DROP POLICY IF EXISTS "update_templates" ON document_templates;
DROP POLICY IF EXISTS "delete_templates" ON document_templates;

-- ============================================
-- STEP 3: ORGANIZATIONS POLICIES
-- Uses get_org_ids_for_user() instead of direct subquery on organization_users
-- ============================================

-- Users can view orgs they own OR are members of
CREATE POLICY "org_select" ON organizations FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (SELECT public.get_org_ids_for_user(auth.uid()))
);

-- Authenticated users can create orgs (they become owner)
CREATE POLICY "org_insert" ON organizations FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Owners can update their orgs
CREATE POLICY "org_update" ON organizations FOR UPDATE 
    USING (owner_id = auth.uid());

-- Owners can delete their orgs
CREATE POLICY "org_delete" ON organizations FOR DELETE 
    USING (owner_id = auth.uid());

-- ============================================
-- STEP 4: ORGANIZATION_USERS POLICIES
-- Uses is_org_owner() instead of direct subquery on organizations
-- ============================================

-- Users can view their own memberships OR org owner can see all
CREATE POLICY "orguser_select" ON organization_users FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_org_owner(organization_id, auth.uid())
);

-- Org owners can add members
CREATE POLICY "orguser_insert" ON organization_users FOR INSERT 
    WITH CHECK (public.is_org_owner(organization_id, auth.uid()));

-- Org owners can update memberships
CREATE POLICY "orguser_update" ON organization_users FOR UPDATE 
    USING (public.is_org_owner(organization_id, auth.uid()));

-- Org owners can remove members
CREATE POLICY "orguser_delete" ON organization_users FOR DELETE 
    USING (public.is_org_owner(organization_id, auth.uid()));

-- ============================================
-- STEP 5: CLIENTS POLICIES
-- Uses helper functions instead of direct subqueries
-- ============================================

CREATE POLICY "client_select" ON clients FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_org_owner(organization_id, auth.uid())
    OR public.get_user_role_in_org(organization_id, auth.uid()) IS NOT NULL
);

CREATE POLICY "client_insert" ON clients FOR INSERT WITH CHECK (
    public.is_org_owner(organization_id, auth.uid())
    OR public.get_user_role_in_org(organization_id, auth.uid()) IN ('owner', 'admin')
);

CREATE POLICY "client_update" ON clients FOR UPDATE USING (
    public.is_org_owner(organization_id, auth.uid())
    OR public.get_user_role_in_org(organization_id, auth.uid()) IN ('owner', 'admin')
);

CREATE POLICY "client_delete" ON clients FOR DELETE USING (
    public.is_org_owner(organization_id, auth.uid())
    OR public.get_user_role_in_org(organization_id, auth.uid()) IN ('owner', 'admin')
);

-- ============================================
-- STEP 6: DOCUMENT_TEMPLATES POLICIES
-- Uses helper functions instead of direct subqueries
-- ============================================

CREATE POLICY "template_select" ON document_templates FOR SELECT USING (
    public.is_org_owner(organization_id, auth.uid())
    OR public.get_user_role_in_org(organization_id, auth.uid()) IS NOT NULL
);

CREATE POLICY "template_insert" ON document_templates FOR INSERT WITH CHECK (
    public.is_org_owner(organization_id, auth.uid())
    OR public.get_user_role_in_org(organization_id, auth.uid()) IN ('owner', 'admin')
);

CREATE POLICY "template_update" ON document_templates FOR UPDATE USING (
    public.is_org_owner(organization_id, auth.uid())
    OR public.get_user_role_in_org(organization_id, auth.uid()) IN ('owner', 'admin')
);

CREATE POLICY "template_delete" ON document_templates FOR DELETE USING (
    public.is_org_owner(organization_id, auth.uid())
    OR public.get_user_role_in_org(organization_id, auth.uid()) IN ('owner', 'admin')
);

SELECT 'RLS policies fixed successfully! No more circular references.' as result;
