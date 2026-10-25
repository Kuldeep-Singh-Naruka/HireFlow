import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { api } from '../services/api';

export default function ResumeDropzone({ profile, onRunStarted }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [rejected, setRejected] = useState([]);

  const reqCount = profile.requirements_json?.requirements?.length ?? 0;
  const disabled = reqCount === 0 || busy;

  const submit = async (fileList) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0 || disabled) return;
    setBusy(true);
    setError(null);
    setRejected([]);
    try {
      const res = await api.startRun(profile.id, files);
      setRejected(res.rejected ?? []);
      onRunStarted(res.run_id);
    } catch (err) {
      setError(err.message);
      setRejected(err.rejected ?? []);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="glass-panel p-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          submit(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          disabled ? 'border-[#1E2638] opacity-60' : dragging ? 'border-blue-500 bg-blue-600/10' : 'border-[#2D374D]'
        }`}
      >
        <UploadCloud className="w-7 h-7 mx-auto text-blue-400 mb-2" />
        <p className="text-sm text-slate-200">
          {busy ? 'Uploading…' : 'Drop resumes here (PDF or DOCX), or'}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="btn-secondary mt-2 px-3 py-1.5 text-xs disabled:cursor-not-allowed"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          className="hidden"
          disabled={disabled}
          onChange={(e) => submit(e.target.files)}
        />
        {reqCount === 0 && (
          <p className="text-xs text-amber-300 mt-3">
            Add at least one requirement to this profile before screening resumes.
          </p>
        )}
      </div>
      {error && <p className="text-xs text-rose-400 mt-3">{error}</p>}
      {rejected.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-amber-300">
          {rejected.map((r, i) => (
            <li key={i}>
              <span className="font-mono">{r.filename}</span>: {r.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
