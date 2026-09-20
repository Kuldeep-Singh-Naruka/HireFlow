import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import JobManager from './components/JobManager';
import CandidateHub from './components/CandidateHub';
import ScreeningMatrix from './components/ScreeningMatrix';
import InterviewIntelligence from './components/InterviewIntelligence';
import { api } from './services/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('jobs');

  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [isExtractingRequirements, setIsExtractingRequirements] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingProfile, setIsExtractingProfile] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [isGeneratingKit, setIsGeneratingKit] = useState(false);

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

  // Sync candidates when selectedJob changes
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
          setSelectedCandidate(candDetail);
        }
      }
    };
    fetchJobDetail();
  }, [selectedJob?.id]);

  // Handle Select Job
  const handleSelectJob = async (job) => {
    setSelectedJob(job);
    const detail = await api.getJobDetail(job.id);
    if (detail && detail.candidates && detail.candidates.length > 0) {
      const candDetail = await api.getCandidateDetail(detail.candidates[0].id);
      setSelectedCandidate(candDetail);
    } else {
      setSelectedCandidate(null);
    }
  };

  // Create Job
  const handleCreateJob = async (title, description_text) => {
    const newJob = await api.createJob(title, description_text);
    setJobs((prev) => [newJob, ...prev]);
    setSelectedJob(newJob);
    setActiveTab('jobs');
    showToast(`Created Job Opening: "${title}"`);
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

  // Upload Resume
  const handleUploadResume = async (file) => {
    if (!selectedJob) return;
    setIsUploading(true);
    try {
      const newCand = await api.uploadCandidateResume(selectedJob.id, file);
      setCandidates((prev) => [...prev, newCand]);
      setSelectedCandidate(newCand);
      setActiveTab('candidates');
      showToast(`Uploaded resume: ${file.name}`);
    } catch (err) {
      console.error('Failed to upload candidate resume:', err);
      showToast("Upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Extract Profile
  const handleExtractProfile = async (candidateId) => {
    setIsExtractingProfile(true);
    try {
      const updatedCand = await api.extractCandidateProfile(candidateId);
      setSelectedCandidate(updatedCand);
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? updatedCand : c)));
      showToast("Candidate profile structured!");
    } catch (err) {
      console.error('Failed to extract candidate profile:', err);
      showToast("Profile extraction failed", "error");
    } finally {
      setIsExtractingProfile(false);
    }
  };

  // Screen Candidate
  const handleScreenCandidate = async (candidateId) => {
    setIsScreening(true);
    try {
      const updatedCand = await api.screenCandidate(candidateId);
      setSelectedCandidate(updatedCand);
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? updatedCand : c)));
      showToast(`Match score evaluated: ${updatedCand?.screening_json?.overall_match_score}%`);
      return updatedCand;
    } catch (err) {
      console.error('Failed to screen candidate:', err);
      showToast("Screening evaluation failed", "error");
    } finally {
      setIsScreening(false);
    }
  };

  // Generate Interview Kit
  const handleGenerateInterviewKit = async (candidateId) => {
    setIsGeneratingKit(true);
    try {
      const updatedCand = await api.generateInterviewKit(candidateId);
      setSelectedCandidate(updatedCand);
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? updatedCand : c)));
      showToast("Interview Question Kit generated!");
    } catch (err) {
      console.error('Failed to generate interview kit:', err);
      showToast("Interview kit generation failed", "error");
    } finally {
      setIsGeneratingKit(false);
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
    setSelectedCandidate(newCand);
    showToast(`Added candidate: ${newCand.filename}`);
  };

  // Compute stats
  const topMatches = candidates.filter(c => (c.screening_json?.overall_match_score || 0) >= 80).length;
  const scores = candidates.map(c => c.screening_json?.overall_match_score).filter(Boolean);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 84;

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

      {/* Clean Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={{
          activeJobs: jobs.length,
          candidatesScreened: candidates.length || 2,
          topMatches: topMatches || 1,
          avgScore
        }}
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
            selectedJob={selectedJob}
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={async (c) => {
              const fullDetail = await api.getCandidateDetail(c.id);
              setSelectedCandidate(fullDetail);
            }}
            onUploadResume={handleUploadResume}
            onExtractProfile={handleExtractProfile}
            isUploading={isUploading}
            isExtractingProfile={isExtractingProfile}
            onInjectMockCandidate={handleInjectMockCandidate}
          />
        )}

        {activeTab === 'screening' && (
          <ScreeningMatrix
            selectedCandidate={selectedCandidate}
            selectedJob={selectedJob}
            candidates={candidates}
            onSelectCandidate={async (c) => {
              const fullDetail = await api.getCandidateDetail(c.id);
              setSelectedCandidate(fullDetail);
            }}
            onScreenCandidate={handleScreenCandidate}
            isScreening={isScreening}
          />
        )}

        {activeTab === 'interview' && (
          <InterviewIntelligence
            selectedCandidate={selectedCandidate}
            selectedJob={selectedJob}
            candidates={candidates}
            onSelectCandidate={async (c) => {
              const fullDetail = await api.getCandidateDetail(c.id);
              setSelectedCandidate(fullDetail);
            }}
            onGenerateInterviewKit={handleGenerateInterviewKit}
            isGeneratingKit={isGeneratingKit}
          />
        )}
      </main>
    </div>
  );
}
