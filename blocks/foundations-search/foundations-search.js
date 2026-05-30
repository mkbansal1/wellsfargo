const INDEX_URL = '/foundation-index.json';

let foundationsData = null;

async function loadData() {
  if (foundationsData) return foundationsData;
  const resp = await fetch(INDEX_URL);
  const json = await resp.json();
  foundationsData = json.data || json;
  return foundationsData;
}

function getUniqueAreas(data) {
  const areas = new Set();
  data.forEach((item) => {
    const val = item.areas || item['program-areas'] || '';
    val.split('|').forEach((a) => {
      const trimmed = a.trim();
      if (trimmed && trimmed.toLowerCase() !== 'all program areas') areas.add(trimmed);
    });
  });
  return [...areas].sort();
}

function getUniqueStates(data) {
  const states = new Set();
  data.forEach((item) => {
    const val = item.states || '';
    val.split(',').forEach((s) => {
      const trimmed = s.trim();
      if (trimmed && trimmed.toLowerCase() !== 'all' && trimmed.toLowerCase() !== 'all states') states.add(trimmed);
    });
  });
  return [...states].sort();
}

function searchByAreaAndState(data, area, state) {
  return data.filter((item) => {
    const itemAreas = (item.areas || item['program-areas'] || '').split('|').map((a) => a.trim().toLowerCase());
    const itemStates = (item.states || '').split(',').map((s) => s.trim().toLowerCase());
    const areaMatch = !area || area === 'all' || itemAreas.some((a) => a === area.toLowerCase());
    const stateMatch = !state || state === 'all' || itemStates.some((s) => s === state.toLowerCase()) || itemStates.includes('all');
    return areaMatch && stateMatch;
  });
}

function searchByName(data, query) {
  const q = query.toLowerCase();
  return data.filter((item) => (item.title || '').toLowerCase().includes(q));
}

function renderResults(results, container, summaryText) {
  container.innerHTML = '';
  const summary = document.createElement('p');
  summary.className = 'foundations-search-summary';
  summary.textContent = summaryText;
  container.appendChild(summary);

  if (results.length === 0) {
    const noResult = document.createElement('p');
    noResult.textContent = 'No results found.';
    container.appendChild(noResult);
    return;
  }

  const table = document.createElement('table');
  table.className = 'foundations-search-results-table';
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Foundation name</th><th>Program areas</th><th>States served</th><th>Other limitations</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  results.forEach((item) => {
    const tr = document.createElement('tr');
    const areas = (item.areas || item['program-areas'] || '').split('|').map((a) => a.trim()).join(';\n');
    const states = (item.states || '').split(',').map((s) => s.trim()).join('\n');
    const limitations = item.limitations || item['geographic-limitations'] || '';
    const path = item.path || '#';
    tr.innerHTML = `<td><a href="${path}">${item.title || ''}</a></td><td>${areas.replace(/\n/g, '<br>')}</td><td>${states.replace(/\n/g, '<br>')}</td><td>${limitations}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

export default async function decorate(block) {
  const data = await loadData();
  const areas = getUniqueAreas(data);
  const states = getUniqueStates(data);

  block.innerHTML = '';

  // Tabs
  const tabBar = document.createElement('div');
  tabBar.className = 'foundations-search-tabs';
  const tab1 = document.createElement('button');
  tab1.textContent = 'Search by Program Area and State';
  tab1.className = 'foundations-search-tab active';
  const tab2 = document.createElement('button');
  tab2.textContent = 'Search by Foundation Name';
  tab2.className = 'foundations-search-tab';
  tabBar.append(tab1, tab2);
  block.appendChild(tabBar);

  // Panel 1: Area + State
  const panel1 = document.createElement('div');
  panel1.className = 'foundations-search-panel active';

  const form1 = document.createElement('div');
  form1.className = 'foundations-search-form';

  const showLabel = document.createElement('span');
  showLabel.textContent = 'Show';
  const areaSelect = document.createElement('select');
  areaSelect.innerHTML = `<option value="all">All Program Areas</option>${areas.map((a) => `<option value="${a}">${a}</option>`).join('')}`;

  const forLabel = document.createElement('span');
  forLabel.textContent = 'for';
  const stateSelect = document.createElement('select');
  stateSelect.innerHTML = `<option value="all">All States</option>${states.map((s) => `<option value="${s}">${s}</option>`).join('')}`;

  const goBtn1 = document.createElement('button');
  goBtn1.className = 'foundations-search-go';
  goBtn1.textContent = 'Go';

  form1.append(showLabel, areaSelect, forLabel, stateSelect, goBtn1);
  panel1.appendChild(form1);

  const learnMore = document.createElement('p');
  learnMore.className = 'foundations-search-learn';
  learnMore.innerHTML = 'Learn more about the various <a href="/private-foundations/program-areas">program areas</a>';
  panel1.appendChild(learnMore);

  block.appendChild(panel1);

  // Panel 2: Name search
  const panel2 = document.createElement('div');
  panel2.className = 'foundations-search-panel';

  const form2 = document.createElement('div');
  form2.className = 'foundations-search-form';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Enter foundation name';
  nameInput.className = 'foundations-search-input';

  const suggestions = document.createElement('ul');
  suggestions.className = 'foundations-search-suggestions';

  const goBtn2 = document.createElement('button');
  goBtn2.className = 'foundations-search-go';
  goBtn2.textContent = 'Go';

  form2.append(nameInput, goBtn2);
  panel2.append(form2, suggestions);
  block.appendChild(panel2);

  // Results container
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'foundations-search-results';
  block.appendChild(resultsContainer);

  // Tab switching
  tab1.addEventListener('click', () => {
    tab1.classList.add('active');
    tab2.classList.remove('active');
    panel1.classList.add('active');
    panel2.classList.remove('active');
  });
  tab2.addEventListener('click', () => {
    tab2.classList.add('active');
    tab1.classList.remove('active');
    panel2.classList.add('active');
    panel1.classList.remove('active');
  });

  // Search by area/state
  goBtn1.addEventListener('click', () => {
    const area = areaSelect.value;
    const state = stateSelect.value;
    const results = searchByAreaAndState(data, area, state);
    const areaLabel = area === 'all' ? 'All Program Areas' : area;
    const stateLabel = state === 'all' ? 'All States' : state;
    const summaryText = `${results.length} results for ${areaLabel} in ${stateLabel}.`;
    renderResults(results, resultsContainer, summaryText);
  });

  // Search by name
  goBtn2.addEventListener('click', () => {
    const query = nameInput.value.trim();
    if (!query) return;
    const results = searchByName(data, query);
    const summaryText = `${results.length} results for "${query}".`;
    renderResults(results, resultsContainer, summaryText);
    suggestions.innerHTML = '';
  });

  // Suggestions on typing
  nameInput.addEventListener('input', () => {
    const query = nameInput.value.trim().toLowerCase();
    suggestions.innerHTML = '';
    if (query.length < 2) return;
    const matches = data.filter((item) => (item.title || '').toLowerCase().includes(query)).slice(0, 8);
    matches.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item.title;
      li.addEventListener('click', () => {
        nameInput.value = item.title;
        suggestions.innerHTML = '';
      });
      suggestions.appendChild(li);
    });
  });

  // Hide suggestions on outside click
  document.addEventListener('click', (e) => {
    if (!panel2.contains(e.target)) suggestions.innerHTML = '';
  });
}
