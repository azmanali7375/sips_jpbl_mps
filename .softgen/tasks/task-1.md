---
title: Database Schema & Authentication Setup
status: in_progress
priority: urgent
type: feature
tags: [database, authentication, backend]
created_by: agent
created_at: 2026-05-09T14:32:57Z
position: 1
---

## Notes
Foundation layer: Complete database schema with all necessary tables for DC management, RLS policies, and multi-role authentication system (Applicant, Officer, Admin). Includes user profiles with department assignments, applications tracking, document storage references, compliance rules, review workflow, and notification system.

## Checklist
- [ ] Create profiles table with role field (applicant, officer, admin), department, full_name, phone
- [ ] Create applications table with applicant_id FK, project details, location, status workflow
- [ ] Create documents table with application_id FK, file storage paths, document types
- [ ] Create compliance_rules table for configurable checking rules (plot_ratio, setback, height, zoning)
- [ ] Create reviews table with application_id FK, officer_id FK, comments, decision
- [ ] Create notifications table for status updates and assignments
- [ ] Set up RLS policies: T1 for profiles, T2 for applications/documents (public read, auth write), T3 for submissions
- [ ] Create auth trigger for auto-profile creation
- [ ] Build authService with role-based access helpers
- [ ] Build profileService for user management

## Acceptance
- Users can register and login with assigned roles
- Database tables created with proper relationships and RLS
- Services provide type-safe database operations