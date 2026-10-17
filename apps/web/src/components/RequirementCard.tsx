import React, { useState } from "react";
import { Trash2, FileText, ChevronDown, ChevronUp, Check, Edit2 } from "lucide-react";
import { Requirement, RequirementCategory, RequirementPriority } from "@parakh/contracts";

interface RequirementCardProps {
  requirement: Requirement;
  onUpdate: (updated: Requirement) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: RequirementCategory[] = [
  "frontend",
  "backend",
  "database",
  "devops",
  "architecture",
  "security",
  "testing",
  "general",
];

export function RequirementCard({ requirement, onUpdate, onDelete }: RequirementCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(requirement.text);
  const [showSource, setShowSource] = useState(false);

  const handleSaveText = () => {
    if (text.trim().length >= 3) {
      onUpdate({ ...requirement, text: text.trim() });
      setIsEditing(false);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ ...requirement, category: e.target.value as RequirementCategory });
  };

  const togglePriority = () => {
    const nextPriority: RequirementPriority =
      requirement.priority === "mandatory" ? "preferred" : "mandatory";
    onUpdate({ ...requirement, priority: nextPriority });
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3">
      <div className="flex items-start justify-between gap-3">
        {/* Main Text Content */}
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveText}
                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 group">
                <p className="text-sm text-slate-200 font-medium leading-relaxed">{requirement.text}</p>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-200 transition"
                  title="Edit requirement text"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Provenance Badge */}
              <div className="flex items-center gap-2">
                {requirement.sourceLocation?.origin === "user_added" || requirement.id.includes("custom") ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    User Added
                  </span>
                ) : requirement.sourceLocation?.sourceSnippet ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Brief Sourced
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" title="Inferred requirement without direct brief citation">
                    Inferred (No Direct Citation)
                  </span>
                )}

                {requirement.sourceLocation?.documentTitle && (
                  <span className="text-[11px] text-slate-400 truncate max-w-xs">
                    {requirement.sourceLocation.documentTitle}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Priority Toggle */}
          <button
            type="button"
            onClick={togglePriority}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition ${
              requirement.priority === "mandatory"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            }`}
          >
            {requirement.priority}
          </button>

          {/* Category Dropdown */}
          <select
            value={requirement.category}
            onChange={handleCategoryChange}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDelete(requirement.id)}
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Delete requirement"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Source Location Dropdown */}
      {requirement.sourceLocation?.sourceSnippet && (
        <div className="pt-1 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => setShowSource(!showSource)}
            className="inline-flex items-center text-xs text-slate-400 hover:text-slate-300 transition"
          >
            <FileText className="w-3 h-3 mr-1 text-slate-500" />
            <span>Source Context (Page {requirement.sourceLocation.pageNumber || 1})</span>
            {showSource ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </button>

          {showSource && (
            <div className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800/40">
                <span>{requirement.sourceLocation.documentTitle || "Opportunity Brief"}</span>
                {requirement.sourceLocation.charStart !== undefined && requirement.sourceLocation.charEnd !== undefined && (
                  <span>Offsets: {requirement.sourceLocation.charStart}–{requirement.sourceLocation.charEnd}</span>
                )}
              </div>
              <div className="italic text-slate-300">
                "{requirement.sourceLocation.sourceSnippet}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
