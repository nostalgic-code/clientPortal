import { getAccessToken, supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ApiOptions extends RequestInit {
  token?: string;
  skipAuth?: boolean;
  _retry?: boolean;
}

async function fetchApi<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token: providedToken, skipAuth, _retry, ...fetchOptions } = options;
  
  // Get token from Supabase if not provided and auth not skipped
  let token = providedToken;
  if (!token && !skipAuth) {
    token = await getAccessToken() || undefined;
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  console.log('[API]', endpoint, 'token present:', !!token);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // On 401, try refreshing the session and retry once
  if (response.status === 401 && !skipAuth && !_retry) {
    console.log('[API] 401 received, refreshing session and retrying...');
    try {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session?.access_token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', session.access_token);
        }
        return fetchApi<T>(endpoint, { ...options, token: session.access_token, _retry: true });
      }
    } catch (e) {
      console.error('[API] Session refresh failed:', e);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{
      access_token: string;
      refresh_token: string;
      user: User;
      organization: Organization;
      client?: Client;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    }),

  register: (data: { email: string; password: string; name: string; organization_name: string }) =>
    fetchApi<{
      access_token: string;
      refresh_token: string;
      user: User;
      organization: Organization;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    }),

  me: (token?: string) =>
    fetchApi<{ user: User; organization: Organization; client?: Client }>('/auth/me', { token }),

  inviteClient: (token: string, data: { client_id: string; password: string }) =>
    fetchApi<{ user: User; client: Client }>('/auth/client-invite', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
};

