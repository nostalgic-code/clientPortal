"""
Seed all document templates into document_templates table.
Templates: agreement, welcome, invoice, strategy_call, project_timeline,
           deliverables, content_guide, monthly_report, competitor_analysis, thank_you
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from supabase_client import get_supabase_admin

ORG_ID = '6d57ac52-c987-4edc-93a1-d64fb3023e1a'

TEMPLATES = [
    {
        "name": "Service Agreement",
        "description": "Professional service agreement with scope, terms, and signature sections",
        "type": "agreement",
        "content": """# SERVICE AGREEMENT

**Date**: {{date}}
**Agreement Number**: {{agreement_number}}

---

## PARTIES

**Service Provider**: {{company_name}}
**Address**: {{company_address}}
**Email**: {{company_email}}

**Client**: {{client_name}}
**Email**: {{client_email}}

---

## 1. SCOPE OF WORK

{{scope_of_work}}

## 2. DELIVERABLES

{{deliverables}}

## 3. TIMELINE

| Phase | Description | Duration |
|-------|-------------|----------|
| {{phase_1_name}} | {{phase_1_description}} | {{phase_1_duration}} |
| {{phase_2_name}} | {{phase_2_description}} | {{phase_2_duration}} |
| {{phase_3_name}} | {{phase_3_description}} | {{phase_3_duration}} |

## 4. INVESTMENT

| Item | Amount |
|------|--------|
| {{line_item_1}} | {{line_amount_1}} |
| {{line_item_2}} | {{line_amount_2}} |
| {{line_item_3}} | {{line_amount_3}} |
| **Total** | **{{total_amount}} {{currency}}** |

**Payment Terms**: {{payment_terms}}

## 5. TERMS & CONDITIONS

- **Revisions**: {{revision_policy}}
- **Cancellation**: {{cancellation_policy}}
- **Intellectual Property**: All deliverables become the property of the client upon full payment.
- **Confidentiality**: Both parties agree to keep project details confidential.

## 6. AGREEMENT

By signing below, both parties agree to the terms outlined in this agreement.

**Client Signature**: _________________________
**Date**: _________________________

**Service Provider Signature**: _________________________
**Date**: _________________________

---

*{{company_name}} — {{company_tagline}}*
""",
        "variables_schema": {
            "date": {"type": "date", "label": "Agreement Date", "required": True},
            "agreement_number": {"type": "text", "label": "Agreement Number"},
            "company_name": {"type": "text", "label": "Company Name", "required": True},
            "company_address": {"type": "text", "label": "Company Address"},
            "company_email": {"type": "email", "label": "Company Email"},
            "company_tagline": {"type": "text", "label": "Company Tagline"},
            "client_name": {"type": "text", "label": "Client Name", "required": True},
            "client_email": {"type": "email", "label": "Client Email"},
            "scope_of_work": {"type": "textarea", "label": "Scope of Work", "required": True},
            "deliverables": {"type": "textarea", "label": "Deliverables"},
            "phase_1_name": {"type": "text", "label": "Phase 1 Name"},
            "phase_1_description": {"type": "text", "label": "Phase 1 Description"},
            "phase_1_duration": {"type": "text", "label": "Phase 1 Duration"},
            "phase_2_name": {"type": "text", "label": "Phase 2 Name"},
            "phase_2_description": {"type": "text", "label": "Phase 2 Description"},
            "phase_2_duration": {"type": "text", "label": "Phase 2 Duration"},
            "phase_3_name": {"type": "text", "label": "Phase 3 Name"},
            "phase_3_description": {"type": "text", "label": "Phase 3 Description"},
            "phase_3_duration": {"type": "text", "label": "Phase 3 Duration"},
            "line_item_1": {"type": "text", "label": "Line Item 1"},
            "line_amount_1": {"type": "text", "label": "Amount 1"},
            "line_item_2": {"type": "text", "label": "Line Item 2"},
            "line_amount_2": {"type": "text", "label": "Amount 2"},
            "line_item_3": {"type": "text", "label": "Line Item 3"},
            "line_amount_3": {"type": "text", "label": "Amount 3"},
            "total_amount": {"type": "number", "label": "Total Amount"},
            "currency": {"type": "text", "label": "Currency"},
            "payment_terms": {"type": "textarea", "label": "Payment Terms"},
            "revision_policy": {"type": "text", "label": "Revision Policy"},
            "cancellation_policy": {"type": "text", "label": "Cancellation Policy"},
        },
        "default_values": {
            "company_name": "Your Company",
            "currency": "ZAR",
            "payment_terms": "50% deposit due upon signing. Remaining 50% due upon project completion.",
            "revision_policy": "2 rounds of revisions included. Additional revisions billed at hourly rate.",
            "cancellation_policy": "Either party may cancel with 14 days written notice.",
            "phase_1_name": "Discovery & Planning",
            "phase_1_description": "Research, strategy, and project setup",
            "phase_1_duration": "1 week",
            "phase_2_name": "Production",
            "phase_2_description": "Content creation and development",
            "phase_2_duration": "2 weeks",
            "phase_3_name": "Delivery & Review",
            "phase_3_description": "Final delivery, revisions, and handoff",
            "phase_3_duration": "1 week",
        }
    },
    {
        "name": "Welcome Document",
        "description": "Client onboarding welcome document with portal access and next steps",
        "type": "welcome",
        "content": """# WELCOME, {{client_name}}! 🎉

