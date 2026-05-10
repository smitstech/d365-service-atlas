import { localName, isArrayWrapper, isXsType } from './wsdl-parser.js';

function xsdToSchema(clark) {
  if (!clark) return {};
  switch (localName(clark)) {
    case 'string':
    case 'anyURI':
    case 'QName':
      return { type: 'string' };
    case 'int':
    case 'short':
    case 'byte':
    case 'unsignedInt':
    case 'unsignedShort':
    case 'unsignedByte':
      return { type: 'integer', format: 'int32' };
    case 'long':
    case 'unsignedLong':
      return { type: 'integer', format: 'int64' };
    case 'decimal':
      return { type: 'number', format: 'decimal' };
    case 'double':
      return { type: 'number', format: 'double' };
    case 'float':
      return { type: 'number', format: 'float' };
    case 'boolean':
      return { type: 'boolean' };
    case 'dateTime':
      return { type: 'string', format: 'date-time' };
    case 'date':
      return { type: 'string', format: 'date' };
    case 'time':
      return { type: 'string', format: 'time' };
    case 'guid':
      return { type: 'string', format: 'uuid' };
    case 'base64Binary':
      return { type: 'string', format: 'byte' };
    case 'duration':
      return { type: 'string' };
    case 'char':
      return { type: 'integer' };
    case 'anyType':
      return {};
    default:
      return { type: 'string' };
  }
}

function makeKeyMap(parsed) {
  const map = new Map();
  const taken = new Set();
  function get(clark) {
    if (!clark) return null;
    if (map.has(clark)) return map.get(clark);
    const local = localName(clark);
    let key = local;
    let n = 1;
    while (taken.has(key)) key = `${local}_${++n}`;
    map.set(clark, key);
    taken.add(key);
    return key;
  }
  for (const clark of Object.keys(parsed.types)) get(clark);
  return get;
}

function fieldSchema(field, parsed, getKey) {
  let typeClark = field.type;
  let typeDef = typeClark ? parsed.types[typeClark] : null;
  let isArray = field.repeated;

  if (typeDef && isArrayWrapper(typeDef)) {
    isArray = true;
    typeClark = typeDef.fields[0].type;
    typeDef = typeClark ? parsed.types[typeClark] : null;
  }

  let inner;
  if (typeDef?.kind === 'complex' || typeDef?.kind === 'enum') {
    inner = { $ref: `#/components/schemas/${getKey(typeClark)}` };
  } else if (typeDef?.kind === 'simple') {
    inner = xsdToSchema(typeDef.base || typeClark);
  } else if (isXsType(typeClark) || typeClark?.includes('Serialization/')) {
    inner = xsdToSchema(typeClark);
  } else {
    inner = {};
  }

  if (field.nillable && !inner.$ref) inner.nullable = true;
  return isArray ? { type: 'array', items: inner } : inner;
}

function objectFromFields(fields, parsed, getKey) {
  const properties = {};
  const required = [];
  for (const f of fields) {
    properties[f.name] = fieldSchema(f, parsed, getKey);
    if (f.required) required.push(f.name);
  }
  const schema = { type: 'object' };
  if (Object.keys(properties).length) schema.properties = properties;
  if (required.length) schema.required = required;
  return schema;
}

function componentSchema(typeDef, parsed, getKey) {
  if (typeDef.kind === 'enum') {
    return { type: 'string', enum: typeDef.values.map((v) => v.name) };
  }
  if (typeDef.kind === 'simple') {
    return xsdToSchema(typeDef.base);
  }
  const own = objectFromFields(typeDef.fields, parsed, getKey);
  if (typeDef.base) {
    return { allOf: [{ $ref: `#/components/schemas/${getKey(typeDef.base)}` }, own] };
  }
  return own;
}

function elementSchema(elementClark, parsed, getKey) {
  if (!elementClark) return null;
  const elementDef = parsed.elements[elementClark];
  if (!elementDef) return null;
  if (elementDef.kind === 'wrapper') {
    return objectFromFields(elementDef.type.fields, parsed, getKey);
  }
  if (elementDef.kind === 'ref' && elementDef.ref) {
    const t = parsed.types[elementDef.ref];
    if (t) return { $ref: `#/components/schemas/${getKey(elementDef.ref)}` };
  }
  return null;
}

export function buildOpenApi(parsed, group, env) {
  const getKey = makeKeyMap(parsed);

  const schemas = {};
  for (const [clark, typeDef] of Object.entries(parsed.types)) {
    if (
      !typeDef ||
      (typeDef.kind !== 'complex' && typeDef.kind !== 'enum' && typeDef.kind !== 'simple')
    )
      continue;
    schemas[getKey(clark)] = componentSchema(typeDef, parsed, getKey);
  }

  const paths = {};
  for (const op of parsed.operations) {
    paths[`/${op.serviceName}/${op.name}`] = {
      post: {
        tags: [op.serviceName],
        operationId: `${op.serviceName}_${op.name}`,
        summary: op.name,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: elementSchema(op.inputElement, parsed, getKey) ?? { type: 'object' },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: elementSchema(op.outputElement, parsed, getKey) ?? { type: 'object' },
              },
            },
          },
        },
      },
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: group,
      version: '1.0.0',
      description: `Generated from D365 F&O service group ${group} on ${env}.`,
    },
    servers: [{ url: `https://${env}.operations.dynamics.com/api/services/${group}` }],
    paths,
    components: { schemas },
  };
}
