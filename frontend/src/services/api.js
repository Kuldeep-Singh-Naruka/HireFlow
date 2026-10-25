const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function formatDetail(detail, fallback) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const loc = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : '';
        return loc ? `${loc}: ${d.msg}` : d.msg;
      })
      .join('; ');
  }
  if (detail && typeof detail === 'object' && detail.message) return detail.message;
  return fallback;
}

async function request(path, { method = 'GET', body, formData } = {}) {
  const init = { method };
  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    const err = new Error('Cannot reach the HireFlow backend');
    err.offline = true;
    throw err;
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = data?.detail;
    const err = new Error(formatDetail(detail, `Request failed (${res.status})`));
    err.status = res.status;
    if (detail && typeof detail === 'object' && !Array.isArray(detail) && detail.rejected) {
      err.rejected = detail.rejected;
    }
    throw err;
  }
  return data;
}

export const api = {
  listProfiles: () => request('/profiles'),
  createProfile: (body) => request('/profiles', { method: 'POST', body }),
  getProfile: (id) => request(`/profiles/${id}`),
  updateProfile: (id, body) => request(`/profiles/${id}`, { method: 'PUT', body }),
  updateRequirements: (id, requirements) =>
    request(`/profiles/${id}/requirements`, { method: 'PUT', body: { requirements } }),
  startRun: (profileId, files) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return request(`/profiles/${profileId}/runs`, { method: 'POST', formData });
  },
  getRun: (id) => request(`/runs/${id}`),
  resumeRun: (id) => request(`/runs/${id}/resume`, { method: 'POST' }),
  rerunReview: (id) => request(`/runs/${id}/review`, { method: 'POST' }),
  getCandidate: (id) => request(`/candidates/${id}`),
  retryCandidate: (id) => request(`/candidates/${id}/retry`, { method: 'POST' }),
  health: () => request('/health'),
  eventsUrl: (runId) => `${API_BASE_URL}/runs/${runId}/events`,
};