We're thrilled to have you on board. This document will help you get started with everything you need.

---

## YOUR CLIENT PORTAL

Access your personalized portal anytime:

**[Open Your Portal]({{portal_link}})**

Inside your portal you'll find:
- **📋 Project Overview** — Goals, timelines, and deliverables at a glance
- **📄 Documents** — Agreements, invoices, and important files
- **📊 Project Timeline** — Real-time progress updates on what we're working on
- **📦 Deliverables** — Access and download all your completed files
- **💬 Communication** — Quick contact and updates

---

## YOUR PROJECT AT A GLANCE

| Detail | Info |
|--------|------|
| **Project** | {{project_name}} |
| **Start Date** | {{start_date}} |
| **Estimated Completion** | {{estimated_completion}} |
| **Your Contact** | {{contact_name}} |
| **Contact Email** | {{contact_email}} |

---

## NEXT STEPS

1. **Review & Sign** your service agreement
2. **Complete the onboarding questionnaire** — we'll send this separately
3. **Schedule your strategy call** — {{strategy_call_link}}
4. **Sit back** — we'll handle everything from here!

---

## WHAT TO EXPECT

> During your project, you'll receive regular updates through your portal. You can check in anytime to see exactly what we're working on, what's been completed, and what's coming next.

We believe in full transparency. Your portal is your window into the entire process.

---

## GOT QUESTIONS?

Don't hesitate to reach out:
- **Email**: {{contact_email}}
- **Phone**: {{contact_phone}}

We're here to make this process as smooth and enjoyable as possible.

---

*Welcome to the {{company_name}} family!*
""",
        "variables_schema": {
            "client_name": {"type": "text", "label": "Client Name", "required": True},
            "portal_link": {"type": "url", "label": "Portal Link"},
            "project_name": {"type": "text", "label": "Project Name"},
            "start_date": {"type": "date", "label": "Start Date"},
            "estimated_completion": {"type": "date", "label": "Estimated Completion"},
            "contact_name": {"type": "text", "label": "Contact Name"},
            "contact_email": {"type": "email", "label": "Contact Email"},
            "contact_phone": {"type": "text", "label": "Contact Phone"},
            "strategy_call_link": {"type": "url", "label": "Strategy Call Link"},
            "company_name": {"type": "text", "label": "Company Name"},
        },
        "default_values": {
            "company_name": "Your Company",
            "contact_name": "Your Name",
            "contact_email": "hello@yourcompany.com",
            "portal_link": "#",
            "strategy_call_link": "#",
        }
    },
    {
        "name": "Invoice",
        "description": "Professional invoice with line items, payment details, and due dates",
        "type": "invoice",
        "content": """# INVOICE

**Invoice #**: {{invoice_number}}
**Date Issued**: {{issue_date}}
**Due Date**: {{due_date}}

---

## FROM

**{{company_name}}**
{{company_address}}
{{company_email}}

## BILL TO

**{{client_name}}**
{{client_email}}
{{client_address}}

---

## SERVICES

| # | Description | Qty | Rate | Amount |
|---|-------------|-----|------|--------|
| 1 | {{line_item_1}} | {{qty_1}} | {{rate_1}} | {{amount_1}} |
| 2 | {{line_item_2}} | {{qty_2}} | {{rate_2}} | {{amount_2}} |
| 3 | {{line_item_3}} | {{qty_3}} | {{rate_3}} | {{amount_3}} |

---

| | |
|---|---|
| **Subtotal** | {{subtotal}} {{currency}} |
| **Tax ({{tax_rate}})** | {{tax_amount}} {{currency}} |
| **Discount** | -{{discount}} {{currency}} |
| **Total Due** | **{{total_amount}} {{currency}}** |

---

## PAYMENT DETAILS

**Bank**: {{bank_name}}
**Account Name**: {{account_name}}
**Account Number**: {{account_number}}
**Branch Code**: {{branch_code}}
**Reference**: {{payment_reference}}

> **Payment Terms**: {{payment_terms}}

---

## NOTES

{{notes}}

---

