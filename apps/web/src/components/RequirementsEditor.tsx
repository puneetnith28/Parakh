import { useState } from "react";
import { Plus, CheckCircle, ArrowRight } from "lucide-react";
import { Requirement } from "@parakh/contracts";
import { RequirementCard } from "./RequirementCard.tsx";

interface RequirementsEditorProps {
  requirements: Requirement[];
  onChange: (requirements: Requirement[]) => void;
  onConfirm: () => void;
}

export function RequirementsEditor({ requirements, onChange, onConfirm }: RequirementsEditorProps) {
  const [newText, setNewText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleUpdate = (updated: Requirement) => {
    onChange(requirements.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDelete = (id: string) => {
    onChange(requirements.filter((r) => r.id !== id));
  };

  const handleAdd = () => {
    if (newText.trim().length >= 3) {
      const newReq: Requirement = {
        id: `req_custom_${Date.now()}`,
        text: newText.trim(),
        category: "general",
        priority: "mandatory",
      };
      onChange([...requirements, newReq]);
      setNewText("");
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Review & Edit Requirements</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              {requirements.length} total
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review the extracted technical requirements. You can edit descriptions, adjust priorities, or add missing criteria before analysis.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Requirement
        </button>
      </div>

      {/* Add Custom Requirement Input */}
      {isAdding && (
        <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center gap-3">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Type technical requirement description (e.g. 'Implement Redis rate-limiting')..."
            className="flex-1 bg-transparent border-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold transition"
          >
            Add
          </button>
        </div>
      )}

      {/* Requirements List */}
      <div className="space-y-3">
        {requirements.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            No requirements extracted. Click "Add Requirement" to create one manually.
          </div>
        ) : (
          requirements.map((req) => (
            <RequirementCard
              key={req.id}
              requirement={req}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Confirmation Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-800">
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          Ready to verify against repository evidence
        </span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={requirements.length === 0}
          className="inline-flex items-center px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold text-sm transition shadow-lg shadow-emerald-500/20"
        >
          Confirm Requirements & Match Evidence
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
