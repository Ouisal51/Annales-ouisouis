let allAnnales = [];

async function loadAllAnnales() {
  try {
    const response = await fetch('data/annales/index.json');
    if (!response.ok) throw new Error('Index non trouvé');
    allAnnales = await response.json();
  } catch (e) {
    console.log('Index non disponible, chargement manuel nécessaire');
    allAnnales = [];
  }
}

function searchAnnales(query) {
  if (!query || query.length < 2) return [];
  const lower = query.toLowerCase();
  return allAnnales.filter(a => 
    a.title.toLowerCase().includes(lower) ||
    a.ue.toLowerCase().includes(lower) ||
    a.subject.toLowerCase().includes(lower)
  );
}

function setupSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  
  if (!input || !dropdown) return;
  
  input.addEventListener('input', (e) => {
    const results = searchAnnales(e.target.value);
    renderSearchResults(results, dropdown);
  });
  
  input.addEventListener('focus', () => {
    if (input.value.length >= 2) {
      dropdown.classList.remove('hidden');
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-wrapper')) {
      dropdown.classList.add('hidden');
    }
  });
}

function renderSearchResults(results, dropdown) {
  if (results.length === 0) {
    dropdown.innerHTML = '<div class="search-no-results">Aucun résultat</div>';
    dropdown.classList.remove('hidden');
    return;
  }
  
  dropdown.innerHTML = results.map(a => `
    <a href="matiere.html?id=${a.ue.toLowerCase()}" class="search-result-item">
      <div class="search-result-title">${a.title}</div>
      <div class="search-result-meta">${a.ue} · ${a.year}</div>
    </a>
  `).join('');
  
  dropdown.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  loadAllAnnales().then(setupSearch);
});