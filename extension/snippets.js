import { buildJsonExample } from './json-example.js';

export function operationUrl(env, group, op) {
  return `https://${env}.operations.dynamics.com/api/services/${group}/${op.serviceName}/${op.name}`;
}

export function curlSnippet(op, parsed, env, group) {
  const url = operationUrl(env, group, op);
  const example = buildJsonExample(op.inputElement, parsed) ?? {};
  const body = JSON.stringify(example).replace(/'/g, `'\\''`);
  return [
    `curl -X POST '${url}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'Authorization: Bearer <TOKEN>' \\`,
    `  -d '${body}'`,
  ].join('\n');
}

export function fetchSnippet(op, parsed, env, group) {
  const url = operationUrl(env, group, op);
  const example = buildJsonExample(op.inputElement, parsed) ?? {};
  const body = JSON.stringify(example, null, 2).replace(/\n/g, '\n  ');
  return [
    `await fetch('${url}', {`,
    `  method: 'POST',`,
    `  headers: {`,
    `    'Content-Type': 'application/json',`,
    `    'Authorization': 'Bearer <TOKEN>',`,
    `  },`,
    `  body: JSON.stringify(${body}),`,
    `});`,
  ].join('\n');
}
