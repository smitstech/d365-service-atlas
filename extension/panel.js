import {
  detectEnv,
  envShortName,
  fetchServiceGroups,
  fetchWsdlText,
  NotSignedInError,
  HttpError,
} from './api.js';
import { parseWsdl, localName, isArrayWrapper } from './wsdl-parser.js';
import { renderSwagger } from './swagger-view.js';
import { renderOperationPage } from './operation-view.js';
import { renderTypePage } from './type-view.js';
import { renderErrorCard } from './error-view.js';
import { buildOpenApi } from './openapi.js';
import { curlSnippet, fetchSnippet } from './snippets.js';

const searchEl = document.getElementById('search');
const searchHintEl = document.getElementById('search-hint');
const breadcrumbEl = document.getElementById('breadcrumb');
const statusEl = document.getElementById('status');
const actionsEl = document.getElementById('actions');
const contentEl = document.getElementById('content');
const titleMarkEl = document.querySelector('.title-mark');

let allGroups = [];
let currentEnv = null;
let searchIndex = null;
let indexingPromise = null;
let renderSeq = 0;
let searchTimer = null;
const parsedCache = new Map();

function setStatus(text, kind) {
  if (!text) {
    statusEl.textContent = '';
    statusEl.className = 'status hidden';
    return;
  }
  statusEl.textContent = text;
  statusEl.className = `status ${kind ?? ''}`.trim();
}

function setActions(...nodes) {
  actionsEl.innerHTML = '';
  for (const n of nodes) if (n) actionsEl.append(n);
}

function setSearchHint(text) {
  if (!text) {
    searchHintEl.textContent = '';
    searchHintEl.classList.add('hidden');
    return;
  }
  searchHintEl.textContent = text;
  searchHintEl.classList.remove('hidden');
}

function setEnvironment(env) {
  titleMarkEl.title = env ? `Environment: ${env}` : '';
}

function updateSearchPlaceholder() {
  if (!allGroups.length) {
    searchEl.placeholder = currentEnv
      ? `Search services in ${envShortName(currentEnv)}...`
      : 'Search groups, operations, types...';
    return;
  }
  searchEl.placeholder = `Search ${allGroups.length} groups, operations, types...`;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function makeExportButton(parsed, group) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'export-btn';
  btn.textContent = '↓ OpenAPI';
  btn.title = 'Download as OpenAPI 3.0 JSON';
  btn.addEventListener('click', () => {
    downloadJson(`${group}.openapi.json`, buildOpenApi(parsed, group, currentEnv));
  });
  return btn;
}

async function copyToClipboard(text, btn, original) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Copied';
  } catch {
    btn.textContent = 'Failed';
  }
  setTimeout(() => {
    btn.textContent = original;
  }, 1200);
}

function makeCopyButton(label, getText) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy-btn';
  btn.textContent = label;
  btn.title = `Copy ${label}`;
  btn.addEventListener('click', () => copyToClipboard(getText(), btn, label));
  return btn;
}

function setBreadcrumb(segments) {
  breadcrumbEl.innerHTML = '';
  if (!segments || !segments.length) {
    breadcrumbEl.classList.add('hidden');
    return;
  }
  breadcrumbEl.classList.remove('hidden');
  segments.forEach((seg, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = '›';
      breadcrumbEl.append(sep);
    }
    if (seg.onClick) {
      const a = document.createElement('a');
      a.className = 'crumb-link';
      a.href = '#';
      a.textContent = seg.label;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        seg.onClick();
      });
      breadcrumbEl.append(a);
    } else {
      const span = document.createElement('span');
      span.className = 'crumb-name';
      span.textContent = seg.label;
      breadcrumbEl.append(span);
    }
  });
}

function reportError(err, fallback) {
  if (err instanceof NotSignedInError) {
    setStatus(err.message, 'err');
    contentEl.innerHTML = '';
    return;
  }
  if (err instanceof HttpError) {
    setStatus('');
    contentEl.innerHTML = '';
    contentEl.append(renderErrorCard(err));
    return;
  }
  setStatus(`${fallback}: ${err.message}`, 'err');
  contentEl.innerHTML = '';
}

async function getParsedGroup(groupName) {
  let parsed = parsedCache.get(groupName);
  if (!parsed) {
    const xml = await fetchWsdlText(currentEnv, groupName);
    parsed = parseWsdl(xml);
    parsedCache.set(groupName, parsed);
  }
  return parsed;
}

