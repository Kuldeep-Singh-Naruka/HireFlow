import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Award, 
  ShieldAlert,
  Users
} from 'lucide-react';
import Badge from './Badge';

export default function ScreeningMatrix({ candidate }) {
  const mappings = candidate?.mapping_json?.mappings;
  if (!mappings) {
    return <div className="text-sm text-slate-400">Mapping data not available.</div>;
  }
  // mappings[i] aligns by index with the run's requirements snapshot.
  const requirements = candidate.requirements ?? [];
  const score = candidate.score;
  const ringColor = score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-5 border border-[#1E2638] flex items-center justify-between gap-6">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <h2 className="text-base font-bold text-white truncate">{candidate.filename}</h2>
        </div>
        {score != null && (
          <div className="flex items-center gap-4 bg-[#090A0F] p-3 rounded-xl border border-[#1E2638]">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-[#1E2638]" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path
                  className={ringColor}
                  strokeDasharray={`${Math.min(100, Math.max(0, score))}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold text-white font-mono">{score}%</span>
            </div>
            <Badge badge={candidate.badge} />
          </div>
        )}
      </div>

      {/* Audit Matrix rows */}
      <div className="glass-panel rounded-xl p-5 border border-[#1E2638] space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Award className="w-4 h-4 text-blue-400" />
          Requirement Mapping & Evidence Audit
        </h3>
        
        <div className="space-y-3">
          {mappings.map((m, i) => (
            <div key={i} className="p-4 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    {m.status === 'met' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {m.status === 'partial' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {m.status === 'gap' && <XCircle className="w-4 h-4 text-rose-400" />}
                    <h4 className="text-sm font-bold text-white leading-snug">{m.requirement_text ?? requirements[i]?.requirement_text}</h4>
                  </div>
                  <div className="mt-1 ml-6 space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                      m.status === 'met' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' :
                      m.status === 'partial' ? 'bg-amber-950/30 text-amber-400 border-amber-900' :
                      'bg-rose-950/30 text-rose-400 border-rose-900'
                    }`}>
                      {m.status}
                    </span>
                    {requirements[i] && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#090A0F] text-slate-400 border border-[#1E2638]">
                        {requirements[i].is_required ? 'Required' : 'Preferred'}
                      </span>
                    )}
                    {m.needs_validation && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-950/30 text-amber-400 border border-amber-900 inline-flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Needs Validation
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {m.evidence_snippet && (
                <div className="ml-6 mt-3 p-3 bg-[#090A0F] border border-[#1E2638] rounded-md">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">Quote from Resume:</span>
                  <p className="text-xs text-slate-300 font-mono">"{m.evidence_snippet}"</p>
                </div>
              )}
              {m.validation_note && (
                <div className="ml-6 mt-2 p-2 bg-amber-950/20 border border-amber-900/50 rounded-md">
                  <p className="text-xs text-amber-200/70">⚠️ {m.validation_note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
