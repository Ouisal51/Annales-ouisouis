const subjects = [
  { id: 'cardiologie', name: 'Cardiologie', icon: '❤️', ue: 'UEMED0604', desc: 'ECG, pathologies cardiovasculaires' },
  { id: 'nutrition', name: 'Nutrition', icon: '🥗', ue: 'UE0501', desc: 'Métabolisme, vitamines, micronutriments' },
  { id: 'infectieux', name: 'Agents infectieux', icon: '🦠', ue: 'UE0501', desc: 'Bactériologie, antibiotiques' },
];

function initHome() {
  renderSubjects();
  renderResumeSection();
  
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('main-content').classList.remove('hidden');
}

function renderSubjects() {
  const grid = document.getElementById('subjects-grid');
  if (!grid) return;
  
  grid.innerHTML = subjects.map(s => `
    <div class="subject-card" onclick="location.href='matiere.html?id=${s.id}'">
      <div class="subject-icon">${s.icon}</div>
      <div class="subject-name">${s.name}</div>
      <div class="subject-meta">${s.ue} · ${s.desc}</div>
    </div>
  `).join('');
}

function renderResumeSection() {
  const recent = getAllRecentAnnales(3);
  const section = document.getElementById('resume-section');
  const container = document.getElementById('resume-cards');
  
  if (!section || !container || recent.length === 0) {
    if (section) section.classList.add('hidden');
    return;
  }
  
  section.classList.remove('hidden');
  
  container.innerHTML = recent.map(({ annaleId, progress }) => {
    const stats = getProgressStats(progress);
    const total = Object.keys(progress.answers).length || 40;
    const pct = Math.round((stats.validated / total) * 100);
    
    return `
      <div class="resume-card" onclick="location.href='epreuve.html?id=${annaleId}'">
        <div class="resume-title">${annaleId}</div>
        <div class="resume-progress">
          <div class="resume-bar">
            <div class="resume-fill" style="width:${pct}%"></div>
          </div>
          <span>${stats.validated}/${total} validées</span>
        </div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', initHome);