// Clients API
export const clientsApi = {
  list: (token: string) => fetchApi<{ clients: Client[] }>('/clients', { token }),
  
  get: (token: string, id: string) => fetchApi<{ client: Client }>(`/clients/${id}`, { token }),
  
  create: (token: string, data: { name: string; email: string; phone?: string; company?: string; status?: string }) =>
    fetchApi<{ client: Client }>('/clients', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  
  update: (token: string, id: string, data: Partial<Client>) =>
    fetchApi<{ client: Client }>(`/clients/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),
};

// Templates API
export const templatesApi = {
  list: (token: string, type?: string, active?: boolean) =>
    fetchApi<{ templates: DocumentTemplate[] }>(`/templates${type ? `?type=${type}` : ''}${active !== undefined ? `&active=${active}` : ''}`, { token }),
  
  get: (token: string, id: string) =>
    fetchApi<{ template: DocumentTemplate }>(`/templates/${id}`, { token }),
  
  create: (token: string, data: CreateTemplateData) =>
    fetchApi<{ template: DocumentTemplate; message: string }>('/templates', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  
  update: (token: string, id: string, data: Partial<CreateTemplateData>) =>
    fetchApi<{ template: DocumentTemplate; message: string }>(`/templates/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),
  
  delete: (token: string, id: string) =>
    fetchApi<{ message: string }>(`/templates/${id}`, {
      method: 'DELETE',
      token,
    }),
  
  duplicate: (token: string, id: string, name?: string) =>
    fetchApi<{ template: DocumentTemplate; message: string }>(`/templates/${id}/duplicate`, {
      method: 'POST',
      token,
      body: JSON.stringify({ name }),
    }),
  
  preview: (token: string, id: string, variables: Record<string, any>) =>
    fetchApi<{ rendered_content: string; variables_used: Record<string, any>; template: DocumentTemplate }>(`/templates/${id}/preview`, {
      method: 'POST',
      token,
      body: JSON.stringify({ variables }),
    }),
  
  generate: (token: string, id: string, data: { client_id: string; project_id?: string; name?: string; variables?: Record<string, any> }) =>
    fetchApi<{ document: Document; message: string }>(`/templates/${id}/generate`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  
  getTypes: (token: string) =>
    fetchApi<{ types: TemplateType[] }>('/templates/types', { token }),
};

// Documents API
export const documentsApi = {
  list: (token: string, filters?: { type?: string; client_id?: string; project_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.client_id) params.append('client_id', filters.client_id);
    if (filters?.project_id) params.append('project_id', filters.project_id);
    if (filters?.status) params.append('status', filters.status);
    const queryString = params.toString();
    return fetchApi<{ documents: Document[] }>(`/documents${queryString ? `?${queryString}` : ''}`, { token });
  },
  
  get: (token: string, id: string) =>
    fetchApi<{ document: Document }>(`/documents/${id}`, { token }),
  
  create: (token: string, data: CreateDocumentData) =>
    fetchApi<{ document: Document; message: string }>('/documents', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  
  update: (token: string, id: string, data: Partial<{ name: string; content: string; variables: Record<string, any>; status: string }>) =>
    fetchApi<{ document: Document; message: string }>(`/documents/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),
  
  delete: (token: string, id: string) =>
    fetchApi<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE',
      token,
    }),
  
  send: (token: string, id: string) =>
    fetchApi<{ document: Document; message: string }>(`/documents/${id}/send`, {
      method: 'POST',
      token,
    }),
  
  // Public endpoints (no auth required)
  getPublic: (publicToken: string) =>
    fetchApi<{ document: Document }>(`/documents/public/${publicToken}`, { skipAuth: true }),
  
  signPublic: (publicToken: string, data: { name: string; signature: string }) =>
    fetchApi<{ document: Document; message: string }>(`/documents/public/${publicToken}/sign`, {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(data),
    }),
};

// Proposals API
export const proposalsApi = {
  list: (token: string, status?: string) =>
    fetchApi<{ proposals: Proposal[] }>(`/proposals${status ? `?status=${status}` : ''}`, { token }),
  
  get: (token: string, id: string) =>
    fetchApi<{ proposal: Proposal }>(`/proposals/${id}`, { token }),
  
  getPublic: (publicToken: string) =>
    fetchApi<{ proposal: PublicProposal }>(`/proposals/public/${publicToken}`),
  
  create: (token: string, data: { client_id: string; template_id: string; variables?: Record<string, string>; total_amount?: number; title?: string }) =>
    fetchApi<{ proposal: Proposal }>('/proposals', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  
  send: (token: string, id: string) =>
    fetchApi<{ proposal: Proposal; public_url: string }>(`/proposals/${id}/send`, {
      method: 'POST',
      token,
    }),
  
  respond: (publicToken: string, action: 'accept' | 'reject') =>
    fetchApi<{ message: string; proposal: Proposal; project?: Project }>(`/proposals/public/${publicToken}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  accept: (publicToken: string) =>
    fetchApi<{ message: string; proposal: Proposal; project?: Project }>(`/proposals/public/${publicToken}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action: 'accept' }),
    }),

  reject: (publicToken: string) =>
    fetchApi<{ message: string; proposal: Proposal }>(`/proposals/public/${publicToken}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject' }),
    }),
};

// Projects API
export const projectsApi = {
  list: (token: string, status?: string) =>
    fetchApi<{ projects: Project[] }>(`/projects${status ? `?status=${status}` : ''}`, { token }),
  
  get: (token: string, id: string) =>
    fetchApi<{ project: Project }>(`/projects/${id}`, { token }),
  
  getClientView: (token: string, id: string) =>
    fetchApi<ClientProjectView>(`/projects/${id}/client-view`, { token }),
  
  updateStatus: (token: string, id: string, status: string) =>
    fetchApi<{ project: Project }>(`/projects/${id}/status`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ status }),
    }),

  completeMilestone: (token: string, projectId: string, milestoneId: string) =>
    fetchApi<{ project: Project; cascade: any; message: string }>(
      `/projects/${projectId}/milestones/${milestoneId}/complete`,
      { method: 'POST', token }
    ),
};

// Phases API
export const phasesApi = {
  list: (token: string, projectId: string) =>
    fetchApi<{ phases: Phase[] }>(`/phases/project/${projectId}`, { token }),
  
  get: (token: string, id: string) =>
    fetchApi<{ phase: Phase }>(`/phases/${id}`, { token }),
  
  activate: (token: string, id: string) =>
    fetchApi<{ phase: Phase }>(`/phases/${id}/activate`, {
      method: 'POST',
      token,
    }),
};

