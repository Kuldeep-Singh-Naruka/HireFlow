import React, { useState } from 'react';
import { Share2, Copy, Check, ExternalLink, Sparkles, Trophy, X, MessageSquare, Terminal } from 'lucide-react';

export default function LinkedInShareModal({ isOpen, onClose, selectedJob, selectedCandidate }) {
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState('showcase'); // showcase, technical, recruiter

  if (!isOpen) return null;

  const candidateName = selectedCandidate ? selectedCandidate.filename.replace(/\.pdf|\.docx/gi, '') : 'Alex Rivera';
  const jobTitle = selectedJob ? selectedJob.title : 'Senior AI Engineer';
  const matchScore = selectedCandidate?.screening_json?.overall_match_score || 94;

  const posts = {
    showcase: `🚀 Excited to present HireFlow — our AI Candidate Screening & Interview Intelligence Agent built for the Hackathon!

🤖 HireFlow automates the end-to-end technical hiring lifecycle:
1️⃣ Structured Job Requirement Extraction (FastAPI + Groq LLM)
2️⃣ Multi-format Resume Ingestion (PDF/DOCX) & Text Layer Parsing
3️⃣ AI Candidate Match Matrix & Skill Gap Scorecard (${matchScore}% match score evaluated for ${candidateName} applying for ${jobTitle})
4️⃣ Custom Technical & Behavioral Interview Intelligence Generator with Live Interactive Simulator!

💻 Built with: React 19 + Vite + Tailwind CSS | FastAPI + SQLAlchemy + LangChain + ChatGroq (Llama 3 70B)

Check out our live pipeline & hackathon demo!

#HireFlow #AIAgent #FastAPI #ReactJS #Groq #LangChain #GenerativeAI #SoftwareEngineering #Hackathon`,

    technical: `⚡ Deep Dive into HireFlow's AI Agent Architecture!

Building a real-time candidate screening agent requires sub-second LLM inference and structured output enforcement:

🔬 Tech Highlights:
• Fast Job Requirement Parsing: Deconstructs raw job descriptions into categorical JSON (skills, experience, qualifications).
• Automated Resume Ingestion: PyMuPDF extraction supporting scanned & multi-page PDF/DOCX files.
• Skill Alignment Matrix: Calculates matched, missing, and bonus skill vectors for candidate evaluation.
• Tailored Interview Intelligence: Generates technical deep-dives, STAR behavioral questions & live session evaluator scorecards.

Stack: React • Vite • Tailwind • FastAPI • SQLAlchemy • Groq Llama 3 70B

#AIArchitecture #GenerativeAI #Groq #LangChain #FastAPI #ReactJS #CodeQuality #DeveloperCommunity`,

    recruiter: `🎯 Eliminating Recruiter Burnout with AI: Introducing HireFlow!

Did you know technical recruiters spend 20+ hours per job opening reading resumes? Keyword-based ATS filters miss top talent and introduce unconscious bias.

HireFlow transforms hiring into a transparent 4-stage AI workflow:
✨ Automated requirement extraction
✨ Multi-dimensional candidate match scoring (${matchScore}% match fit accuracy)
✨ Tailored interview questions targeting candidate skill gaps
✨ Real-time interview session simulator for evaluators

Try out HireFlow and see how AI can empower human recruiters!

#FutureOfWork #RecruitingAI #HiringTech #HRTech #AIInHR #TalentAcquisition #GenerativeAI`
  };

  const currentPostText = posts[activePreset];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentPostText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(currentPostText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0D1322] rounded-2xl max-w-xl w-full p-6 space-y-5 border border-blue-500/40 shadow-2xl shadow-blue-900/20 animate-float max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white m-0">LinkedIn Hackathon Showcase Kit</h3>
              <span className="text-[11px] text-blue-300 font-medium">Maximize 25% LinkedIn Engagement Score</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-blue-200 leading-relaxed">
            Publishing project content on LinkedIn is worth <strong>25% of your hackathon score</strong>! Select a template, copy or share directly to your feed.
          </p>
        </div>

        {/* Template Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-[#131B2E] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActivePreset('showcase')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activePreset === 'showcase'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Hackathon Showcase
          </button>

          <button
            onClick={() => setActivePreset('technical')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activePreset === 'technical'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Technical Deep-Dive
          </button>

          <button
            onClick={() => setActivePreset('recruiter')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activePreset === 'recruiter'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Recruiter Vision
          </button>
        </div>

        {/* Post Text Preview Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Post Preview:
          </label>
          <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">
            {currentPostText}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-2 transition-all border border-slate-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Text'}
          </button>

          <button
            onClick={handleShareLinkedIn}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
          >
            <ExternalLink className="w-4 h-4" />
            Open & Share on LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
}
