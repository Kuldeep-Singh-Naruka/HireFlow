import React, { useState } from 'react';
import { 
  Target, 
  Copy,
  Check
} from 'lucide-react';

export default function InterviewIntelligence({ selectedCandidate, selectedJob }) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  const iqResult = selectedCandidate?.interview_questions_json;
  
  if (!iqResult || !iqResult.questions) {
    return <div className="text-sm text-slate-400">Interview questions not available.</div>;
  }

  const questions = iqResult.questions;
  
  const handleCopyQuestion = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const validationQuestions = questions.filter(q => q.question_type === 'validation');
  const probeQuestions = questions.filter(q => q.question_type === 'probe');
  const generalQuestions = questions.filter(q => q.question_type === 'general');

  return (
    <div className="glass-panel rounded-xl p-6 border border-[#1E2638] space-y-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-[#1E2638] pb-3">
        <Target className="w-4 h-4 text-blue-400" />
        Tailored Interview Questions for "{selectedJob?.title}" ({questions.length})
      </h3>

      <div className="space-y-6">
        {/* Validation Questions */}
        {validationQuestions.length > 0 && (
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 block">
              High Priority: Validation (Verify Gaps & Claims)
            </span>
            {validationQuestions.map((q, idx) => (
              <div key={`val-${idx}`} className="p-4 rounded-lg bg-[#151B2A] border border-rose-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-950/30 text-rose-400 border border-rose-900">
                    Target: {q.target_requirement}
                  </span>
                  <button
                    onClick={() => handleCopyQuestion(q.question_text, `val-${idx}`)}
                    className="px-2 py-1 text-[11px] rounded bg-[#090A0F] text-slate-400 hover:text-white border border-[#1E2638] flex items-center gap-1"
                  >
                    {copiedIndex === `val-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedIndex === `val-${idx}` ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  "{q.question_text}"
                </h4>
              </div>
            ))}
          </div>
        )}

        {/* Probe Questions */}
        {probeQuestions.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-[#1E2638]">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block">
              Probe Questions (Explore Partial Matches)
            </span>
            {probeQuestions.map((q, idx) => (
              <div key={`prb-${idx}`} className="p-4 rounded-lg bg-[#151B2A] border border-amber-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-950/30 text-amber-400 border border-amber-900">
                    Target: {q.target_requirement}
                  </span>
                  <button
                    onClick={() => handleCopyQuestion(q.question_text, `prb-${idx}`)}
                    className="px-2 py-1 text-[11px] rounded bg-[#090A0F] text-slate-400 hover:text-white border border-[#1E2638] flex items-center gap-1"
                  >
                    {copiedIndex === `prb-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedIndex === `prb-${idx}` ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  "{q.question_text}"
                </h4>
              </div>
            ))}
          </div>
        )}

        {/* General Questions */}
        {generalQuestions.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-[#1E2638]">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 block">
              General Depth Questions (Expand on Strengths)
            </span>
            {generalQuestions.map((q, idx) => (
              <div key={`gen-${idx}`} className="p-4 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#090A0F] text-blue-400 border border-[#1E2638]">
                    Target: {q.target_requirement}
                  </span>
                  <button
                    onClick={() => handleCopyQuestion(q.question_text, `gen-${idx}`)}
                    className="px-2 py-1 text-[11px] rounded bg-[#090A0F] text-slate-400 hover:text-white border border-[#1E2638] flex items-center gap-1"
                  >
                    {copiedIndex === `gen-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedIndex === `gen-${idx}` ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  "{q.question_text}"
                </h4>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