*Thank you for your business! — {{company_name}}*
""",
        "variables_schema": {
            "invoice_number": {"type": "text", "label": "Invoice Number", "required": True},
            "issue_date": {"type": "date", "label": "Issue Date", "required": True},
            "due_date": {"type": "date", "label": "Due Date", "required": True},
            "company_name": {"type": "text", "label": "Company Name"},
            "company_address": {"type": "text", "label": "Company Address"},
            "company_email": {"type": "email", "label": "Company Email"},
            "client_name": {"type": "text", "label": "Client Name", "required": True},
            "client_email": {"type": "email", "label": "Client Email"},
            "client_address": {"type": "text", "label": "Client Address"},
            "line_item_1": {"type": "text", "label": "Line Item 1"},
            "qty_1": {"type": "text", "label": "Qty 1"},
            "rate_1": {"type": "text", "label": "Rate 1"},
            "amount_1": {"type": "text", "label": "Amount 1"},
            "line_item_2": {"type": "text", "label": "Line Item 2"},
            "qty_2": {"type": "text", "label": "Qty 2"},
            "rate_2": {"type": "text", "label": "Rate 2"},
            "amount_2": {"type": "text", "label": "Amount 2"},
            "line_item_3": {"type": "text", "label": "Line Item 3"},
            "qty_3": {"type": "text", "label": "Qty 3"},
            "rate_3": {"type": "text", "label": "Rate 3"},
            "amount_3": {"type": "text", "label": "Amount 3"},
            "subtotal": {"type": "number", "label": "Subtotal"},
            "tax_rate": {"type": "text", "label": "Tax Rate"},
            "tax_amount": {"type": "number", "label": "Tax Amount"},
            "discount": {"type": "number", "label": "Discount"},
            "total_amount": {"type": "number", "label": "Total Amount"},
            "currency": {"type": "text", "label": "Currency"},
            "bank_name": {"type": "text", "label": "Bank Name"},
            "account_name": {"type": "text", "label": "Account Name"},
            "account_number": {"type": "text", "label": "Account Number"},
            "branch_code": {"type": "text", "label": "Branch Code"},
            "payment_reference": {"type": "text", "label": "Payment Reference"},
            "payment_terms": {"type": "text", "label": "Payment Terms"},
            "notes": {"type": "textarea", "label": "Notes"},
        },
        "default_values": {
            "company_name": "Your Company",
            "currency": "ZAR",
            "tax_rate": "15% VAT",
            "payment_terms": "Due within 7 days of invoice date.",
            "discount": "0",
        }
    },
    {
        "name": "Strategy Call Booking",
        "description": "Strategy call booking confirmation with agenda, preparation, and meeting link",
        "type": "strategy_call",
        "content": """# STRATEGY CALL BOOKING ✅

Your strategy call has been confirmed!

---

## CALL DETAILS

| Detail | Info |
|--------|------|
| **Date** | {{scheduled_date}} |
| **Time** | {{scheduled_time}} |
| **Duration** | {{duration}} minutes |
| **Type** | {{call_type}} |
| **Platform** | {{platform}} |

### [→ Join the Call]({{meeting_link}})

---

## AGENDA

{{agenda}}

---

## BEFORE THE CALL

To make the most of our time together, please:

1. **Review your goals** — What do you want to achieve?
2. **Gather inspiration** — Save examples of work you like (links, screenshots, etc.)
3. **List your questions** — Anything you want to discuss
4. **Check your tech** — Ensure your camera and mic are working

> **Pro tip**: The more prepared you are, the more valuable our call will be!

---

## WHAT WE'LL COVER

- Understanding your brand, goals, and target audience
- Discussing your current challenges
- Outlining a recommended strategy
- Defining next steps and timeline
- Q&A

---

## NEED TO RESCHEDULE?

No problem! Click below to choose a new time:

**[Reschedule Call]({{reschedule_link}})**

Please provide at least 24 hours notice for rescheduling.

---

*Looking forward to speaking with you! — {{company_name}}*
""",
        "variables_schema": {
            "scheduled_date": {"type": "date", "label": "Call Date", "required": True},
            "scheduled_time": {"type": "text", "label": "Call Time", "required": True},
            "duration": {"type": "number", "label": "Duration (min)"},
            "call_type": {"type": "text", "label": "Call Type"},
            "platform": {"type": "text", "label": "Platform"},
            "meeting_link": {"type": "url", "label": "Meeting Link", "required": True},
            "agenda": {"type": "textarea", "label": "Agenda"},
            "reschedule_link": {"type": "url", "label": "Reschedule Link"},
            "company_name": {"type": "text", "label": "Company Name"},
        },
        "default_values": {
            "duration": "45",
            "call_type": "Strategy & Planning",
            "platform": "Google Meet",
            "company_name": "Your Company",
            "agenda": "1. Introductions & overview\n2. Your goals and vision\n3. Current challenges\n4. Recommended strategy\n5. Timeline & next steps\n6. Q&A",
        }
    },
    {
        "name": "Project Timeline & Progress",
        "description": "Live project timeline showing current work, completed phases, and upcoming milestones",
        "type": "project_timeline",
        "content": """# PROJECT PROGRESS UPDATE

**Project**: {{project_name}}
**Client**: {{client_name}}
**Last Updated**: {{last_updated}}

---

## 📊 OVERALL PROGRESS

**{{overall_progress}}% Complete** — Status: **{{project_status}}**

---

## 🔥 CURRENTLY WORKING ON

> {{current_task}}

**Phase**: {{current_phase}}
**Expected completion**: {{current_task_eta}}

### Current Phase Details:
{{current_phase_details}}

---

## ✅ COMPLETED

