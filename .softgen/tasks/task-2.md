---
title: Application Submission Portal
status: in_progress
priority: high
type: feature
tags: [frontend, submission, forms]
created_by: agent
created_at: 2026-05-09T14:32:57Z
position: 2
---

## Notes
User-facing portal for submitting development control applications with document uploads, form validation, and applicant tracking. Includes authentication pages, landing page, and submission form with file upload capabilities for PDFs, DWG files, and images.

## Checklist
- [x] Create landing page with feature highlights and CTAs
- [x] Build login form with error handling
- [x] Build registration form with role selection
- [ ] Create application submission form with project details fields
- [ ] Add multi-file upload component (PDF, DWG, images)
- [ ] Implement checklist validation before submission
- [ ] Create applicant dashboard to view submission status
- [ ] Add application tracking number generation

## Acceptance
- Applicants can register and login
- Landing page clearly presents the system's value proposition
- Application form captures all required fields
- Documents upload successfully to Supabase Storage
- Applicants receive tracking number and can view submission status