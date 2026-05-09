---
title: Officer Review Dashboard
status: todo
priority: high
type: feature
tags: [dashboard, review, officer]
created_by: agent
created_at: 2026-05-09T14:32:57Z
position: 3
---

## Notes
Planning officer workspace for reviewing DC applications. Displays assigned cases, application details, uploaded documents with preview, compliance check results, and review action tools (comment, request revision, approve, reject).

## Checklist
- [ ] Create officer dashboard layout with statistics (pending, under review, approved today)
- [ ] Build applications table with filters (status, date, assigned officer, violation flags)
- [ ] Create application detail view with all project information
- [ ] Add document viewer/preview component for PDFs and images
- [ ] Build review action panel with comment textarea, decision buttons
- [ ] Create reviewService for adding comments and updating application status
- [ ] Add compliance check results display with pass/fail indicators
- [ ] Implement case assignment functionality for admins

## Acceptance
- Officers can view all assigned applications in organized table
- Full application details visible with document previews
- Officers can add comments and change application status