| Phase | Completed On | Notes |
|-------|-------------|-------|
| {{completed_phase_1}} | {{completed_date_1}} | {{completed_notes_1}} |
| {{completed_phase_2}} | {{completed_date_2}} | {{completed_notes_2}} |
| {{completed_phase_3}} | {{completed_date_3}} | {{completed_notes_3}} |

---

## 📅 UPCOMING

| Phase | Estimated Start | Duration |
|-------|----------------|----------|
| {{upcoming_phase_1}} | {{upcoming_start_1}} | {{upcoming_duration_1}} |
| {{upcoming_phase_2}} | {{upcoming_start_2}} | {{upcoming_duration_2}} |
| {{upcoming_phase_3}} | {{upcoming_start_3}} | {{upcoming_duration_3}} |

---

## 📋 FULL TIMELINE

| # | Phase | Status | Timeline |
|---|-------|--------|----------|
| 1 | {{phase_1_name}} | {{phase_1_status}} | {{phase_1_timeline}} |
| 2 | {{phase_2_name}} | {{phase_2_status}} | {{phase_2_timeline}} |
| 3 | {{phase_3_name}} | {{phase_3_status}} | {{phase_3_timeline}} |
| 4 | {{phase_4_name}} | {{phase_4_status}} | {{phase_4_timeline}} |
| 5 | {{phase_5_name}} | {{phase_5_status}} | {{phase_5_timeline}} |

---

## 💬 NOTES & UPDATES

{{project_notes}}

---

> Your portal always has the latest progress. Visit anytime to check on your project!

*{{company_name}}*
""",
        "variables_schema": {
            "project_name": {"type": "text", "label": "Project Name", "required": True},
            "client_name": {"type": "text", "label": "Client Name", "required": True},
            "last_updated": {"type": "date", "label": "Last Updated"},
            "overall_progress": {"type": "number", "label": "Overall Progress %"},
            "project_status": {"type": "text", "label": "Project Status"},
            "current_task": {"type": "text", "label": "Current Task", "required": True},
            "current_phase": {"type": "text", "label": "Current Phase"},
            "current_task_eta": {"type": "text", "label": "Current Task ETA"},
            "current_phase_details": {"type": "textarea", "label": "Current Phase Details"},
            "completed_phase_1": {"type": "text", "label": "Completed Phase 1"},
            "completed_date_1": {"type": "text", "label": "Completed Date 1"},
            "completed_notes_1": {"type": "text", "label": "Completed Notes 1"},
            "completed_phase_2": {"type": "text", "label": "Completed Phase 2"},
            "completed_date_2": {"type": "text", "label": "Completed Date 2"},
            "completed_notes_2": {"type": "text", "label": "Completed Notes 2"},
            "completed_phase_3": {"type": "text", "label": "Completed Phase 3"},
            "completed_date_3": {"type": "text", "label": "Completed Date 3"},
            "completed_notes_3": {"type": "text", "label": "Completed Notes 3"},
            "upcoming_phase_1": {"type": "text", "label": "Upcoming Phase 1"},
            "upcoming_start_1": {"type": "text", "label": "Upcoming Start 1"},
            "upcoming_duration_1": {"type": "text", "label": "Upcoming Duration 1"},
            "upcoming_phase_2": {"type": "text", "label": "Upcoming Phase 2"},
            "upcoming_start_2": {"type": "text", "label": "Upcoming Start 2"},
            "upcoming_duration_2": {"type": "text", "label": "Upcoming Duration 2"},
            "upcoming_phase_3": {"type": "text", "label": "Upcoming Phase 3"},
            "upcoming_start_3": {"type": "text", "label": "Upcoming Start 3"},
            "upcoming_duration_3": {"type": "text", "label": "Upcoming Duration 3"},
            "phase_1_name": {"type": "text"}, "phase_1_status": {"type": "text"}, "phase_1_timeline": {"type": "text"},
            "phase_2_name": {"type": "text"}, "phase_2_status": {"type": "text"}, "phase_2_timeline": {"type": "text"},
            "phase_3_name": {"type": "text"}, "phase_3_status": {"type": "text"}, "phase_3_timeline": {"type": "text"},
            "phase_4_name": {"type": "text"}, "phase_4_status": {"type": "text"}, "phase_4_timeline": {"type": "text"},
            "phase_5_name": {"type": "text"}, "phase_5_status": {"type": "text"}, "phase_5_timeline": {"type": "text"},
            "project_notes": {"type": "textarea", "label": "Notes & Updates"},
            "company_name": {"type": "text", "label": "Company Name"},
        },
        "default_values": {
            "company_name": "Your Company",
            "project_status": "In Progress",
            "overall_progress": "0",
        }
    },
    {
        "name": "Deliverables & Fulfillment",
        "description": "Deliverables handoff document with file access, usage rights, and instructions",
        "type": "deliverables",
        "content": """# DELIVERABLES — {{project_name}}

**Client**: {{client_name}}
**Delivery Date**: {{delivery_date}}
**Project Reference**: {{project_reference}}

---

## 📦 YOUR FILES ARE READY!

All deliverables for your project have been completed and are ready for download.

### [→ Download All Files]({{deliverables_link}})

---

## WHAT'S INCLUDED

