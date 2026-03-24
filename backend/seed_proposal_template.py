"""Seed a professional project proposal template into document_templates."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase_client import get_supabase_admin

ORG_ID = "6d57ac52-c987-4edc-93a1-d64fb3023e1a"

PROPOSAL_CONTENT = """---

# {{project_title}}

## Project Proposal for {{client_name}}

**Prepared by:** {{freelancer_name}}
**Date:** {{proposal_date}}
**Valid Until:** {{valid_until}}

---

## Table of Contents

1. Project Overview
2. Problem Statement
3. Proposed Solution
4. Scope & Deliverables
5. Project Timeline
6. Investment & Pricing
7. Why Choose Us
8. Terms & Conditions
9. Agreement

---

## 1. Project Overview

**Client:** {{client_name}}
**Project:** {{project_title}}
**Contact:** {{client_email}}

This proposal outlines a comprehensive plan for {{project_title}}. We have carefully analysed your requirements and crafted a solution that aligns perfectly with your business goals.

---

## 2. Problem Statement

### The Challenge

{{client_name}} is currently facing the following challenges:

- **Challenge 1:** {{challenge_1}}
- **Challenge 2:** {{challenge_2}}
- **Challenge 3:** {{challenge_3}}

### Impact

Without addressing these challenges, {{client_name}} risks falling behind competitors and missing key growth opportunities. Our solution directly targets these pain points with measurable outcomes.

---

## 3. Proposed Solution

### Our Approach

We propose a tailored strategy that includes:

1. **Discovery & Research** — Deep dive into your brand, audience, and market positioning
2. **Strategy Development** — Custom roadmap aligned with your business objectives
3. **Execution & Implementation** — Hands-on delivery of all project components
4. **Review & Optimisation** — Data-driven refinements to maximise results

### Expected Outcomes

- Increased brand visibility and engagement
- Streamlined workflows and processes
- Measurable ROI within the project timeline
- Long-term sustainable growth framework

---

## 4. Scope & Deliverables

### What's Included

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | {{deliverable_1}} | {{deliverable_1_desc}} |
| 2 | {{deliverable_2}} | {{deliverable_2_desc}} |
| 3 | {{deliverable_3}} | {{deliverable_3_desc}} |
| 4 | {{deliverable_4}} | {{deliverable_4_desc}} |

### What's Not Included

- Items outside the agreed scope
- Additional revisions beyond {{revision_rounds}} rounds
- Third-party costs (stock images, paid tools, ad spend)

---

## 5. Project Timeline

### Phase Breakdown

| Phase | Duration | Details |
|-------|----------|---------|
| **Phase 1: Discovery** | Week 1-{{discovery_weeks}} | Research, audit, strategy call |
| **Phase 2: Strategy** | Week {{strategy_start}}-{{strategy_end}} | Planning, content calendar, roadmap |
| **Phase 3: Execution** | Week {{execution_start}}-{{execution_end}} | Production, delivery, implementation |
| **Phase 4: Review** | Week {{review_start}}-{{review_end}} | Analysis, optimisation, handover |

**Total Project Duration:** {{timeline_weeks}} weeks
**Estimated Start Date:** {{start_date}}
**Estimated Completion:** {{end_date}}

---

## 6. Investment & Pricing

### Project Investment

| Item | Amount |
|------|--------|
| {{line_item_1}} | R{{line_item_1_amount}} |
| {{line_item_2}} | R{{line_item_2_amount}} |
| {{line_item_3}} | R{{line_item_3_amount}} |
| **Total Investment** | **R{{project_amount}}** |

### Payment Terms

- **Deposit:** {{deposit_percentage}}% (R{{deposit_amount}}) due upon acceptance
- **Milestone Payment:** {{milestone_percentage}}% due at project midpoint
- **Final Payment:** {{final_percentage}}% due upon completion

*All prices are in South African Rand (ZAR) and exclude VAT unless stated.*

---

## 7. Why Choose Us

### Our Track Record

> "{{testimonial_1}}"
> — {{testimonial_1_author}}

> "{{testimonial_2}}"
> — {{testimonial_2_author}}

### What Sets Us Apart

- **Dedicated Support** — Direct communication, no middlemen
- **Results-Driven** — Every deliverable tied to measurable outcomes
- **Transparent Process** — Real-time project tracking via your client portal
- **Quality Guaranteed** — {{revision_rounds}} rounds of revisions included

---

## 8. Terms & Conditions

1. **Payment:** All payments must be made according to the schedule outlined above. Late payments may result in project delays.

2. **Revisions:** {{revision_rounds}} rounds of revisions are included. Additional revisions will be billed at R{{hourly_rate}}/hour.

3. **Timeline:** The project timeline begins upon receipt of the deposit payment and all required materials from the client.

4. **Intellectual Property:** All deliverables become the property of {{client_name}} upon full payment.

5. **Confidentiality:** Both parties agree to maintain confidentiality regarding proprietary information shared during the project.

6. **Cancellation:** Either party may cancel with 14 days written notice. Work completed up to cancellation will be invoiced.

7. **Liability:** {{freelancer_name}} will not be liable for any indirect or consequential damages arising from the project.

---

## 9. Agreement

By accepting this proposal, {{client_name}} agrees to the terms outlined in this document and authorises {{freelancer_name}} to commence work upon receipt of the deposit.

