import { localName, flattenFields, isArrayWrapper } from './wsdl-parser.js';
import { renderSchemaForType } from './schema-view.js';

function collectReferencedTypes(elementClark, parsed) {
  const refs = new Set();
  if (!elementClark) return refs;
  const elementDef = parsed.elements[elementClark];
  if (!elementDef) return refs;

  let fields;
  if (elementDef.kind === 'wrapper') {
    fields = flattenFields(elementDef.type, parsed.types);
  } else if (elementDef.kind === 'ref') {
    const t = parsed.types[elementDef.ref];
    if (!t) return refs;
    fields = flattenFields(t, parsed.types);
  }
  if (!fields) return refs;

  function walk(typeClark, visited) {
    if (!typeClark || visited.has(typeClark)) return;
    visited.add(typeClark);
    refs.add(typeClark);
    const td = parsed.types[typeClark];
    if (td?.kind !== 'complex') return;
    for (const f of flattenFields(td, parsed.types)) {
      let t = f.type;
      const tdef = t ? parsed.types[t] : null;
      if (tdef && isArrayWrapper(tdef)) t = tdef.fields[0].type;
      walk(t, visited);
    }
  }

  for (const f of fields) {
    let t = f.type;
    const tdef = t ? parsed.types[t] : null;
    if (tdef && isArrayWrapper(tdef)) t = tdef.fields[0].type;
    walk(t, new Set());
  }
  return refs;
}

function findUsages(typeClark, parsed) {
  const usages = [];
  for (const op of parsed.operations) {
    const inRefs = collectReferencedTypes(op.inputElement, parsed);
    const outRefs = collectReferencedTypes(op.outputElement, parsed);
    if (inRefs.has(typeClark) || outRefs.has(typeClark)) {
      usages.push({
        op,
        inRequest: inRefs.has(typeClark),
        inResponse: outRefs.has(typeClark),
      });
    }
  }
  return usages;
}

function renderHeader(typeClark, typeDef, parsed) {
  const header = document.createElement('div');
  header.className = 'op-page-header';

  const top = document.createElement('div');
  top.className = 'op-page-top';
  const name = document.createElement('span');
  name.className = 'op-page-path';
  name.textContent = localName(typeClark);
  top.append(name);
  header.append(top);

  if (typeDef?.base) {
    const inherit = document.createElement('div');
    inherit.className = 'op-page-url';
    const chain = [];
    let cur = typeDef.base;
    while (cur) {
      chain.push(localName(cur));
      cur = parsed.types[cur]?.base;
    }
    inherit.textContent = `extends ${chain.join(' → ')}`;
    header.append(inherit);
  }

  return header;
}

function renderEnumValues(typeDef) {
  const root = document.createElement('div');
  root.className = 'schema';
  for (const v of typeDef.values) {
    const row = document.createElement('div');
    row.className = 'prop';
    const label = document.createElement('span');
    label.className = 'pname';
    label.textContent = v.name;
    row.append(label);
    if (v.value != null) {
      const sep = document.createElement('span');
      sep.textContent = ' = ';
      const val = document.createElement('span');
      val.className = 'ptype';
      val.textContent = v.value;
      row.append(sep, val);
    }
    root.append(row);
  }
  return root;
}

function renderUsages(usages, onUsageClick) {
  const list = document.createElement('div');
  list.className = 'usages';
  for (const u of usages) {
    const row = document.createElement('div');
    row.className = 'op-row';
    const method = document.createElement('span');
    method.className = 'method';
    method.textContent = 'POST';
    const path = document.createElement('span');
    path.className = 'op-path';
    path.textContent = `${u.op.serviceName} · /${u.op.name}`;
    const dir = document.createElement('span');
    dir.className = 'pmeta';
    dir.textContent = u.inRequest && u.inResponse ? 'in/out' : u.inRequest ? 'in' : 'out';
    row.append(method, path, dir);
    row.addEventListener('click', () => onUsageClick(u.op));
    list.append(row);
  }
  return list;
}

function renderSection(title, child) {
  const section = document.createElement('div');
  section.className = 'op-page-section';
  const t = document.createElement('div');
  t.className = 'section-title';
  t.textContent = title;
  section.append(t, child);
  return section;
}

export function renderTypePage(container, typeClark, parsed, groupName, onTypeClick, onUsageClick) {
  container.innerHTML = '';
  const typeDef = parsed.types[typeClark];

  container.append(renderHeader(typeClark, typeDef, parsed));

  if (!typeDef) {
    container.append(
      renderSection(
        'Definition',
        (() => {
          const d = document.createElement('div');
          d.className = 'schema';
          d.textContent = `(unresolved type ${localName(typeClark)})`;
          return d;
        })(),
      ),
    );
    return;
  }

  if (typeDef.kind === 'enum') {
    container.append(renderSection('Values', renderEnumValues(typeDef)));
  } else if (typeDef.kind === 'complex') {
    container.append(renderSection('Fields', renderSchemaForType(typeClark, parsed, onTypeClick)));
  } else {
    const d = document.createElement('div');
    d.className = 'schema';
    d.textContent = `(simple type, base: ${localName(typeDef.base)})`;
    container.append(renderSection('Definition', d));
  }

  const usages = findUsages(typeClark, parsed);
  if (usages.length) {
    // Usages are scoped to this one service group's WSDL (a shared type lives in
    // many groups); make that explicit so the list doesn't read as environment-wide.
    const title = groupName
      ? `Used by (${usages.length}) · ${groupName}`
      : `Used by (${usages.length})`;
    container.append(renderSection(title, renderUsages(usages, onUsageClick)));
  }
}