| # | Deliverable | Format | Status |
|---|-------------|--------|--------|
| 1 | {{deliverable_1}} | {{format_1}} | ✅ Ready |
| 2 | {{deliverable_2}} | {{format_2}} | ✅ Ready |
| 3 | {{deliverable_3}} | {{format_3}} | ✅ Ready |
| 4 | {{deliverable_4}} | {{format_4}} | ✅ Ready |
| 5 | {{deliverable_5}} | {{format_5}} | ✅ Ready |

---

## FILE ORGANIZATION

Your files are organized in the following structure:

```
📁 {{project_name}}/
├── 📁 Final/          — Ready-to-use files
├── 📁 Source/         — Editable source files
├── 📁 Exports/        — Various formats & sizes
└── 📁 Documentation/  — Usage guides & notes
```

---

## USAGE RIGHTS

{{usage_rights}}

---

## REVISION POLICY

- **Included revisions**: {{included_revisions}}
- **Revision window**: {{revision_window}}
- **How to request**: Reply to this document or email {{contact_email}}

---

## NEXT STEPS

1. Download and review all deliverables
2. Test files across your intended platforms
3. Request any revisions within the revision window
4. Refer to your Content Usage Guide for posting tips

---

> Questions about your deliverables? Reach out anytime at **{{contact_email}}**

*Thank you for working with us! — {{company_name}}*
""",
        "variables_schema": {
            "project_name": {"type": "text", "label": "Project Name", "required": True},
            "client_name": {"type": "text", "label": "Client Name", "required": True},
            "delivery_date": {"type": "date", "label": "Delivery Date"},
            "project_reference": {"type": "text", "label": "Project Reference"},
            "deliverables_link": {"type": "url", "label": "Download Link"},
            "deliverable_1": {"type": "text"}, "format_1": {"type": "text"},
            "deliverable_2": {"type": "text"}, "format_2": {"type": "text"},
            "deliverable_3": {"type": "text"}, "format_3": {"type": "text"},
            "deliverable_4": {"type": "text"}, "format_4": {"type": "text"},
            "deliverable_5": {"type": "text"}, "format_5": {"type": "text"},
            "usage_rights": {"type": "textarea", "label": "Usage Rights"},
            "included_revisions": {"type": "text", "label": "Included Revisions"},
            "revision_window": {"type": "text", "label": "Revision Window"},
            "contact_email": {"type": "email", "label": "Contact Email"},
            "company_name": {"type": "text", "label": "Company Name"},
        },
        "default_values": {
            "company_name": "Your Company",
            "included_revisions": "2 rounds of revisions",
            "revision_window": "14 days from delivery",
            "usage_rights": "You have full commercial usage rights for all delivered content. Files may be used across all platforms including social media, website, print, and advertising.",
            "contact_email": "hello@yourcompany.com",
        }
    },
    {
        "name": "Content Usage Guide",
        "description": "Guide for clients on how to use, transfer, and post their delivered content",
        "type": "content_guide",
        "content": """# CONTENT USAGE GUIDE

Hey **{{client_name}}**! 👋

This guide will help you get the absolute most out of your content. Follow these tips to ensure everything looks perfect wherever you share it.

---

## 📱 TRANSFERRING FILES

### iPhone / Mac Users
Use **AirDrop** for the fastest, highest-quality transfer:
1. Open the file on your device
2. Tap Share → AirDrop
3. Select your iPhone/Mac
4. Files transfer at full quality!

### Android / Windows Users
Options for quality transfer:
- **Google Drive** — Upload → Download on device
- **Snapdrop.net** — Wireless transfer on same WiFi
- **USB Cable** — Direct transfer, no quality loss

> ⚠️ **Avoid**: WhatsApp, Messenger, or email for transferring — these compress your files and reduce quality.

---

## 📲 POSTING BEST PRACTICES

### Instagram
- **Best times**: {{best_times_instagram}}
- **Reels**: Use trending audio for maximum reach
- **Stories**: Post 3-5 stories per week minimum
- **Captions**: Keep the hook in the first line, save hashtags for comments
- **Hashtags**: 5-15 relevant hashtags per post

### TikTok
- **Best times**: {{best_times_tiktok}}
- **Trending**: Check trending sounds before posting
- **Caption**: Keep it short and curiosity-driven
- **Frequency**: 1-3 posts per day for growth

### LinkedIn
- **Best times**: {{best_times_linkedin}}
- **Format**: Text posts with images perform best
- **Tone**: Professional but authentic

### Facebook
- **Best times**: {{best_times_facebook}}
- **Engagement**: Ask questions in your captions
- **Groups**: Share content in relevant groups

---

## 🎨 BRAND GUIDELINES

| Element | Specification |
|---------|--------------|
| **Primary Color** | {{primary_color}} |
| **Secondary Color** | {{secondary_color}} |
| **Font** | {{brand_font}} |
| **Tone of Voice** | {{tone_of_voice}} |

---

## 📏 FORMAT GUIDE

