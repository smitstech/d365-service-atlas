export const XS_NS = 'http://www.w3.org/2001/XMLSchema';
export const WSDL_NS = 'http://schemas.xmlsoap.org/wsdl/';

export function clarkName(ns, name) {
  return `{${ns ?? ''}}${name}`;
}

export function localName(clark) {
  if (!clark) return '?';
  const m = /^\{[^}]*\}(.+)$/.exec(clark);
  return m ? m[1] : clark;
}

export function isXsType(clark) {
  return clark?.startsWith(`{${XS_NS}}`);
}

function resolveQName(el, qname) {
  if (!qname) return null;
  const idx = qname.indexOf(':');
  const prefix = idx === -1 ? null : qname.slice(0, idx);
  const local = idx === -1 ? qname : qname.slice(idx + 1);
  const ns = el.lookupNamespaceURI(prefix);
  return clarkName(ns, local);
}

function childrenByName(parent, ns, name) {
  return Array.from(parent.children).filter((c) => c.namespaceURI === ns && c.localName === name);
}

function firstChild(parent, ns, name) {
  return childrenByName(parent, ns, name)[0] ?? null;
}

function enumNumericValue(enumEl) {
  const ann = firstChild(enumEl, XS_NS, 'annotation');
  if (!ann) return null;
  const appinfo = firstChild(ann, XS_NS, 'appinfo');
  if (!appinfo) return null;
  for (const child of Array.from(appinfo.children)) {
    if (child.localName === 'EnumerationValue') return child.textContent.trim();
  }
  return null;
}

function parseSimpleType(st) {
  const restriction = firstChild(st, XS_NS, 'restriction');
  if (!restriction) return { kind: 'simple', base: null };
  const base = restriction.getAttribute('base');
  const enumEls = childrenByName(restriction, XS_NS, 'enumeration');
  if (enumEls.length) {
    const values = enumEls.map((e) => ({
      name: e.getAttribute('value'),
      value: enumNumericValue(e),
    }));
    return { kind: 'enum', base, values };
  }
  return { kind: 'simple', base };
}

function parseSequence(seqEl) {
  const fields = [];
  for (const child of childrenByName(seqEl, XS_NS, 'element')) {
    const name = child.getAttribute('name');
    const minOccurs = child.getAttribute('minOccurs') || '1';
    const maxOccurs = child.getAttribute('maxOccurs') || '1';
    const typeAttr = child.getAttribute('type');
    const typeClark = typeAttr ? resolveQName(child, typeAttr) : null;
    fields.push({
      name,
      type: typeClark,
      required: minOccurs !== '0',
      repeated: maxOccurs === 'unbounded' || (maxOccurs && parseInt(maxOccurs, 10) > 1),
      nillable: child.getAttribute('nillable') === 'true',
    });
  }
  return fields;
}

function parseComplexType(ct) {
  const complexContent = firstChild(ct, XS_NS, 'complexContent');
  let baseClark = null;
  let sequenceEl = null;
  if (complexContent) {
    const ext = firstChild(complexContent, XS_NS, 'extension');
    if (ext) {
      baseClark = resolveQName(ext, ext.getAttribute('base'));
      sequenceEl = firstChild(ext, XS_NS, 'sequence');
    }
  } else {
    sequenceEl = firstChild(ct, XS_NS, 'sequence');
  }
  return {
    kind: 'complex',
    base: baseClark,
    fields: sequenceEl ? parseSequence(sequenceEl) : [],
  };
}

export function parseWsdl(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const parseErr = doc.getElementsByTagName('parsererror')[0];
  if (parseErr) throw new Error(parseErr.textContent.split('\n')[0]);

  const root = doc.documentElement;
  const types = {};
  const elements = {};

  for (const schema of Array.from(doc.getElementsByTagNameNS(XS_NS, 'schema'))) {
    const ns = schema.getAttribute('targetNamespace');

    for (const ct of childrenByName(schema, XS_NS, 'complexType')) {
      const name = ct.getAttribute('name');
      if (name) types[clarkName(ns, name)] = parseComplexType(ct);
    }
    for (const st of childrenByName(schema, XS_NS, 'simpleType')) {
      const name = st.getAttribute('name');
      if (name) types[clarkName(ns, name)] = parseSimpleType(st);
    }
    for (const el of childrenByName(schema, XS_NS, 'element')) {
      const name = el.getAttribute('name');
      if (!name) continue;
      const inlineCt = firstChild(el, XS_NS, 'complexType');
      if (inlineCt) {
        elements[clarkName(ns, name)] = { kind: 'wrapper', type: parseComplexType(inlineCt) };
      } else {
        const t = el.getAttribute('type');
        elements[clarkName(ns, name)] = { kind: 'ref', ref: t ? resolveQName(el, t) : null };
      }
    }
  }

  const messages = {};
  const tnsRoot = root.getAttribute('targetNamespace');
  for (const msg of childrenByName(root, WSDL_NS, 'message')) {
    const name = msg.getAttribute('name');
    const part = firstChild(msg, WSDL_NS, 'part');
    if (!part) continue;
    const elementAttr = part.getAttribute('element');
    if (elementAttr) messages[clarkName(tnsRoot, name)] = resolveQName(part, elementAttr);
  }

  const operations = [];
  for (const pt of childrenByName(root, WSDL_NS, 'portType')) {
    const serviceName = pt.getAttribute('name');
    for (const op of childrenByName(pt, WSDL_NS, 'operation')) {
      const opName = op.getAttribute('name');
      const inputEl = firstChild(op, WSDL_NS, 'input');
      const outputEl = firstChild(op, WSDL_NS, 'output');
      const inputMsg = inputEl ? resolveQName(inputEl, inputEl.getAttribute('message')) : null;
      const outputMsg = outputEl ? resolveQName(outputEl, outputEl.getAttribute('message')) : null;
      operations.push({
        serviceName,
        name: opName,
        inputElement: inputMsg ? messages[inputMsg] : null,
        outputElement: outputMsg ? messages[outputMsg] : null,
      });
    }
  }

  return { types, elements, operations };
}

export function flattenFields(typeDef, types, seen = new Set()) {
  if (!typeDef || typeDef.kind !== 'complex') return [];
  const out = [];
  if (typeDef.base && !seen.has(typeDef.base)) {
    seen.add(typeDef.base);
    out.push(...flattenFields(types[typeDef.base], types, seen));
  }
  out.push(...typeDef.fields);
  return out;
}

export function isArrayWrapper(typeDef) {
  return (
    typeDef?.kind === 'complex' &&
    !typeDef.base &&
    typeDef.fields.length === 1 &&
    typeDef.fields[0].repeated
  );
}
