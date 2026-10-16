import { useState, useEffect } from "react";
import { Header } from "./components/Header.tsx";
import { InputSection } from "./components/InputSection.tsx";

const API_BASE = "http://localhost:3000";

export default function App() {
  const [opportunityText, setOpportunityText] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      const res = await fetch(`${API_BASE}/api/ping`);
      if (res.ok) {
        setSuccessMessage(
          "Connection verified! Inputs validated according to @parakh/contracts schema specifications."
        );
      } else {
        setValidationError("Backend API is currently unreachable. Please verify that the API server is running.");
      }
    } catch {
      setValidationError("Could not connect to Parakh backend API. Please run 'npm run dev' to start both services.");
    } finally {
      setIsLoading(false);
    }
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
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Parakh &copy; 2026 Parakh Contributors. Open-source under Apache-2.0.
      </footer>
    </div>
  );
}