| Platform | Recommended Size | Aspect Ratio |
|----------|-----------------|--------------|
| Instagram Feed | 1080x1350px | 4:5 |
| Instagram Stories/Reels | 1080x1920px | 9:16 |
| TikTok | 1080x1920px | 9:16 |
| Facebook | 1200x630px | 1.91:1 |
| LinkedIn | 1200x627px | 1.91:1 |
| YouTube Thumbnail | 1280x720px | 16:9 |

---

## 📊 TRACKING PERFORMANCE

After posting, track these key metrics:
- **Reach** — How many people saw your content
- **Engagement Rate** — Likes + comments ÷ reach
- **Saves & Shares** — Indicates high-value content
- **Profile Visits** — Shows conversion interest

---

## 💡 QUICK TIPS

1. **Consistency > Perfection** — Post regularly
2. **Engage back** — Reply to comments within the first hour
3. **Repurpose** — One piece of content can work across multiple platforms
4. **Test & learn** — Try different posting times and formats

---

*Need help with your content strategy? We're always here! — {{company_name}}*
""",
        "variables_schema": {
            "client_name": {"type": "text", "label": "Client Name", "required": True},
            "best_times_instagram": {"type": "text", "label": "Best Times - Instagram"},
            "best_times_tiktok": {"type": "text", "label": "Best Times - TikTok"},
            "best_times_linkedin": {"type": "text", "label": "Best Times - LinkedIn"},
            "best_times_facebook": {"type": "text", "label": "Best Times - Facebook"},
            "primary_color": {"type": "text", "label": "Primary Color"},
            "secondary_color": {"type": "text", "label": "Secondary Color"},
            "brand_font": {"type": "text", "label": "Brand Font"},
            "tone_of_voice": {"type": "text", "label": "Tone of Voice"},
            "company_name": {"type": "text", "label": "Company Name"},
        },
        "default_values": {
            "company_name": "Your Company",
            "best_times_instagram": "Tue-Thu, 10am-12pm & 7pm-9pm",
            "best_times_tiktok": "Tue-Thu, 7pm-10pm",
            "best_times_linkedin": "Tue-Wed, 8am-10am",
            "best_times_facebook": "Wed-Fri, 1pm-4pm",
            "tone_of_voice": "Professional yet approachable",
        }
    },
    {
        "name": "Monthly Report",
        "description": "Monthly performance report with metrics, highlights, and recommendations",
        "type": "monthly_report",
        "content": """# MONTHLY REPORT

**Client**: {{client_name}}
**Period**: {{period_start}} — {{period_end}}
**Prepared by**: {{prepared_by}}

---

## 📈 PERFORMANCE SUMMARY

| Metric | This Month | Last Month | Change |
|--------|-----------|------------|--------|
| **Followers** | {{followers_current}} | {{followers_previous}} | {{followers_change}} |
| **Reach** | {{reach_current}} | {{reach_previous}} | {{reach_change}} |
| **Engagement Rate** | {{engagement_current}} | {{engagement_previous}} | {{engagement_change}} |
| **Website Clicks** | {{clicks_current}} | {{clicks_previous}} | {{clicks_change}} |
| **Impressions** | {{impressions_current}} | {{impressions_previous}} | {{impressions_change}} |

---

## 🏆 HIGHLIGHTS

### Top Performing Content
{{top_content}}

### Key Wins
{{key_wins}}

---

## 📊 CONTENT BREAKDOWN

| Content Type | Posts | Avg. Reach | Avg. Engagement |
|-------------|-------|-----------|-----------------|
| {{content_type_1}} | {{posts_1}} | {{avg_reach_1}} | {{avg_engagement_1}} |
| {{content_type_2}} | {{posts_2}} | {{avg_reach_2}} | {{avg_engagement_2}} |
| {{content_type_3}} | {{posts_3}} | {{avg_reach_3}} | {{avg_engagement_3}} |

---

## 🎯 GOALS PROGRESS

| Goal | Target | Actual | Status |
|------|--------|--------|--------|
| {{goal_1}} | {{target_1}} | {{actual_1}} | {{goal_status_1}} |
| {{goal_2}} | {{target_2}} | {{actual_2}} | {{goal_status_2}} |
| {{goal_3}} | {{target_3}} | {{actual_3}} | {{goal_status_3}} |

---

## 💡 RECOMMENDATIONS FOR NEXT MONTH

{{recommendations}}

---

## 📅 UPCOMING PLAN

{{upcoming_plan}}

---