const INDEX_CONCURRENCY = 6;

// Single source of truth for which parsed-type kinds are searchable and how they
// surface: `kind` matches typeDef.kind, `label` is the per-row badge, `section`
// is the results heading. Add an entry here to make a new kind searchable.
const SEARCHABLE_TYPE_KINDS = [
  { kind: 'enum', label: 'Enum', section: 'Enums' },
  { kind: 'complex', label: 'Type', section: 'Types' },
];
const TYPE_KIND_LABEL = new Map(SEARCHABLE_TYPE_KINDS.map((k) => [k.kind, k.label]));

async function buildSearchIndex() {
  const operations = [];
  const types = [];
  const total = allGroups.length;
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < total) {
      const i = cursor++;
      const g = allGroups[i];
      try {
        const parsed = await getParsedGroup(g.Name);
        for (const op of parsed.operations) {
          operations.push({
            groupName: g.Name,
            serviceName: op.serviceName,
            opName: op.name,
            op,
          });
        }
        for (const [typeClark, typeDef] of Object.entries(parsed.types)) {
          if (!TYPE_KIND_LABEL.has(typeDef.kind)) continue;
          // Skip generated array-wrapper complex types (e.g. ArrayOfFoo); they
          // are plumbing, not types a user navigates to.
          if (isArrayWrapper(typeDef)) continue;
          types.push({
            groupName: g.Name,
            typeClark,
            typeName: localName(typeClark),
            kind: typeDef.kind,
          });
        }
      } catch {
        // Keep search useful even if one service group fails to parse or load.
      }
      done += 1;
      if (!searchEl.classList.contains('hidden') && searchEl.value.trim().length >= 2) {
        setStatus(`Indexing ${done}/${total}…`);
      }
    }
  }

  const workers = Math.min(INDEX_CONCURRENCY, Math.max(1, total));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  operations.sort(
    (a, b) =>
      a.groupName.localeCompare(b.groupName) ||
      a.serviceName.localeCompare(b.serviceName) ||
      a.opName.localeCompare(b.opName),
  );
  // A shared type (same namespace-qualified Clark name) is re-declared in every
  // group's WSDL. Collapse those to one entry, keeping the alphabetically-first
  // group as the representative, so search shows each type once instead of N times.
  const dedupedTypes = new Map();
  for (const t of types) {
    const existing = dedupedTypes.get(t.typeClark);
    if (!existing || t.groupName.localeCompare(existing.groupName) < 0) {
      dedupedTypes.set(t.typeClark, t);
    }
  }
  const uniqueTypes = Array.from(dedupedTypes.values());
  uniqueTypes.sort(
    (a, b) => a.typeName.localeCompare(b.typeName) || a.groupName.localeCompare(b.groupName),
  );
  searchIndex = { operations, types: uniqueTypes };
  return searchIndex;
}

async function ensureSearchIndex() {
  if (searchIndex) return searchIndex;
  if (!indexingPromise) {
    indexingPromise = buildSearchIndex()
      .catch((err) => {
        console.warn('[d365-services] indexing failed', err);
        return { operations: [], types: [] };
      })
      .finally(() => {
        indexingPromise = null;
      });
  }
  return indexingPromise;
}

function appendSection(root, title, rows) {
  if (!rows.length) return;
  const section = document.createElement('section');
  section.className = 'list-section';
  const heading = document.createElement('div');
  heading.className = 'list-section-title';
  heading.textContent = title;
  const list = document.createElement('div');
  list.className = 'groups';
  for (const row of rows) list.append(row);
  section.append(heading, list);
  root.append(section);
}

function appendRows(root, rows) {
  if (!rows.length) return;
  const list = document.createElement('div');
  list.className = 'groups';
  for (const row of rows) list.append(row);
  root.append(list);
}

function makeGroupRow(groupName) {
  const row = document.createElement('div');
  row.className = 'group-row plain-row';
  const main = document.createElement('div');
  main.className = 'group-main';
  const name = document.createElement('div');
  name.className = 'group-name';
  name.textContent = groupName;
  main.append(name);
  const chev = document.createElement('span');
  chev.className = 'chev';
  chev.textContent = '›';
  row.append(main, chev);
  row.addEventListener('click', () => showDetailView(groupName));
  return row;
}

