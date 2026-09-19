import React, { useState } from 'react';
import { 
  Award, 
  Sparkles, 
  HelpCircle, 
  UserCheck, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  Star, 
  MessageSquare, 
  RefreshCw,
  Zap,
  ChevronRight,
  Send
} from 'lucide-react';

export default function InterviewIntelligence({ 
  selectedCandidate, 
  selectedJob, 
  onGenerateInterviewKit, 
  isGeneratingKit 
}) {
  const [activeTab, setActiveTab] = useState('technical'); // technical, behavioral, probes, simulator
  const [simActive, setSimActive] = useState(false);
  const [currentSimIndex, setCurrentSimIndex] = useState(0);
  const [simAnswers, setSimAnswers] = useState({});
  const [currentRating, setCurrentRating] = useState(4);
  const [currentNotes, setCurrentNotes] = useState('');

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

  const handleSaveSimResponse = () => {
    setSimAnswers(prev => ({
      ...prev,
      [currentSimIndex]: {
        rating: currentRating,
        notes: currentNotes
      }
    }));

    if (currentSimIndex < allQuestions.length - 1) {
      setCurrentSimIndex(prev => prev + 1);
      setCurrentRating(4);
      setCurrentNotes('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="glass-panel-glow rounded-2xl p-6 border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
              AI Interview Intelligence Agent
            </span>
            <span className="text-xs text-slate-400">Tailored Q&A & Live Simulator</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">
            Interview Kit for {selectedCandidate ? selectedCandidate.filename : 'Selected Candidate'}
          </h2>
          <p className="text-xs text-slate-300">
            Targeting role: <strong className="text-purple-300">{selectedJob?.title || 'Job Opening'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onGenerateInterviewKit(selectedCandidate?.id)}
            disabled={!selectedCandidate || isGeneratingKit}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
              !selectedCandidate || isGeneratingKit
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'gradient-btn text-white shadow-purple-600/40 hover:scale-105'
            }`}
          >
            {isGeneratingKit ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                Generating Kit...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-300" />
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
              className="px-4 py-3 rounded-xl font-bold text-xs bg-emerald-600 text-white border border-emerald-500/40 hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30"
            >
              <Play className="w-4 h-4 fill-current" />
              {simActive ? 'Exit Simulator' : 'Launch Live Simulator'}
            </button>
          )}
        </div>
      </div>

      {kit ? (
        <div className="space-y-6">
          {/* Navigation Sub-Tabs */}
          {!simActive && (
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setActiveTab('technical')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'technical'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-4 h-4 text-purple-300" />
                Technical Questions ({technical.length})
              </button>

              <button
                onClick={() => setActiveTab('behavioral')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'behavioral'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4 text-blue-300" />
                Behavioral STAR ({behavioral.length})
              </button>

              <button
                onClick={() => setActiveTab('probes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'probes'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                Missing Skill Probes ({probes.length})
              </button>
            </div>
          )}

          {/* SIMULATOR MODE */}
          {simActive || activeTab === 'simulator' ? (
            <div className="glass-panel-glow rounded-2xl p-6 border border-emerald-500/40 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-base font-bold text-white">Live AI Interview Session Simulator</h3>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                  Question {currentSimIndex + 1} of {allQuestions.length}
                </span>
              </div>

              {allQuestions[currentSimIndex] && (
                <div className="space-y-5">
                  {/* Current Question Box */}
                  <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-500/20 text-purple-300">
                        {allQuestions[currentSimIndex].type} • {allQuestions[currentSimIndex].target_skill}
                      </span>
                      {allQuestions[currentSimIndex].difficulty && (
                        <span className="text-xs text-amber-300 font-semibold">
                          Difficulty: {allQuestions[currentSimIndex].difficulty}
                        </span>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-white leading-snug mt-2">
                      "{allQuestions[currentSimIndex].question}"
                    </h4>
                  </div>

                  {/* Expected Key Points Cheat Sheet */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Interviewer Evaluator Guide:
                    </span>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-slate-300">
                      {allQuestions[currentSimIndex].expected_answer_points?.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Interactive Interviewer Scorecard Input */}
                  <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Candidate Answer Rating:
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setCurrentRating(star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star className={`w-5 h-5 ${star <= currentRating ? 'text-yellow-400 fill-current' : 'text-slate-600'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Interviewer Real-time Notes:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Type candidate response summary, technical depth observation, or red flags..."
                        value={currentNotes}
                        onChange={(e) => setCurrentNotes(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setCurrentSimIndex(Math.max(0, currentSimIndex - 1))}
                        disabled={currentSimIndex === 0}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40"
                      >
                        Previous Question
                      </button>

                      <button
                        onClick={handleSaveSimResponse}
                        className="gradient-btn px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                      >
                        {currentSimIndex < allQuestions.length - 1 ? (
                          <>Next Question <ChevronRight className="w-4 h-4" /></>
                        ) : (
                          <>Finish Interview Simulation <CheckCircle2 className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STANDARD QUESTION LIST VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Question Cards */}
              <div className="lg:col-span-8 space-y-4">
                {activeTab === 'technical' && (
                  <div className="space-y-4">
                    {technical.map((q, idx) => (
                      <div key={idx} className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300">
                            Target: {q.target_skill}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            q.difficulty === 'Hard' ? 'bg-rose-500/20 text-rose-300' :
                            q.difficulty === 'Medium' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {q.difficulty}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white leading-snug">
                          {q.question}
                        </h4>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Expected Key Answer Points:
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
                  <div className="space-y-4">
                    {behavioral.map((q, idx) => (
                      <div key={idx} className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300">
                          Competency: {q.competency}
                        </span>

                        <h4 className="text-base font-bold text-white leading-snug">
                          {q.question}
                        </h4>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
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
                  <div className="space-y-4">
                    {probes.map((q, idx) => (
                      <div key={idx} className="glass-panel rounded-2xl p-5 border border-amber-500/30 space-y-3">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Targeting Missing Skill: {q.missing_skill}
                        </span>

                        <h4 className="text-base font-bold text-white leading-snug">
                          {q.probe_question}
                        </h4>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
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
                <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Interviewer Cheat Sheet
                  </h4>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {cheatSheet.map((tip, i) => (
                      <li key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 leading-relaxed flex items-start gap-2">
                        <span className="text-purple-400 font-bold">•</span>
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
        <div className="glass-panel rounded-2xl p-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white">AI Interview Intelligence Agent</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click "Generate Interview Questions" above to produce custom technical deep-dives, behavioral scenarios, and missing skill probes.
          </p>
        </div>
      )}
    </div>
  );
}
