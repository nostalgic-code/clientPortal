# Onboarding Flow


## Part 1 — Admin Registration and Setup

1. A new user visits the site and clicks "Get Started" to go to the registration page.

2. The user fills in their full name, email, password (minimum 8 characters), and organization name, then submits the form.

3. The backend creates a Supabase auth account, which automatically triggers a database function that creates a profile with the role set to "admin". An organization is created using the provided name, and the user is linked to it as the owner. An organization membership record is also created with the role "admin".

4. If email confirmation is enabled in Supabase, the user must click the confirmation link sent to their email. That link redirects to the auth callback page, which picks up the session tokens and sends the user to the dashboard. If email confirmation is disabled, the user is sent straight to the dashboard after registration.

5. The user lands on the dashboard. Everything is empty at this point — zero clients, zero projects, zero proposals, zero invoices. All sidebar navigation items are visible but contain no data.

6. The admin can optionally go to Settings to update their organization name, personal name, phone number, and company name. This is not required to proceed.


## Part 2 — Templates

7. Document templates must be seeded into the system. This is currently a manual step — the admin (or a developer) runs the seed script or executes the SQL seed file against the database. This populates the Templates section with default templates for proposals, agreements, invoices, welcome letters, strategy call notes, project timelines, deliverables, content guides, monthly reports, competitor analyses, and thank you letters. Without templates, the admin cannot create proposals or generate documents.

8. Each template has a type (like "proposal", "agreement", "invoice", etc.), a body written in Markdown, a set of variable placeholders written as {{variable_name}}, a variables schema that describes what each variable is, and default values for those variables. The admin can also create custom templates from the Templates page by providing a name, type, content, and optionally variables and defaults.

9. When the admin later selects a template to create a proposal or document, the system does the following: it takes the template content, merges the template's default values with any values the admin provides (admin-provided values override defaults), automatically injects the client's name and email into the variables, then replaces every {{variable_name}} placeholder in the content with the actual value. The result is the final resolved content that gets saved to the proposal or document.


## Part 3 — Creating a Client

10. The admin goes to the Clients page and creates a new client by providing at minimum a name and email address. Optionally they can add a phone number and company name. The client is created with a status of "lead". At this point the client is just a record in the system — they have no user account and cannot log in.

11. The admin invites the client to the portal by clicking "Invite to Portal" on the clients page. A dialog asks the admin to set a password for the client. The backend creates a Supabase auth account for the client (auto-confirmed, no email verification needed), sets their profile role to "client", links the new user to the existing client record, and adds them as a "member" of the organization. After this step, the client can log in with the email and password the admin set.


## Part 4 — Proposal Flow (How a Project Gets Created)

12. The admin goes to the Proposals page and creates a new proposal. They must select a client and a template. The template must be of type "proposal" — other template types cannot be used for proposals. The admin fills in any template variables (like project scope, pricing, timeline, etc.) and optionally sets a title and total amount. The system resolves the template content with the variables as described in step 9. The proposal is saved with a status of "draft".

13. While the proposal is in "draft" status, the admin can still edit the content, title, and total amount. Once a proposal is sent, it can no longer be edited.

14. The admin sends the proposal. This generates a unique public token (a UUID), builds a public URL in the format /proposal/{token}, and changes the proposal status from "draft" to "sent". The sent timestamp is recorded.

15. There is no project yet. A project cannot be created manually or independently. The only way a project gets created is when a client accepts a proposal. This is the single trigger for the entire project lifecycle.

16. The client can respond to the proposal in two ways: through the public link (no login required) or through the client portal (if they have been invited and are logged in). Both paths do the same thing.

17. If the client rejects the proposal, the status changes to "rejected", the responded timestamp is recorded, and nothing else happens. The admin can see the rejection on their proposals page.

