import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Award, 
  TrendingUp, 
  RefreshCw, 
  ShieldAlert, 
  Check, 
  AlertCircle,
  Star,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ScreeningMatrix({ 
  selectedCandidate, 
  selectedJob, 
  candidates = [],
  onSelectCandidate,
  onScreenCandidate, 
  isScreening 
}) {
  const screening = selectedCandidate?.screening_json;
  const matchScore = screening?.overall_match_score || 0;

  const handleScreenClick = async () => {
    if (!selectedCandidate) return;
    const result = await onScreenCandidate(selectedCandidate.id);
    if (result?.screening_json?.overall_match_score >= 80) {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 }
      });
    }
  };

  const skillBreakdown = screening?.skill_breakdown || {
    matched_skills: [],
    missing_required_skills: [],
    bonus_skills: []
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card with Candidate Selector */}
      <div className="glass-panel rounded-xl p-5 border border-[#1E2638] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#151B2A] text-slate-400 border border-[#1E2638]">
              Candidate Screening Engine
            </span>
          </div>

          {/* In-Tab Candidate Selector */}
          <div className="flex items-center gap-2 mt-2">
            <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <select
              value={selectedCandidate?.id || ''}
              onChange={(e) => {
                const cand = candidates.find(c => c.id === Number(e.target.value));
                if (cand && onSelectCandidate) onSelectCandidate(cand);
              }}
              className="bg-[#090A0F] border border-[#1E2638] text-white text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 min-w-[240px]"
            >
              {candidates.length > 0 ? (
                candidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.filename} {c.screening_json ? `(${c.screening_json.overall_match_score}%)` : '(Unparsed)'}
                  </option>
                ))
              ) : (
                <option value="">No candidates available</option>
              )}
            </select>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Targeting Role: <strong className="text-slate-200">{selectedJob?.title || 'Selected Opening'}</strong>
          </p>
        </div>

        <button
          onClick={handleScreenClick}
          disabled={!selectedCandidate || isScreening}
          className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition-all ${
            !selectedCandidate || isScreening
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'btn-primary'
          }`}
        >
          {isScreening ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              Evaluating Match...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              {screening ? 'Re-Run Match Engine' : 'Run Match Evaluation'}
            </>
          )}
        </button>
      </div>

      {screening ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Score & Recommendation Gauge */}
          <div className="lg:col-span-4 space-y-5">
            {/* Score Ring Card */}
            <div className="glass-panel rounded-xl p-6 border border-[#1E2638] text-center space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Overall Match Rating
              </span>

              {/* Match Score Meter */}
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#1E2638]"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={
                      matchScore >= 80 ? "text-emerald-400" :
                      matchScore >= 60 ? "text-amber-400" : "text-rose-400"
                    }
                    strokeDasharray={`${matchScore}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white font-mono">
                    {matchScore}%
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Fit Index</span>
                </div>
              </div>

              {/* Recommendation Badge */}
              <div className="pt-1">
                <span className="text-[11px] text-slate-400 block mb-1">
                  Recommendation:
                </span>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium ${
                  screening.recommendation.includes('Shortlist') 
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : screening.recommendation.includes('Consider')
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                }`}>
                  {screening.recommendation.includes('Shortlist') ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                  {screening.recommendation}
                </div>
              </div>
            </div>

            {/* AI Reasoning Summary */}
            <div className="glass-panel rounded-xl p-4 border border-[#1E2638] space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Evaluation Reasoning
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-[#090A0F] p-3 rounded-lg border border-[#1E2638] font-sans">
                "{screening.summary_reasoning}"
              </p>
            </div>
          </div>

          {/* Detailed Skill Matrix & Analysis */}
          <div className="lg:col-span-8 space-y-5">
            {/* Skill Matrix Grid */}
            <div className="glass-panel rounded-xl p-5 border border-[#1E2638] space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-400" />
                Skill Alignment Analysis
              </h3>

              <div className="space-y-3">
                {/* Matched Skills */}
                <div className="p-3.5 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Matched Skills ({skillBreakdown.matched_skills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skillBreakdown.matched_skills.length > 0 ? (
                      skillBreakdown.matched_skills.map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None detected</span>
                    )}
                  </div>
                </div>

                {/* Missing Required Skills */}
                <div className="p-3.5 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Missing Required Skills ({skillBreakdown.missing_required_skills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skillBreakdown.missing_required_skills.length > 0 ? (
                      skillBreakdown.missing_required_skills.map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 rounded text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/80 flex items-center gap-1 font-mono">
                          <XCircle className="w-3 h-3 text-rose-400" /> {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-400 font-medium">All required skills met</span>
                    )}
                  </div>
                </div>

                {/* Bonus Skills */}
                {skillBreakdown.bonus_skills?.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-blue-400" /> Additional Relevant Skills ({skillBreakdown.bonus_skills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {skillBreakdown.bonus_skills.map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 rounded text-xs font-medium bg-[#090A0F] text-slate-300 border border-[#1E2638] font-mono">
                          +{skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Strengths vs Risks Dual Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Strengths */}
              <div className="glass-panel rounded-xl p-4 border border-[#1E2638] space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Candidate Strengths
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {screening.key_strengths?.map((str, i) => (
                    <li key={i} className="flex items-start gap-2 bg-[#090A0F] p-2 rounded border border-[#1E2638]">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks & Gaps */}
              <div className="glass-panel rounded-xl p-4 border border-[#1E2638] space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Potential Gaps / Risks
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {screening.potential_risks?.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 bg-[#090A0F] p-2 rounded border border-[#1E2638]">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-12 text-center space-y-2">
          <Sparkles className="w-5 h-5 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-white">Match Evaluation Ready</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click "Run Match Evaluation" to compute match score percentage and skill breakdown.
          </p>
        </div>
      )}
    </div>
  );
}
