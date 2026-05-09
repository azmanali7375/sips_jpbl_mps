---
title: Enhanced Workflow - OSC Integration & Multi-Role Assignment
status: in_progress
priority: urgent
type: feature
tags: [workflow, roles, notifications]
created_by: agent
created_at: 2026-05-09T15:32:10Z
position: 6
---

## Notes
Enhanced workflow to match Malaysian government SPC MPS system. Applications come from OSC (One Stop Center), registered by Admin Assistant, assigned by Unit Head to Assistant Planner J5, reviewed by Department Head. Multi-stage approval process with automatic notifications at each stage.

## Checklist
- [x] Update user roles: admin_assistant, unit_head, assistant_planner_j5, department_head, ydp
- [x] Create workflow stages table: osc_received → registered → assigned → site_visit → technical_report → head_review → recommendation → osc_meeting → approved/rejected
- [x] Admin Assistant dashboard - register applications from OSC
- [x] Unit Head dashboard - view pending assignments, assign to Assistant Planners
- [ ] Assistant Planner dashboard - receive assignments with notifications
- [ ] Department Head dashboard - review technical reports, provide recommendations
- [ ] Automatic notification system for each workflow stage
- [ ] Track workflow history with timestamps and officer actions

## Acceptance
- Applications flow through correct stages with role-based access
- Each officer receives notifications for their assigned tasks
- Workflow history is tracked and visible
- Only authorized roles can perform specific actions