-- ============================================
-- DEFAULT DOCUMENT TEMPLATES
-- Run this AFTER supabase_schema_v2.sql
-- These templates use {{variable}} syntax for placeholders
-- ============================================

-- Note: You'll need to replace 'YOUR_ORG_ID' with actual organization ID
-- Or run this as a function that takes org_id as parameter

-- ============================================
-- 1. WELCOME DOCUMENT
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Welcome Document' as name,
    'Welcome new clients with essential information and portal access' as description,
    'welcome' as type,
    E'# WELCOME

Hey **{{client_name}}**,

Thank you for choosing to work with us. We''re thrilled to have the opportunity to bring your vision to life. Below, you''ll find everything you need to get started smoothly.

---

## AGREEMENT

[Link to the Agreement]({{agreement_link}})

---

## CLIENT PORTAL LINK

**[Access Your Portal]({{portal_link}})**

Welcome to your personalized Client Portal! This is your dedicated space to stay connected with us and track every stage of your project in one convenient place. Inside, you''ll find:

- **Project Overview**: A summary of your project goals, timelines, and key deliverables.

- **Documents (Agreements & Invoices)**: All your important paperwork in one place. Easily review, signed agreements and pending invoices.

- **Project Timeline & Updates**: Stay informed with real-time updates on your project''s milestones and progress. View a detailed timeline, upcoming tasks, and key dates to ensure everything is on track.

- **Media Deliverables**: Access your project files, including drafts, final deliverables, and reference materials. All content will be organized and readily available for your review and download.

- **Contact**: Need assistance or have questions? Here''s how to reach us.

The Client Portal is designed to make your experience with us as seamless and transparent as possible. We''re excited to have you here and look forward to creating exceptional work together!

---

**{{company_name}}**

*{{company_tagline}}*' as content,
    '{"client_name": "string", "agreement_link": "string", "portal_link": "string", "company_name": "string", "company_tagline": "string"}' as variables_schema,
    '{"company_tagline": "Your creative partner"}' as default_values,
    true as is_default
FROM organizations LIMIT 1;

-- ============================================
-- 2. AGREEMENT / CONTRACT
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Service Agreement' as name,
    'Standard service agreement template' as description,
    'agreement' as type,
    E'# SERVICE AGREEMENT

**Date**: {{date}}
**Agreement Number**: {{agreement_number}}

---

## PARTIES

**Service Provider:**
{{company_name}}
{{company_address}}
{{company_email}}

**Client:**
{{client_name}}
{{client_company}}
{{client_address}}
{{client_email}}

---

## PROJECT DETAILS

**Project Name**: {{project_name}}
**Start Date**: {{start_date}}
**Estimated Completion**: {{end_date}}

---

## SERVICES / SCOPE OF WORK

{{scope_of_work}}

---

## DELIVERABLES

{{deliverables_list}}

---

## TIMELINE

| Phase | Description | Duration |
|-------|-------------|----------|
{{timeline_table}}

---

## INVESTMENT

| Description | Amount |
|-------------|--------|
{{pricing_table}}

**Subtotal**: {{subtotal}}
**Tax ({{tax_rate}}%)**: {{tax_amount}}
**TOTAL**: **{{total_amount}} {{currency}}**

---

## PAYMENT TERMS

{{payment_terms}}

- **Deposit**: {{deposit_amount}} due upon signing
- **Final Payment**: Due upon project completion

---

## TERMS & CONDITIONS

1. **Revisions**: {{revision_policy}}

2. **Intellectual Property**: Upon full payment, all deliverables become the property of the Client.

3. **Confidentiality**: Both parties agree to keep project details confidential.

4. **Cancellation**: {{cancellation_policy}}

5. **Liability**: {{liability_terms}}

---

## SIGNATURES

**Service Provider**

Signature: _________________________
Name: {{company_representative}}
Date: _________________________

**Client**

Signature: _________________________
Name: {{client_name}}
Date: _________________________

---