// Shared builder for the search-result rows (operations and types). Each row is
// a name + meta line, a kind badge, and a chevron, wired to an onClick handler.
function makeResultRow({ name, meta, label, onClick }) {
  const row = document.createElement('div');
  row.className = 'group-row';
  const main = document.createElement('div');
  main.className = 'group-main';
  const nameEl = document.createElement('div');
  nameEl.className = 'group-name';
  nameEl.textContent = name;
  const metaEl = document.createElement('div');
  metaEl.className = 'result-meta';
  metaEl.textContent = meta;
  main.append(nameEl, metaEl);
  const labelEl = document.createElement('span');
  labelEl.className = 'group-kind';
  labelEl.textContent = label;
  const chev = document.createElement('span');
  chev.className = 'chev';
  chev.textContent = '›';
  row.append(main, labelEl, chev);
  row.addEventListener('click', onClick);
  return row;
}

function makeOperationRow(item, kind = 'Op') {
  return makeResultRow({
    name: `/${item.opName}`,
    meta: `${item.groupName} · ${item.serviceName}`,
    label: kind,
    onClick: () => showOperationByName(item.groupName, item.serviceName, item.opName),
  });
}

function makeTypeRow(item) {
  return makeResultRow({
    name: item.typeName,
    meta: item.groupName,
    label: TYPE_KIND_LABEL.get(item.kind),
    onClick: () => showTypeByName(item.groupName, item.typeClark),
  });
}

async function renderList() {
  const seq = ++renderSeq;
  const q = searchEl.value.trim().toLowerCase();
  const groupMatches = q ? allGroups.filter((g) => g.Name.toLowerCase().includes(q)) : allGroups;
  contentEl.innerHTML = '';
  setSearchHint('');

  let operationMatches = [];
  let typeMatches = [];
  if (q.length >= 2) {
    const index = await ensureSearchIndex();
    if (seq !== renderSeq) return;
    operationMatches = index.operations.filter((item) =>
      [item.groupName, item.serviceName, item.opName].some((value) =>
        value.toLowerCase().includes(q),
      ),
    );
    typeMatches = index.types.filter((item) =>
      [item.typeName, item.groupName].some((value) => value.toLowerCase().includes(q)),
    );
  }

  const totalMatches = groupMatches.length + operationMatches.length + typeMatches.length;

  if (!totalMatches) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = q
      ? `Nothing matches "${searchEl.value.trim()}".`
      : 'No service groups found.';
    contentEl.append(empty);
    setStatus(q ? 'No matches' : '');
    return;
  }

  if (q) {
    appendSection(
      contentEl,
      `Service groups (${groupMatches.length})`,
      groupMatches.map((g) => makeGroupRow(g.Name)),
    );
    appendSection(
      contentEl,
      `Operations (${operationMatches.length})`,
      operationMatches.map((item) => makeOperationRow(item)),
    );
    for (const { kind, section } of SEARCHABLE_TYPE_KINDS) {
      const kindMatches = typeMatches.filter((item) => item.kind === kind);
      appendSection(
        contentEl,
        `${section} (${kindMatches.length})`,
        kindMatches.map((item) => makeTypeRow(item)),
      );
    }
    if (q.length < 2) {
      setSearchHint('Type one more character to also search operations, enums, and types');
      setStatus(`${groupMatches.length} group matches`);
    } else {
      setStatus(
        `${operationMatches.length} operations · ${typeMatches.length} types · ${groupMatches.length} groups`,
      );
    }
    return;
  }

  appendRows(
    contentEl,
    groupMatches.map((g) => makeGroupRow(g.Name)),
  );
  setStatus('');
}

function showListView() {
  searchEl.classList.remove('hidden');
  setBreadcrumb(null);
  setActions();
  void renderList();
}

