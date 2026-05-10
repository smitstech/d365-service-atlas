import { renderSchemaForElement } from './schema-view.js';
import { buildJsonExample } from './json-example.js';
import { operationUrl } from './snippets.js';

function splitMiddle(text) {
  const marker = '/api/services/';
  const idx = text.indexOf(marker);
  if (idx === -1) return { start: text, end: '' };
  return {
    start: text.slice(0, idx + marker.length),
    end: text.slice(idx + marker.length),
  };
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.classList.add('copied');
  } catch {
    btn.classList.add('failed');
  }
  setTimeout(() => {
    btn.classList.remove('copied', 'failed');
  }, 1200);
}

function makeInlineCopyButton(label, getText) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'icon-copy-btn';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.addEventListener('click', () => copyText(getText(), btn));
  return btn;
}

function renderUrl(op, env, group) {
  const fullUrl = operationUrl(env, group, op);
  const parts = splitMiddle(fullUrl);
  const row = document.createElement('div');
  row.className = 'endpoint-row';

  const url = document.createElement('div');
  url.className = 'op-page-url';
  url.title = fullUrl;

  const start = document.createElement('span');
  start.className = 'url-start';
  start.textContent = parts.start;
  url.append(start);

  if (parts.end) {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'url-ellipsis';
    ellipsis.textContent = '...';
    const end = document.createElement('span');
    end.className = 'url-end';
    end.textContent = parts.end;
    url.append(ellipsis, end);
  }

  row.append(
    url,
    makeInlineCopyButton('Copy endpoint', () => fullUrl),
  );
  return row;
}

function renderHeader(op) {
  const header = document.createElement('div');
  header.className = 'op-page-header';

  const top = document.createElement('div');
  top.className = 'op-page-top';
  const method = document.createElement('span');
  method.className = 'method';
  method.textContent = 'POST';
  const path = document.createElement('span');
  path.className = 'op-page-path';
  path.textContent = `/${op.name}`;
  top.append(method, path);
  header.append(top);

  return header;
}

function renderSection(title, elementClark, parsed, onTypeClick) {
  const section = document.createElement('div');
  section.className = 'op-page-section';
  const t = document.createElement('div');
  t.className = 'section-title';
  t.textContent = title;
  section.append(t);
  section.append(renderSchemaForElement(elementClark, parsed, onTypeClick));
  return section;
}

function renderExampleSection(op, parsed) {
  const section = document.createElement('div');
  section.className = 'op-page-section';
  const example = JSON.stringify(buildJsonExample(op.inputElement, parsed) ?? {}, null, 2);
  const titleRow = document.createElement('div');
  titleRow.className = 'section-title-row';
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Example request JSON';
  titleRow.append(
    title,
    makeInlineCopyButton('Copy JSON', () => example),
  );
  const pre = document.createElement('pre');
  pre.className = 'example-code';
  pre.textContent = example;
  section.append(titleRow, pre);
  return section;
}

export function renderOperationPage(container, op, parsed, env, group, onTypeClick) {
  container.innerHTML = '';
  container.append(renderUrl(op, env, group));
  container.append(renderHeader(op));
  container.append(renderSection('Request body', op.inputElement, parsed, onTypeClick));
  container.append(renderSection('Response 200', op.outputElement, parsed, onTypeClick));
  container.append(renderExampleSection(op, parsed));
}
