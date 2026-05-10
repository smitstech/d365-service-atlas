function groupByService(operations) {
  const groups = new Map();
  for (const op of operations) {
    if (!groups.has(op.serviceName)) groups.set(op.serviceName, []);
    groups.get(op.serviceName).push(op);
  }
  return [...groups.entries()];
}

function renderOperationRow(op, onClick) {
  const row = document.createElement('div');
  row.className = 'op-row';

  const method = document.createElement('span');
  method.className = 'method';
  method.textContent = 'POST';

  const path = document.createElement('span');
  path.className = 'op-path';
  path.textContent = `/${op.name}`;

  const chev = document.createElement('span');
  chev.className = 'chev';
  chev.textContent = '›';

  row.append(method, path, chev);
  row.addEventListener('click', () => onClick(op));
  return row;
}

function renderServiceSection(serviceName, ops, group, onOpClick) {
  const section = document.createElement('section');
  section.className = 'service-section';
  section.dataset.service = serviceName;

  const header = document.createElement('div');
  header.className = 'service-header';
  const titleRow = document.createElement('div');
  titleRow.className = 'service-title-row';
  const title = document.createElement('div');
  title.className = 'service-title';
  title.textContent = serviceName;
  const count = document.createElement('div');
  count.className = 'service-count';
  count.textContent = `${ops.length} ${ops.length === 1 ? 'operation' : 'operations'}`;
  titleRow.append(title, count);
  header.append(titleRow);
  section.append(header);

  for (const op of ops) section.append(renderOperationRow(op, onOpClick));
  return section;
}

export function renderSwagger(container, parsed, group, onOpClick) {
  container.innerHTML = '';
  for (const [serviceName, ops] of groupByService(parsed.operations)) {
    container.append(renderServiceSection(serviceName, ops, group, onOpClick));
  }
}
