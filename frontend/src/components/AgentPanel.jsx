import { useEffect, useRef } from 'react';
import { RotateCcw, Play } from 'lucide-react';
import Badge from './Badge';

const STEPS = [
  ['extract', 'Extract'],
  ['profile', 'Profile'],
  ['mapping', 'Mapping'],
  ['questions', 'Questions'],
];

const DOT = {
  pending: 'bg-slate-600',
  running: 'bg-blue-500 animate-pulse',
  ok: 'bg-emerald-500',
  error: 'bg-rose-500',
  skipped: 'border border-slate-500',
};

const STAGES = ['Screening', 'Reviewing', 'Done'];

function stageOf(status) {
  if (status === 'reviewing') return 1;
  if (status === 'done') return 2;
  return 0; // queued / running
}

export default function AgentPanel({ run, actionPending = false, onRetryCandidate, onResume }) {
  const logRef = useRef(null);
  const shown = (run?.events ?? []).slice(-50);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  if (!run) return null;
  const interrupted = run.status === 'interrupted';
  const failed = run.status === 'failed';
  const stage = stageOf(run.status);
  // Per-candidate retry is only valid on a finished run; an interrupted run is resumed instead.
  const canRetry = run.status === 'done' && !actionPending;
  let retryTitle;
  if (interrupted) retryTitle = 'Resume the run instead';
  else if (run.status !== 'done') retryTitle = 'Wait for the run to finish';

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <ol className="flex items-center gap-2 text-xs">
          {STAGES.map((label, i) => {
            let cls = 'border-[#1E2638] text-slate-500';
            if (interrupted) {
              if (i === 0) cls = 'border-amber-700 bg-amber-950/50 text-amber-300';
            } else if (!failed) {
              if (i === stage) cls = 'border-blue-500/60 bg-blue-600/15 text-blue-200';
              else if (i < stage) cls = 'border-emerald-800 text-emerald-400';
            }
            return (
              <li key={label} className={`rounded-full px-3 py-1 border ${cls}`}>
                {label}
              </li>
            );
          })}
          {interrupted && <li className="text-amber-300">Interrupted</li>}
          {failed && <li className="text-rose-400">Failed</li>}
        </ol>
        {interrupted && (
          <button
            onClick={onResume}
            disabled={actionPending}
            className="btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Resume
          </button>
        )}
      </div>

      <ul className="divide-y divide-[#1E2638]">
        {run.candidates.map((c) => {
          const hasError = STEPS.some(([k]) => c[`${k}_status`] === 'error');
          return (
            <li key={c.id} className="py-2 flex items-center gap-3 text-sm">
              <span className="flex-1 min-w-0 truncate" title={c.filename}>{c.name}</span>
              <span className="flex items-center gap-1.5">
                {STEPS.map(([k, label]) => {
                  const st = c[`${k}_status`];
                  const err = c[`${k}_error`];
                  return (
                    <span
                      key={k}
                      title={err ? `${label}: ${err}` : `${label}: ${st}`}
                      className={`w-2.5 h-2.5 rounded-full ${DOT[st] ?? DOT.pending}`}
                    />
                  );
                })}
              </span>
              <span className="w-10 text-right font-mono text-xs text-slate-300">
                {c.score != null ? c.score : ''}
              </span>
              <span className="w-32">{c.badge && <Badge badge={c.badge} />}</span>
              <span className="w-16 text-right">
                {hasError && (
                  <button
                    onClick={() => onRetryCandidate(c.id)}
                    disabled={!canRetry}
                    title={retryTitle}
                    className="btn-secondary px-2 py-1 text-[11px] inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Retry
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div
        ref={logRef}
        className="max-h-40 overflow-y-auto rounded-md bg-[#090A0F] border border-[#1E2638] p-3 font-mono text-[11px] space-y-0.5"
      >
        {shown.length === 0 ? (
          <p className="text-slate-500">Waiting for events…</p>
        ) : (
          shown.map((e) => (
            <p key={e.id} className={e.type === 'review_failed' || e.data?.error ? 'text-rose-400' : 'text-slate-400'}>
              {e.message}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
