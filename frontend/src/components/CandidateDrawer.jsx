import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';
import Badge from './Badge';
import ScreeningMatrix from './ScreeningMatrix';
import InterviewIntelligence from './InterviewIntelligence';

const STEP_LABELS = [
  ['extract', 'Extract'],
  ['profile', 'Profile'],
  ['mapping', 'Mapping'],
  ['questions', 'Questions'],
];

export default function CandidateDrawer({ candidateId, onClose }) {
  const [state, setState] = useState({ id: null, candidate: null, error: null });

  useEffect(() => {
    if (!candidateId) return undefined;
    let cancelled = false;
    api
      .getCandidate(candidateId)
      .then((c) => {
        if (!cancelled) setState({ id: candidateId, candidate: c, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ id: candidateId, candidate: null, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  useEffect(() => {
    if (!candidateId) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [candidateId, onClose]);

  if (!candidateId) return null;
  const ready = state.id === candidateId;
  const c = ready ? state.candidate : null;
  const stepErrors = c ? STEP_LABELS.filter(([k]) => c[`${k}_error`]) : [];
  const profileJson = c?.profile_json;
  const skills = profileJson?.skills ?? [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <aside className="relative w-full max-w-2xl h-full overflow-y-auto bg-[#0D111A] border-l border-[#1E2638] p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">{c?.name ?? 'Candidate'}</h2>
            {c && (
              <div className="flex items-center gap-2 mt-1 text-sm">
                {c.score != null && <span className="font-mono">{c.score}%</span>}
                <Badge badge={c.badge} />
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!ready && <p className="text-sm text-slate-400">Loading…</p>}
        {ready && state.error && <p className="text-sm text-rose-400">{state.error}</p>}

        {c && (
          <>
            {stepErrors.length > 0 && (
              <ul className="rounded-md border border-rose-900/60 bg-rose-950/20 p-3 space-y-1 text-xs text-rose-300">
                {stepErrors.map(([k, label]) => (
                  <li key={k}>
                    <strong>{label}:</strong> {c[`${k}_error`]}
                  </li>
                ))}
              </ul>
            )}

            {(profileJson?.summary || skills.length > 0) && (
              <div className="glass-panel p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profile</h3>
                {profileJson.summary && <p className="text-sm text-slate-300">{profileJson.summary}</p>}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <span key={s} className="rounded-full bg-[#151B2A] border border-[#1E2638] px-2.5 py-0.5 text-xs text-slate-300">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ScreeningMatrix candidate={c} />
            <InterviewIntelligence questions={c.interview_questions_json?.questions} />
          </>
        )}
      </aside>
    </div>
  );
}
