import React, { useState } from 'react';
import { Share2, Copy, Check, ExternalLink, Sparkles, Trophy } from 'lucide-react';

export default function LinkedInShareModal({ isOpen, onClose, selectedJob, selectedCandidate }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const candidateName = selectedCandidate ? selectedCandidate.filename.replace(/\.pdf|\.docx/gi, '') : 'Top Candidate';
  const jobTitle = selectedJob ? selectedJob.title : 'Senior Software Engineer';
  const matchScore = selectedCandidate?.screening_json?.overall_match_score || 94;

  const postText = `🚀 Excited to showcase HireFlow — our AI Candidate Screening & Interview Intelligence Agent built for the Hackathon!

🤖 HireFlow automates end-to-end technical hiring:
1️⃣ Structured Job Requirement Extraction (FastAPI + Groq LLM)
2️⃣ Multi-format Resume Ingestion (PDF/DOCX) & Text Layer Parsing
3️⃣ AI Candidate Match Matrix & Skill Gap Scorecard (${matchScore}% match score evaluated for ${candidateName} applying for ${jobTitle})
4️⃣ Custom Technical & Behavioral Interview Intelligence Generator with Live Interactive Simulator!

💻 Stack: React + Vite + Tailwind CSS | FastAPI + SQLAlchemy + LangChain + ChatGroq (llama-3)

Check out our demo & live pipeline!

#HireFlow #AIAgent #FastAPI #ReactJS #Groq #LangChain #GenerativeAI #SoftwareEngineering #Hackathon`;

  const handleCopy = () => {
    navigator.clipboard.writeText(postText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(postText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel-glow rounded-2xl max-w-xl w-full p-6 space-y-5 border border-blue-500/40 animate-float">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white m-0">LinkedIn Hackathon Showcase Kit</h3>
              <span className="text-[11px] text-blue-300 font-medium">Maximize 25% LinkedIn Engagement Score</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            ✕
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-blue-200">
            Copy or share this ready-to-post project announcement to LinkedIn. It highlights your AI integration metrics and tech stack!
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Generated LinkedIn Post Content:
          </label>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">
            {postText}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-2 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Text'}
          </button>

          <button
            onClick={handleShareLinkedIn}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Open & Share on LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
}
