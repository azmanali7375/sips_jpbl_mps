---
title: Application Submission Portal
status: todo
priority: high
type: feature
tags: [frontend, forms, upload]
created_by: agent
created_at: 2026-05-09T14:32:57Z
position: 2
---

## Notes
Applicant-facing portal for submitting new DC applications. Multi-step form with project details, location information, file uploads (PDF plans, DWG drawings, images), and pre-submission checklist validation. Uses Supabase Storage for file management.

## Checklist
- [ ] Create submission form component with project details fields (name, type, location, plot_ratio, setback)
- [ ] Add file upload interface supporting PDF, DWG, PNG, JPG with drag-and-drop
- [ ] Build checklist validation component (required documents, completeness check)
- [ ] Create applicationService for CRUD operations
- [ ] Create documentService for file upload/download with Supabase Storage
- [ ] Add submission success page with application tracking number
- [ ] Build "My Applications" list view for applicants to track status

## Acceptance
- Applicants can submit complete applications with all required documents
- Files upload successfully to Supabase Storage
- Applicants receive tracking number and can view submission status