*By signing this agreement, both parties agree to the terms and conditions outlined above.*' as content,
    '{"date": "date", "agreement_number": "string", "company_name": "string", "company_address": "string", "company_email": "string", "client_name": "string", "client_company": "string", "client_address": "string", "client_email": "string", "project_name": "string", "start_date": "date", "end_date": "date", "scope_of_work": "text", "deliverables_list": "text", "timeline_table": "text", "pricing_table": "text", "subtotal": "number", "tax_rate": "number", "tax_amount": "number", "total_amount": "number", "currency": "string", "payment_terms": "text", "deposit_amount": "string", "revision_policy": "text", "cancellation_policy": "text", "liability_terms": "text", "company_representative": "string"}' as variables_schema,
    '{"currency": "USD", "tax_rate": "0", "revision_policy": "2 rounds of revisions included", "cancellation_policy": "50% cancellation fee if cancelled after project start"}' as default_values,
    true as is_default
FROM organizations LIMIT 1;

-- ============================================
-- 3. INVOICE
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Invoice' as name,
    'Professional invoice template' as description,
    'invoice' as type,
    E'# INVOICE

**{{company_name}}**

---

| | |
|---|---|
| **DATE OF ISSUE** | {{issue_date}} |
| **DUE DATE** | {{due_date}} |
| **INVOICE NUMBER** | {{invoice_number}} |
| **REFERENCE** | {{reference}} |

---

## FROM

{{company_name}}
{{company_address}}
{{company_phone}}
{{company_email}}

## BILL TO

{{client_name}}
{{client_company}}
{{client_address}}
{{client_email}}
{{client_phone}}

---

## SERVICES / PRODUCTS

| Description | Qty | Unit Price | Amount |
|-------------|-----|------------|--------|
{{line_items}}

---

| | |
|---|---|
| **Subtotal** | {{subtotal}} |
| **Tax ({{tax_rate}}%)** | {{tax_amount}} |
| **Discount** | {{discount}} |
| **TOTAL** | **{{total}} {{currency}}** |

| **PAYMENT DUE** | **{{total}} {{currency}}** |

---

## PAYMENT

### Bank Transfer

{{bank_name}}
Account Name: {{account_name}}
Account Number: {{account_number}}
Routing: {{routing_number}}

### Or Pay Online

[Click to Pay]({{payment_link}})

*Scan QR code for payment:*
{{qr_code}}

---

## TERMS & CONDITIONS

{{terms_and_conditions}}

If you have any questions, feel free to reach out.

---

**Thank you for your business!**

{{company_name}}' as content,
    '{"company_name": "string", "company_address": "string", "company_phone": "string", "company_email": "string", "issue_date": "date", "due_date": "date", "invoice_number": "string", "reference": "string", "client_name": "string", "client_company": "string", "client_address": "string", "client_email": "string", "client_phone": "string", "line_items": "text", "subtotal": "number", "tax_rate": "number", "tax_amount": "number", "discount": "number", "total": "number", "currency": "string", "bank_name": "string", "account_name": "string", "account_number": "string", "routing_number": "string", "payment_link": "string", "qr_code": "string", "terms_and_conditions": "text"}' as variables_schema,
    '{"currency": "USD", "tax_rate": "0", "discount": "0", "terms_and_conditions": "Payment is due within 14 days of invoice date. Late payments may incur additional fees."}' as default_values,
    true as is_default
FROM organizations LIMIT 1;

-- ============================================
-- 4. STRATEGY CALL BOOKING
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Strategy Call Booking' as name,
    'Schedule strategy calls with clients' as description,
    'strategy_call' as type,
    E'# STRATEGY CALL

Hey **{{client_name}}**,

Let''s schedule a call to discuss your project and align on strategy.

---

## MEETING DETAILS

**Topic**: {{call_topic}}
**Duration**: {{duration}} minutes
**Date/Time**: {{scheduled_date}} at {{scheduled_time}} ({{timezone}})

---

## JOIN THE CALL

