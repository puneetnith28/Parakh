import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Play,
} from 'lucide-react';
import { inspectRepository, RepositoryInspectionResult } from '../../services/api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface LiveRepositoryInspectorProps {
  onStartAssessment?: (repoUrl?: string) => void;
  onCommitResolved?: (sha: string) => void;
}

const POPULAR_REPOS = [
  { label: 'Parakh (Self)', url: 'https://github.com/puneetnith28/Parakh' },
  { label: 'Express', url: 'https://github.com/expressjs/express' },
  { label: 'Fastify', url: 'https://github.com/fastify/fastify' },
];

export const LiveRepositoryInspector: React.FC<LiveRepositoryInspectorProps> = ({
  onStartAssessment,
  onCommitResolved,
}) => {
  const [repoInput, setRepoInput] = useState('https://github.com/puneetnith28/Parakh');
  const [data, setData] = useState<RepositoryInspectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInspect = async (urlToInspect: string) => {
    if (!urlToInspect.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await inspectRepository(urlToInspect.trim());
      setData(result);
      if (onCommitResolved && result.pinnedRevision?.commitSha) {
        onCommitResolved(result.pinnedRevision.commitSha);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to inspect target repository');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleInspect('https://github.com/puneetnith28/Parakh');
  }, []);

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 text-[#111111] shadow-xl border border-black/5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E5DE]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#163300] text-[#9FE870] flex items-center justify-center shrink-0">
            <GitBranch className="w-4 h-4 text-[#9FE870]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#111111]">Live Repository Inspector</span>
              <Badge variant="lime" size="sm" dot dotColor="bg-[#163300]">
                Live API
              </Badge>
            </div>
            <p className="text-[11px] text-[#5F625E]">
              Real-time SSRF validation & immutable git commit pinning
            </p>
          </div>
        </div>

        {data?.pinnedRevision?.commitSha && (
          <Badge variant="dark" size="sm">
            PINNED AT HEAD
          </Badge>
        )}
      </div>

      {/* URL Input Form */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInspect(repoInput)}
              placeholder="https://github.com/owner/repository"
              className="w-full bg-[#F2F4F0] border border-[#E2E5DE] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#111111] placeholder-[#828580] focus:outline-none focus:ring-2 focus:ring-[#163300]"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleInspect(repoInput)}
            disabled={isLoading}
            icon={
              isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )
            }
            className="font-bold text-xs shrink-0"
          >
            {isLoading ? 'Resolving...' : 'Inspect'}
          </Button>
        </div>

        {/* Quick Repository Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-[#5F625E] font-medium mr-1">Quick check:</span>
          {POPULAR_REPOS.map((repo) => (
            <button
              key={repo.label}
              type="button"
              onClick={() => {
                setRepoInput(repo.url);
                handleInspect(repo.url);
              }}
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                repoInput === repo.url
                  ? 'bg-[#163300] text-white border-[#163300] font-bold'
                  : 'bg-[#F2F4F0] text-[#5F625E] hover:text-[#111111] border-[#E2E5DE]'
              }`}
            >
              {repo.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Dynamic Results Grid */}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#F2F4F0] p-3 rounded-2xl">
              <div className="text-xs text-[#5F625E] font-medium">Default Branch</div>
              <div className="text-base font-bold font-mono text-[#163300] mt-0.5 truncate">
                {data.metadata.defaultBranch || 'main'}
              </div>
            </div>

            <div className="bg-[#F2F4F0] p-3 rounded-2xl">
              <div className="text-xs text-[#5F625E] font-medium">Language</div>
              <div className="text-base font-bold text-[#163300] mt-0.5 truncate">
                {data.metadata.language || 'Multi-language'}
              </div>
            </div>

            <div className="bg-[#F2F4F0] p-3 rounded-2xl">
              <div className="text-xs text-[#5F625E] font-medium">SSRF Safety</div>
              <div className="text-base font-bold text-[#163300] mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-[#163300]" /> Verified
              </div>
            </div>

            <div className="bg-[#F2F4F0] p-3 rounded-2xl">
              <div className="text-xs text-[#5F625E] font-medium">Provenance</div>
              <div className="text-base font-bold text-[#163300] mt-0.5">
                SHA-256
              </div>
            </div>
          </div>

          {/* Resolved Commit Pin Banner */}
          <div className="text-xs font-mono bg-[#F2F4F0] p-3 rounded-xl flex items-center justify-between gap-2 border border-[#E2E5DE]">
            <div className="flex items-center gap-2 min-w-0">
              <GitCommit className="w-4 h-4 text-[#163300] shrink-0" />
              <span className="truncate text-[#111111]">
                sha:{' '}
                <strong className="text-[#163300]">
                  {data.pinnedRevision.commitSha}
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopySha(data.pinnedRevision.commitSha)}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-[#163300] border border-[#E2E5DE] transition shrink-0 cursor-pointer"
              title="Copy commit SHA"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <a
              href={data.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#5F625E] hover:text-[#111111] inline-flex items-center gap-1 font-mono transition"
            >
              <span>{data.metadata.fullName}</span>
              <ExternalLink className="w-3 h-3 text-[#163300]" />
            </a>

            {onStartAssessment && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onStartAssessment(data.canonicalUrl)}
                icon={<Play className="w-3 h-3 text-[#163300]" />}
                className="font-bold text-xs"
              >
                Assess This Repository
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveRepositoryInspector;
