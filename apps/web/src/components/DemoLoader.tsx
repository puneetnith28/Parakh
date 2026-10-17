import { Sparkles } from "lucide-react";

export const SAMPLE_BRIEF_TEXT = `# Project Brief: Modern Full-Stack Enterprise Billing & Subscription Engine

## 1. Project Overview
We are seeking a senior full-stack engineer to build an enterprise SaaS billing portal and subscription microservice. The platform must handle multi-tenant customer onboarding, automated recurring invoices, and real-time payment reconciliation.

## 2. Key Technical Requirements
- **FR-01 Frontend Architecture:** Must implement a responsive React 18 or Next.js SPA utilizing TypeScript and clean component boundaries.
- **FR-02 Authentication & Authorization:** Must implement secure JSON Web Token (JWT) session handling with refresh token rotation and role-based access control (RBAC).
- **FR-03 Relational Database Layer:** Must integrate a PostgreSQL or MongoDB persistence layer with schema migrations and ACID transaction compliance.
- **FR-04 API Rate Limiting & Security:** Must enforce API rate limiting (sliding window or token bucket) to prevent brute-force abuse and scrapers.
- **FR-05 Automated Testing:** Must achieve comprehensive automated test coverage (>= 80%) with unit and integration test suites.
- **FR-06 Containerization & CI/CD:** Must provide production Dockerfile containers and automated GitHub Actions workflows for linting, testing, and deployment.

## 3. Deliverables & Timeline
- Complete source code with documentation and environment setup scripts.
- Verified test reports demonstrating API reliability.
- Initial MVP delivery within 4 weeks.`;

export const SAMPLE_REPO_URL = "https://github.com/puneetnith28/Parakh";

interface DemoLoaderProps {
  onLoadDemo: (brief: string, repo: string) => void;
}

export function DemoLoader({ onLoadDemo }: DemoLoaderProps) {
  const handleLoad = () => {
    onLoadDemo(SAMPLE_BRIEF_TEXT, SAMPLE_REPO_URL);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-sky-950/30 border border-sky-800/40 gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-sky-200">Instant Demo Scenario</h4>
          <p className="text-xs text-sky-400/80">
            Pre-populate a realistic SaaS client brief & repository with one click.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLoad}
        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition shadow-sm hover:shadow-sky-500/20 flex items-center justify-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Load Sample Demo
      </button>
    </div>
  );
}
