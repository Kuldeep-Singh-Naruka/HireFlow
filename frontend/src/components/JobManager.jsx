import React, { useState } from 'react';
import { 
  Plus, 
  Briefcase, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Users, 
  Layers,
  ChevronRight,
  RefreshCw,
  Zap
} from 'lucide-react';
import { SAMPLE_JOBS } from '../services/SampleData';

export default function JobManager({ 
  jobs, 
  selectedJob, 
  onSelectJob, 
  onCreateJob, 
  onExtractRequirements,
  isExtractingRequirements 
}) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [descriptionText, setDescriptionText] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !descriptionText.trim()) return;
    onCreateJob(title, descriptionText);
    setTitle('');
    setDescriptionText('');
    setShowModal(false);
  };

  const handlePrefillSample = (sampleIndex) => {
    const sample = SAMPLE_JOBS[sampleIndex];
    setTitle(sample.title);
    setDescriptionText(sample.description_text);
  };

  const requirements = selectedJob?.requirements_json?.requirements || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar: Job Openings List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-400" />
            Job Openings ({jobs.length})
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Opening
          </button>
        </div>

        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {jobs.map((job) => {
            const isSelected = selectedJob?.id === job.id;
            const candCount = job.candidates?.length || 0;
            const isExtracted = job.requirements_status === 'ok';

            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                className={`p-3.5 rounded-lg cursor-pointer transition-all border ${
                  isSelected 
                    ? 'bg-[#151B2A] border-blue-500/70' 
                    : 'bg-[#111520] border-[#1E2638] hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-white line-clamp-1">
                    {job.title}
                  </h3>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`} />
                </div>

                <div className="flex items-center justify-between mt-2.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {candCount} Candidates
                  </span>

                  {isExtracted ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Requirements Parsed
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1 font-medium text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> Unparsed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Panel: Selected Job Detail & Requirements */}
      <div className="lg:col-span-8 space-y-6">
        {selectedJob ? (
          <div className="glass-panel rounded-xl p-6 border border-[#1E2638] space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E2638] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#151B2A] text-slate-400 border border-[#1E2638]">
                    Job ID #{selectedJob.id}
                  </span>
                  <span className="text-xs text-slate-400">
                    Created {new Date(selectedJob.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1.5 m-0">
                  {selectedJob.title}
                </h2>
              </div>

              <button
                onClick={() => onExtractRequirements(selectedJob.id)}
                disabled={isExtractingRequirements}
                className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition-all ${
                  isExtractingRequirements 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'btn-primary'
                }`}
              >
                {isExtractingRequirements ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    Extracting Requirements...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    {selectedJob.requirements_status === 'ok' ? 'Re-extract Requirements' : 'Extract Requirements'}
                  </>
                )}
              </button>
            </div>

            {/* Extracted Structured Requirements View */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Structured Role Requirements ({requirements.length})
                </h3>
              </div>

              {selectedJob.requirements_status === 'ok' && requirements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {requirements.map((req, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg text-xs border bg-[#151B2A] border-[#1E2638] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider bg-[#090A0F] text-slate-400 border border-[#1E2638]">
                          {req.category}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          req.is_required 
                            ? 'bg-blue-950/70 text-blue-300 border border-blue-800/80' 
                            : 'bg-slate-800/60 text-slate-400 border border-slate-700/60'
                        }`}>
                          {req.is_required ? 'Must-Have' : 'Nice-To-Have'}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed font-sans">
                        {req.requirement_text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-lg bg-[#151B2A] border border-dashed border-[#1E2638] text-center space-y-2">
                  <Sparkles className="w-5 h-5 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-medium text-white">No requirements extracted yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click "Extract Requirements" to analyze responsibilities and key technical criteria automatically.
                  </p>
                </div>
              )}
            </div>

            {/* Raw Job Description Text */}
            <div className="border-t border-[#1E2638] pt-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Raw Job Description
              </h3>
              <div className="p-3.5 rounded-lg bg-[#090A0F] border border-[#1E2638] text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                {selectedJob.description_text}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-xl p-12 text-center space-y-3 border border-[#1E2638]">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Job Openings Created Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first job opening to define role requirements and start evaluating candidate resumes.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5 mt-2"
            >
              <Plus className="w-4 h-4" /> Create Job Opening
            </button>
          </div>
        )}
      </div>

      {/* Create New Job Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111520] rounded-xl max-w-2xl w-full p-6 space-y-4 border border-[#1E2638]">
            <div className="flex items-center justify-between border-b border-[#1E2638] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" /> Create Job Opening
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {/* Quick Prefill Templates */}
            <div className="p-3 rounded-lg bg-[#151B2A] border border-[#1E2638] space-y-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-400" /> Prefill Templates:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePrefillSample(0)}
                  className="px-2.5 py-1 text-xs rounded bg-[#090A0F] text-slate-300 border border-[#1E2638] hover:bg-slate-800 transition-all"
                >
                  Template 1: Senior AI Engineer
                </button>
                <button
                  type="button"
                  onClick={() => handlePrefillSample(1)}
                  className="px-2.5 py-1 text-xs rounded bg-[#090A0F] text-slate-300 border border-[#1E2638] hover:bg-slate-800 transition-all"
                >
                  Template 2: Lead Frontend Engineer
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior AI Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#090A0F] border border-[#1E2638] text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Job Description Text
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Paste the job responsibilities and technical requirements..."
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#090A0F] border border-[#1E2638] text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2638]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-xs"
                >
                  Create Opening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
