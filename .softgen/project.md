# DC Management System - Segamat Municipal Council

## Vision
A comprehensive Development Control (DC) application management system for the Town Planning & Landscape Department at Segamat Municipal Council. Streamlines the submission, review, and approval process for development applications with automated compliance checking, document management, and workflow automation.

## Design
**Palette:**
- `--primary: 210 100% 25%` (official navy) - Headers, primary actions, official elements
- `--secondary: 210 20% 35%` (slate blue) - Secondary actions, tabs
- `--accent: 35 100% 45%` (amber) - Alerts, pending status, attention items
- `--muted: 210 10% 92%` (light blue-grey) - Backgrounds, disabled states
- `--background: 0 0% 100%` (white) - Main background
- `--foreground: 210 25% 15%` (dark slate) - Body text
- `--destructive: 0 85% 45%` (red) - Rejections, violations, errors
- `--success: 142 76% 36%` (green) - Approvals, compliance

**Typography:**
- Headings: Merriweather (serif authority)
- Body: Inter (sans clarity)
- Data/metrics: JetBrains Mono (tabular-nums)

**Style Direction:** Government-official modern — structured grids, clear status indicators, tabular data presentation, workflow progression visualization

## Features
1. **Multi-role Authentication** - Applicants, Planning Officers, Administrators with role-based access control
2. **Application Submission Portal** - Upload plans (PDF, DWG, images), applicant details capture, checklist validation
3. **Automated Compliance Checking** - Plot ratio, setbacks, building height, land use zoning rules encoded
4. **Officer Review Dashboard** - View submissions, annotate plans, add comments, request revisions, approve/reject
5. **Workflow Automation** - Status tracking (Submitted → Under Review → Approved/Rejected), case assignment, notifications
6. **Document Management** - Organized file storage, version control, download capabilities
7. **GIS Integration** - Zoning map overlay, proximity checking, violation flagging
8. **Report Generation** - Approval letters, compliance summaries, decision logs