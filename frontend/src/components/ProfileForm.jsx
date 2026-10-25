import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import RequirementEditor from './RequirementEditor';

const SENIORITIES = ['junior', 'mid', 'senior', 'lead', 'principal'];
const inputCls =
  'w-full bg-[#0D111A] border border-[#1E2638] rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500/60';

function ChipsInput({ label, chips, onChange }) {
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const v = raw.trim();
    if (v && !chips.includes(v)) onChange([...chips, v]);
    setDraft('');
  };
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {chips.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 bg-[#151B2A] border border-[#1E2638] rounded-full px-2.5 py-0.5 text-xs">
            {c}
            <button type="button" aria-label={`Remove ${c}`} onClick={() => onChange(chips.filter((x) => x !== c))}>
              <X className="w-3 h-3 text-slate-500 hover:text-slate-200" />
            </button>
          </span>
        ))}
      </div>
      <input
        className={inputCls}
        value={draft}
        placeholder="Type and press Enter or comma"
        onChange={(e) => {
          const val = e.target.value;
          if (val.endsWith(',')) add(val.slice(0, -1));
          else setDraft(val);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => add(draft)}
      />
    </div>
  );
}

export default function ProfileForm({ onDone, onCancel }) {
  const [title, setTitle] = useState('');
  const [seniority, setSeniority] = useState('');
  const [minYears, setMinYears] = useState('');
  const [mustHave, setMustHave] = useState([]);
  const [niceToHave, setNiceToHave] = useState([]);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [jd, setJd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const profile = await api.createProfile({
        title: title.trim(),
        seniority: seniority || null,
        min_years: minYears === '' ? null : Number(minYears),
        must_have: mustHave,
        nice_to_have: niceToHave,
        location: location.trim() || null,
        notes: notes.trim() || null,
        jd_text: jd.trim() || null,
      });
      setCreated(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveRequirements = async (requirements) => {
    setBusy(true);
    setError(null);
    try {
      await api.updateRequirements(created.id, requirements);
      onDone(created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <div className="glass-panel p-6 max-w-3xl w-full">
        <h2 className="text-lg font-semibold mb-1">Review requirements for &ldquo;{created.title}&rdquo;</h2>
        <p className="text-xs text-slate-400 mb-4">Edit anything before saving. Scoring uses exactly this list.</p>
        {created.requirements_status === 'error' && (
          <p className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-md px-3 py-2 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Requirement extraction failed: {created.requirements_error}
          </p>
        )}
        <RequirementEditor
          initial={created.requirements_json?.requirements ?? []}
          onSave={saveRequirements}
          saving={busy}
          error={error}
        />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass-panel p-6 max-w-3xl w-full space-y-4">
      <h2 className="text-lg font-semibold">New hiring profile</h2>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Title *</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Seniority</label>
          <select className={inputCls} value={seniority} onChange={(e) => setSeniority(e.target.value)}>
            <option value="">Any</option>
            {SENIORITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Min years</label>
          <input type="number" min="0" className={inputCls} value={minYears} onChange={(e) => setMinYears(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Location</label>
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>
      <ChipsInput label="Must-have" chips={mustHave} onChange={setMustHave} />
      <ChipsInput label="Nice-to-have" chips={niceToHave} onChange={setNiceToHave} />
      <div>
        <label className="block text-xs text-slate-400 mb-1">Notes</label>
        <textarea rows={2} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Job description (optional)</label>
        <textarea rows={6} className={inputCls} value={jd} onChange={(e) => setJd(e.target.value)} />
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary text-sm px-4 py-2">Cancel</button>
        )}
        <button type="submit" disabled={busy || !title.trim()} className="btn-primary text-sm px-4 py-2 disabled:opacity-40">
          {busy ? 'Creating...' : 'Create profile'}
        </button>
      </div>
    </form>
  );
}
