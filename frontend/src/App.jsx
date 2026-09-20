import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import JobManager from './components/JobManager';
import CandidateHub from './components/CandidateHub';
import { api } from './services/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('jobs');

  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [isExtractingRequirements, setIsExtractingRequirements] = useState(false);
  const [isProcessingCandidate, setIsProcessingCandidate] = useState(false);
  const [autoPipelineStatus, setAutoPipelineStatus] = useState(null);

  // Ref to track active candidate pipeline processing and prevent duplicate concurrent API calls
  const activeProcessingRef = useRef(new Set());

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initial Data Loading
  useEffect(() => {
    const init = async () => {
      const jobList = await api.getJobs();
      setJobs(jobList);
      if (jobList.length > 0) {
        setSelectedJob(jobList[0]);
      }
    };
    init();
  }, []);

  // Sync candidates when selectedJob changes (single source of truth)
  useEffect(() => {
    if (!selectedJob) {
      setCandidates([]);
      setSelectedCandidate(null);
      return;
    }

    const fetchJobDetail = async () => {
      const detail = await api.getJobDetail(selectedJob.id);
      if (detail && detail.candidates) {
        setCandidates(detail.candidates);
        if (detail.candidates.length > 0 && !selectedCandidate) {
          const candDetail = await api.getCandidateDetail(detail.candidates[0].id);
          autoProcessCandidatePipeline(candDetail);
        }
      }
    };
    fetchJobDetail();
  }, [selectedJob?.id]);

  // AUTOMATED BACKGROUND AI PIPELINE FUNCTION (Deduplicated)
  const autoProcessCandidatePipeline = async (cand) => {
    if (!cand || !selectedJob) return;

    // Prevent duplicate concurrent pipeline calls for the same candidate ID
    if (activeProcessingRef.current.has(cand.id)) return;
    activeProcessingRef.current.add(cand.id);

    setSelectedCandidate(cand);

    // If candidate already has complete profile, mapping, and questions, no need to re-run
    if (cand.profile_json && cand.mapping_json && cand.interview_questions_json) {
      activeProcessingRef.current.delete(cand.id);
      return;
    }

    setIsProcessingCandidate(true);
    let updatedCand = cand;

    try {
      // Step 1: Auto-Extract Profile if needed
      if (!updatedCand.profile_json) {
        setAutoPipelineStatus("Parsing Candidate Profile...");
        updatedCand = await api.extractCandidateProfile(updatedCand.id);
        setSelectedCandidate(updatedCand);
      }

      // Step 2: Auto-Map Requirements if needed
      if (!updatedCand.mapping_json) {
        setAutoPipelineStatus("Evaluating Match Index...");
        updatedCand = await api.screenCandidate(updatedCand.id);
        setSelectedCandidate(updatedCand);
      }

      // Step 3: Auto-Generate Interview Questions if needed
      if (!updatedCand.interview_questions_json) {
        setAutoPipelineStatus("Generating Interview Questions...");
        updatedCand = await api.generateInterviewKit(updatedCand.id);
        setSelectedCandidate(updatedCand);
      }

      // Update state
      setCandidates((prev) => prev.map((c) => (c.id === updatedCand.id ? updatedCand : c)));
      showToast(`AI Pipeline complete for ${updatedCand.filename}!`);
    } catch (err) {
      console.error("Auto pipeline error:", err);
    } finally {
      activeProcessingRef.current.delete(cand.id);
      setIsProcessingCandidate(false);
      setAutoPipelineStatus(null);
    }
  };

  // Handle Select Job (Clean & Deduplicated)
  const handleSelectJob = (job) => {
    setSelectedJob(job);
  };

  // Create Job & Auto-Extract Requirements
  const handleCreateJob = async (title, description_text) => {
    try {
      const newJob = await api.createJob(title, description_text);
      setJobs((prev) => [newJob, ...prev]);
      setSelectedJob(newJob);
      setActiveTab('jobs');
      showToast(`Created Job Opening: "${title}". Extracting requirements...`);

      // Automatically trigger requirement extraction for the newly created job
      await handleExtractRequirements(newJob.id);
    } catch (err) {
      console.error('Failed to create job:', err);
      showToast("Failed to create job opening", "error");
    }
  };

  // Extract Requirements
  const handleExtractRequirements = async (jobId) => {
    setIsExtractingRequirements(true);
    try {
      const updatedJob = await api.extractJobRequirements(jobId);
      setSelectedJob(updatedJob);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updatedJob : j)));
      showToast("Requirements extracted successfully!");
    } catch (err) {
      console.error('Failed to extract job requirements:', err);
      showToast("Extraction error occurred", "error");
    } finally {
      setIsExtractingRequirements(false);
    }
  };

  // Upload Resume(s) (Single or Multi-Select)
  const handleUploadResumes = async (input) => {
    if (!selectedJob || !input) return;
    const fileList = input instanceof FileList || Array.isArray(input) ? Array.from(input) : [input];
    if (fileList.length === 0) return;

    showToast(`Uploading ${fileList.length} resume${fileList.length > 1 ? 's' : ''}...`);

    // Process each file sequentially — avoids parallel Gemini API calls hitting the rate limit
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const newCand = await api.uploadCandidateResume(selectedJob.id, file);
        setCandidates((prev) => {
          const exists = prev.some((c) => c.id === newCand.id);
          return exists ? prev : [...prev, newCand];
        });
        setActiveTab('candidates');
        await autoProcessCandidatePipeline(newCand);  // await — run one at a time
      } catch (err) {
        console.error('Failed to upload candidate resume:', err);
        showToast(`Upload failed for ${file.name}`, 'error');
      }
    }
  };

  // Inject Mock Candidate Preset
  const handleInjectMockCandidate = (mockPreset) => {
    if (!selectedJob) return;
    const newCand = {
      ...mockPreset,
      id: Date.now(),
      job_id: selectedJob.id,
      created_at: new Date().toISOString()
    };
    setCandidates((prev) => [newCand, ...prev]);
    setActiveTab('candidates');
    showToast(`Added candidate: ${newCand.filename}`);
    autoProcessCandidatePipeline(newCand);
  };

  // Compute stats
  const getScore = (c) => {
    if (c.screening_json?.overall_match_score) return c.screening_json.overall_match_score;
    if (c.mapping_json?.mappings) {
      const mappings = c.mapping_json.mappings;
      const met = mappings.filter(m => m.status === 'met').length;
      const partial = mappings.filter(m => m.status === 'partial').length;
      const total = mappings.length || 1;
      return Math.min(100, Math.max(15, Math.round(((met * 1.0 + partial * 0.5) / total) * 100)));
    }
    return 0;
  };

  const topMatches = candidates.filter(c => getScore(c) >= 80).length;
  const scores = candidates.map(c => getScore(c)).filter(s => s > 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <div className="min-h-screen bg-radial-ambient text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
          <div className={`px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 text-xs font-medium border ${
            toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800'
              : 'bg-[#151B2A] text-slate-100 border-blue-500/40'
          }`}>
            {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastMessage.text}
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={{
          activeJobs: jobs.length,
          candidatesScreened: candidates.length,
          topMatches: topMatches,
          avgScore
        }}
        autoPipelineStatus={autoPipelineStatus}
      />

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full px-6 mt-8 flex-1">
        {activeTab === 'jobs' && (
          <JobManager
            jobs={jobs}
            selectedJob={selectedJob}
            onSelectJob={handleSelectJob}
            onCreateJob={handleCreateJob}
            onExtractRequirements={handleExtractRequirements}
            isExtractingRequirements={isExtractingRequirements}
          />
        )}

        {activeTab === 'candidates' && (
          <CandidateHub
            jobs={jobs}
            selectedJob={selectedJob}
            onSelectJob={handleSelectJob}
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={async (c) => {
              const fullDetail = await api.getCandidateDetail(c.id);
              autoProcessCandidatePipeline(fullDetail);
            }}
            onUploadResumes={handleUploadResumes}
            onUploadResume={handleUploadResumes}
            isProcessingCandidate={isProcessingCandidate}
            onInjectMockCandidate={handleInjectMockCandidate}
          />
        )}
      </main>
    </div>
  );
}
