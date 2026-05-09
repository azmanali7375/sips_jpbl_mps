# DC Management System - Segamat Municipal Council (Sistem SPC MPS)

## Vision
Sistem pintar dan bersepadu bagi Jabatan Perancang Bandar & Landskap, Majlis Perbandaran Segamat untuk mengurus, menyelaras dan mempercepatkan proses kawalan pembangunan (Development Control - DC) secara sistematik, telus dan efisien. Mengintegrasikan penerimaan permohonan dari OSC, semakan teknikal, lawatan tapak, penjanaan laporan automatik, pengurusan syor dan pemantauan keputusan mesyuarat OSC.

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

**Style Direction:** Malaysian government-official modern — structured grids, clear status indicators, bilingual support (BM/EN), workflow progression visualization

## Features
1. **Penerimaan Permohonan dari OSC** - Admin Assistant registers applications with document upload (PDF, DWG, images)
2. **Agihan Permohonan** - Unit Head assigns to Assistant Planner J5 with automatic notifications
3. **Lawatan Tapak** - Site visit with photo upload and technical observations
4. **Penjanaan Laporan Teknikal** - Auto-generate technical reports based on policy documents (RFN, RSN, RTD, Climate Action Plan, Smart City Plan, SDG Roadmap)
5. **Semakan Ketua Jabatan** - Department Head reviews and provides recommendations
6. **Arahan Bertulis** - Generate written directives for plan amendments requiring YDP signature
7. **Keputusan Mesyuarat OSC** - Record meeting decisions (Lulus/Tolak/Lulus Dengan Pindaan) and auto-generate Forms C1/C2
8. **Pendaftaran Pelan Lulus** - Register endorsed approved plans with tracking
9. **Automated Compliance Checking** - Plot ratio, setbacks, building height, zoning rules
10. **Workflow Automation** - Multi-stage approval with role-based notifications
11. **GIS Integration** - Zoning map overlay, proximity checking