async function showDetailView(groupName, scrollToService) {
  const mySeq = ++renderSeq;
  searchEl.classList.add('hidden');
  setBreadcrumb([{ label: 'Services', onClick: showListView }, { label: groupName }]);
  contentEl.innerHTML = '';
  setStatus('Loading service info…');
  try {
    const parsed = await getParsedGroup(groupName);
    if (mySeq !== renderSeq) return;
    renderSwagger(contentEl, parsed, groupName, (op) => showOperationView(groupName, op, parsed));
    setActions(parsed.operations.length ? makeExportButton(parsed, groupName) : null);
    setStatus('');
    if (scrollToService) {
      const target = contentEl.querySelector(`[data-service="${CSS.escape(scrollToService)}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    if (mySeq !== renderSeq) return;
    reportError(err, 'Failed to load service info');
  }
}

async function showOperationByName(groupName, serviceName, opName) {
  const mySeq = ++renderSeq;
  searchEl.classList.add('hidden');
  setBreadcrumb([
    { label: 'Services', onClick: showListView },
    { label: groupName, onClick: () => showDetailView(groupName) },
    { label: serviceName },
  ]);
  contentEl.innerHTML = '';
  setActions();
  setStatus('Loading operation…');
  try {
    const parsed = await getParsedGroup(groupName);
    if (mySeq !== renderSeq) return;
    const op = parsed.operations.find(
      (candidate) => candidate.serviceName === serviceName && candidate.name === opName,
    );
    if (!op) throw new Error(`Operation ${serviceName}.${opName} was not found.`);
    showOperationView(groupName, op, parsed);
  } catch (err) {
    if (mySeq !== renderSeq) return;
    reportError(err, 'Failed to load operation');
  }
}

async function showTypeByName(groupName, typeClark) {
  const mySeq = ++renderSeq;
  searchEl.classList.add('hidden');
  setBreadcrumb([
    { label: 'Services', onClick: showListView },
    { label: groupName, onClick: () => showDetailView(groupName) },
    { label: localName(typeClark) },
  ]);
  contentEl.innerHTML = '';
  setActions();
  setStatus('Loading type…');
  try {
    const parsed = await getParsedGroup(groupName);
    if (mySeq !== renderSeq) return;
    if (!parsed.types[typeClark]) throw new Error(`Type ${localName(typeClark)} was not found.`);
    showTypeView(groupName, parsed, typeClark, null);
  } catch (err) {
    if (mySeq !== renderSeq) return;
    reportError(err, 'Failed to load type');
  }
}

function showOperationView(groupName, op, parsed) {
  renderSeq += 1;
  searchEl.classList.add('hidden');
  setBreadcrumb([
    { label: 'Services', onClick: showListView },
    { label: groupName, onClick: () => showDetailView(groupName) },
    { label: op.serviceName, onClick: () => showDetailView(groupName, op.serviceName) },
    { label: op.name },
  ]);
  setActions(
    makeCopyButton('curl', () => curlSnippet(op, parsed, currentEnv, groupName)),
    makeCopyButton('fetch', () => fetchSnippet(op, parsed, currentEnv, groupName)),
  );
  contentEl.innerHTML = '';
  renderOperationPage(contentEl, op, parsed, currentEnv, groupName, (typeClark) =>
    showTypeView(groupName, parsed, typeClark, op),
  );
  setStatus('');
}

function showTypeView(groupName, parsed, typeClark, fromOp) {
  renderSeq += 1;
  searchEl.classList.add('hidden');
  const segments = [
    { label: 'Services', onClick: showListView },
    { label: groupName, onClick: () => showDetailView(groupName) },
  ];
  if (fromOp) {
    segments.push({
      label: fromOp.serviceName,
      onClick: () => showDetailView(groupName, fromOp.serviceName),
    });
    segments.push({
      label: fromOp.name,
      onClick: () => showOperationView(groupName, fromOp, parsed),
    });
  }
  segments.push({ label: localName(typeClark) });
  setBreadcrumb(segments);
  setActions();
  contentEl.innerHTML = '';
  renderTypePage(
    contentEl,
    typeClark,
    parsed,
    groupName,
    (nextType) => showTypeView(groupName, parsed, nextType, fromOp),
    (op) => showOperationView(groupName, op, parsed),
  );
  setStatus('');
}

searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void renderList();
  }, 150);
});

(async () => {
  currentEnv = await detectEnv();
  setEnvironment(currentEnv);
  updateSearchPlaceholder();
  if (!currentEnv) {
    setStatus('Open a D365 F&O tab and reopen the panel.', 'err');
    return;
  }
  try {
    allGroups = (await fetchServiceGroups(currentEnv)).sort((a, b) =>
      a.Name.localeCompare(b.Name, undefined, { sensitivity: 'base' }),
    );
    updateSearchPlaceholder();
    showListView();
  } catch (err) {
    reportError(err, 'Failed to load services');
  }
})();