{{#if meeting_type == "google_meet"}}
**Google Meet**: [Join Meeting]({{meeting_link}})
{{/if}}

{{#if meeting_type == "zoom"}}
**Zoom Meeting**: [Join Meeting]({{meeting_link}})
Meeting ID: {{meeting_id}}
Passcode: {{meeting_passcode}}
{{/if}}

---

## AGENDA

{{agenda}}

---

## BEFORE THE CALL

Please prepare:
- [ ] Review any materials shared
- [ ] List any questions or concerns
- [ ] Have examples ready of what you like/dislike

---

## NEED TO RESCHEDULE?

No problem! Click here to reschedule: [Reschedule]({{reschedule_link}})

Please give at least 24 hours notice for rescheduling.

---

Looking forward to speaking with you!

**{{company_name}}**' as content,
    '{"client_name": "string", "call_topic": "string", "duration": "number", "scheduled_date": "date", "scheduled_time": "string", "timezone": "string", "meeting_type": "string", "meeting_link": "string", "meeting_id": "string", "meeting_passcode": "string", "agenda": "text", "reschedule_link": "string", "company_name": "string"}' as variables_schema,
    '{"duration": "60", "timezone": "UTC", "call_topic": "Project Strategy Discussion"}' as default_values,
    true as is_default
FROM organizations LIMIT 1;

-- ============================================
-- 5. PROJECT TIMELINE
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Project Timeline' as name,
    'Track project phases and milestones' as description,
    'project_timeline' as type,
    E'# PROJECT UPDATES

## Project Timeline & Updates

**Project**: {{project_name}}
**Client**: {{client_name}}
**Last Updated**: {{last_updated}}

---

## CURRENT STATUS

**Phase**: {{current_phase}}
**Progress**: {{overall_progress}}%
**Next Milestone**: {{next_milestone}}

---

## PHASE OVERVIEW

{{#each phases}}
### {{phase_name}}

**Status**: {{status}}
**Duration**: {{start_date}} - {{end_date}}

| Task | Pre-Production | Development | Delivery | Posted |
|------|----------------|-------------|----------|--------|
{{#each milestones}}
| {{title}} | {{pre_production}} | {{development}} | {{delivery}} | {{posted}} |
{{/each}}

{{/each}}

---

## LEGEND

- 🟢 **Done** - Task completed
- 🟡 **In Progress** - Currently working on
- ⚪ **Pending** - Not started yet
- ➖ **N/A** - Not applicable

---

## UPCOMING

{{upcoming_tasks}}

---

## NOTES

{{notes}}

---

*This timeline is updated regularly. Check back for the latest progress.*

**{{company_name}}**' as content,
    '{"project_name": "string", "client_name": "string", "last_updated": "date", "current_phase": "string", "overall_progress": "number", "next_milestone": "string", "phases": "array", "upcoming_tasks": "text", "notes": "text", "company_name": "string"}' as variables_schema,
    '{}' as default_values,
    true as is_default
FROM organizations LIMIT 1;

-- ============================================
-- 6. DELIVERABLES / FULFILLMENT
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Media Deliverables' as name,
    'Deliver files and media to clients' as description,
    'deliverables' as type,
    E'# DELIVERABLES

## Media Deliverables

**Project**: {{project_name}}
**Client**: {{client_name}}
**Delivery Date**: {{delivery_date}}

---

## RECENT PROJECT DELIVERABLES

{{recent_deliverables_description}}

**[Access Deliverables]({{deliverables_link}})**

*Recommended: Google Drive*

---

## ACCESS ALL DELIVERABLES

Access all of **{{client_name}}**''s deliverables below:

**[View All Files]({{all_files_link}})**

*Recommended: Google Drive*

---

## DOWNLOAD INSTRUCTIONS

1. Click the link above to access the folder
2. Review all files to ensure everything is correct
3. Download by clicking "Download All" or select individual files
4. Files will remain accessible until {{access_expiry}}

---

## INCLUDED IN THIS DELIVERY

{{#each deliverables}}
- [ ] {{name}} ({{type}}) - {{file_size}}
{{/each}}

---

## NEED CHANGES?

If you need any revisions or have questions about the deliverables:
- Email: {{support_email}}
- Reply to this document

Please note: {{revision_policy}}

---

**{{company_name}}**' as content,
    '{"project_name": "string", "client_name": "string", "delivery_date": "date", "recent_deliverables_description": "text", "deliverables_link": "string", "all_files_link": "string", "access_expiry": "date", "deliverables": "array", "support_email": "string", "revision_policy": "text", "company_name": "string"}' as variables_schema,
    '{"revision_policy": "2 rounds of revisions are included in your package"}' as default_values,
    true as is_default
FROM organizations LIMIT 1;

-- ============================================
-- 7. CONTENT USAGE GUIDE
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Content Usage Guide' as name,
    'Guide clients on how to use their content' as description,
    'content_guide' as type,
    E'# CONTENT USAGE GUIDE

Hey **{{client_name}}**,

This guide will help you transfer, upload, and share your content in the best possible quality while ensuring it performs well on each platform.

---

## 1. TRANSFERRING FILES WITHOUT LOSING QUALITY

Before uploading, it''s crucial to move the files correctly between devices to avoid compression and loss of quality.

### Mac Users (Using AirDrop)

- Use AirDrop to transfer videos/photos from your Mac to iPhone
- Open Finder and select your files
- Right-click → Share → AirDrop → Select your iPhone
- **Important**: Ensure AirDrop is set to "Everyone" and transfer files in their original format (ProRes, 4K, or high-res HEIC/JPEG).

### Windows Users (Transferring to iPhone)

- The easiest way is to use iCloud Drive or a tool like Snapdrop.net
- Upload the files to iCloud Drive on your PC
- On your iPhone, open Files → iCloud Drive, then download the content
- Alternatively, use Google Drive or Dropbox, but ensure to download in original quality.

### Android Users (Transferring to Android)

- Use Google Drive or a direct USB connection
- Upload files to Google Drive from your PC
- Open the Google Drive app on your phone and download them
- Alternative: Use a USB-C or OTG cable to move files manually.

---

## 2. POSTING TO SOCIAL MEDIA

### Instagram

**Reels/Stories:**
- Resolution: 1080 x 1920 (9:16)
- Format: MP4 or MOV
- Max length: 90 seconds (Reels), 60 seconds (Stories)
- Upload directly from your gallery for best quality

**Feed Posts:**
- Square: 1080 x 1080
- Portrait: 1080 x 1350
- Landscape: 1080 x 566
- Use high-res images, avoid screenshots

### TikTok

- Resolution: 1080 x 1920 (9:16)
- Format: MP4 or MOV
- Upload from gallery, not through screen recording
- Enable "High Quality Uploads" in settings

### YouTube

**Shorts:**
- Resolution: 1080 x 1920 (9:16)
- Max length: 60 seconds

**Regular Videos:**
- Resolution: 1920 x 1080 minimum (4K preferred)
- Format: MP4 (H.264 codec)
- Upload via desktop for best quality

### LinkedIn

- Video: 1920 x 1080 (16:9) or 1080 x 1080 (1:1)
- Images: 1200 x 627 minimum
- Format: MP4 for videos, PNG/JPEG for images

---

## 3. BEST PRACTICES

### DO:
- ✅ Always download files in original quality
- ✅ Use native transfer methods (AirDrop, USB)
- ✅ Check platform-specific settings for quality uploads
- ✅ Preview content before posting

### DON''T:
- ❌ Screenshot or screen record content
- ❌ Use messaging apps to transfer (they compress)
- ❌ Download from social media (heavily compressed)
- ❌ Re-upload already posted content

---

## 4. ENGAGEMENT TIPS

- **Best times to post**: {{best_posting_times}}
- **Hashtag strategy**: {{hashtag_tips}}
- **Caption tips**: {{caption_tips}}
- **Engagement**: Respond to comments within the first hour

---

## NEED HELP?

If you have any questions about using your content:
- Email: {{support_email}}
- Schedule a call: {{support_call_link}}

---

**{{company_name}}**' as content,
    '{"client_name": "string", "best_posting_times": "text", "hashtag_tips": "text", "caption_tips": "text", "support_email": "string", "support_call_link": "string", "company_name": "string"}' as variables_schema,
    '{"best_posting_times": "Weekdays 9-11am and 7-9pm", "hashtag_tips": "Use 5-10 relevant hashtags, mix popular and niche", "caption_tips": "Hook in first line, call-to-action at the end"}' as default_values,
    true as is_default
FROM organizations LIMIT 1;

-- ============================================
-- 8. MONTHLY REPORT
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Monthly Report' as name,
    'Monthly performance and progress report' as description,
    'monthly_report' as type,
    E'# MONTHLY REPORT

**{{client_name}}**
**Period**: {{period_start}} - {{period_end}}
**Prepared by**: {{company_name}}

---

## EXECUTIVE SUMMARY

{{executive_summary}}

---

## KEY METRICS

| Metric | This Month | Last Month | Change |
|--------|------------|------------|--------|
| Followers | {{followers_current}} | {{followers_previous}} | {{followers_change}} |
| Engagement Rate | {{engagement_current}} | {{engagement_previous}} | {{engagement_change}} |
| Total Reach | {{reach_current}} | {{reach_previous}} | {{reach_change}} |
| Total Impressions | {{impressions_current}} | {{impressions_previous}} | {{impressions_change}} |

---

## CONTENT PERFORMANCE

### Top Performing Posts

{{#each top_posts}}
**{{rank}}. {{title}}**
- Views/Reach: {{views}}
- Engagement: {{engagement}}
- Key takeaway: {{takeaway}}
{{/each}}

### Content Breakdown

| Content Type | Posts | Avg. Engagement |
|--------------|-------|-----------------|
{{content_breakdown}}

---

## HIGHLIGHTS

{{#each highlights}}
- ✅ {{this}}
{{/each}}

---

## CHALLENGES

{{#each challenges}}
- ⚠️ {{this}}
{{/each}}

---

## RECOMMENDATIONS FOR NEXT MONTH

{{#each recommendations}}
{{index}}. {{this}}
{{/each}}

---

## UPCOMING CONTENT

{{upcoming_content}}

---

## ADDITIONAL NOTES

{{notes}}

---

*Report generated on {{report_date}}*

**{{company_name}}**' as content,
    '{"client_name": "string", "period_start": "date", "period_end": "date", "company_name": "string", "executive_summary": "text", "followers_current": "string", "followers_previous": "string", "followers_change": "string", "engagement_current": "string", "engagement_previous": "string", "engagement_change": "string", "reach_current": "string", "reach_previous": "string", "reach_change": "string", "impressions_current": "string", "impressions_previous": "string", "impressions_change": "string", "top_posts": "array", "content_breakdown": "text", "highlights": "array", "challenges": "array", "recommendations": "array", "upcoming_content": "text", "notes": "text", "report_date": "date"}' as variables_schema,
    '{}' as default_values,
    true as is_default
FROM organizations LIMIT 1;

-- ============================================
-- 9. COMPETITOR ANALYSIS
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Competitor Analysis' as name,
    'Analyze competitors and market positioning' as description,
    'competitor_analysis' as type,
    E'# COMPETITOR ANALYSIS

**{{client_name}}**
**Date**: {{analysis_date}}

---

## OVERVIEW

This Competitor Analysis Report provides a clear breakdown of your top competitors'' strategies, showcasing their strengths, weaknesses, and opportunities we can leverage to elevate your brand.

---

## COMPETITOR OVERVIEW

| Metric | {{competitor_1_name}} | {{competitor_2_name}} | {{competitor_3_name}} |
|--------|----------------------|----------------------|----------------------|
| **Followers** | {{competitor_1_followers}} | {{competitor_2_followers}} | {{competitor_3_followers}} |
| **Posting Frequency** | {{competitor_1_frequency}} | {{competitor_2_frequency}} | {{competitor_3_frequency}} |
| **Content Style** | {{competitor_1_style}} | {{competitor_2_style}} | {{competitor_3_style}} |
| **Engagement Rate** | {{competitor_1_engagement}} | {{competitor_2_engagement}} | {{competitor_3_engagement}} |
| **Avg Video Views** | {{competitor_1_views}} | {{competitor_2_views}} | {{competitor_3_views}} |
| **Best Performing Content** | {{competitor_1_best}} | {{competitor_2_best}} | {{competitor_3_best}} |

---

## DETAILED ANALYSIS

### {{competitor_1_name}}

**Strengths:**
{{competitor_1_strengths}}

**Weaknesses:**
{{competitor_1_weaknesses}}

**Opportunities:**
{{competitor_1_opportunities}}

---

### {{competitor_2_name}}

**Strengths:**
{{competitor_2_strengths}}

**Weaknesses:**
{{competitor_2_weaknesses}}

**Opportunities:**
{{competitor_2_opportunities}}

---

### {{competitor_3_name}}

**Strengths:**
{{competitor_3_strengths}}

**Weaknesses:**
{{competitor_3_weaknesses}}

**Opportunities:**
{{competitor_3_opportunities}}

---

## KEY TAKEAWAYS

{{key_takeaways}}

---

## RECOMMENDATIONS

Based on this analysis, here''s how we can position **{{client_name}}** for success:

{{#each recommendations}}
{{index}}. {{this}}
{{/each}}

---

## NEXT STEPS

{{next_steps}}

---

*Competitors with higher engagement focus on storytelling, high-quality visuals, and influencer collaborations.*

**{{company_name}}**' as content,
    '{"client_name": "string", "analysis_date": "date", "competitor_1_name": "string", "competitor_1_followers": "string", "competitor_1_frequency": "string", "competitor_1_style": "string", "competitor_1_engagement": "string", "competitor_1_views": "string", "competitor_1_best": "string", "competitor_1_strengths": "text", "competitor_1_weaknesses": "text", "competitor_1_opportunities": "text", "competitor_2_name": "string", "competitor_2_followers": "string", "competitor_2_frequency": "string", "competitor_2_style": "string", "competitor_2_engagement": "string", "competitor_2_views": "string", "competitor_2_best": "string", "competitor_2_strengths": "text", "competitor_2_weaknesses": "text", "competitor_2_opportunities": "text", "competitor_3_name": "string", "competitor_3_followers": "string", "competitor_3_frequency": "string", "competitor_3_style": "string", "competitor_3_engagement": "string", "competitor_3_views": "string", "competitor_3_best": "string", "competitor_3_strengths": "text", "competitor_3_weaknesses": "text", "competitor_3_opportunities": "text", "key_takeaways": "text", "recommendations": "array", "next_steps": "text", "company_name": "string"}' as variables_schema,
    '{}' as default_values,
    true as is_default
FROM organizations LIMIT 1;

-- ============================================
-- 10. THANK YOU DOCUMENT
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Thank You Document' as name,
    'Project completion thank you with feedback request' as description,
    'thank_you' as type,
    E'# THANK YOU

**Project Name**: {{project_name}}
**Date**: {{completion_date}}

---

## YOUR FINAL DELIVERABLES

All your project files are ready! Click the link below to access them:

**[Access Final Deliverables]({{deliverables_link}})**

*{{deliverables_location}}*

They are also available in the Media Deliverables section of your client portal.

Files will remain accessible until {{access_expiry}}. Please download and store them securely.

---

## MAKING THE MOST OF YOUR CONTENT

For best results when posting, check out our Content Usage Guide attached in the same email.

---

## IT WAS GREAT WORKING WITH YOU!

We truly appreciate the opportunity to bring your vision to life. Your trust means the world to us, and we''d love to continue creating exceptional work together!

### Want More Content?

Many of our clients see the best results with consistent, high-quality content. If you''re interested in future projects, let''s chat!

**[Schedule a Call]({{call_link}})**

### Referral Program

Know someone who needs premium content? Refer them, and when they book a project, you''ll receive {{referral_reward}} as a thank you!

**[Refer a Friend]({{referral_link}})**

### We''d Love Your Feedback!

A quick testimonial would mean a lot and help more brands benefit from our work.

**[Share Your Thoughts]({{testimonial_link}})**

---

## STAY CONNECTED

Follow us for tips, updates, and inspiration:

{{social_links}}

---

Thank you again for choosing **{{company_name}}**. We can''t wait to work with you again!

With gratitude,
**{{team_signature}}**

*{{company_name}}*' as content,
    '{"project_name": "string", "completion_date": "date", "deliverables_link": "string", "deliverables_location": "string", "access_expiry": "date", "call_link": "string", "referral_reward": "string", "referral_link": "string", "testimonial_link": "string", "social_links": "text", "company_name": "string", "team_signature": "string"}' as variables_schema,
    '{"deliverables_location": "Google Drive / Dropbox", "referral_reward": "10% off your next project"}' as default_values,
    true as is_default
FROM organizations LIMIT 1;

-- ============================================
-- 11. PROPOSAL
-- ============================================
INSERT INTO document_templates (organization_id, name, description, type, content, variables_schema, default_values, is_default) 
SELECT 
    id as organization_id,
    'Project Proposal' as name,
    'Detailed project proposal template' as description,
    'proposal' as type,
    E'# PROJECT PROPOSAL

**Prepared for**: {{client_name}}
**Date**: {{date}}
**Valid Until**: {{valid_until}}

---

## ABOUT US

{{company_description}}

---

## PROJECT OVERVIEW

### Understanding Your Needs

{{client_needs}}

### Our Solution

{{proposed_solution}}

---

## SCOPE OF WORK

{{scope_of_work}}

---

## DELIVERABLES

{{#each deliverables}}
- {{this}}
{{/each}}

---

## TIMELINE

| Phase | Duration | Deliverables |
|-------|----------|--------------|
{{timeline_table}}

**Estimated Completion**: {{completion_date}}

---

## INVESTMENT

### Package: {{package_name}}

{{package_description}}

| Item | Amount |
|------|--------|
{{pricing_table}}

**Total Investment**: **{{total_amount}} {{currency}}**

### Payment Terms

{{payment_terms}}

---

## WHY CHOOSE US?

{{#each reasons}}
✓ {{this}}
{{/each}}

---

## PORTFOLIO

View our recent work: [Portfolio]({{portfolio_link}})

---

## NEXT STEPS

1. Review this proposal
2. Let us know if you have any questions
3. Sign the agreement to get started
4. {{custom_next_step}}

**Ready to begin?** [Accept Proposal]({{accept_link}})

---

## TERMS & CONDITIONS

{{terms_and_conditions}}

---

*This proposal is valid until {{valid_until}}.*

**{{company_name}}**
{{company_contact}}' as content,
    '{"client_name": "string", "date": "date", "valid_until": "date", "company_description": "text", "client_needs": "text", "proposed_solution": "text", "scope_of_work": "text", "deliverables": "array", "timeline_table": "text", "completion_date": "date", "package_name": "string", "package_description": "text", "pricing_table": "text", "total_amount": "number", "currency": "string", "payment_terms": "text", "reasons": "array", "portfolio_link": "string", "custom_next_step": "string", "accept_link": "string", "terms_and_conditions": "text", "company_name": "string", "company_contact": "string"}' as variables_schema,
    '{"currency": "USD", "custom_next_step": "Schedule a kickoff call"}' as default_values,
    true as is_default
FROM organizations LIMIT 1;
