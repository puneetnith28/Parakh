# UI Actions & Control Handlers Verification (Step 25)

**Status:** Verified  
**Date:** 2026-10-17  

---

## 1. Action Matrix & Verification Results

| Control | Action | Target / Result | Status |
|---|---|---|---|
| **Navbar Brand** | Click | Navigates to Public Landing overview | PASS |
| **Navbar Dashboard** | Click | Opens Desktop Dashboard shell | PASS |
| **Navbar Start Assessment** | Click | Triggers Reference 3 Evaluation Mode Modal | PASS |
| **Evaluation Mode (Card 1)** | Select | Activates Opportunity Assessment flow | PASS |
| **Evaluation Mode (Card 2)** | Select | Activates Direct Repository Audit flow | PASS |
| **Sample Demo Loader** | Click | Pre-populates brief text & GitHub target | PASS |
| **Analyze Capability** | Submit | Validates URL & extracts structured requirements | PASS |
| **Requirements Editor (Add)** | Click | Opens inline form for custom criteria | PASS |
| **Category Filter Pills** | Click | Filters requirements list by domain tag | PASS |
| **Confirm Requirements** | Click | Locks requirements and launches AST scanner | PASS |
| **Analysis Retry** | Click | Re-attempts evaluation with exponential backoff | PASS |
| **Results Tab Switching** | Click | Toggles between Evidence Map, Gaps, Proposal, Export | PASS |
| **Citation Inspection** | Click | Opens slide-out drawer with commit permalink & AST snippet | PASS |
| **Export (JSON)** | Click | Downloads valid JSON report payload | PASS |
| **Export (HTML)** | Click | Downloads standalone printable HTML report | PASS |
| **Print / PDF** | Click | Opens browser native print dialog | PASS |
| **Share Link** | Click | Copies secure viewToken permalink to clipboard | PASS |
| **Delete Report** | Click | Sends authenticated DELETE request & clears URL state | PASS |