**Prepared By:**
{{freelancer_name}}
{{freelancer_email}}
{{proposal_date}}

**Accepted By:**
{{client_name}}
{{client_email}}
Date: _______________
Signature: _______________

---

*This proposal was generated via your client portal. For questions, contact {{freelancer_email}}.*
"""

VARIABLES_SCHEMA = {
    "project_title": "Project title",
    "client_name": "Client's full name or company",
    "client_email": "Client's email address",
    "freelancer_name": "Your name or business name",
    "freelancer_email": "Your email address",
    "proposal_date": "Date of proposal",
    "valid_until": "Proposal expiry date",
    "project_amount": "Total project amount",
    "challenge_1": "First client challenge",
    "challenge_2": "Second client challenge",
    "challenge_3": "Third client challenge",
    "deliverable_1": "First deliverable name",
    "deliverable_1_desc": "First deliverable description",
    "deliverable_2": "Second deliverable name",
    "deliverable_2_desc": "Second deliverable description",
    "deliverable_3": "Third deliverable name",
    "deliverable_3_desc": "Third deliverable description",
    "deliverable_4": "Fourth deliverable name",
    "deliverable_4_desc": "Fourth deliverable description",
    "revision_rounds": "Number of revision rounds",
    "timeline_weeks": "Total weeks for the project",
    "start_date": "Project start date",
    "end_date": "Project end date",
    "discovery_weeks": "Discovery phase end week",
    "strategy_start": "Strategy phase start week",
    "strategy_end": "Strategy phase end week",
    "execution_start": "Execution phase start week",
    "execution_end": "Execution phase end week",
    "review_start": "Review phase start week",
    "review_end": "Review phase end week",
    "line_item_1": "First line item name",
    "line_item_1_amount": "First line item amount",
    "line_item_2": "Second line item name",
    "line_item_2_amount": "Second line item amount",
    "line_item_3": "Third line item name",
    "line_item_3_amount": "Third line item amount",
    "deposit_percentage": "Deposit percentage",
    "deposit_amount": "Deposit amount",
    "milestone_percentage": "Milestone payment percentage",
    "final_percentage": "Final payment percentage",
    "hourly_rate": "Hourly rate for extra revisions",
    "testimonial_1": "First testimonial quote",
    "testimonial_1_author": "First testimonial author",
    "testimonial_2": "Second testimonial quote",
    "testimonial_2_author": "Second testimonial author",
}

DEFAULT_VALUES = {
    "project_title": "New Project",
    "freelancer_name": "Your Business Name",
    "freelancer_email": "hello@yourbusiness.com",
    "revision_rounds": "2",
    "timeline_weeks": "8",
    "discovery_weeks": "2",
    "strategy_start": "3",
    "strategy_end": "4",
    "execution_start": "5",
    "execution_end": "7",
    "review_start": "7",
    "review_end": "8",
    "deposit_percentage": "50",
    "milestone_percentage": "25",
    "final_percentage": "25",
    "hourly_rate": "500",
    "challenge_1": "Lack of consistent brand presence",
    "challenge_2": "No structured content strategy",
    "challenge_3": "Limited audience engagement and growth",
    "deliverable_1": "Brand Strategy Document",
    "deliverable_1_desc": "Comprehensive brand guidelines and positioning",
    "deliverable_2": "Content Calendar",
    "deliverable_2_desc": "3-month content plan with themes and schedules",
    "deliverable_3": "Creative Assets",
    "deliverable_3_desc": "Designed content pieces ready for publishing",
    "deliverable_4": "Performance Report",
    "deliverable_4_desc": "Analytics report with insights and recommendations",
    "line_item_1": "Strategy & Planning",
    "line_item_1_amount": "2500",
    "line_item_2": "Content Creation",
    "line_item_2_amount": "4000",
    "line_item_3": "Management & Reporting",
    "line_item_3_amount": "1500",
    "testimonial_1": "Working with them completely transformed our brand presence online.",
    "testimonial_1_author": "Previous Client",
    "testimonial_2": "Professional, creative, and delivering results beyond expectations.",
    "testimonial_2_author": "Previous Client",
}


def seed():
    admin = get_supabase_admin()

    # Check if a default proposal template already exists for this org
    existing = (
        admin.table("document_templates")
        .select("id, name")
        .eq("organization_id", ORG_ID)
        .eq("type", "proposal")
        .eq("is_default", True)
        .execute()
    )

    if existing.data:
        print(f"Default proposal template already exists: {existing.data[0]['name']} (id: {existing.data[0]['id']})")
        return existing.data[0]

    template_data = {
        "organization_id": ORG_ID,
        "name": "Professional Project Proposal",
        "description": "A comprehensive project proposal template with cover page, scope, timeline, pricing, testimonials, terms, and agreement sections. Fully customisable with dynamic variables.",
        "type": "proposal",
        "content": PROPOSAL_CONTENT,
        "variables_schema": VARIABLES_SCHEMA,
        "default_values": DEFAULT_VALUES,
        "is_default": True,
        "is_active": True,
        "theme": {"primaryColor": "#000000", "fontFamily": "Inter"},
    }

    result = admin.table("document_templates").insert(template_data).execute()
    template = result.data[0]
    print(f"✅ Proposal template created: {template['name']} (id: {template['id']})")
    return template


if __name__ == "__main__":
    seed()
