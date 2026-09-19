import React from 'react';
import { 
  Sparkles, 
  Users, 
  Briefcase, 
  Award,
  Shield
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  stats = { activeJobs: 1, candidatesScreened: 2, topMatches: 1, avgScore: 82 }
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#0B101D] border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white m-0 leading-none">
              HireFlow
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              AI Candidate Screening & Interview Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#131B2E] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'jobs' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Job Openings
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'candidates' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Resumes & Parsing
          </button>

          <button
            onClick={() => setActiveTab('screening')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'screening' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Match Scorecard
          </button>

          <button
            onClick={() => setActiveTab('interview')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'interview' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Interview Agent
          </button>
        </nav>
      </div>

      {/* Quick Metrics Bar */}
      <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-[#111726] rounded-md p-2 border border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium">Active Openings</span>
          <p className="text-base font-bold text-white mt-0.5 font-mono">{stats.activeJobs}</p>
        </div>
        <div className="bg-[#111726] rounded-md p-2 border border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium">Resumes Parsed</span>
          <p className="text-base font-bold text-white mt-0.5 font-mono">{stats.candidatesScreened}</p>
        </div>
        <div className="bg-[#111726] rounded-md p-2 border border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium">Shortlisted Candidates</span>
          <p className="text-base font-bold text-emerald-400 mt-0.5 font-mono">{stats.topMatches}</p>
        </div>
        <div className="bg-[#111726] rounded-md p-2 border border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium">Avg Fit Index</span>
          <p className="text-base font-bold text-blue-400 mt-0.5 font-mono">{stats.avgScore}%</p>
        </div>
      </div>
    </header>
  );
}
