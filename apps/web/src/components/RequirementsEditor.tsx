import { useState } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { Requirement } from '@parakh/contracts';
import { RequirementCard } from './RequirementCard';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export interface RequirementsEditorProps {
  requirements: Requirement[];
  onChange: (requirements: Requirement[]) => void;
  onConfirm: () => void;
}

export function RequirementsEditor({ requirements, onChange, onConfirm }: RequirementsEditorProps) {
  const [newText, setNewText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const mandatoryCount = requirements.filter((r) => r.priority === 'mandatory').length;
  const preferredCount = requirements.filter((r) => r.priority === 'preferred').length;
  const userAddedCount = requirements.filter(
    (r) => r.sourceLocation?.origin === 'user_added' || r.id.includes('custom')
  ).length;

  const filteredRequirements = selectedCategory === 'all'
    ? requirements
    : requirements.filter((r) => r.category === selectedCategory);

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
        category: 'general',
        priority: 'mandatory',
        sourceLocation: {
          origin: 'user_added',
        },
      };
      onChange([...requirements, newReq]);
      setNewText('');
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-[#F2F4F0] border border-[#E2E5DE] rounded-[28px] p-6 sm:p-10 shadow-sm space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E5DE]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              Review & Refine Requirements
            </h2>
            <Badge variant="lime" size="sm" className="font-bold">
              {requirements.length} Total
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="px-3 py-0.5 rounded-full bg-[#163300] text-white text-xs font-semibold">
              {mandatoryCount} mandatory
            </span>
            <span className="px-3 py-0.5 rounded-full bg-white border border-[#E2E5DE] text-[#5F625E] text-xs font-semibold">
              {preferredCount} preferred
            </span>
            {userAddedCount > 0 && (
              <span className="px-3 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold">
                {userAddedCount} user added
              </span>
            )}
          </div>
        </div>

        <Button
          onClick={() => setIsAdding(!isAdding)}
          variant="secondary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          className="font-bold text-xs self-start sm:self-auto"
        >
          Add Requirement
        </Button>
      </div>

      {/* In-place Add Form */}
      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E5DE] shadow-sm space-y-4">
          <label htmlFor="custom-req-text" className="block text-sm font-bold text-[#111111]">
            New Custom Requirement
          </label>
          <input
            id="custom-req-text"
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="e.g., Must enforce rate limiting with Redis sliding-window algorithm"
            className="w-full bg-[#F2F4F0] border border-[#E2E5DE] rounded-xl px-4 py-3 text-sm text-[#111111] placeholder-[#828580] focus:outline-none focus:ring-2 focus:ring-[#163300]"
            autoFocus
          />
          <div className="flex justify-end gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewText('');
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              disabled={newText.trim().length < 3}
              className="font-bold text-xs"
            >
              Save Requirement
            </Button>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        {['all', 'frontend', 'backend', 'database', 'devops', 'architecture', 'security', 'testing', 'general'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full capitalize whitespace-nowrap transition-all font-semibold outline-none ${
              selectedCategory === cat
                ? 'bg-[#163300] text-white shadow-sm'
                : 'bg-white text-[#5F625E] hover:text-[#111111] hover:bg-[#EAECE7] border border-[#E2E5DE]'
            } focus-visible:ring-2 focus-visible:ring-[#163300]`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Requirements List */}
      <div className="space-y-3.5">
        {filteredRequirements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E2E5DE] text-sm text-[#5F625E]">
            No requirements found for category &ldquo;{selectedCategory}&rdquo;.
          </div>
        ) : (
          filteredRequirements.map((req) => (
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
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E2E5DE]">
        <div className="text-xs text-[#5F625E]">
          Confirming locks requirements into the assessment pipeline for repository scanning.
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onConfirm}
          icon={<ArrowRight className="w-4 h-4" />}
          iconPosition="right"
          className="font-bold text-sm px-8 py-3.5 shadow-sm w-full sm:w-auto"
        >
          Confirm & Proceed to Evaluation
        </Button>
      </div>
    </div>
  );
}

export default RequirementsEditor;
