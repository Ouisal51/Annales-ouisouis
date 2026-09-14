let annale = null;
let annaleId = null;
let progress = null;
let chronoInterval = null;

async function initEpreuve() {
  const params = new URLSearchParams(window.location.search);
  annaleId = params.get('id');
  
  if (!annaleId) {
    showError('Aucune annale spécifiée');
    return;
  }
  
  try {
    const res = await fetch(`data/annales/${annaleId}.json`);
    if (!res.ok) throw new Error('Annale non trouvée');
    annale = await res.json();
  } catch (err) {
    showError('Impossible de charger l\'annale. Vérifiez que le fichier JSON existe.');
    return;
  }
  
  progress = loadProgress(annaleId) || createFreshProgress(annaleId);
  progress.lastOpenedAt = new Date().toISOString();
  
  document.title = `${annale.title} — Épreuve`;
  document.getElementById('exam-title').textContent = annale.title;
  
  renderQuestions();
  setupSidebar();
  setupChrono();
  setupOptions();
  updateGlobalProgress();
  
  document.getElementById('loading-state').classList.add('hidden');
  
  saveProgress(annaleId, progress);
}

function renderQuestions() {
  const main = document.getElementById('exam-main-content');
  main.innerHTML = '';
  
  annale.dossiers.forEach((dossier, di) => {
    const block = document.createElement('section');
    block.className = 'dossier-block';
    
    let html = `<div class="dossier-header"><h2>📁 ${dossier.title}</h2></div>`;
    
    dossier.questions.forEach((q, qi) => {
      const qKey = q.id || `d${di+1}q${qi+1}`;
      const ans = progress.answers[qKey] || { selected: [], validated: false };
      
      html += renderQuestionCard(q, qKey, ans);
    });
    
    block.innerHTML = html;
    main.appendChild(block);
  });
  
  setupQuestionEvents();
}

function renderQuestionCard(q, qKey, ans) {
  const isValidated = ans.validated;
  const inputType = q.type === 'QRU' ? 'radio' : 'checkbox';
  
  let itemsHtml = '';
  if (q.type === 'QROC') {
    itemsHtml = `<input type="text" class="qroc-input" value="${ans.selected[0] || ''}" placeholder="Votre réponse..." ${isValidated ? 'disabled' : ''}>`;
  } else {
    itemsHtml = q.items.map(item => {
      const isSelected = ans.selected.includes(item.letter);
      return `
        <label class="item-label ${isSelected ? 'selected' : ''} ${isValidated ? 'disabled' : ''}">
          <input type="${inputType}" name="${qKey}" value="${item.letter}" ${isSelected ? 'checked' : ''} ${isValidated ? 'disabled' : ''}>
          <span><strong>${item.letter}</strong> - ${item.text}</span>
        </label>
      `;
    }).join('');
  }
  
  const imageHtml = q.image ? `<img src="data/images/${q.image}" alt="Illustration">` : '';
  
  return `
    <article class="question-card ${isValidated ? 'validated' : ''}" id="question-${qKey}" data-qkey="${qKey}">
      <div class="validation-badge ${isValidated ? '' : 'hidden'}">✓ Réponse validée</div>
      <div class="question-header">
        <span class="question-number">❓ Question ${q.number}</span>
        <span class="question-type">${q.type === 'QCM' ? 'QCM' : q.type === 'QRU' ? 'QRU' : 'QROC'}</span>
      </div>
      <div class="question-statement">
        ${q.statement}
        ${imageHtml}
      </div>
      <div class="items-list">
        ${itemsHtml}
      </div>
      <button class="btn btn-success btn-validate" data-qkey="${qKey}" ${isValidated ? 'disabled' : ''}>
        ${isValidated ? '✓ Validé · Modifier' : '✓ Valider'}
      </button>
    </article>
  `;
}

function setupQuestionEvents() {
  document.querySelectorAll('.item-label input').forEach(input => {
    input.addEventListener('change', (e) => {
      const card = e.target.closest('.question-card');
      const qKey = card.dataset.qkey;
      
      if (e.target.type === 'radio') {
        card.querySelectorAll('.item-label').forEach(l => l.classList.remove('selected'));
      }
      
      e.target.closest('.item-label').classList.toggle('selected', e.target.checked);
    });
  });
  
  document.querySelectorAll('.btn-validate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const qKey = e.target.dataset.qkey;
      validateQuestion(qKey);
    });
  });
  
  document.querySelectorAll('.qroc-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const qKey = e.target.closest('.question-card').dataset.qkey;
      if (!progress.answers[qKey]) {
        progress.answers[qKey] = { selected: [], validated: false };
      }
      progress.answers[qKey].selected = [e.target.value];
      saveProgress(annaleId, progress);
    });
  });
}

function validateQuestion(qKey) {
  const card = document.getElementById(`question-${qKey}`);
  const q = findQuestion(qKey);
  
  if (!progress.answers[qKey]) {
    progress.answers[qKey] = { selected: [], validated: false };
  }
  
  const ans = progress.answers[qKey];
  
  if (ans.validated) {
    ans.validated = false;
    card.classList.remove('validated');
    card.querySelector('.validation-badge').classList.add('hidden');
    card.querySelector('.btn-validate').textContent = '✓ Valider';
    card.querySelector('.btn-validate').disabled = false;
    card.querySelectorAll('input').forEach(i => i.disabled = false);
  } else {
    if (q.type !== 'QROC') {
      const selected = Array.from(card.querySelectorAll('input:checked')).map(i => i.value);
      ans.selected = selected;
    }
    ans.validated = true;
    card.classList.add('validated');
    card.querySelector('.validation-badge').classList.remove('hidden');
    card.querySelector('.btn-validate').textContent = '✓ Validé · Modifier';
    card.querySelectorAll('input').forEach(i => i.disabled = true);
    
    if (progress.autoScrollEnabled) {
      scrollToNext(qKey);
    }
  }
  
  saveProgress(annaleId, progress);
  updateGlobalProgress();
  updateSidebar();
}

