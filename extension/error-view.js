function looksLikeJson(ct, body) {
  if (ct?.includes('json')) return true;
  const t = body?.trim();
  return t && (t.startsWith('{') || t.startsWith('['));
}

function looksLikeXml(ct, body) {
  if (ct?.includes('xml')) return true;
  const t = body?.trim();
  return t?.startsWith('<') && !t.toLowerCase().startsWith('<!doctype html');
}

function looksLikeHtml(ct, body) {
  if (ct?.includes('html')) return true;
  return body?.trim().toLowerCase().startsWith('<!doctype html');
}

function extractFault(xmlText) {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length) return null;
    const grab = (tag) => doc.getElementsByTagName(tag)[0]?.textContent?.trim();
    const exMsg = grab('ExceptionMessage') || grab('faultstring') || grab('Message');
    const exType = grab('ExceptionType');
    if (!exMsg && !exType) return null;
    return [exType, exMsg].filter(Boolean).join(': ');
  } catch {
    return null;
  }
}

function formatBody(body, contentType) {
  if (!body) return { text: '(empty body)', summary: null };
  const ct = contentType?.toLowerCase() || '';

  if (looksLikeJson(ct, body)) {
    try {
      const obj = JSON.parse(body);
      const summary = obj?.ExceptionMessage || obj?.Message || obj?.error?.message || null;
      return { text: JSON.stringify(obj, null, 2), summary };
    } catch {
      return { text: body, summary: null };
    }
  }
  if (looksLikeXml(ct, body)) {
    return { text: body, summary: extractFault(body) };
  }
  if (looksLikeHtml(ct, body)) {
    const stripped = body
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { text: body, summary: stripped.slice(0, 200) };
  }
  return { text: body, summary: null };
}

function emptyBodyHint() {
  return 'No further details from the server.';
}

export function renderErrorCard(err) {
  const card = document.createElement('div');
  card.className = 'error-card';

  const title = document.createElement('div');
  title.className = 'err-title';
  title.textContent = err.message || 'Request failed';
  card.append(title);

  const body = err.body ?? '';
  const ct = err.contentType ?? '';

  if (!body || !body.trim()) {
    const hint = document.createElement('div');
    hint.className = 'err-hint';
    hint.textContent = emptyBodyHint();
    card.append(hint);
    return card;
  }

  const { text, summary } = formatBody(body, ct);
  if (ct || summary) {
    const meta = document.createElement('div');
    meta.className = 'err-meta';
    const parts = [];
    if (ct) parts.push(ct);
    if (summary) parts.push(summary);
    meta.textContent = parts.join(' — ');
    card.append(meta);
  }

  const pre = document.createElement('pre');
  pre.textContent = text;
  card.append(pre);
  return card;
}
