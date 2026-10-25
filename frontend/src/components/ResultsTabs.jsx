import { useState } from 'react';
import { Flag, RotateCcw } from 'lucide-react';
import Badge from './Badge';

const TABS = [
  ['shortlist', 'Shortlist'],
  ['summary', 'Summary'],
  ['flags', 'Flags'],
];

const POOL_STYLES = {
  strong: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
  mixed: 'bg-amber-950/60 text-amber-300 border-amber-800',
  weak: 'bg-rose-950/60 text-rose-300 border-rose-800',
};

export default function ResultsTabs({ profile, run, onOpenCandidate, onRerunReview, actionPending = false }) {
  const [tab, setTab] = useState('shortlist');
  const candidates = profile.candidates ?? [];
  if (candidates.length === 0) return null;

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const nameOf = (id) => byId.get(id)?.name ?? `Candidate #${id}`;

  const latest = profile.latest_review;
  const review = latest?.review_status === 'ok' ? latest.review_json : null;
  const reviewFailed = latest?.review_status === 'error';
  const flagged = new Set((review?.flags ?? []).map((f) => f.candidate_id));
  const inProgress = run && (run.status === 'running' || run.status === 'reviewing' || run.status === 'queued');

  // Fallback rows: scored candidates, best first.
  const fallbackRows = candidates
    .filter((c) => c.score != null)
    .sort((a, b) => b.score - a.score)
    .map((c, i) => ({ candidate_id: c.id, rank: i + 1, reason: null }));
  const rows = review ? review.shortlist : fallbackRows;

  const rowButton = (id, children) => (
    <button type="button" onClick={() => onOpenCandidate(id)} className="text-left hover:text-blue-300">
      {children}
    </button>
  );

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div role="tablist" className="flex gap-1">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-xs rounded-md border ${
                tab === key ? 'border-blue-500/60 bg-blue-600/15 text-blue-200' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
              {key === 'flags' && review && review.flags.length > 0 ? ` (${review.flags.length})` : ''}
            </button>
          ))}
        </div>
        {inProgress && <span className="text-xs text-slate-500">Updating…</span>}
      </div>

      {!review && (
        <div className="rounded-md border border-[#1E2638] bg-[#0D111A] p-3 text-xs text-slate-400 flex items-center justify-between gap-3">
          <span>
            {reviewFailed ? (
              <>
                Review failed: <span className="text-rose-400">{latest.review_error}</span>. Showing candidates by score.
              </>
            ) : (
              'No review yet. Showing candidates by score.'
            )}
          </span>
          {reviewFailed && (
            <button
              onClick={() => onRerunReview(latest.run_id)}
              disabled={actionPending}
              className="btn-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3 h-3" /> Retry review
            </button>
          )}
        </div>
      )}

      {tab === 'shortlist' && (
        <div className="space-y-2">
          {review?.ranking_overridden && (
            <p className="text-xs text-amber-300">Ranking adjusted to match scores</p>
          )}
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">No scored candidates yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-1 pr-3 w-10">#</th>
                  <th className="py-1 pr-3">Candidate</th>
                  <th className="py-1 pr-3 w-14">Score</th>
                  <th className="py-1 pr-3">Badge</th>
                  <th className="py-1">Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const c = byId.get(r.candidate_id);
                  return (
                    <tr
                      key={r.candidate_id}
                      onClick={() => onOpenCandidate(r.candidate_id)}
                      className="border-t border-[#1E2638] cursor-pointer hover:bg-[#151B2A] align-top"
                    >
                      <td className="py-2 pr-3 font-mono text-slate-400">{r.rank}</td>
                      <td className="py-2 pr-3">
                        {rowButton(r.candidate_id, nameOf(r.candidate_id))}
                        {flagged.has(r.candidate_id) && (
                          <Flag className="inline w-3.5 h-3.5 ml-1.5 text-amber-400" aria-label="Flagged" />
                        )}
                      </td>
                      <td className="py-2 pr-3 font-mono">{c?.score ?? ''}</td>
                      <td className="py-2 pr-3">{c?.badge && <Badge badge={c.badge} />}</td>
                      <td className="py-2 text-xs text-slate-400">{r.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'summary' &&
        (review ? (
          <div className="space-y-4 text-sm">
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs capitalize ${
                POOL_STYLES[review.summary.pool_strength] ?? 'border-[#1E2638] text-slate-300'
              }`}
            >
              Pool strength: {review.summary.pool_strength}
            </span>
            <p className="text-slate-300">{review.summary.overview}</p>
            {review.summary.top_picks?.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1">Top picks</h4>
                <p className="text-slate-200">
                  {review.summary.top_picks.map((id, i) => (
                    <span key={id}>
                      {i > 0 && ', '}
                      <button type="button" className="hover:text-blue-300" onClick={() => onOpenCandidate(id)}>
                        {nameOf(id)}
                      </button>
                    </span>
                  ))}
                </p>
              </div>
            )}
            {review.summary.common_gaps?.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1">Common gaps</h4>
                <div className="flex flex-wrap gap-1.5">
                  {review.summary.common_gaps.map((g) => (
                    <span key={g} className="rounded-full bg-[#151B2A] border border-[#1E2638] px-2.5 py-0.5 text-xs text-slate-300">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {review.summary.next_steps?.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1">Next steps</h4>
                <ul className="list-disc pl-5 space-y-0.5 text-slate-300">
                  {review.summary.next_steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Summary is available once the review completes.</p>
        ))}

      {tab === 'flags' &&
        (review ? (
          review.flags.length === 0 ? (
            <p className="text-sm text-slate-400">No candidates flagged.</p>
          ) : (
            <ul className="space-y-2">
              {review.flags.map((f) => (
                <li key={f.candidate_id}>
                  <button
                    type="button"
                    onClick={() => onOpenCandidate(f.candidate_id)}
                    className="w-full text-left glass-card p-3"
                  >
                    <span className="text-sm font-medium">{nameOf(f.candidate_id)}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">{f.reason}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-slate-400">Flags are available once the review completes.</p>
        ))}
    </div>
  );
}
