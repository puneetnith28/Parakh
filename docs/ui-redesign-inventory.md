# UI Architecture & Component Inventory Audit

## Frontend Technology Stack
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + custom CSS variables
- **Motion & Interactions:** `motion/react` + Three.js
- **Icons:** `lucide-react`
- **State Architecture:** Local component state with URL deep-linking support (`reportId`, `viewToken`)

## Component Inventory
| Component | Location | Role in Product Workflow | Redesign Mapping |
|:---|:---|:---|:---|
| `Header` | `apps/web/src/components/Header.tsx` | Global top navigation & API status | Top navbar with logo, nav links & profile / status indicator |
| `InputSection` | `apps/web/src/components/InputSection.tsx` | Brief & repo URL entry | Clean `#F2F4F0` container with lime accents |
| `DemoLoader` | `apps/web/src/components/DemoLoader.tsx` | One-click sample scenario filler | Pill banner with lime button |
| `RequirementsEditor` | `apps/web/src/components/RequirementsEditor.tsx` | Review, edit, add technical criteria | Light gray cards with category pill filters |
| `RequirementCard` | `apps/web/src/components/RequirementCard.tsx` | Individual criteria card | Light card with edit/delete actions |
| `AnalysisProgress` | `apps/web/src/components/AnalysisProgress.tsx` | Live evaluation progress radar | Minimal step progress card with lime pulse |
| `ReportSummary` | `apps/web/src/components/ReportSummary.tsx` | Executive audit summary | White card with green verified badge & export pill buttons |
| `CoverageSummary` | `apps/web/src/components/EvidenceMap/CoverageSummary.tsx` | Stacked metric distribution bar | Segmented coverage indicator |
| `EvidenceMap` | `apps/web/src/components/EvidenceMap/EvidenceMap.tsx` | Detailed capability cards & proof links | Clean list/grid cards with status badges |
| `FilterBar` | `apps/web/src/components/EvidenceMap/FilterBar.tsx` | Search, status chips, category dropdown | Light gray pill filters with active green states |
| `CitationDrawer` | `apps/web/src/components/EvidenceMap/CitationDrawer.tsx` | Immutable commit code inspection | Clean slide-over modal with syntax highlighting |
| `UserOverride` | `apps/web/src/components/EvidenceMap/UserOverride.tsx` | Auditor manual status override modal | Symmetrical dialog with audit note fields |
| `GapChecklist` | `apps/web/src/components/ActionPlan/GapChecklist.tsx` | Missing criteria remediation checklist | Interactive checklist with green checkmarks |
| `ProposalKit` | `apps/web/src/components/ProposalKit.tsx` | Proposal response drafting | Grounded RFP response generator |
| `ReportExport` | `apps/web/src/components/ReportExport.tsx` | JSON, HTML, Print & Share links | Action pills with copy feedback |

## Backend Endpoints Connected
- `GET /healthz`: System health check
- `POST /api/requirements/extract`: Technical criteria extraction
- `POST /api/assessment/evaluate`: Full evidence matching & citation validation
- `GET /api/reports/:id`: Retrieve saved report via view token
- `DELETE /api/reports/:id`: Permanently purge report
- `POST /api/repository/inspect`: Verify repository connectivity & commit SHA
