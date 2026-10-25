import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const EVENT_TYPES = [
  'run_started', 'candidate_step', 'step_retry', 'candidate_done', 'candidate_flagged',
  'review_started', 'review_done', 'review_failed', 'run_done', 'run_interrupted',
];
const REFETCH_ON = new Set(['candidate_step', 'candidate_done', 'review_done', 'review_failed', 'run_done']);
const CLOSE_ON = new Set(['run_done', 'run_interrupted']);
const TERMINAL = new Set(['done', 'interrupted', 'failed']);
const POLL_MS = 1500;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

// Union of two event lists, de-duplicated and sorted by id.
function mergeEvents(existing, incoming) {
  const seen = new Set(existing.map((e) => e.id));
  const added = incoming.filter((e) => !seen.has(e.id));
  if (!added.length) return existing;
  return [...existing, ...added].sort((a, b) => a.id - b.id);
}

const maxId = (events) => events.reduce((m, e) => Math.max(m, e.id), 0);

/**
 * Live state of a run: initial GET, then SSE with debounced refetch.
 * `watchNonce` > 0 means an action (retry/resume/re-review) was just started on a run whose
 * stream may already be closed: poll until a new terminal event arrives instead of using SSE.
 */
export function useRun(runId, watchNonce = 0) {
  const [state, setState] = useState({ runId: null, run: null, error: null });
  const lastIdRef = useRef(0);

  useEffect(() => {
    if (!runId) return undefined;
    let cancelled = false;
    let es = null;
    let timer = null;
    let pollTimer = null;
    const baseline = watchNonce > 0 ? lastIdRef.current : 0;

    const load = async () => {
      try {
        const fresh = await api.getRun(runId);
        if (cancelled) return null;
        setState((s) => {
          const prev = s.runId === runId && s.run ? s.run.events : [];
          const events = mergeEvents(fresh.events, prev);
          lastIdRef.current = maxId(events);
          return { runId, run: { ...fresh, events }, error: null };
        });
        return fresh;
      } catch (err) {
        if (!cancelled) setState((s) => ({ runId, run: s.runId === runId ? s.run : null, error: err }));
        return null;
      }
    };

    const scheduleRefetch = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 300);
    };

    if (watchNonce > 0) {
      const started = Date.now();
      const poll = async () => {
        const fresh = await load();
        if (cancelled) return;
        const finished = fresh?.events.some(
          (e) => e.id > baseline && CLOSE_ON.has(e.type)
        );
        if (!finished && Date.now() - started < POLL_TIMEOUT_MS) pollTimer = setTimeout(poll, POLL_MS);
      };
      poll();
    } else {
      load().then((fresh) => {
        if (cancelled || !fresh || TERMINAL.has(fresh.status)) return;
        es = new EventSource(`${api.eventsUrl(runId)}?after=${lastIdRef.current}`);
        EVENT_TYPES.forEach((type) => {
          es.addEventListener(type, (msg) => {
            let ev;
            try {
              ev = JSON.parse(msg.data);
            } catch {
              return;
            }
            setState((s) => {
              if (s.runId !== runId || !s.run) return s;
              const events = mergeEvents(s.run.events, [ev]);
              lastIdRef.current = maxId(events);
              return { ...s, run: { ...s.run, events } };
            });
            if (REFETCH_ON.has(type)) scheduleRefetch();
            if (CLOSE_ON.has(type)) es.close();
          });
        });
      });
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(pollTimer);
      if (es) es.close();
    };
  }, [runId, watchNonce]);

  if (!runId || state.runId !== runId) return { run: null, error: null };
  return { run: state.run, error: state.error };
}
