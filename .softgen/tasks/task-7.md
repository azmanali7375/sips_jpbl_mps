---
title: Site Visit Module with Photo Upload
status: done
priority: high
type: feature
tags:
- site-visit
- photos
- field-work
created_by: agent
created_at: 2026-05-09 15:32:10+00:00
position: 7
---

## Notes
Assistant Planners conduct site visits to observe and verify site conditions. During visits, they capture photos, upload to system, record observations and technical information. System uses this data for automatic technical report generation.

## Checklist
- [x] Create site_visits table with application_id FK, officer_id FK, visit_date, observations
- [x] Create site_photos table with site_visit_id FK, photo_url, caption, location
- [x] Site visit form - date, observations, technical notes
- [x] Multi-photo upload with drag-drop support
- [x] Photo gallery view with captions and locations
- [x] Mark site visit as complete
- [x] Link site visit data to technical report generation (data ready, consumption in task-8)

## Acceptance
- Assistant Planners can record site visits with multiple photos ✓
- Photos are organized and captioned ✓
- Site visit observations feed into technical report (data ready for task-8) ✓
- Site visit status is tracked in workflow ✓
