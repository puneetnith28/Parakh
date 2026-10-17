import React, { useState } from 'react';
import { Trash2, FileText, ChevronDown, ChevronUp, Check, Edit2 } from 'lucide-react';
import { Requirement, RequirementCategory, RequirementPriority } from '@parakh/contracts';
import { Badge } from './ui/Badge';

export interface RequirementCardProps {
  requirement: Requirement;
  onUpdate: (updated: Requirement) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: RequirementCategory[] = [
  'frontend',
  'backend',
  'database',
  'devops',
  'architecture',
  'security',
  'testing',
  'general',
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
      requirement.priority === 'mandatory' ? 'preferred' : 'mandatory';
    onUpdate({ ...requirement, priority: nextPriority });
  };

  const isUserAdded =
    requirement.sourceLocation?.origin === 'user_added' || requirement.id.includes('custom');
  const hasSourceSnippet = Boolean(requirement.sourceLocation?.sourceSnippet);

  return (
    <div className="p-5 rounded-2xl bg-white border border-[#E2E5DE] hover:border-[#163300]/40 transition-all shadow-sm space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        {/* Main Text Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-[#F2F4F0] border border-[#163300] rounded-xl px-3.5 py-2 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#163300]"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveText}
                className="p-2 rounded-xl bg-[#9FE870] text-[#163300] hover:bg-[#8EE05B] transition-colors"
                aria-label="Save requirement text"
              >
                <Check className="w-4 h-4 font-bold" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 group">
                <p className="text-sm font-semibold text-[#111111] leading-relaxed">
                  {requirement.text}
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#5F625E] hover:text-[#111111] transition-opacity"
                  title="Edit requirement text"
                  aria-label="Edit requirement text"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Provenance Badge */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {isUserAdded ? (
                  <Badge variant="warning" size="sm">
                    User Added
                  </Badge>
                ) : hasSourceSnippet ? (
                  <Badge variant="lime" size="sm" dot dotColor="bg-[#163300]">
                    Brief Sourced
                  </Badge>
                ) : (
                  <Badge variant="outline" size="sm">
                    Inferred
                  </Badge>
                )}

                {requirement.sourceLocation?.documentTitle && (
                  <span className="text-[11px] font-mono text-[#5F625E] truncate max-w-xs">
                    {requirement.sourceLocation.documentTitle}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => onDelete(requirement.id)}
          className="p-1.5 text-[#828580] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
          title="Delete requirement"
          aria-label="Delete requirement"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Controls Bar: Category, Priority, and Source toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2E5DE] text-xs">
        <div className="flex items-center gap-3">
          {/* Category Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#5F625E] font-medium">Domain:</span>
            <select
              value={requirement.category}
              onChange={handleCategoryChange}
              className="bg-[#F2F4F0] border border-[#E2E5DE] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#163300] cursor-pointer capitalize"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Toggle */}
          <button
            type="button"
            onClick={togglePriority}
            className={`px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider transition-colors ${
              requirement.priority === 'mandatory'
                ? 'bg-[#163300] text-white'
                : 'bg-[#F2F4F0] text-[#5F625E] hover:text-[#111111] hover:bg-[#EAECE7]'
            }`}
          >
            {requirement.priority}
          </button>
        </div>

        {/* Source Citation Dropdown Toggle */}
        {hasSourceSnippet && (
          <button
            type="button"
            onClick={() => setShowSource(!showSource)}
            className="flex items-center gap-1 text-[#5F625E] hover:text-[#111111] font-medium"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showSource ? 'Hide source' : 'View source quote'}</span>
            {showSource ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Collapsible Source Citation */}
      {showSource && requirement.sourceLocation?.sourceSnippet && (
        <div className="mt-2 p-3.5 rounded-xl bg-[#F2F4F0] border border-[#E2E5DE] text-xs font-mono text-[#5F625E] space-y-1">
          <div className="font-bold text-[#111111] font-sans">Source snippet from brief:</div>
          <div className="whitespace-pre-wrap leading-relaxed text-[#111111]">
            &ldquo;{requirement.sourceLocation.sourceSnippet}&rdquo;
          </div>
          {requirement.sourceLocation.pageNumber && (
            <div className="text-[10px] text-[#828580]">
              Page: {requirement.sourceLocation.pageNumber}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RequirementCard;
