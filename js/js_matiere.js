const matieresData = {
  'cardiologie': {
    name: 'Cardiologie',
    icon: '❤️',
    ue: 'UEMED0604',
    desc: 'ECG, pathologies cardiovasculaires, insuffisance cardiaque',
    annales: [
      { id: 'cardio-p2-2024', title: 'Cardiologie 2024', year: 2024, duration: 90 },
      { id: 'cardio-2023', title: 'Cardiologie 2023', year: 2023, duration: 90 },
      { id: 'cardio-2022', title: 'Cardiologie 2022', year: 2022, duration: 90 },
    ]
  },
  'nutrition': {
    name: 'Nutrition',
    icon: '🥗',
    ue: 'UE0501',
    desc: 'Métabolisme des protéines, lipides, glucides, vitamines',
    annales: [
      { id: 'nutrition-2024', title: 'Nutrition 2024', year: 2024, duration: 90 },
      { id: 'nutrition-2023', title: 'Nutrition 2023', year: 2023, duration: 90 },
    ]
  },
  'infectieux': {
    name: 'Agents infectieux',
    icon: '🦠',
    ue: 'UE0501',
    desc: 'Bactériologie, antibiotiques, résistances',
    annales: [
      { id: 'fgsm3-501-2024', title: 'Agents infectieux 2024', year: 2024, duration: 90 },
    ]
  }
};

let currentMatiere = null;
let currentAnales = [];

function initMatiere() {
  const params = new URLSearchParams(window.location.search);
  const matiereId = params.get('id');
  
  currentMatiere = matieresData[matiereId];
  if (!currentMatiere) {
    document.getElementById('matiere-title').textContent = 'Matière non trouvée';
    return;
  }
  
  document.getElementById('matiere-icon').textContent = currentMatiere.icon;
  document.getElementById('matiere-title').textContent = currentMatiere.name;
  document.getElementById('matiere-meta').textContent = `${currentMatiere.ue} · ${currentMatiere.annales.length} annales`;
  document.getElementById('matiere-desc').textContent = currentMatiere.desc;
  
  currentAnales = currentMatiere.annales.map(a => ({
    ...a,
    status: getAnnaleStatus(a.id)
  }));
  
  renderAnales();
  setupFilters();
  
  document.querySelector('.loading-state').classList.add('hidden');
}

function renderAnales() {
  const sort = document.getElementById('sort-select')?.value || 'year-desc';
  const status = document.getElementById('status-select')?.value || 'all';
  
  let filtered = [...currentAnales];
  
  if (status !== 'all') {
    filtered = filtered.filter(a => a.status === status);
  }
  
  filtered.sort((a, b) => {
    return sort === 'year-desc' ? b.year - a.year : a.year - b.year;
  });
  
  const container = document.getElementById('annales-list');
  const empty = document.getElementById('empty-state');
  
  if (filtered.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  
  empty.classList.add('hidden');
  
  container.innerHTML = filtered.map(a => {
    const statusLabels = {
      not_started: { text: 'Non commencée', class: 'status-not_started' },
      in_progress: { text: 'En cours', class: 'status-in_progress' },
      completed: { text: 'Terminée', class: 'status-completed' }
    };
    const statusInfo = statusLabels[a.status];
    
    return `
      <div class="annale-card">
        <div class="annale-info">
          <h3>${a.title}</h3>
          <div class="annale-meta">${currentMatiere.ue} · ${a.year} · ${a.duration} min</div>
          <span class="annale-status ${statusInfo.class}">${statusInfo.text}</span>
        </div>
        <a href="epreuve.html?id=${a.id}" class="btn btn-primary">▶ ${a.status === 'not_started' ? 'Commencer' : 'Reprendre'}</a>
      </div>
    `;
  }).join('');
}

function setupFilters() {
  document.getElementById('sort-select')?.addEventListener('change', renderAnales);
  document.getElementById('status-select')?.addEventListener('change', renderAnales);
}

document.addEventListener('DOMContentLoaded', initMatiere);