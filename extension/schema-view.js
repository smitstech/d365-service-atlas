import { localName, flattenFields, isArrayWrapper } from './wsdl-parser.js';

const MAX_DEPTH = 6;

function renderEnumLine(enumDef) {
  const el = document.createElement('div');
  el.className = 'penum';
  el.textContent = `[${enumDef.values
    .map((v) => (v.value != null ? `${v.name} (${v.value})` : v.name))
    .join(' | ')}]`;
  return el;
}

function renderTruncated(text) {
  const t = document.createElement('div');
  t.className = 'truncated';
  t.textContent = text;
  return t;
}

function appendBrace(parent, text) {
  const b = document.createElement('span');
  b.className = 'brace';
  b.textContent = text;
  parent.append(b);
  return b;
}

function appendBraceLine(parent, text) {
  const b = document.createElement('div');
  b.className = 'brace';
  b.textContent = text;
  parent.append(b);
  return b;
}

function makeTypeElement(label, typeClark, clickable, onTypeClick) {
  if (clickable && onTypeClick && typeClark) {
    const a = document.createElement('a');
    a.className = 'ptype ptype-link';
    a.href = '#';
    a.textContent = label;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      onTypeClick(typeClark);
    });
    return a;
  }
  const span = document.createElement('span');
  span.className = 'ptype';
  span.textContent = label;
  return span;
}

function renderProp(field, types, depth, visited, onTypeClick) {
  const wrap = document.createElement('div');
  wrap.className = 'prop';
  const row = document.createElement('div');
  row.className = 'row';

  const name = document.createElement('span');
  name.className = 'pname';
  name.textContent = field.name;
  row.append(name);

  const sep = document.createElement('span');
  sep.textContent = ':';
  row.append(sep);

  const typeDef = field.type ? types[field.type] : null;
  let typeLabel = localName(field.type);
  let displayType = typeDef;
  let arrayItemClark = null;
  let isArray = false;
  if (typeDef && isArrayWrapper(typeDef)) {
    arrayItemClark = typeDef.fields[0].type;
    typeLabel = localName(arrayItemClark);
    displayType = arrayItemClark ? types[arrayItemClark] : null;
    isArray = true;
  } else if (field.repeated) {
    isArray = true;
  }

  const targetClark = arrayItemClark || field.type;
  const isComplex = displayType?.kind === 'complex';
  row.append(
    makeTypeElement(isArray ? `${typeLabel}[]` : typeLabel, targetClark, isComplex, onTypeClick),
  );

  if (field.required) {
    const req = document.createElement('span');
    req.className = 'pmark';
    req.textContent = '*';
    req.title = 'required';
    row.append(req);
  } else {
    const opt = document.createElement('span');
    opt.className = 'pmeta';
    opt.textContent = '(optional)';
    row.append(opt);
  }

  wrap.append(row);

  if (displayType?.kind === 'enum') {
    wrap.append(renderEnumLine(displayType));
  } else if (isComplex) {
    if (depth >= MAX_DEPTH) {
      wrap.append(renderTruncated('… (max depth reached)'));
    } else if (visited.has(targetClark)) {
      wrap.append(renderTruncated(`↻ ${localName(targetClark)} (recursive)`));
    } else {
      const next = new Set(visited);
      next.add(targetClark);
      const fields = flattenFields(displayType, types);
      if (!fields.length) {
        appendBrace(row, isArray ? ' [{}]' : ' {}');
      } else if (isArray) {
        appendBrace(row, ' [');
        const arrChildren = document.createElement('div');
        arrChildren.className = 'children';
        appendBraceLine(arrChildren, '{');
        const objChildren = document.createElement('div');
        objChildren.className = 'children';
        for (const f of fields)
          objChildren.append(renderProp(f, types, depth + 1, next, onTypeClick));
        arrChildren.append(objChildren);
        appendBraceLine(arrChildren, '}');
        wrap.append(arrChildren);
        appendBraceLine(wrap, ']');
      } else {
        appendBrace(row, ' {');
        const children = document.createElement('div');
        children.className = 'children';
        for (const f of fields) children.append(renderProp(f, types, depth + 1, next, onTypeClick));
        wrap.append(children);
        appendBraceLine(wrap, '}');
      }
    }
  }

  return wrap;
}

function renderFieldsBlock(fields, types, onTypeClick) {
  const root = document.createElement('div');
  root.className = 'schema';
  if (!fields || !fields.length) {
    root.textContent = '{}';
    return root;
  }
  appendBraceLine(root, '{');
  const inner = document.createElement('div');
  inner.className = 'children';
  for (const f of fields) inner.append(renderProp(f, types, 1, new Set(), onTypeClick));
  root.append(inner);
  appendBraceLine(root, '}');
  return root;
}

export function renderSchemaForElement(elementClark, parsed, onTypeClick) {
  if (!elementClark) {
    const root = document.createElement('div');
    root.className = 'schema';
    root.textContent = '(none)';
    return root;
  }
  const elementDef = parsed.elements[elementClark];
  if (!elementDef) {
    const root = document.createElement('div');
    root.className = 'schema';
    root.textContent = `(unresolved element ${localName(elementClark)})`;
    return root;
  }
  let fields;
  if (elementDef.kind === 'wrapper') {
    fields = flattenFields(elementDef.type, parsed.types);
  } else if (elementDef.kind === 'ref') {
    const refType = parsed.types[elementDef.ref];
    if (!refType) {
      const root = document.createElement('div');
      root.className = 'schema';
      root.textContent = `(unresolved type ${localName(elementDef.ref)})`;
      return root;
    }
    fields = flattenFields(refType, parsed.types);
  }
  return renderFieldsBlock(fields, parsed.types, onTypeClick);
}

export function renderSchemaForType(typeClark, parsed, onTypeClick) {
  const typeDef = parsed.types[typeClark];
  if (!typeDef || typeDef.kind !== 'complex') {
    const root = document.createElement('div');
    root.className = 'schema';
    root.textContent = '(no fields)';
    return root;
  }
  const fields = flattenFields(typeDef, parsed.types);
  return renderFieldsBlock(fields, parsed.types, onTypeClick);
}
