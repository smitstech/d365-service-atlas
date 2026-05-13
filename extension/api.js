const HOST_RE = /^[^.]+\.(operations|axcloud)\.dynamics\.com$/;

export function envFromUrl(url) {
  try {
    const { hostname } = new URL(url);
    return HOST_RE.test(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

export function envShortName(env) {
  return env ? env.split('.')[0] : '';
}

export async function detectEnv() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ? envFromUrl(tab.url) : null;
}

export function servicesUrl(env) {
  return `https://${env}/api/services`;
}

export function wsdlUrl(env, groupName) {
  return `https://${env}/soap/services/${encodeURIComponent(groupName)}?singleWsdl`;
}

export class HttpError extends Error {
  constructor(status, statusText, body, contentType) {
    super(`HTTP ${status} ${statusText || ''}`.trim());
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.contentType = contentType;
  }
}

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in to this environment.');
  }
}

async function authedFetch(url, accept) {
  const res = await fetch(url, {
    headers: { Accept: accept },
    credentials: 'include',
    redirect: 'manual',
  });
  if (res.type === 'opaqueredirect' || res.status === 0) throw new NotSignedInError();
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new HttpError(res.status, res.statusText, body, res.headers.get('content-type') || '');
  }
  return res;
}

export async function fetchServiceGroups(env) {
  const res = await authedFetch(servicesUrl(env), 'application/json');
  const data = await res.json();
  return data?.ServiceGroups ?? [];
}

export async function fetchWsdlText(env, groupName) {
  const res = await authedFetch(wsdlUrl(env, groupName), 'application/xml,text/xml,*/*');
  return res.text();
}
