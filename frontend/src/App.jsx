import { useCallback, useEffect, useRef, useState } from 'react';
import { Layers, Plus, X } from 'lucide-react';
import { api } from './services/api';
import Sidebar from './components/Sidebar';
import ProfileForm from './components/ProfileForm';
import ProfileHeader from './components/ProfileHeader';
import OfflineBanner from './components/OfflineBanner';
import ResumeDropzone from './components/ResumeDropzone';
import AgentPanel from './components/AgentPanel';
import ResultsTabs from './components/ResultsTabs';
import CandidateDrawer from './components/CandidateDrawer';
import { useRun } from './hooks/useRun';

function pickActiveRunId(profile) {
  const runs = profile?.runs ?? []; // newest first
  if (runs.length === 0) return null;
  const live = runs.find((r) => ['queued', 'running', 'reviewing'].includes(r.status));
  return (live ?? runs[0]).id;
}

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [offline, setOffline] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionPending, setActionPending] = useState(false);
  const actionPendingRef = useRef(false);
  const [watch, setWatch] = useState({ runId: null, nonce: 0 });
  const [openCandidateId, setOpenCandidateId] = useState(null);
  const prevOfflineRef = useRef(false);
  const lastRunKeyRef = useRef(null);

  const shownProfile = profile && profile.id === selectedProfileId ? profile : null;
  const activeRunId = pickActiveRunId(shownProfile);
  const { run } = useRun(activeRunId, watch.runId === activeRunId ? watch.nonce : 0);

  const handleError = useCallback((err) => {
    if (err?.offline) setOffline(true);
    else setLoadError(err?.message ?? 'Something went wrong');
  }, []);

  const refreshProfiles = useCallback(async () => {
    try {
      const list = await api.listProfiles();
      setProfiles(list);
      setOffline(false);
      setLoadError(null);
      return list;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoaded(true);
    }
  }, [handleError]);

  const refreshProfile = useCallback(
    async (id = selectedProfileId) => {
      if (!id) return;
      try {
        setProfile(await api.getProfile(id));
      } catch (err) {
        handleError(err);
      }
    },
    [selectedProfileId, handleError]
  );

  // Initial load; select the first profile.
  useEffect(() => {
    let cancelled = false;
    api
      .listProfiles()
      .then((list) => {
        if (cancelled) return;
        setProfiles(list);
        if (list.length > 0) setSelectedProfileId((cur) => cur ?? list[0].id);
      })
      .catch((err) => {
        if (!cancelled) handleError(err);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [handleError]);

  // Load the selected profile's detail.
  useEffect(() => {
    if (!selectedProfileId) return undefined;
    let cancelled = false;
    api
      .getProfile(selectedProfileId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (!cancelled) handleError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProfileId, handleError]);

  // Backend health polling: drives the status dot and offline banner.
  useEffect(() => {
    const tick = async () => {
      try {
        await api.health();
        setOffline(false);
      } catch {
        setOffline(true);
      }
    };
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  // Reload data when the backend comes back (offline true -> false).
  useEffect(() => {
    if (prevOfflineRef.current && !offline) {
      refreshProfiles();
      refreshProfile();
    }
    prevOfflineRef.current = offline;
  }, [offline, refreshProfiles, refreshProfile]);

  // Refresh the profile whenever the active run changes state (run done, retry, review finished).
  const runKey = run ? `${run.id}:${run.status}:${run.review_status}` : null;
  useEffect(() => {
    const prev = lastRunKeyRef.current;
    lastRunKeyRef.current = runKey;
    if (prev && runKey && prev !== runKey && prev.split(':')[0] === runKey.split(':')[0]) {
      refreshProfile();
    }
  }, [runKey, refreshProfile]);

  const startWatch = (runId) => setWatch((w) => ({ runId, nonce: w.nonce + 1 }));

  const handleRunStarted = async () => {
    await refreshProfile();
  };

  const act = async (runId, fn) => {
    if (actionPendingRef.current) return; // ignore double clicks while a POST is in flight
    actionPendingRef.current = true;
    setActionPending(true);
    setActionError(null);
    try {
      await fn();
      startWatch(runId);
    } catch (err) {
      if (err?.offline) setOffline(true);
      else setActionError(err?.message ?? 'Action failed');
    } finally {
      actionPendingRef.current = false;
      setActionPending(false);
    }
  };
  const handleRetryCandidate = (id) => act(activeRunId, () => api.retryCandidate(id));
  const handleResume = () => act(activeRunId, () => api.resumeRun(activeRunId));
  const handleRerunReview = (runId) => act(runId, () => api.rerunReview(runId));

  const handleCreated = async (id) => {
    await refreshProfiles();
    setSelectedProfileId(id);
    await refreshProfile(id);
    setCreating(false);
  };

  const showForm = creating;

  return (
    <div className="h-screen bg-radial-ambient text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <header className="h-12 shrink-0 border-b border-[#1E2638] px-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <Layers className="w-5 h-5 text-blue-500" /> HireFlow
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span
            className={`w-2 h-2 rounded-full ${offline ? 'bg-rose-500' : 'bg-emerald-500'}`}
            aria-hidden="true"
          />
          {offline ? 'Backend offline' : 'Backend online'}
        </div>
      </header>
      {offline && <OfflineBanner />}
      <div className="flex-1 flex min-h-0">
        <Sidebar
          profiles={profiles}
          selectedId={selectedProfileId}
          onSelect={(id) => {
            setCreating(false);
            setSelectedProfileId(id);
          }}
          onNew={() => setCreating(true)}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {showForm ? (
            <ProfileForm onDone={handleCreated} onCancel={() => setCreating(false)} />
          ) : shownProfile ? (
            <div className="max-w-5xl mx-auto space-y-4">
              {actionError && (
                <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
                  <span>{actionError}</span>
                  <button onClick={() => setActionError(null)} aria-label="Dismiss error" className="shrink-0 text-rose-300 hover:text-rose-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <ProfileHeader key={shownProfile.id} profile={shownProfile} onUpdated={() => { refreshProfile(); refreshProfiles(); }} />
              <ResumeDropzone profile={shownProfile} onRunStarted={handleRunStarted} />
              {run && (
                <AgentPanel
                  run={run}
                  actionPending={actionPending}
                  onRetryCandidate={handleRetryCandidate}
                  onResume={handleResume}
                />
              )}
              <ResultsTabs
                profile={shownProfile}
                run={run}
                onOpenCandidate={setOpenCandidateId}
                onRerunReview={handleRerunReview}
                actionPending={actionPending}
              />
            </div>
          ) : loaded && profiles.length === 0 && !offline ? (
            <div className="h-full flex items-center justify-center">
              <div className="glass-panel p-10 text-center max-w-md">
                <h2 className="text-lg font-semibold mb-2">Create your first hiring profile</h2>
                <p className="text-sm text-slate-400 mb-5">
                  Describe the role, review the requirements, then screen a batch of resumes against it.
                </p>
                <button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> New profile
                </button>
              </div>
            </div>
          ) : loadError ? (
            <p className="text-sm text-rose-400">{loadError}</p>
          ) : null}
        </main>
      </div>
      <CandidateDrawer candidateId={openCandidateId} onClose={() => setOpenCandidateId(null)} />
    </div>
  );
}