*Questions about this report? Let's discuss! — {{company_name}}*
""",
        "variables_schema": {
            "client_name": {"type": "text", "label": "Client Name", "required": True},
            "period_start": {"type": "date", "label": "Period Start", "required": True},
            "period_end": {"type": "date", "label": "Period End", "required": True},
            "prepared_by": {"type": "text", "label": "Prepared By"},
            "followers_current": {"type": "text"}, "followers_previous": {"type": "text"}, "followers_change": {"type": "text"},
            "reach_current": {"type": "text"}, "reach_previous": {"type": "text"}, "reach_change": {"type": "text"},
            "engagement_current": {"type": "text"}, "engagement_previous": {"type": "text"}, "engagement_change": {"type": "text"},
            "clicks_current": {"type": "text"}, "clicks_previous": {"type": "text"}, "clicks_change": {"type": "text"},
            "impressions_current": {"type": "text"}, "impressions_previous": {"type": "text"}, "impressions_change": {"type": "text"},
            "top_content": {"type": "textarea", "label": "Top Performing Content"},
            "key_wins": {"type": "textarea", "label": "Key Wins"},
            "content_type_1": {"type": "text"}, "posts_1": {"type": "text"}, "avg_reach_1": {"type": "text"}, "avg_engagement_1": {"type": "text"},
            "content_type_2": {"type": "text"}, "posts_2": {"type": "text"}, "avg_reach_2": {"type": "text"}, "avg_engagement_2": {"type": "text"},
            "content_type_3": {"type": "text"}, "posts_3": {"type": "text"}, "avg_reach_3": {"type": "text"}, "avg_engagement_3": {"type": "text"},
            "goal_1": {"type": "text"}, "target_1": {"type": "text"}, "actual_1": {"type": "text"}, "goal_status_1": {"type": "text"},
            "goal_2": {"type": "text"}, "target_2": {"type": "text"}, "actual_2": {"type": "text"}, "goal_status_2": {"type": "text"},
            "goal_3": {"type": "text"}, "target_3": {"type": "text"}, "actual_3": {"type": "text"}, "goal_status_3": {"type": "text"},
            "recommendations": {"type": "textarea", "label": "Recommendations"},
            "upcoming_plan": {"type": "textarea", "label": "Upcoming Plan"},
            "company_name": {"type": "text", "label": "Company Name"},
        },
        "default_values": {
            "company_name": "Your Company",
            "prepared_by": "Your Name",
        }
    },
    {
        "name": "Competitor Analysis",
        "description": "Competitor analysis report with benchmarks, SWOT, and strategic recommendations",
        "type": "competitor_analysis",
        "content": """# COMPETITOR ANALYSIS

**Prepared for**: {{client_name}}
**Date**: {{analysis_date}}
**Prepared by**: {{prepared_by}}

---

## OVERVIEW

{{overview}}

---

## COMPETITORS ANALYZED

| # | Competitor | Platform | Followers | Engagement Rate |
|---|-----------|----------|-----------|----------------|
| 1 | {{competitor_1}} | {{platform_1}} | {{followers_1}} | {{engagement_1}} |
| 2 | {{competitor_2}} | {{platform_2}} | {{followers_2}} | {{engagement_2}} |
| 3 | {{competitor_3}} | {{platform_3}} | {{followers_3}} | {{engagement_3}} |

---

## YOUR POSITION

| Metric | You | Industry Avg | Top Competitor |
|--------|-----|-------------|----------------|
| **Followers** | {{your_followers}} | {{avg_followers}} | {{top_followers}} |
| **Engagement Rate** | {{your_engagement}} | {{avg_engagement}} | {{top_engagement}} |
| **Post Frequency** | {{your_frequency}} | {{avg_frequency}} | {{top_frequency}} |
| **Content Quality** | {{your_quality}} | {{avg_quality}} | {{top_quality}} |

---

## SWOT ANALYSIS

### ✅ Strengths
{{strengths}}

### ⚠️ Weaknesses
{{weaknesses}}

### 🚀 Opportunities
{{opportunities}}

### 🔴 Threats
{{threats}}

---

## KEY FINDINGS

{{key_findings}}

---

## STRATEGIC RECOMMENDATIONS

{{recommendations}}

---

## ACTION ITEMS

| Priority | Action | Expected Impact | Timeline |
|----------|--------|----------------|----------|
| 🔴 High | {{action_1}} | {{impact_1}} | {{timeline_1}} |
| 🟡 Medium | {{action_2}} | {{impact_2}} | {{timeline_2}} |
| 🟢 Low | {{action_3}} | {{impact_3}} | {{timeline_3}} |

---