18. If the client accepts the proposal, the following all happens automatically in one step:
    - 18a. The proposal status changes to "accepted" and the responded timestamp is recorded.
    - 18b. The client record status changes from "lead" to "active".
    - 18c. A new project is created with the name "Project for {client name}" and status "active".
    - 18d. Four phases are created under the project in this exact order: Onboarding (status "active"), Strategy (status "pending"), Fulfilment (status "pending"), Reporting (status "pending").
    - 18e. Four milestones are created under the Onboarding phase: Agreement Signing (status "in_progress"), Welcome Document (status "pending"), Invoice Payment (status "pending"), Resource Upload (status "pending").
    - 18f. Only the first milestone (Agreement Signing) starts as "in_progress". The rest are "pending" and waiting.


## Part 5 — Phase and Milestone Tracking (The Cascade System)

19. Phases and milestones follow a strict sequential cascade. Only one phase can be "active" at a time. Only one milestone within the active phase can be "in_progress" at a time. Everything else is either "pending" (waiting its turn) or "completed" (done).

20. When a milestone is completed (either manually by the admin or automatically by the system), the cascade logic runs:
    - 20a. The completed milestone is marked as "completed" with a timestamp.
    - 20b. The system looks for the next "pending" milestone in the same phase.
    - 20c. If there is a next milestone, it is set to "in_progress". The phase stays "active".
    - 20d. If there are no more pending milestones in the phase, the entire phase is marked as "completed".
    - 20e. If the phase completed, the system looks for the next "pending" phase in the project.
    - 20f. If there is a next phase, it is set to "active", and the first milestone in that new phase is set to "in_progress".
    - 20g. If there are no more pending phases, the entire project is marked as "completed".

21. This means the project progresses as: Onboarding (active) → all 4 milestones completed (Agreement Signing → Welcome Document → Invoice Payment → Resource Upload) → Strategy (active) → its milestones completed → Fulfilment (active) → its milestones completed → Reporting (active) → its milestones completed → Project completed.

22. The admin can also manually complete any milestone from the project detail page. This triggers the same cascade. The admin can also manually activate a phase, but only if no other phase is currently active.

23. Both the admin (on the dashboard) and the client (on the portal) can see the current project progress. Progress is calculated as a percentage: (number of completed phases / total phases) * 100.


## Part 6 — Documents Between Admin and Client

24. The admin creates documents from the Documents page. A document requires a name, type, content, and a client. Optionally the admin can link it to a project and base it on a template. If a template is used, the same variable resolution from step 9 applies. Valid document types include: welcome, agreement, invoice, proposal, strategy call, project timeline, deliverables, content guide, monthly report, competitor analysis, thank you, and custom. The document is created with a status of "draft".

25. While a document is in "draft" status, the admin can edit the name, content, variables, and status. The admin can also delete draft documents.

26. The admin sends the document to the client. This changes the status from "draft" to "sent" and records the sent timestamp. The client can now see this document in their portal.

27. The client only sees documents with a status of "sent" or later (sent, viewed, signed, approved, rejected). Drafts are never visible to the client.

28. When the client opens a document in the portal, the status automatically changes from "sent" to "viewed" and the viewed timestamp is recorded. This tells the admin the client has seen it.

29. If the document is an agreement type, the client can sign it. Signing records the client's name, their drawn/typed signature (as base64 data), their IP address, browser info, and the signing timestamp. The document status changes to "signed".

30. When an agreement document is signed, the system automatically looks for the "Agreement Signing" milestone in the client's active project. If that milestone is currently "in_progress" or "pending", it is automatically completed, and the cascade from step 20 runs. This means: signing the agreement completes the first onboarding milestone, which then activates the "Welcome Document" milestone.

31. Once the Agreement Signing milestone is completed, the admin sends the client a welcome document (using a template of type "welcome"). When the welcome document is sent and the client views or acknowledges it, the "Welcome Document" milestone is completed (either automatically or manually by the admin), and the cascade activates the "Invoice Payment" milestone.


## Part 7 — Invoices

32. The admin creates invoices from the Invoices page, linked to a project (and therefore to a client). Invoices have line items, subtotal, tax, total, currency, and due date.

