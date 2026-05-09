---
title: Site Visit Module with Photo Upload
status: todo
priority: high
type: feature
tags: [site-visit, photos, field-work]
created_by: agent
created_at: 2026-05-09T15:32:10Z
position: 7
---

## Notes
Assistant Planners conduct site visits to observe and verify site conditions. During visits, they capture photos, upload to system, record observations and technical information. System uses this data for automatic technical report generation.

## Checklist
- [ ] Create site_visits table with application_id FK, officer_id FK, visit_date, observations
- [ ] Create site_photos table with site_visit_id FK, photo_url, caption, location
- [ ] Site visit form - date, observations, technical notes
- [ ] Multi-photo upload with drag-drop support
- [ ] Photo gallery view with captions and locations
- [ ] Mark site visit as complete
- [ ] Link site visit data to technical report generation

## Acceptance
- Assistant Planners can record site visits with multiple photos
- Photos are organized and captioned
- Site visit observations feed into technical report
- Site visit status is tracked in workflow