function findQuestion(qKey) {
  for (const d of annale.dossiers) {
    for (const q of d.questions) {
      if ((q.id || '') === qKey) return q;
    }
  }
  return null;
}

function scrollToNext(currentQKey) {
  const allCards = Array.from(document.querySelectorAll('.question-card'));
  const currentIndex = allCards.findIndex(c => c.dataset.qkey === currentQKey);
  const nextCard = allCards[currentIndex + 1];
  
  if (nextCard && !nextCard.classList.contains('validated')) {
    nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function setupSidebar() {
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const close = document.getElementById('sidebar-close');
  
  function open() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
  }
  
  function close() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }
  
  hamburger?.addEventListener('click', open);
  close?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
  
  updateSidebar();
  
  document.getElementById('sidebar-correction-link').href = `correction.html?id=${annaleId}`;
}

function updateSidebar() {
  const body = document.getElementById('sidebar-body');
  const stats = document.getElementById('sidebar-stats');
  
  let total = 0, validated = 0, answered = 0;
  
  let html = '';
  annale.dossiers.forEach((d, di) => {
    html += `<div class="sidebar-dossier"><h4>${d.title}</h4><div class="pills-grid">`;
    
    d.questions.forEach((q, qi) => {
      const qKey = q.id || `d${di+1}q${qi+1}`;
      const ans = progress.answers[qKey] || {};
      total++;
      
      let cls = 'pill-unseen';
      if (ans.validated) { cls = 'pill-validated'; validated++; }
      else if (ans.selected?.length > 0) { cls = 'pill-inprogress'; answered++; }
      
      html += `<button class="pill ${cls}" onclick="document.getElementById('question-${qKey}').scrollIntoView({behavior:'smooth'})">${q.number}</button>`;
    });
    
    html += '</div></div>';
  });
  
  body.innerHTML = html;
  stats.textContent = `${validated} / ${total} validées · ${answered} en cours`;
}

function setupChrono() {
  const toggle = document.getElementById('chrono-toggle');
  const display = document.getElementById('chrono-display');
  
  toggle?.addEventListener('change', (e) => {
    progress.chronoEnabled = e.target.checked;
    display.classList.toggle('hidden', !e.target.checked);
    
    if (e.target.checked && !progress.isPaused) {
      startChrono();
    } else {
      stopChrono();
    }
    
    saveProgress(annaleId, progress);
  });
  
  if (progress.chronoEnabled) {
    toggle.checked = true;
    display.classList.remove('hidden');
    updateChronoDisplay();
    if (!progress.isPaused) startChrono();
  }
  
  document.getElementById('chrono-pause')?.addEventListener('click', () => {
    progress.isPaused = !progress.isPaused;
    if (progress.isPaused) {
      stopChrono();
      document.getElementById('chrono-pause').textContent = '▶ Reprendre';
    } else {
      startChrono();
      document.getElementById('chrono-pause').textContent = '⏸ Pause';
    }
    saveProgress(annaleId, progress);
  });
}

function startChrono() {
  if (chronoInterval) clearInterval(chronoInterval);
  document.getElementById('chrono-dot').classList.add('running');
  
  chronoInterval = setInterval(() => {
    if (!progress.isPaused) {
      progress.elapsedSeconds = (progress.elapsedSeconds || 0) + 1;
      updateChronoDisplay();
      saveProgress(annaleId, progress);
    }
  }, 1000);
}

function stopChrono() {
  clearInterval(chronoInterval);
  document.getElementById('chrono-dot')?.classList.remove('running');
}

function updateChronoDisplay() {
  const s = progress.elapsedSeconds || 0;
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  document.getElementById('chrono-time').textContent = `${h}:${m}:${sec}`;
}

function setupOptions() {
  document.getElementById('options-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('options-dropdown').classList.toggle('hidden');
  });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#options-zone')) {
      document.getElementById('options-dropdown')?.classList.add('hidden');
    }
  });
  
  document.getElementById('autoscroll-toggle')?.addEventListener('change', (e) => {
    progress.autoScrollEnabled = e.target.checked;
    saveProgress(annaleId, progress);
  });
  
  document.getElementById('btn-terminer')?.addEventListener('click', () => {
    if (confirm('Terminer l\'épreuve et voir la correction ?')) {
      progress.completed = true;
      progress.completedAt = new Date().toISOString();
      saveProgress(annaleId, progress);
      window.location.href = `correction.html?id=${annaleId}`;
    }
  });
}

function updateGlobalProgress() {
  const total = annale.dossiers.reduce((sum, d) => sum + d.questions.length, 0);
  const validated = Object.values(progress.answers).filter(a => a.validated).length;
  const pct = total > 0 ? Math.round((validated / total) * 100) : 0;
  
  document.getElementById('global-progress-text').textContent = `${validated} / ${total} validées`;
  document.getElementById('global-progress-pct').textContent = `${pct}%`;
  document.getElementById('global-progress-fill').style.width = `${pct}%`;
}

function showError(msg) {
  document.getElementById('loading-state').innerHTML = `
    <div style="text-align:center;color:var(--error)">
      <h2>❌ Erreur</h2>
      <p>${msg}</p>
      <a href="index.html" class="btn btn-primary" style="margin-top:1rem">Retour à l'accueil</a>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', initEpreuve);