// Milestones API
export const milestonesApi = {
  list: (token: string, phaseId: string) =>
    fetchApi<{ milestones: Milestone[] }>(`/milestones/phase/${phaseId}`, { token }),
  
  get: (token: string, id: string) =>
    fetchApi<{ milestone: Milestone }>(`/milestones/${id}`, { token }),
  
  completeAction: (token: string, actionId: string) =>
    fetchApi<{ action: MilestoneAction; milestone: Milestone; phase_status: string; project_status: string }>(
      `/milestones/actions/${actionId}/complete`,
      { method: 'POST', token }
    ),
};

// Invoices API
export const invoicesApi = {
  list: (token: string, projectId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    if (status) params.append('status', status);
    const query = params.toString();
    return fetchApi<{ invoices: Invoice[] }>(`/invoices${query ? `?${query}` : ''}`, { token });
  },
  
  get: (token: string, id: string) =>
    fetchApi<{ invoice: Invoice }>(`/invoices/${id}`, { token }),
  
  create: (token: string, data: { project_id: string; subtotal: number; tax_rate?: number; discount_amount?: number; currency?: string; due_days?: number; client_id?: string; description?: string }) =>
    fetchApi<{ invoice: Invoice }>('/invoices', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  
  markPaid: (token: string, id: string) =>
    fetchApi<{ invoice: Invoice }>(`/invoices/${id}/pay`, {
      method: 'POST',
      token,
    }),

  cancel: (token: string, id: string) =>
    fetchApi<{ invoice: Invoice }>(`/invoices/${id}/cancel`, {
      method: 'POST',
      token,
    }),
};

// Reports API
export const reportsApi = {
  list: (token: string, projectId?: number) => {
    const params = projectId ? `?project_id=${projectId}` : '';
    return fetchApi<{ reports: Report[] }>(`/reports${params}`, { token });
  },
  
  get: (token: string, id: number) =>
    fetchApi<{ report: Report }>(`/reports/${id}`, { token }),
};

// Organization Settings API
export const organizationApi = {
  get: (token: string) =>
    fetchApi<{ organization: Organization; stats: { members: number; clients: number; projects: number } }>('/organization', { token }),

  update: (token: string, data: { name: string }) =>
    fetchApi<{ organization: Organization }>('/organization', {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),

  getProfile: (token: string) =>
    fetchApi<{ profile: User }>('/organization/profile', { token }),

  updateProfile: (token: string, data: { name?: string; phone?: string; company_name?: string; avatar_url?: string }) =>
    fetchApi<{ profile: User }>('/organization/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
};

// ==========================================
// CLIENT PORTAL API
// ==========================================

export const portalApi = {
  // Dashboard
  getDashboard: (token?: string) =>
    fetchApi<{ client: PortalClient; project: PortalProjectSummary | null; stats: PortalStats }>('/portal/dashboard', { token }),

  // Proposals
  getProposals: (token?: string) =>
    fetchApi<{ proposals: Proposal[] }>('/portal/proposals', { token }),

  getProposal: (id: string, token?: string) =>
    fetchApi<{ proposal: Proposal }>(`/portal/proposals/${id}`, { token }),

  respondToProposal: (id: string, action: 'accept' | 'reject', token?: string) =>
    fetchApi<{ message: string; proposal: Proposal; project?: Project }>(`/portal/proposals/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
      token,
    }),

  // Documents
  getDocuments: (token?: string) =>
    fetchApi<{ documents: Document[] }>('/portal/documents', { token }),

  getDocument: (id: string, token?: string) =>
    fetchApi<{ document: Document }>(`/portal/documents/${id}`, { token }),

  signDocument: (id: string, data: { name?: string; signature?: string }, token?: string) =>
    fetchApi<{ document: Document; message: string }>(`/portal/documents/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  // Project
  getProject: (token?: string) =>
    fetchApi<{ project: Project | null }>('/portal/project', { token }),

  // Invoices
  getInvoices: (token?: string) =>
    fetchApi<{ invoices: Invoice[] }>('/portal/invoices', { token }),

  getInvoice: (id: string, token?: string) =>
    fetchApi<{ invoice: Invoice }>(`/portal/invoices/${id}`, { token }),

  // File Uploads
  getUploads: (category?: string, token?: string) => {
    const params = category && category !== 'all' ? `?category=${category}` : '';
    return fetchApi<{ uploads: ClientUpload[]; total: number }>(`/portal/uploads${params}`, { token });
  },

  uploadFile: async (file: File, category: string, notes: string, token?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('notes', notes);

    const authToken = token || await getAccessToken() || undefined;
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${API_BASE_URL}/portal/uploads`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }
    return response.json() as Promise<{ upload: ClientUpload; message: string }>;
  },

  deleteUpload: (id: string, token?: string) =>
    fetchApi<{ message: string }>(`/portal/uploads/${id}`, {
      method: 'DELETE',
      token,
    }),

  downloadUpload: async (id: string, filename: string, token?: string) => {
    const authToken = token || await getAccessToken() || undefined;
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${API_BASE_URL}/portal/uploads/${id}/download`, { headers });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Admin: View client uploads
  adminGetClientUploads: (clientId: string, token?: string) =>
    fetchApi<{ uploads: ClientUpload[] }>(`/portal/admin/uploads/${clientId}`, { token }),

  adminDownloadClientUpload: async (clientId: string, fileId: string, filename: string, token?: string) => {
    const authToken = token || await getAccessToken() || undefined;
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${API_BASE_URL}/portal/admin/uploads/${clientId}/${fileId}/download`, { headers });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

// ==========================================
// NOTIFICATIONS API
// ==========================================

export const notificationsApi = {
  list: (token?: string, unreadOnly?: boolean, limit?: number) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unread_only', 'true');
    if (limit) params.append('limit', String(limit));
    const query = params.toString();
    return fetchApi<{ notifications: Notification[]; unread_count: number }>(`/notifications${query ? `?${query}` : ''}`, { token });
  },

  getUnreadCount: (token?: string) =>
    fetchApi<{ unread_count: number }>('/notifications/unread-count', { token }),

  markAsRead: (id: string, token?: string) =>
    fetchApi<{ notification: Notification }>(`/notifications/${id}/read`, {
      method: 'POST',
      token,
    }),

  markAllAsRead: (token?: string) =>
    fetchApi<{ message: string }>('/notifications/read-all', {
      method: 'POST',
      token,
    }),

  delete: (id: string, token?: string) =>
    fetchApi<{ message: string }>(`/notifications/${id}`, {
      method: 'DELETE',
      token,
    }),

  clearAll: (token?: string) =>
    fetchApi<{ message: string }>('/notifications/clear', {
      method: 'POST',
      token,
    }),
};

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  phone?: string;
  company_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  status: 'lead' | 'active' | 'past';
  notes?: string;
  portal_token?: string;
  created_at: string;
  updated_at?: string;
}

export interface Template {
  id: number;
  organization_id: number;
  name: string;
  type: 'proposal' | 'agreement' | 'invoice' | 'letter';
  source: 'native' | 'imported';
  created_at: string;
  versions?: TemplateVersion[];
}

export interface TemplateVersion {
  id: number;
  template_id: number;
  version_number: number;
  content: string;
  variables: Record<string, string>;
  created_at: string;
}

export interface Proposal {
  id: string;
  organization_id: string;
  client_id: string;
  template_id: string;
  title?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  content?: string;
  total_amount?: number;
  currency?: string;
  public_token?: string;
  sent_at?: string;
  responded_at?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  template?: DocumentTemplate;
}

export interface PublicProposal {
  id: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  content: string;
  total_amount?: number;
  currency?: string;
  client_name: string;
  client?: Client;
  created_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  client?: Client;
  phases?: Phase[];
  active_phase?: Phase;
  progress?: number;
}

export interface Phase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  order_index: number;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  phase_id: string;
  title: string;
  description?: string;
  order_index: number;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
  created_at: string;
  actions?: MilestoneAction[];
}

export interface MilestoneAction {
  id: string;
  milestone_id: string;
  type: 'upload' | 'sign' | 'approve' | 'schedule' | 'pay';
  title: string;
  description?: string;
  requirements?: Record<string, any>;
  status: 'pending' | 'complete';
  completed_at?: string;
  created_at: string;
}

export interface ClientProjectView {
  project_name: string;
  status: string;
  current_phase?: string;
  current_action?: {
    milestone: string;
    action: MilestoneAction;
  };
  phases: {
    name: string;
    status: string;
    order: number;
  }[];
}

export interface Invoice {
  id: string;
  organization_id?: string;
  project_id: string;
  client_id?: string;
  document_id?: string;
  invoice_number: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date?: string;
  due_date?: string;
  paid_at?: string;
  bank_details?: Record<string, string>;
  public_token?: string;
  created_at: string;
  project?: Project;
}

// New Document Template Types
export type DocumentType = 
  | 'welcome'
  | 'agreement'
  | 'invoice'
  | 'proposal'
  | 'strategy_call'
  | 'project_timeline'
  | 'deliverables'
  | 'content_guide'
  | 'monthly_report'
  | 'competitor_analysis'
  | 'thank_you'
  | 'custom';

export interface DocumentTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: DocumentType;
  content: string;
  variables_schema: Record<string, string>;
  default_values: Record<string, any>;
  is_default: boolean;
  is_active: boolean;
  version: number;
  theme: {
    primaryColor?: string;
    fontFamily?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  type: DocumentType;
  content: string;
  variables_schema?: Record<string, string>;
  default_values?: Record<string, any>;
  is_default?: boolean;
  is_active?: boolean;
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
  };
}

export interface TemplateType {
  id: DocumentType;
  name: string;
  description: string;
}

export interface Document {
  id: string;
  organization_id: string;
  project_id?: string;
  client_id: string;
  template_id?: string;
  name: string;
  type: DocumentType;
  content: string;
  variables: Record<string, any>;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'approved' | 'rejected';
  sent_at?: string;
  viewed_at?: string;
  signed_at?: string;
  signature_data?: {
    name: string;
    signature: string;
    ip_address: string;
    user_agent: string;
    signed_at: string;
  };
  public_token: string;
  created_at: string;
  updated_at: string;
  clients?: { name: string; email: string };
  projects?: { name: string };
  document_templates?: { name: string; type: string };
}

export interface CreateDocumentData {
  name: string;
  type: DocumentType;
  content: string;
  client_id: string;
  project_id?: string;
  template_id?: string;
  variables?: Record<string, any>;
}

export interface Report {
  id: number;
  project_id: number;
  artifact_id?: number;
  title: string;
  period?: string;
  content?: string;
  generated_at: string;
  created_at: string;
  project?: Project;
}

// ==========================================
// PORTAL TYPES
// ==========================================

export interface PortalClient {
  id: string;
  name: string;
  email: string;
  company?: string;
}

export interface PortalProjectSummary {
  id: string;
  name: string;
  status: string;
  progress: number;
  active_phase: string | null;
}

export interface PortalStats {
  total_proposals: number;
  pending_proposals: number;
  total_documents: number;
  pending_documents: number;
  signed_documents: number;
  total_invoices: number;
  unpaid_invoices: number;
  paid_invoices: number;
  uploads: number;
}

export interface ClientUpload {
  id: string;
  filename: string;
  storage_name: string;
  category: 'logo' | 'brand' | 'content' | 'document' | 'image' | 'video' | 'other';
  size: number;
  mime_type: string;
  notes: string;
  uploaded_at: string;
}

export type NotificationType =
  | 'proposal_sent'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'document_sent'
  | 'document_signed'
  | 'document_viewed'
  | 'file_uploaded'
  | 'invoice_created'
  | 'milestone_completed'
  | 'milestone_auto_completed'
  | 'phase_activated'
  | 'project_completed';

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}
