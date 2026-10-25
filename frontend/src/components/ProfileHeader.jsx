import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { api } from '../services/api';
import RequirementEditor from './RequirementEditor';

export default function ProfileHeader({ profile, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const reqs = profile.requirements_json?.requirements ?? [];

  const save = async (requirements) => {
    setSaving(true);
    setError(null);
    try {
      await api.updateRequirements(profile.id, requirements);
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{profile.title}</h1>
          <p className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3">
            {profile.seniority && <span className="capitalize">{profile.seniority}</span>}
            {profile.min_years != null && <span>{profile.min_years}+ years</span>}
            {profile.location && <span>{profile.location}</span>}
            <span>{reqs.length} requirement{reqs.length === 1 ? '' : 's'}</span>
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0">
            <Pencil className="w-3.5 h-3.5" /> Edit requirements
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-4">
          <RequirementEditor
            initial={reqs}
            onSave={save}
            onCancel={() => setEditing(false)}
            saving={saving}
            error={error}
          />
        </div>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {reqs.map((r, i) => (
            <li
              key={i}
              className={
                r.is_required
                  ? 'text-xs rounded-full px-2.5 py-0.5 bg-blue-600/15 border border-blue-500/40 text-blue-200'
                  : 'text-xs rounded-full px-2.5 py-0.5 bg-[#151B2A] border border-[#1E2638] text-slate-400'
              }
            >
              {r.requirement_text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
