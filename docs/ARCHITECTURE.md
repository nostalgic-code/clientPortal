# AstroTechnologies Portal — System Architecture & API Reference

> **Version:** 2.0 | **Last Updated:** February 8, 2026 | **Endpoints:** 65 | **Tables:** 17

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Authentication](#authentication)
5. [Data Model](#data-model)
6. [Client Portal Flow](#client-portal-flow)
7. [API Reference](#api-reference)
8. [Test Cases](#test-cases)
9. [Error Handling](#error-handling)
10. [Deployment](#deployment)

---

## Overview

A multi-tenant SaaS client management platform for creative agencies. Provides:

- **Admin Dashboard** — Manage clients, proposals, projects, documents, invoices, templates
- **Client Portal** — Self-service: proposals, documents, project tracking, invoices, uploads
- **Template Engine** — 12 document types with `{{variable}}` interpolation
- **Invoice System** — Subtotal/tax/discount with auto-generated INV-YYYY-NNNN numbers

| Metric | Count |
|--------|-------|
| API Endpoints | 65 |
| Database Tables | 17 |
| Flask Blueprints | 9 |
| Document Types | 12 |
| User Roles | 2 (admin, client) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, react-markdown |
| **API Proxy** | Next.js rewrites: `/api/:path*` → Flask `:5000` |
| **Backend** | Flask 3.x, Python 3.13, 9 Blueprints, Supabase Python SDK |
| **Database** | PostgreSQL (Supabase), Row-Level Security, ES256 JWT |
| **Storage** | Local filesystem: `backend/uploads/portal/{client_id}/` |

---

## Architecture

```
Browser → Next.js (:3000) → [proxy] → Flask (:5000) → Supabase (PostgreSQL + Auth)
                                                    → Local FS (uploads/)
```

### Blueprint Registration

| Blueprint | URL Prefix | Endpoints |
|-----------|-----------|-----------|
| `auth_bp` | `/api/auth` | 6 |
| `clients_bp` | `/api/clients` | 5 |
| `proposals_bp` | `/api/proposals` | 7 |
| `projects_bp` | `/api/projects` | 4 |
| `invoices_bp` | `/api/invoices` | 5 |
| `templates_bp` | `/api/templates` | 9 |
| `documents_bp` | `/api/documents` | 8 |
| `org_settings_bp` | `/api/organization` | 4 |
| `client_portal_bp` | `/api/portal` | 16 |
| inline | `/api/health` | 1 |

### Directory Structure

```
portal/
├── backend/
│   ├── app.py                    # Flask entry, blueprint registration
│   ├── config.py                 # JWT, DB, upload config
│   ├── supabase_client.py        # Supabase SDK init (anon + service role)
│   ├── routes/
│   │   ├── auth.py               # Auth & user management
│   │   ├── clients.py            # Client CRUD
│   │   ├── proposals.py          # Proposal lifecycle
│   │   ├── projects.py           # Project & phases
│   │   ├── invoices.py           # Invoice CRUD + payments
│   │   ├── templates.py          # Template engine
│   │   ├── documents_new.py      # Document CRUD (V2)
│   │   ├── organization_settings.py
│   │   └── client_portal.py      # All portal endpoints (16)
│   └── uploads/portal/           # Client file uploads
│
├── frontend/src/
│   ├── app/
│   │   ├── dashboard/            # Admin (10 pages)
│   │   └── portal/               # Client (6 pages)
│   ├── lib/
│   │   ├── api.ts                # API client + interfaces
│   │   ├── auth-context.tsx      # Auth state
│   │   └── supabase.ts           # Supabase browser client
│   └── components/               # Shared UI
│
└── docs/                         # This documentation
```

---

## Authentication

### Flow

1. **Admin Register** → Supabase `sign_up` → Create org → Add to `organization_users` → Return JWT
2. **Admin Login** → Supabase `sign_in_with_password` → Fetch profile + org → Return JWT
3. **Client Invite** → Admin creates Supabase user (`admin.auth.create_user`) → Links `clients.user_id` → Adds to org
4. **Client Login** → Same as admin login, but response includes `client` object
5. **Token Refresh** → Supabase `refresh_session` → New access_token

### Middleware

| Decorator | Used In | Validates |
|-----------|---------|-----------|
| `supabase_auth_required` | Admin routes | Calls Supabase `/auth/v1/user` API |
| `portal_auth_required` | Portal routes | Checks Bearer token presence, extracts `sub` from JWT |

---

## Data Model

### Core Tables

| Table | PK | Key Columns | Relationships |
|-------|----|----|---|
| `profiles` | UUID | email, name, role | 1:1 auth.users |
| `organizations` | UUID | name, owner_id, settings JSONB | 1:N everything |
| `clients` | UUID | name, email, status, user_id, portal_token | N:1 org |
| `document_templates` | UUID | name, type, content, variables_schema JSONB | N:1 org |
| `proposals` | UUID | title, content, total_amount, status, public_token | N:1 client |
| `projects` | UUID | name, status, budget, currency | N:1 client, 1:N phases |
| `phases` | UUID | name, order_index, status | N:1 project, 1:N milestones |
| `milestones` | UUID | title, status, order_index | N:1 phase |
| `documents` | UUID | name, type, content, status, signature_data JSONB | N:1 client |
| `invoices` | UUID | invoice_number, subtotal, tax_rate, tax_amount, total, currency | N:1 client |
| `invoice_items` | UUID | description, quantity, unit_price, amount | N:1 invoice |
| `deliverables` | UUID | name, type, file_url, status | N:1 project |
| `strategy_calls` | UUID | title, scheduled_at, meeting_url | N:1 project |
| `competitor_analyses` | UUID | title, summary, key_takeaways | N:1 project |
| `monthly_reports` | UUID | title, metrics JSONB, period_start/end | N:1 project |
| `files` | UUID | storage_key, original_filename, mime_type | N:1 org |

### Status Enumerations

| Entity | Statuses |
|--------|----------|
| Client | `lead` → `active` → `past` |
| Proposal | `draft` → `sent` → `viewed` → `accepted` / `rejected` / `expired` |
| Project | `draft` → `active` → `paused` → `completed` / `cancelled` |
| Document | `draft` → `sent` → `viewed` → `signed` / `approved` / `rejected` |
| Invoice | `draft` → `sent` → `paid` / `overdue` / `cancelled` |
| Phase | `pending` → `active` → `completed` |
| Milestone | `pending` → `in_progress` → `review` → `completed` |

### Document Types (12)

`welcome` · `agreement` · `invoice` · `proposal` · `strategy_call` · `project_timeline` · `deliverables` · `content_guide` · `monthly_report` · `competitor_analysis` · `thank_you` · `custom`

---

## Client Portal Flow

```
ADMIN                                    CLIENT
─────                                    ──────
1. Create Client (lead)
2. Create Proposal (draft)
3. Send Proposal ──────────────────► 4. View Proposal
                                     5. Accept/Reject
   ◄── On Accept ──────────────────
6. Auto-create Project + 4 Phases
7. Invite Client to Portal ────────► 8. Client Logs In
9. Send Documents ─────────────────► 10. View & Sign
11. Create Invoice ────────────────► 12. View Invoices
                                     13. Upload Resources
14. View Client Uploads ◄──────────
```

### Portal Pages

| Page | Route | API | Description |
|------|-------|-----|-------------|
| Dashboard | `/portal` | `GET /api/portal/dashboard` | Stats, project summary |
| Proposals | `/portal/proposals` | `GET /api/portal/proposals` | View/respond |
| Documents | `/portal/documents` | `GET /api/portal/documents` | View/sign |
| Project | `/portal/project` | `GET /api/portal/project` | Phases/milestones |
| Invoices | `/portal/invoices` | `GET /api/portal/invoices` | View invoices |
| Uploads | `/portal/uploads` | `GET/POST /api/portal/uploads` | Upload files |

---

## API Reference

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | Public | Register admin + org |
| `POST` | `/login` | Public | Login (admin or client) |
| `POST` | `/refresh` | Public | Refresh access token |
| `GET` | `/me` | Bearer | Get current user |
| `POST` | `/client-invite` | Admin | Invite client to portal |
| `POST` | `/logout` | Bearer | Logout |

### Clients (`/api/clients`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Admin | List clients (?status=) |
| `GET` | `/{id}` | Admin/Own | Get client |
| `POST` | `/` | Admin | Create client |
| `PUT` | `/{id}` | Admin | Update client |
| `DELETE` | `/{id}` | Admin | Delete client |

### Templates (`/api/templates`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Auth | List (?type=&active=) |
| `GET` | `/{id}` | Auth | Get template |
| `POST` | `/` | Auth | Create template |
| `PUT` | `/{id}` | Auth | Update template |
| `DELETE` | `/{id}` | Auth | Soft delete (is_active=false) |
| `POST` | `/{id}/duplicate` | Auth | Duplicate template |
| `POST` | `/{id}/preview` | Auth | Preview with variables |
| `POST` | `/{id}/generate` | Auth | Generate document from template |
| `GET` | `/types` | Auth | List 12 template types |

### Documents (`/api/documents`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Auth | List (?type=&client_id=&status=) |
| `GET` | `/{id}` | Auth | Get document |
| `POST` | `/` | Auth | Create document |
| `PUT` | `/{id}` | Auth | Update document |
| `DELETE` | `/{id}` | Auth | Delete document |
| `POST` | `/{id}/send` | Auth | Send to client |
| `GET` | `/public/{token}` | Public | View document (auto-mark viewed) |
| `POST` | `/public/{token}/sign` | Public | Sign document |

### Proposals (`/api/proposals`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Admin | List (?status=) |
| `GET` | `/{id}` | Auth | Get proposal |
| `GET` | `/public/{token}` | Public | Public view |
| `POST` | `/` | Admin | Create proposal |
| `PUT` | `/{id}` | Admin | Update proposal |
| `POST` | `/{id}/send` | Admin | Send to client |
| `POST` | `/public/{token}/respond` | Public | Accept/reject |

### Projects (`/api/projects`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Auth | List (?status=) |
| `GET` | `/{id}` | Auth | Get with phases/milestones |
| `PUT` | `/{id}/status` | Admin | Update status |
| `GET` | `/{id}/client-view` | Auth | Simplified client view |

### Invoices (`/api/invoices`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Auth | List (?project_id=&status=) |
| `GET` | `/{id}` | Auth | Get invoice |
| `POST` | `/` | Admin | Create (subtotal, tax_rate, discount) |
| `POST` | `/{id}/pay` | Auth | Mark as paid |
| `POST` | `/{id}/cancel` | Admin | Cancel invoice |

**Invoice Tax Computation:**
- `tax_amount` = subtotal × (tax_rate / 100)
- `total` = subtotal + tax_amount - discount_amount
- `invoice_number` = DB function `generate_invoice_number(org_id)` → `INV-YYYY-NNNN`

### Organization (`/api/organization`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Auth | Get org + stats |
| `PUT` | `/` | Admin | Update org name |
| `GET` | `/profile` | Auth | Get user profile |
| `PUT` | `/profile` | Auth | Update profile |

### Portal (`/api/portal`) — 16 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/dashboard` | Portal | Client dashboard + stats |
| `GET` | `/proposals` | Portal | List proposals |
| `GET` | `/proposals/{id}` | Portal | Get proposal detail |
| `POST` | `/proposals/{id}/respond` | Portal | Accept/reject |
| `GET` | `/documents` | Portal | List sent documents |
| `GET` | `/documents/{id}` | Portal | Get document (auto-viewed) |
| `POST` | `/documents/{id}/sign` | Portal | Sign document |
| `GET` | `/project` | Portal | Project with phases |
| `GET` | `/invoices` | Portal | List invoices |
| `GET` | `/invoices/{id}` | Portal | Get invoice |
| `GET` | `/uploads` | Portal | List uploaded files |
| `POST` | `/uploads` | Portal | Upload file |
| `DELETE` | `/uploads/{id}` | Portal | Delete upload |
| `GET` | `/uploads/{id}/download` | Portal | Download file |
| `GET` | `/admin/uploads/{client_id}` | Admin | List client uploads |
| `GET` | `/admin/uploads/{cid}/{fid}/download` | Admin | Download client file |

---

## Test Cases

### AUTH — Authentication & Authorization (12 tests)

| ID | Test | Method | Expected |
|----|------|--------|----------|
| TC-AUTH-001 | Register new admin | POST /auth/register | 201, access_token, role=admin |
| TC-AUTH-002 | Duplicate email | POST /auth/register | 500, email taken |
| TC-AUTH-003 | Missing fields | POST /auth/register | 400, required fields |
| TC-AUTH-004 | Admin login | POST /auth/login | 200, JWT + org |
| TC-AUTH-005 | Client login | POST /auth/login | 200, JWT + client record |
| TC-AUTH-006 | Wrong password | POST /auth/login | 401, invalid credentials |
| TC-AUTH-007 | Valid /me | GET /auth/me | 200, user + org |
| TC-AUTH-008 | Expired token | GET /auth/me | 401, expired |
| TC-AUTH-009 | Invite client | POST /auth/client-invite | 201, user + link |
| TC-AUTH-010 | Already invited | POST /auth/client-invite | 409, already exists |
| TC-AUTH-011 | Client can't invite | POST /auth/client-invite | 403, admin only |
| TC-AUTH-012 | Token refresh | POST /auth/refresh | 200, new tokens |

### PROPOSALS — Full Lifecycle (10 tests)

| ID | Test | Expected |
|----|------|----------|
| TC-PROP-001 | Create with template + variables | 201, variables resolved |
| TC-PROP-002 | Send generates public_token | 200, status=sent |
| TC-PROP-003 | Public view limited fields | 200, no org data exposed |
| TC-PROP-004 | Accept creates project + 4 phases | 200, project + phases |
| TC-PROP-005 | Onboarding=active, others=pending | Verify phase statuses |
| TC-PROP-006 | Accept sets client.status=active | Verify client update |
| TC-PROP-007 | Reject keeps client as lead | 200, no project created |
| TC-PROP-008 | Double-respond blocked | 400, already responded |
| TC-PROP-009 | Portal shows own proposals | 200, filtered by client |
| TC-PROP-010 | Can't see other client's proposals | Data isolation verified |

### INVOICES — V2 Schema (9 tests)

| ID | Test | Expected |
|----|------|----------|
| TC-INV-001 | Tax computation | subtotal×15% = tax_amount, total computed |
| TC-INV-002 | Discount applied | total = subtotal + tax - discount |
| TC-INV-003 | Auto invoice_number | Matches INV-YYYY-NNNN |
| TC-INV-004 | client_id from project | Auto-derived, not required in body |
| TC-INV-005 | Default currency ZAR | No currency → ZAR |
| TC-INV-006 | Visible in portal | Client sees invoice |
| TC-INV-007 | Mark paid | status=paid, paid_at set |
| TC-INV-008 | Can't pay twice | 400, already paid |
| TC-INV-009 | Cancel non-paid | status=cancelled |

### E2E — Portal Journey (12 tests)

| ID | Test | Expected |
|----|------|----------|
| TC-E2E-001 | Lead → invite → login → dashboard | Full lifecycle works |
| TC-E2E-002 | Dashboard proposal stats | Correct counts |
| TC-E2E-003 | Accept via portal | Project created |
| TC-E2E-004 | Project phases visible | 4 phases with progress |
| TC-E2E-005 | All 12 doc types received | Portal shows all types |
| TC-E2E-006 | Invoice with tax in portal | Correct total displayed |
| TC-E2E-007 | File upload stores on disk | File in uploads/portal/ |
| TC-E2E-008 | Admin views client uploads | List returned |
| TC-E2E-009 | Admin downloads file | Binary with Content-Disposition |
| TC-E2E-010 | Client blocked from admin endpoints | 403 |
| TC-E2E-011 | No token → 401 | Unauthenticated blocked |
| TC-E2E-012 | Client A can't see Client B data | Isolation verified |

---

## Error Handling

### Standard Response

```json
{ "error": "Human-readable error message" }
```

### Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Reads, updates, actions |
| 201 | Created | New resource |
| 400 | Bad Request | Missing fields, invalid transition |
| 401 | Unauthorized | No/expired JWT |
| 403 | Forbidden | Wrong role or org |
| 404 | Not Found | Resource missing |
| 409 | Conflict | Duplicate |
| 500 | Server Error | Unexpected |

---

## Deployment

### Environment Variables

```bash
# backend/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJ...       # anon key
SUPABASE_SERVICE_KEY=eyJ...  # service role key
JWT_SECRET_KEY=secret
FLASK_SECRET_KEY=secret
```

### Setup

```bash
# Backend
cd backend && pip install -r requirements.txt && python app.py  # :5000

# Frontend
cd frontend && npm install --legacy-peer-deps && npm run dev    # :3000

# Database — run supabase_schema_v2.sql in Supabase SQL Editor
```

### Configuration

| Setting | Value |
|---------|-------|
| Max upload | 16 MB |
| JWT access expiry | 24 hours |
| JWT refresh expiry | 30 days |
| Default currency | ZAR |
| Invoice due days | 14 |
| CORS origin | localhost:3000 |
