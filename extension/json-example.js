import { localName, flattenFields, isArrayWrapper } from './wsdl-parser.js';

function primitiveExample(clark) {
  if (!clark) return null;
  switch (localName(clark)) {
    case 'string':
    case 'anyURI':
    case 'QName':
      return '';
    case 'int':
    case 'long':
    case 'short':
    case 'byte':
    case 'unsignedInt':
    case 'unsignedLong':
    case 'unsignedShort':
    case 'unsignedByte':
    case 'decimal':
    case 'double':
    case 'float':
    case 'char':
      return 0;
    case 'boolean':
      return false;
    case 'dateTime':
      return `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
    case 'guid':
      return '00000000-0000-0000-0000-000000000000';
    case 'duration':
      return 'PT0S';
    case 'base64Binary':
      return '';
    case 'anyType':
      return null;
    default:
      return null;
  }
}

function valueForField(field, types, visited) {
  let typeClark = field.type;
  let typeDef = typeClark ? types[typeClark] : null;
  let isArray = field.repeated;

  if (typeDef && isArrayWrapper(typeDef)) {
    isArray = true;
    typeClark = typeDef.fields[0].type;
    typeDef = typeClark ? types[typeClark] : null;
  }

  let value;
  if (typeDef?.kind === 'complex') {
    if (visited.has(typeClark)) {
      value = {};
    } else {
      const next = new Set(visited);
      next.add(typeClark);
      value = buildObject(flattenFields(typeDef, types), types, next);
    }
  } else if (typeDef?.kind === 'enum') {
    value = typeDef.values[0]?.name ?? '';
  } else {
    value = primitiveExample(typeClark);
  }

  return isArray ? [value] : value;
}

function buildObject(fields, types, visited) {
  const out = {};
  for (const f of fields) out[f.name] = valueForField(f, types, visited);
  return out;
}

export function buildJsonExample(elementClark, parsed) {
  if (!elementClark) return null;
  const elementDef = parsed.elements[elementClark];
  if (!elementDef) return null;

  let fields;
  if (elementDef.kind === 'wrapper') {
    fields = flattenFields(elementDef.type, parsed.types);
  } else if (elementDef.kind === 'ref') {
    const refType = parsed.types[elementDef.ref];
    if (!refType) return null;
    fields = flattenFields(refType, parsed.types);
  }
  if (!fields) return null;
  return buildObject(fields, parsed.types, new Set());
}