*This analysis is based on publicly available data as of {{analysis_date}}. — {{company_name}}*
""",
        "variables_schema": {
            "client_name": {"type": "text", "label": "Client Name", "required": True},
            "analysis_date": {"type": "date", "label": "Analysis Date", "required": True},
            "prepared_by": {"type": "text", "label": "Prepared By"},
            "overview": {"type": "textarea", "label": "Overview"},
            "competitor_1": {"type": "text"}, "platform_1": {"type": "text"}, "followers_1": {"type": "text"}, "engagement_1": {"type": "text"},
            "competitor_2": {"type": "text"}, "platform_2": {"type": "text"}, "followers_2": {"type": "text"}, "engagement_2": {"type": "text"},
            "competitor_3": {"type": "text"}, "platform_3": {"type": "text"}, "followers_3": {"type": "text"}, "engagement_3": {"type": "text"},
            "your_followers": {"type": "text"}, "avg_followers": {"type": "text"}, "top_followers": {"type": "text"},
            "your_engagement": {"type": "text"}, "avg_engagement": {"type": "text"}, "top_engagement": {"type": "text"},
            "your_frequency": {"type": "text"}, "avg_frequency": {"type": "text"}, "top_frequency": {"type": "text"},
            "your_quality": {"type": "text"}, "avg_quality": {"type": "text"}, "top_quality": {"type": "text"},
            "strengths": {"type": "textarea", "label": "Strengths"},
            "weaknesses": {"type": "textarea", "label": "Weaknesses"},
            "opportunities": {"type": "textarea", "label": "Opportunities"},
            "threats": {"type": "textarea", "label": "Threats"},
            "key_findings": {"type": "textarea", "label": "Key Findings"},
            "recommendations": {"type": "textarea", "label": "Recommendations"},
            "action_1": {"type": "text"}, "impact_1": {"type": "text"}, "timeline_1": {"type": "text"},
            "action_2": {"type": "text"}, "impact_2": {"type": "text"}, "timeline_2": {"type": "text"},
            "action_3": {"type": "text"}, "impact_3": {"type": "text"}, "timeline_3": {"type": "text"},
            "company_name": {"type": "text", "label": "Company Name"},
        },
        "default_values": {
            "company_name": "Your Company",
            "prepared_by": "Your Name",
        }
    },
    {
        "name": "Thank You Document",
        "description": "Post-project thank you with deliverables recap, testimonial request, and referral CTA",
        "type": "thank_you",
        "content": """# THANK YOU, {{client_name}}! 🙏

It has been an absolute pleasure working with you on **{{project_name}}**. We're so proud of what we created together!

---

## YOUR PROJECT RECAP

| Detail | Info |
|--------|------|
| **Project** | {{project_name}} |
| **Duration** | {{project_duration}} |
| **Deliverables** | {{total_deliverables}} items |
| **Status** | ✅ Complete |

---

## 📦 YOUR DELIVERABLES

All your files are available in your portal:

### [→ Access Your Files]({{deliverables_link}})

---

## 💬 WE'D LOVE YOUR FEEDBACK

Your experience matters to us! If you have a moment, we'd truly appreciate a testimonial:

### [→ Share Your Feedback]({{testimonial_link}})

> A quick 2-3 sentence review about your experience helps other clients find us and lets us keep improving!

---

## 🔄 WANT MORE?

We'd love to continue working together. Here are some ways we can help:

{{additional_services}}

### [→ Book Your Next Project]({{booking_link}})

---

## 📣 REFER A FRIEND

Know someone who could use our services?

{{referral_program}}

### [→ Refer a Friend]({{referral_link}})

---

## STAY CONNECTED

- **Website**: {{website}}
- **Instagram**: {{instagram}}
- **Email**: {{contact_email}}

---

*Thank you for trusting us with your vision. Until next time! ❤️*

*— {{company_name}}*
""",
        "variables_schema": {
            "client_name": {"type": "text", "label": "Client Name", "required": True},
            "project_name": {"type": "text", "label": "Project Name", "required": True},
            "project_duration": {"type": "text", "label": "Project Duration"},
            "total_deliverables": {"type": "number", "label": "Total Deliverables"},
            "deliverables_link": {"type": "url", "label": "Deliverables Link"},
            "testimonial_link": {"type": "url", "label": "Testimonial Link"},
            "additional_services": {"type": "textarea", "label": "Additional Services"},
            "booking_link": {"type": "url", "label": "Booking Link"},
            "referral_program": {"type": "textarea", "label": "Referral Program Details"},
            "referral_link": {"type": "url", "label": "Referral Link"},
            "website": {"type": "url", "label": "Website"},
            "instagram": {"type": "text", "label": "Instagram Handle"},
            "contact_email": {"type": "email", "label": "Contact Email"},
            "company_name": {"type": "text", "label": "Company Name"},
        },
        "default_values": {
            "company_name": "Your Company",
            "additional_services": "- Monthly content creation packages\n- Social media management\n- Brand refresh & redesign\n- Campaign strategy & execution",
            "referral_program": "Share us with a friend and you both receive 10% off your next project!",
            "contact_email": "hello@yourcompany.com",
        }
    },
]


def seed():
    admin = get_supabase_admin()
    
    for tmpl in TEMPLATES:
        # Check if this type already has a default template
        existing = admin.table('document_templates') \
            .select('id, name') \
            .eq('organization_id', ORG_ID) \
            .eq('type', tmpl['type']) \
            .eq('is_default', True) \
            .execute()
        
        if existing.data:
            print(f"⏭️  Skipping {tmpl['type']} — default already exists: {existing.data[0]['name']}")
            continue
        
        result = admin.table('document_templates').insert({
            'organization_id': ORG_ID,
            'name': tmpl['name'],
            'description': tmpl['description'],
            'type': tmpl['type'],
            'content': tmpl['content'],
            'variables_schema': tmpl['variables_schema'],
            'default_values': tmpl['default_values'],
            'is_default': True,
            'is_active': True,
            'version': 1,
        }).execute()
        
        if result.data:
            print(f"✅ Created: {tmpl['name']} (id: {result.data[0]['id']})")
        else:
            print(f"❌ Failed to create: {tmpl['name']}")

    print("\n🎉 Done! All templates seeded.")


if __name__ == '__main__':
    seed()
