import { Plus, Briefcase } from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar({ profiles, selectedId, onSelect, onNew }) {
  return (
    <aside className="w-64 shrink-0 border-r border-[#1E2638] bg-[#0D111A] flex flex-col">
      <div className="p-3">
        <button onClick={onNew} className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-sm">
          <Plus className="w-4 h-4" /> New profile
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={clsx(
              'w-full text-left rounded-lg px-3 py-2 border transition-colors',
              p.id === selectedId
                ? 'bg-[#151B2A] border-blue-500/40'
                : 'border-transparent hover:bg-[#151B2A]'
            )}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-slate-100 truncate">
              <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{p.title}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 flex gap-2 pl-5">
              {p.seniority && <span className="capitalize">{p.seniority}</span>}
              <span>{p.candidate_count} candidate{p.candidate_count === 1 ? '' : 's'}</span>
              {p.latest_run_status && <span>{p.latest_run_status}</span>}
            </div>
          </button>
        ))}
        {profiles.length === 0 && (
          <p className="text-xs text-slate-500 px-3 py-2">No profiles yet.</p>
        )}
      </nav>
    </aside>
  );
}