33. The client sees invoices in their portal under the Invoices section. They can view the details of each invoice.

34. When an invoice is marked as "paid" (by the admin), the system can auto-complete the "Invoice Payment" milestone in the client's active project through the same cascade mechanism. This then activates the "Resource Upload" milestone.


## Part 8 — Client File Uploads

35. The client uploads files through the Upload Files section in the portal. They select a file, pick a category (logo, brand, content, document, image, video, or other), and optionally add notes. Allowed file types include pdf, doc, docx, xls, xlsx, ppt, pptx, images, videos, zip, and design files like ai/psd/eps.

36. Files are saved on the server in a folder specific to that client (uploads/portal/{client_id}/). A JSON catalog file (_catalog.json) in that folder tracks every uploaded file with its ID, original filename, storage name, category, size, mime type, notes, and upload timestamp.

37. The client can view, download, and delete their own uploads from the portal.

38. The admin can view and download any client's uploads from the Client Uploads section on the dashboard. The admin sees the files through a separate admin endpoint that reads the same catalog.

39. When the client uploads files, the system can auto-complete the "Resource Upload" milestone in the client's active project. If Agreement Signing, Welcome Document, and Invoice Payment are all already completed, completing Resource Upload finishes the entire Onboarding phase and activates the Strategy phase.


## Part 9 — Client Portal Experience (What the Client Sees)

40. The client logs in with the credentials the admin set during the invitation. The system detects their role is "client" and redirects them to the portal (not the dashboard).

41. The portal dashboard shows the client an overview: their name, their active project (if any), project progress percentage, current active phase name, counts of proposals/documents/invoices/uploads, and how many items need attention (pending proposals, unsigned documents, unpaid invoices).

42. The portal has these sections: Proposals (view and respond to sent proposals), My Project (see phases, milestones, and progress), Documents (view and sign documents), Invoices (view invoices and payment status), Upload Files (upload, view, download, and delete files).

43. The client cannot see anything in "draft" status. They only see proposals that have been "sent", documents that have been "sent" or later, and invoices linked to their projects.

44. If there is no project yet (no proposal has been accepted), the project section shows nothing. The client's portal populates as the admin sends them things and as they progress through their onboarding.


---


## Summary — What Unlocks Each Step

| Step | What Must Happen First |
|------|----------------------|
| Access dashboard | User must register and be authenticated with an "admin" role |
| Access client portal | User must be invited by an admin and authenticated with a "client" role |
| Create a template | Admin must be logged in and have an organization |
| Create a proposal | At least one client must exist and at least one "proposal" type template must exist |
| Edit a proposal | The proposal must still be in "draft" status |
| Send a proposal | A proposal must exist in "draft" status |
| Client sees proposal in portal | The proposal must be in "sent" status |
| Project gets created | The client must accept a proposal — this is the only trigger |
| Onboarding phase and milestones appear | Happens automatically when the project is created on proposal acceptance |
| Agreement Signing milestone completes | Client signs an agreement document, or admin manually completes it |
| Welcome Document milestone activates | Agreement Signing must be completed first |
| Welcome Document milestone completes | Admin sends the welcome document and client views it, or admin manually completes it |
| Invoice Payment milestone activates | Welcome Document must be completed first |
| Invoice Payment milestone completes | Invoice is marked as paid, or admin manually completes it |
| Resource Upload milestone activates | Invoice Payment must be completed first |
| Resource Upload milestone completes | Client uploads files, or admin manually completes it |
| Strategy phase activates | All four Onboarding milestones must be completed |
| Fulfilment phase activates | Strategy phase must be completed |
| Reporting phase activates | Fulfilment phase must be completed |
| Project marked as completed | All four phases must be completed |
| Client can see documents | Admin must create a document and send it (change status to "sent") |
| Client can sign a document | The document must be of type "agreement" and have been sent |
| Client can upload files | The client must have portal access (been invited) |
| Admin can view client uploads | The client must have uploaded at least one file |
