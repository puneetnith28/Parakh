import { useState, useEffect } from "react";
import { Requirement } from "@parakh/contracts";
import { Header } from "./components/Header.tsx";
import { InputSection } from "./components/InputSection.tsx";
import { RequirementsEditor } from "./components/RequirementsEditor.tsx";

const API_BASE = "http://localhost:3000";

export default function App() {
  const [opportunityText, setOpportunityText] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Requirements stage state
  const [stage, setStage] = useState<"input" | "review_requirements">("input");
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function checkApi() {
      try {
        const res = await fetch(`${API_BASE}/healthz`);
        if (res.ok && isMounted) {
          setApiStatus("online");
        } else if (isMounted) {
          setApiStatus("offline");
        }
      } catch {
        if (isMounted) setApiStatus("offline");
      }
    }
    checkApi();
    const interval = setInterval(checkApi, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAnalyze = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    if (!opportunityText.trim()) {
      setValidationError("Please paste a client opportunity brief or RFP description.");
      return;
    }

    if (!repoUrl.trim()) {
      setValidationError("Please provide a valid GitHub repository URL.");
      return;
    }

    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/i;
    if (!githubRegex.test(repoUrl.trim())) {
      setValidationError("Invalid repository URL. Must be in the format: https://github.com/owner/repo");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/opportunity/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: opportunityText, title: "Opportunity Brief" }),
      });

      if (res.ok) {
        // Extract basic criteria from paragraphs/lines for review
        const lines = opportunityText
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 5 && !l.startsWith("#"));

        const initialRequirements: Requirement[] = (lines.length > 0 ? lines : [opportunityText])
          .slice(0, 6)
          .map((line, idx) => ({
            id: `req_${String(idx + 1).padStart(3, "0")}`,
            text: line.replace(/^[-*•\d.]+\s*/, ""),
            category: line.toLowerCase().includes("database")
              ? "database"
              : line.toLowerCase().includes("react") || line.toLowerCase().includes("front")
                ? "frontend"
                : line.toLowerCase().includes("test")
                  ? "testing"
                  : line.toLowerCase().includes("docker") || line.toLowerCase().includes("ci")
                    ? "devops"
                    : "general",
            priority: line.toLowerCase().includes("must") || line.toLowerCase().includes("require")
              ? "mandatory"
              : "preferred",
            sourceLocation: {
              pageNumber: 1,
              sourceSnippet: line,
            },
          }));

        setRequirements(initialRequirements);
        setStage("review_requirements");
        setSuccessMessage("Brief ingested successfully! Review and refine extracted requirements below.");
      } else {
        const errorData = await res.json().catch(() => ({}));
        setValidationError(errorData.message || "Failed to process opportunity text.");
      }
    } catch {
      setValidationError("Could not connect to Parakh backend API. Please run 'npm run dev' to start both services.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRequirements = () => {
    alert(`Confirmed ${requirements.length} requirements. Ready to initiate repository evidence matching!`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col w-full">
      <Header apiStatus={apiStatus} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Developer Capability Assessment
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Extract requirements from your client brief and verify them against inspectable code, tests, and documentation from your GitHub repository.
          </p>
        </div>

        {stage === "input" && (
          <InputSection
            opportunityText={opportunityText}
            setOpportunityText={setOpportunityText}
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            validationError={validationError}
            successMessage={successMessage}
          />
        )}

        {stage === "review_requirements" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStage("input")}
                className="text-xs text-slate-400 hover:text-slate-200 transition"
              >
                &larr; Back to Brief Input
              </button>
              <span className="text-xs font-mono text-emerald-400">Target Repo: {repoUrl}</span>
            </div>

            <RequirementsEditor
              requirements={requirements}
              onChange={setRequirements}
              onConfirm={handleConfirmRequirements}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Parakh &copy; 2026 Parakh Contributors. Open-source under Apache-2.0.
      </footer>
    </div>
  );
}
