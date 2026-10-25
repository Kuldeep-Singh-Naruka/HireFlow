import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const CATEGORIES = ['skill', 'experience', 'qualification', 'other'];
const inputCls =
  'bg-[#0D111A] border border-[#1E2638] rounded-md px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500/60';

export default function RequirementEditor({ initial, onSave, onCancel, saving = false, error = null }) {
  const [items, setItems] = useState(() => (initial ?? []).map((r) => ({ ...r })));

  const update = (i, patch) => setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const add = () =>
    setItems((prev) => [...prev, { requirement_text: '', category: 'skill', is_required: true }]);

  const invalid = items.length === 0 || items.some((r) => !r.requirement_text.trim());

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={clsx(inputCls, 'flex-1 min-w-0')}
              value={r.requirement_text}
              placeholder="Requirement"
              aria-label="Requirement text"
              onChange={(e) => update(i, { requirement_text: e.target.value })}
            />
            <button
              type="button"
              onClick={() => update(i, { is_required: !r.is_required })}
              className={clsx(
                'text-xs font-medium rounded-md px-2.5 py-1.5 border w-16',
                r.is_required
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                  : 'bg-[#151B2A] border-[#1E2638] text-slate-400'
              )}
            >
              {r.is_required ? 'Must' : 'Nice'}
            </button>
            <select
              className={inputCls}
              value={r.category}
              aria-label="Category"
              onChange={(e) => update(i, { category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button type="button" onClick={() => remove(i)} aria-label="Delete requirement" className="text-slate-500 hover:text-rose-400 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-500">No requirements yet. Add at least one.</p>}
      </div>
      <button type="button" onClick={add} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Add requirement
      </button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary text-sm px-4 py-2">Cancel</button>
        )}
        <button
          type="button"
          disabled={invalid || saving}
          onClick={() => onSave(items.map((r) => ({ ...r, requirement_text: r.requirement_text.trim() })))}
          className="btn-primary text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save requirements'}
        </button>
      </div>
    </div>
  );
}
