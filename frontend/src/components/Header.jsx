import React from 'react';
import { 
  Users, 
  Briefcase, 
  Sparkles,
  Award
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  stats = { activeJobs: 1, candidatesScreened: 2, topMatches: 1, avgScore: 84 }
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#090A0F]/95 backdrop-blur-md border-b border-[#1E2638] px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            HF
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white m-0 leading-none">
              HireFlow
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Candidate Screening & Interview Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#111520] p-1 rounded-lg border border-[#1E2638]">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'jobs' 
                ? 'bg-blue-600 text-white font-semibold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#151B2A]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Job Openings
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'candidates' 
                ? 'bg-blue-600 text-white font-semibold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#151B2A]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Candidate Resumes
          </button>

          <button
            onClick={() => setActiveTab('screening')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'screening' 
                ? 'bg-blue-600 text-white font-semibold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#151B2A]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Match Scorecard
          </button>

          <button
            onClick={() => setActiveTab('interview')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'interview' 
                ? 'bg-blue-600 text-white font-semibold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#151B2A]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Interview Agent
          </button>
        </nav>
      </div>

      {/* Metrics Bar */}
      <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-[#1E2638]/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-[#111520] rounded-lg p-2 border border-[#1E2638]">
          <span className="text-[11px] text-slate-400 font-medium">Active Openings</span>
          <p className="text-sm font-bold text-white mt-0.5 font-mono">{stats.activeJobs}</p>
        </div>
        <div className="bg-[#111520] rounded-lg p-2 border border-[#1E2638]">
          <span className="text-[11px] text-slate-400 font-medium">Resumes Ingested</span>
          <p className="text-sm font-bold text-white mt-0.5 font-mono">{stats.candidatesScreened}</p>
        </div>
        <div className="bg-[#111520] rounded-lg p-2 border border-[#1E2638]">
          <span className="text-[11px] text-slate-400 font-medium">Shortlisted Matches</span>
          <p className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">{stats.topMatches}</p>
        </div>
        <div className="bg-[#111520] rounded-lg p-2 border border-[#1E2638]">
          <span className="text-[11px] text-slate-400 font-medium">Avg Fit Index</span>
          <p className="text-sm font-bold text-blue-400 mt-0.5 font-mono">{stats.avgScore}%</p>
        </div>
      </div>
    </header>
  );
}
