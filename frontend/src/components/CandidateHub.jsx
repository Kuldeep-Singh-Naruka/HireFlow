import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  UserCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Briefcase, 
  GraduationCap, 
  FolderGit2, 
  ChevronRight,
  RefreshCw,
  Search,
  Award,
  TrendingUp,
  ShieldAlert,
  Check,
  AlertCircle,
  Star,
  Target,
  Copy,
  Layers,
  Plus
} from 'lucide-react';

export default function CandidateHub({ 
  jobs = [],
  selectedJob, 
  onSelectJob,
  candidates = [], 
  selectedCandidate, 
  onSelectCandidate, 
  onUploadResumes,
  onUploadResume, 
  isProcessingCandidate
}) {
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [sortBy, setSortBy] = useState('match'); // Default sort: Match Percentage Descending

  const uploader = onUploadResumes || onUploadResume;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (uploader) uploader(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (uploader) uploader(e.target.files);
      e.target.value = '';
    }
  };

  const handleCopyQuestion = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getCandidateScore = (c) => {
    if (c?.screening_json?.overall_match_score !== undefined && c?.screening_json?.overall_match_score !== null) {
      return c.screening_json.overall_match_score;
    }
    if (c?.mapping_json?.overall_match_score !== undefined && c?.mapping_json?.overall_match_score !== null) {
      return c.mapping_json.overall_match_score;
    }
    return undefined;
  };

  const candidateList = (candidates || [])
    .filter(c => c.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'match') {
        const scoreA = getCandidateScore(a) ?? -1;
        const scoreB = getCandidateScore(b) ?? -1;
        return scoreB - scoreA;
      } else {
        return (b.id || 0) - (a.id || 0);
      }
    });

  const profile = selectedCandidate?.profile_json;
  const screening = selectedCandidate?.screening_json;
  const kit = selectedCandidate?.interview_kit_json;
  const matchScore = getCandidateScore(selectedCandidate);

  const jobRequirements = selectedJob?.requirements_json?.requirements || [];

  const skillBreakdown = screening?.skill_breakdown || {
    matched_skills: [],
    missing_required_skills: [],
    bonus_skills: []
  };

  const technical = kit?.technical_questions || [];
  const behavioral = kit?.behavioral_questions || [];
  const probes = kit?.skill_gap_probes || [];

  return (
    <div className="space-y-6">
      {/* TARGET JOB OPENING BANNER */}
      {selectedJob ? (
        <div className="glass-panel rounded-xl p-5 border border-blue-500/40 bg-gradient-to-r from-[#111520] via-[#151B2A] to-[#111520] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider block font-semibold">
                  Target Job Opening
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    value={selectedJob?.id || ''}
                    onChange={(e) => {
                      const found = jobs.find(j => j.id === Number(e.target.value));
                      if (found && onSelectJob) onSelectJob(found);
                    }}
                    className="bg-[#090A0F] border border-[#1E2638] text-white text-base font-bold rounded-lg px-3 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.title} (Job ID #{j.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className="px-2.5 py-1 rounded bg-[#090A0F] border border-[#1E2638]">
                {candidates.length} Resumes
              </span>
              <span className="px-2.5 py-1 rounded bg-[#090A0F] border border-[#1E2638]">
                {jobRequirements.length} Requirements
              </span>
            </div>
          </div>

          {jobRequirements.length > 0 && (
            <div className="pt-2 border-t border-[#1E2638]/80 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> Target Criteria:
              </span>
              {jobRequirements.slice(0, 5).map((req, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-[#090A0F] text-slate-300 border border-[#1E2638] font-mono">
                  {req.requirement_text}
                </span>
              ))}
              {jobRequirements.length > 5 && (
                <span className="text-[11px] text-slate-500 font-mono">+{jobRequirements.length - 5} more</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-8 text-center space-y-2 border border-[#1E2638]">
          <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Job Opening Created Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Please create a job opening under "Job Openings" tab first to start evaluating candidate resumes.
          </p>
        </div>
      )}

      {selectedJob && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: File Upload & Candidate Roster */}
          <div className="lg:col-span-4 space-y-5">
            {/* Upload Zone */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`glass-panel rounded-xl p-5 border text-center transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-[#151B2A]' 
                  : 'border-[#1E2638] hover:border-slate-700'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[#151B2A] text-slate-400 flex items-center justify-center mx-auto mb-2 border border-[#1E2638]">
                <UploadCloud className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Upload Resumes (Multi-Select)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-3 font-mono">
                Select or drop multiple PDF/DOCX files
              </p>

              <label className="btn-primary px-4 py-2 text-xs inline-flex items-center gap-2 cursor-pointer shadow-sm">
                <UploadCloud className="w-4 h-4" />
                Select File(s) to Upload
                <input 
                  type="file" 
                  accept=".pdf,.docx" 
                  multiple
                  onChange={handleFileInput} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Candidate Roster */}
            <div className="glass-panel rounded-xl p-4 border border-[#1E2638] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  Uploaded Resumes ({candidateList.length})
                </h3>
              </div>

              {/* Roster Search & Sort Control Bar */}
              {candidates.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search candidate..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#090A0F] border border-[#1E2638] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-[#090A0F] border border-[#1E2638] text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                    title="Sort candidate roster"
                  >
                    <option value="match">Match % (High to Low)</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
              )}

              <div className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto pr-1">
                {candidateList.length > 0 ? (
                  candidateList.map((cand) => {
                    const isSelected = selectedCandidate?.id === cand.id;
                    const score = getCandidateScore(cand);

                    return (
                      <div
                        key={cand.id}
                        onClick={() => onSelectCandidate(cand)}
                        className={`p-3 rounded-lg cursor-pointer transition-all border ${
                          isSelected 
                            ? 'bg-[#151B2A] border-blue-500/70' 
                            : 'bg-[#111520] border-[#1E2638] hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded bg-[#090A0F] flex items-center justify-center text-slate-400 border border-[#1E2638]">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-white line-clamp-1">
                                {cand.filename}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID #{cand.id}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`} />
                        </div>

                        <div className="flex items-center justify-between mt-2 text-[11px]">
                          {score !== undefined ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              score >= 80 ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' :
                              score >= 60 ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                              'bg-rose-950/80 text-rose-300 border border-rose-800'
                            }`}>
                              {score}% Match
                            </span>
                          ) : (
                            <span className="text-blue-400 flex items-center gap-1 font-mono text-[10px] animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Calculating Match...
                            </span>
                          )}

                          {cand.profile_json ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Auto-Analyzed
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Processing</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center p-8 text-xs text-slate-500 space-y-1">
                    <p>No resumes uploaded for this job opening yet.</p>
                    <p className="text-[11px] text-slate-600">Upload a PDF or DOCX file above to analyze!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: UNIFIED CANDIDATE INTELLIGENCE DASHBOARD */}
          <div className="lg:col-span-8 space-y-6">
            {selectedCandidate ? (
              <div className="space-y-6">
                {/* Top Dashboard Header & AI Score Banner */}
                <div className="glass-panel rounded-xl p-6 border border-[#1E2638] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E2638] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#151B2A] text-slate-400 border border-[#1E2638]">
                          Candidate ID #{selectedCandidate.id}
                        </span>
                        {isProcessingCandidate && (
                          <span className="text-xs text-blue-400 font-mono flex items-center gap-1 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Auto-analyzing pipeline...
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-white mt-1 m-0">
                        {selectedCandidate.filename}
                      </h2>
                      <p className="text-xs text-[#3B82F6] font-semibold mt-0.5">
                        Evaluating For Role: <strong>{selectedJob?.title || 'Selected Role'}</strong> (Job ID #{selectedJob?.id})
                      </p>
                    </div>

                    {/* Match Score Meter Gauge */}
                    {screening && (
                      <div className="flex items-center gap-4 bg-[#090A0F] p-3 rounded-xl border border-[#1E2638]">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-[#1E2638]"
                              strokeWidth="3.5"
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
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className="absolute text-sm font-bold text-white font-mono">{matchScore}%</span>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Recommendation:</span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold mt-0.5 ${
                            screening.recommendation.includes('Shortlist') 
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : screening.recommendation.includes('Consider')
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          }`}>
                            {screening.recommendation.includes('Shortlist') ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
                            {screening.recommendation}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Executive Summary */}
                  {profile && (
                    <div className="p-3.5 rounded-lg bg-[#090A0F] border border-[#1E2638] space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Executive Profile Summary
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        "{profile.summary}"
                      </p>
                    </div>
                  )}
                </div>

                {/* SECTION 1: SKILLS & EXPERIENCE */}
                {profile && (
                  <div className="glass-panel rounded-xl p-6 border border-[#1E2638] space-y-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-[#1E2638] pb-3">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      Candidate Background & Technical Skills ({profile.skills?.length || 0})
                    </h3>

                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills?.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-[#151B2A] text-slate-300 border border-[#1E2638] font-mono"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Experience History */}
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                        Work Experience History
                      </span>
                      {profile.experience?.map((exp, i) => (
                        <div key={i} className="p-3.5 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-1">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-white">{exp.title}</h5>
                            {exp.organization && (
                              <span className="text-[11px] font-mono text-blue-400">
                                @{exp.organization}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed mt-1">
                            {exp.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SECTION 2: MATCH SCORECARD & SKILL ALIGNMENT */}
                {screening && (
                  <div className="glass-panel rounded-xl p-6 border border-[#1E2638] space-y-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-[#1E2638] pb-3">
                      <Award className="w-4 h-4 text-blue-400" />
                      Role Fit & Skill Breakdown Matrix against "{selectedJob?.title}"
                    </h3>

                    {/* Reasoning */}
                    <div className="p-3.5 rounded-lg bg-[#090A0F] border border-[#1E2638] space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Screening Evaluation Reasoning
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        "{screening.summary_reasoning}"
                      </p>
                    </div>

                    {/* Skill Alignment Breakdown */}
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Matched Role Skills ({skillBreakdown.matched_skills.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {skillBreakdown.matched_skills.map((skill, i) => (
                            <span key={i} className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Missing Required Role Skills ({skillBreakdown.missing_required_skills.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {skillBreakdown.missing_required_skills.length > 0 ? (
                            skillBreakdown.missing_required_skills.map((skill, i) => (
                              <span key={i} className="px-2.5 py-1 rounded text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/80 flex items-center gap-1 font-mono">
                                ✕ {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-emerald-400 font-medium">All required role skills met</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Strengths vs Risks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-[#090A0F] border border-[#1E2638] space-y-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Key Strengths for Role
                        </h4>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {screening.key_strengths?.map((str, i) => (
                            <li key={i}>• {str}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-lg bg-[#090A0F] border border-[#1E2638] space-y-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Potential Risks for Role
                        </h4>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {screening.potential_risks?.map((risk, i) => (
                            <li key={i}>• {risk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 3: TAILORED INTERVIEW INTELLIGENCE QUESTIONS */}
                {kit && (
                  <div className="glass-panel rounded-xl p-6 border border-[#1E2638] space-y-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-[#1E2638] pb-3">
                      <Target className="w-4 h-4 text-blue-400" />
                      Tailored Interview Questions for "{selectedJob?.title}" ({technical.length + behavioral.length + probes.length})
                    </h3>

                    {/* Technical Questions */}
                    <div className="space-y-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 block">
                        Technical Questions
                      </span>
                      {technical.map((q, idx) => (
                        <div key={idx} className="p-4 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#090A0F] text-slate-400 border border-[#1E2638]">
                              Target: {q.target_skill} • {q.difficulty}
                            </span>
                            <button
                              onClick={() => handleCopyQuestion(q.question, `t-${idx}`)}
                              className="px-2 py-1 text-[11px] rounded bg-[#090A0F] text-slate-400 hover:text-white border border-[#1E2638] flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              {copiedIndex === `t-${idx}` ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <h4 className="text-xs font-bold text-white leading-snug">
                            "{q.question}"
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Criteria: {q.expected_answer_points?.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Behavioral STAR Questions */}
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 block">
                        Behavioral STAR Scenarios
                      </span>
                      {behavioral.map((q, idx) => (
                        <div key={idx} className="p-4 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#090A0F] text-slate-400 border border-[#1E2638]">
                              Competency: {q.competency}
                            </span>
                            <button
                              onClick={() => handleCopyQuestion(q.question, `b-${idx}`)}
                              className="px-2 py-1 text-[11px] rounded bg-[#090A0F] text-slate-400 hover:text-white border border-[#1E2638] flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              {copiedIndex === `b-${idx}` ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <h4 className="text-xs font-bold text-white leading-snug">
                            "{q.question}"
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Evaluation: {q.evaluation_criteria}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel rounded-xl p-12 text-center text-slate-400 text-xs">
                Upload a candidate resume or select one from the list to view their screening report for {selectedJob?.title || 'the role'}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
