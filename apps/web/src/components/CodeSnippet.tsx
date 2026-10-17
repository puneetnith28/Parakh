import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { TactileButton } from "./TactileButton.tsx";

interface CodeSnippetProps {
  code: string;
  startLine?: number;
  highlightLines?: number[];
  language?: string;
  className?: string;
}

export function CodeSnippet({
  code,
  startLine = 1,
  highlightLines = [],
  className = "",
}: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const lines = code.split("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 font-mono text-xs ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800/80 text-[11px] text-slate-400">
        <span>Verified Evidence Snapshot</span>
        <TactileButton
          onClick={handleCopy}
          variant="secondary"
          size="sm"
          padding="3px 8px"
          rounded={10}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400 mr-1 inline" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1 inline" />
              <span>Copy</span>
            </>
          )}
        </TactileButton>
      </div>

      {/* Code Container */}
      <div className="overflow-x-auto p-3 max-h-[420px] scrollbar-thin scrollbar-thumb-slate-800">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const currentLineNumber = startLine + idx;
              const isHighlighted = highlightLines.includes(currentLineNumber);

              return (
                <tr
                  key={idx}
                  className={`leading-5 group transition-colors ${
                    isHighlighted ? "bg-emerald-950/30 font-semibold" : "hover:bg-slate-900/50"
                  }`}
                >
                  <td className="w-10 select-none pr-3 text-right text-slate-600 group-hover:text-slate-400 font-mono text-[11px]">
                    {currentLineNumber}
                  </td>
                  <td className="whitespace-pre text-slate-200 pl-2">
                    {/* Basic syntax highlight tinting */}
                    {formatSyntax(line)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Lightweight token highlighting without heavy external bundles
 */
function formatSyntax(line: string) {
  // Comments
  if (line.trim().startsWith("//") || line.trim().startsWith("#")) {
    return <span className="text-slate-500 italic">{line}</span>;
  }

  // Keywords
  const keywordRegex = /\b(import|export|from|function|const|let|var|return|if|else|async|await|class|interface|type|public|private)\b/g;
  const parts = line.split(keywordRegex);

  if (parts.length <= 1) return line;

  return parts.map((part, i) => {
    if (
      ["import", "export", "from", "function", "const", "let", "var", "return", "if", "else", "async", "await", "class", "interface", "type", "public", "private"].includes(
        part
      )
    ) {
      return (
        <span key={i} className="text-purple-400 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}
