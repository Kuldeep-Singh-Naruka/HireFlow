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
  Search
} from 'lucide-react';
import { MOCK_CANDIDATE_DATA } from '../services/SampleData';

export default function CandidateHub({ 
  selectedJob, 
  candidates, 
  selectedCandidate, 
  onSelectCandidate, 
  onUploadResume, 
  onExtractProfile,
  isUploading,
  isExtractingProfile,
  onInjectMockCandidate
}) {
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadResume(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUploadResume(e.target.files[0]);
    }
  };

  const candidateList = (candidates || []).filter(c => 
    c.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const profile = selectedCandidate?.profile_json;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: File Upload & Candidate Roster */}
      <div className="lg:col-span-5 space-y-5">
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
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Upload Resume</h3>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-3 font-mono">
            PDF or DOCX (Max 10 MB)
          </p>

          <label className="btn-primary px-3.5 py-1.5 text-xs inline-flex items-center gap-2 cursor-pointer">
            <UploadCloud className="w-3.5 h-3.5" />
            {isUploading ? 'Uploading...' : 'Select Resume File'}
            <input 
              type="file" 
              accept=".pdf,.docx" 
              onChange={handleFileInput} 
              className="hidden" 
              disabled={isUploading}
            />
          </label>

          {/* Preset Candidates */}
          <div className="mt-4 pt-3 border-t border-[#1E2638] flex items-center justify-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Presets:</span>
            <button
              onClick={() => onInjectMockCandidate(MOCK_CANDIDATE_DATA[0])}
              className="px-2 py-0.5 text-[11px] font-medium rounded bg-[#151B2A] text-slate-300 border border-[#1E2638] hover:bg-slate-800 transition-all"
            >
              + Senior Candidate
            </button>
            <button
              onClick={() => onInjectMockCandidate(MOCK_CANDIDATE_DATA[1])}
              className="px-2 py-0.5 text-[11px] font-medium rounded bg-[#151B2A] text-slate-300 border border-[#1E2638] hover:bg-slate-800 transition-all"
            >
              + Junior Candidate
            </button>
          </div>
        </div>

        {/* Candidate List */}
        <div className="glass-panel rounded-xl p-5 border border-[#1E2638] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              Candidates ({candidateList.length})
            </h3>
          </div>

          {/* Roster Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#090A0F] border border-[#1E2638] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2 max-h-[calc(100vh-450px)] overflow-y-auto pr-1">
            {candidateList.length > 0 ? (
              candidateList.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;
                const isExtracted = cand.profile_status === 'ok' || cand.profile_json;

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
                      {cand.extraction_status === 'ok' ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Text Extracted
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3 h-3" /> Pending Text
                        </span>
                      )}

                      {isExtracted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#090A0F] text-slate-300 border border-[#1E2638] font-mono">
                          Profile Ready
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#090A0F] text-slate-500 border border-[#1E2638] font-mono">
                          Unparsed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-6 text-xs text-slate-500">
                No candidates found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Structured Candidate Profile (Always Displayed) */}
      <div className="lg:col-span-7">
        {selectedCandidate ? (
          <div className="glass-panel rounded-xl p-6 border border-[#1E2638] space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E2638] pb-4">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Candidate ID #{selectedCandidate.id}
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5 m-0">
                  {selectedCandidate.filename}
                </h2>
              </div>

              <button
                onClick={() => onExtractProfile(selectedCandidate.id)}
                disabled={isExtractingProfile}
                className={`px-3.5 py-1.5 rounded-lg font-medium text-xs flex items-center gap-2 transition-all ${
                  isExtractingProfile 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'btn-primary'
                }`}
              >
                {isExtractingProfile ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    Extracting Profile...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    {profile ? 'Re-extract Profile' : 'Extract Profile'}
                  </>
                )}
              </button>
            </div>

            {/* STRUCTURED PROFILE VIEW */}
            {profile ? (
              <div className="space-y-5">
                {/* Summary */}
                <div className="p-3.5 rounded-lg bg-[#090A0F] border border-[#1E2638] space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Profile Overview
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    "{profile.summary}"
                  </p>
                </div>

                {/* Skills Cloud */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    Technical Skills ({profile.skills?.length || 0})
                  </h4>
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
                </div>

                {/* Experience Timeline */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    Work Experience History
                  </h4>
                  <div className="space-y-2">
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

                {/* Projects & Education */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-1.5">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <FolderGit2 className="w-3.5 h-3.5 text-slate-400" /> Key Projects
                    </h5>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-slate-300">
                      {profile.projects?.map((proj, i) => (
                        <li key={i}>{proj}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-1.5">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Education
                    </h5>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-slate-300">
                      {profile.education?.map((edu, i) => (
                        <li key={i}>{edu}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-lg bg-[#151B2A] border border-dashed border-[#1E2638] space-y-2">
                <Sparkles className="w-5 h-5 text-slate-500 mx-auto" />
                <h4 className="text-sm font-medium text-white">Profile unparsed</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Click "Extract Profile" to parse skills and experience automatically.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel rounded-xl p-12 text-center text-slate-400 text-xs">
            Select a candidate from the roster to inspect profile details.
          </div>
        )}
      </div>
    </div>
  );
}
