import React, { useState } from 'react';
import { 
  Award, 
  Sparkles, 
  UserCheck, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  Star, 
  RefreshCw,
  Zap,
  ChevronRight,
  Copy,
  Check,
  Users
} from 'lucide-react';

export default function InterviewIntelligence({ 
  selectedCandidate, 
  selectedJob, 
  candidates = [],
  onSelectCandidate,
  onGenerateInterviewKit, 
  isGeneratingKit 
}) {
  const [activeTab, setActiveTab] = useState('technical');
  const [simActive, setSimActive] = useState(false);
  const [currentSimIndex, setCurrentSimIndex] = useState(0);
  const [currentRating, setCurrentRating] = useState(4);
  const [currentNotes, setCurrentNotes] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const kit = selectedCandidate?.interview_kit_json;

  const technical = kit?.technical_questions || [];
  const behavioral = kit?.behavioral_questions || [];
  const probes = kit?.skill_gap_probes || [];
  const cheatSheet = kit?.interviewer_cheat_sheet || [];

  const allQuestions = [
    ...technical.map(q => ({ ...q, type: 'Technical' })),
    ...behavioral.map(q => ({ question: q.question, target_skill: q.competency, type: 'Behavioral', expected_answer_points: [q.evaluation_criteria] })),
    ...probes.map(q => ({ question: q.probe_question, target_skill: `Probe: ${q.missing_skill}`, type: 'Skill Gap Probe', expected_answer_points: [q.goal] }))
  ];

  const handleCopyQuestion = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card with Candidate Selector */}
      <div className="glass-panel rounded-xl p-6 border border-[#1E2638] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#151B2A] text-slate-400 border border-[#1E2638]">
              Interview Intelligence Agent
            </span>
          </div>

          {/* Candidate Selector Dropdown */}
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
                    {c.filename} {c.interview_kit_json ? '(Kit Ready)' : '(No Kit)'}
                  </option>
                ))
              ) : (
                <option value="">No candidates available</option>
              )}
            </select>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Targeting role: <strong className="text-slate-200">{selectedJob?.title || 'Job Opening'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onGenerateInterviewKit(selectedCandidate?.id)}
            disabled={!selectedCandidate || isGeneratingKit}
            className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition-all ${
              !selectedCandidate || isGeneratingKit
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {isGeneratingKit ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                Generating Kit...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {kit ? 'Regenerate Questions' : 'Generate Interview Questions'}
              </>
            )}
          </button>

          {allQuestions.length > 0 && (
            <button
              onClick={() => {
                setSimActive(!simActive);
                setActiveTab(simActive ? 'technical' : 'simulator');
              }}
              className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {simActive ? 'Exit Simulator' : 'Launch Session Simulator'}
            </button>
          )}
        </div>
      </div>

      {kit ? (
        <div className="space-y-6">
          {!simActive && (
            <div className="flex items-center gap-2 border-b border-[#1E2638] pb-3">
              <button
                onClick={() => setActiveTab('technical')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'technical'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-[#151B2A] text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-blue-400" />
                Technical ({technical.length})
              </button>

              <button
                onClick={() => setActiveTab('behavioral')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'behavioral'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-[#151B2A] text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                Behavioral STAR ({behavioral.length})
              </button>

              <button
                onClick={() => setActiveTab('probes')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'probes'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-[#151B2A] text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Missing Skill Probes ({probes.length})
              </button>
            </div>
          )}

          {/* SIMULATOR MODE */}
          {simActive || activeTab === 'simulator' ? (
            <div className="glass-panel rounded-xl p-6 border border-[#1E2638] space-y-6">
              <div className="flex items-center justify-between border-b border-[#1E2638] pb-4">
                <h3 className="text-sm font-bold text-white">Live AI Interview Session Simulator</h3>
                <span className="text-xs font-mono text-slate-400 bg-[#090A0F] px-3 py-1 rounded border border-[#1E2638]">
                  Question {currentSimIndex + 1} of {allQuestions.length}
                </span>
              </div>

              {allQuestions[currentSimIndex] && (
                <div className="space-y-5">
                  <div className="p-5 rounded-lg bg-[#090A0F] border border-[#1E2638] space-y-2">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-[#151B2A] text-slate-400 border border-[#1E2638]">
                      {allQuestions[currentSimIndex].type} • {allQuestions[currentSimIndex].target_skill}
                    </span>
                    <h4 className="text-base font-bold text-white leading-snug mt-2">
                      "{allQuestions[currentSimIndex].question}"
                    </h4>
                  </div>

                  <div className="p-4 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Evaluator Guide:
                    </span>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-slate-300">
                      {allQuestions[currentSimIndex].expected_answer_points?.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-5 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Answer Rating:
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setCurrentRating(star)}
                            className="p-1"
                          >
                            <Star className={`w-4 h-4 ${star <= currentRating ? 'text-amber-400 fill-current' : 'text-slate-600'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Interviewer Notes:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Type notes on technical depth or communication clarity..."
                        value={currentNotes}
                        onChange={(e) => setCurrentNotes(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg bg-[#090A0F] border border-[#1E2638] text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setCurrentSimIndex(Math.max(0, currentSimIndex - 1))}
                        disabled={currentSimIndex === 0}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40"
                      >
                        Previous
                      </button>

                      <button
                        onClick={() => {
                          if (currentSimIndex < allQuestions.length - 1) {
                            setCurrentSimIndex(prev => prev + 1);
                          } else {
                            setSimActive(false);
                          }
                        }}
                        className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
                      >
                        {currentSimIndex < allQuestions.length - 1 ? 'Next Question' : 'Finish Session'} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STANDARD QUESTION LIST VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-4">
                {activeTab === 'technical' && (
                  <div className="space-y-3">
                    {technical.map((q, idx) => (
                      <div key={idx} className="glass-panel rounded-xl p-5 border border-[#1E2638] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#090A0F] text-slate-400 border border-[#1E2638]">
                            Target: {q.target_skill}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              Difficulty: {q.difficulty}
                            </span>
                            <button
                              onClick={() => handleCopyQuestion(q.question, `tech-${idx}`)}
                              className="px-2 py-1 text-[11px] rounded bg-[#090A0F] text-slate-400 hover:text-white border border-[#1E2638] flex items-center gap-1"
                              title="Copy question text"
                            >
                              {copiedIndex === `tech-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              {copiedIndex === `tech-${idx}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-white leading-snug">
                          {q.question}
                        </h4>

                        <div className="p-3 rounded-lg bg-[#090A0F] border border-[#1E2638] space-y-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Expected Answer Criteria:
                          </span>
                          <ul className="space-y-1 pl-4 list-disc text-xs text-slate-300">
                            {q.expected_answer_points?.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'behavioral' && (
                  <div className="space-y-3">
                    {behavioral.map((q, idx) => (
                      <div key={idx} className="glass-panel rounded-xl p-5 border border-[#1E2638] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#090A0F] text-slate-400 border border-[#1E2638]">
                            Competency: {q.competency}
                          </span>

                          <button
                            onClick={() => handleCopyQuestion(q.question, `beh-${idx}`)}
                            className="px-2 py-1 text-[11px] rounded bg-[#090A0F] text-slate-400 hover:text-white border border-[#1E2638] flex items-center gap-1"
                          >
                            {copiedIndex === `beh-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedIndex === `beh-${idx}` ? 'Copied' : 'Copy'}
                          </button>
                        </div>

                        <h4 className="text-sm font-bold text-white leading-snug">
                          {q.question}
                        </h4>

                        <div className="p-3 rounded-lg bg-[#090A0F] border border-[#1E2638]">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                            Evaluation Criteria:
                          </span>
                          <p className="text-xs text-slate-300">{q.evaluation_criteria}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'probes' && (
                  <div className="space-y-3">
                    {probes.map((q, idx) => (
                      <div key={idx} className="glass-panel rounded-xl p-5 border border-[#1E2638] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#090A0F] text-amber-400 border border-[#1E2638]">
                            Missing Skill: {q.missing_skill}
                          </span>

                          <button
                            onClick={() => handleCopyQuestion(q.probe_question, `prb-${idx}`)}
                            className="px-2 py-1 text-[11px] rounded bg-[#090A0F] text-slate-400 hover:text-white border border-[#1E2638] flex items-center gap-1"
                          >
                            {copiedIndex === `prb-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedIndex === `prb-${idx}` ? 'Copied' : 'Copy'}
                          </button>
                        </div>

                        <h4 className="text-sm font-bold text-white leading-snug">
                          {q.probe_question}
                        </h4>

                        <div className="p-3 rounded-lg bg-[#090A0F] border border-[#1E2638]">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                            Probe Objective:
                          </span>
                          <p className="text-xs text-slate-300">{q.goal}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar: Interviewer Cheat Sheet */}
              <div className="lg:col-span-4 space-y-4">
                <div className="glass-panel rounded-xl p-5 border border-[#1E2638] space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-blue-400" /> Interviewer Guidelines
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {cheatSheet.map((tip, i) => (
                      <li key={i} className="p-3 rounded-lg bg-[#090A0F] border border-[#1E2638] leading-relaxed flex items-start gap-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-12 text-center space-y-2">
          <Award className="w-6 h-6 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-white">Interview Questions Ready</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click "Generate Interview Questions" to generate technical and behavioral questions.
          </p>
        </div>
      )}
    </div>
  );
}
