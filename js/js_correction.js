let annale = null;
let annaleId = null;
let progress = null;

async function initCorrection() {
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
    showError('Impossible de charger l\'annale');
    return;
  }
  
  progress = loadProgress(annaleId);
  if (!progress) {
    showError('Aucune progression trouvée pour cette annale');
    return;
  }
  
  calculateAndDisplayResults();
  
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('results-content').classList.remove('hidden');
}

function calculateAndDisplayResults() {
  let totalScore = 0;
  let totalQuestions = 0;
  let concordantes = 0;
  let discordantes = 0;
  let nonRepondues = 0;
  
  const questionsHtml = [];
  
  annale.dossiers.forEach(dossier => {
    dossier.questions.forEach(q => {
      const qKey = q.id || `d${annale.dossiers.indexOf(dossier)+1}q${dossier.questions.indexOf(q)+1}`;
      const ans = progress.answers[qKey] || { selected: [], validated: false };
      
      totalQuestions++;
      
      if (!ans.validated) {
        nonRepondues++;
        questionsHtml.push(renderQuestionCorrection(q, ans, 0, 'non-repondu'));
        return;
      }
      
      const result = calculateScore(q, ans);
      totalScore += result.score;
      
      if (result.discordances === 0) concordantes++;
      else discordantes++;
      
      questionsHtml.push(renderQuestionCorrection(q, ans, result.score, result.discordances === 0 ? 'correct' : result.score > 0 ? 'partial' : 'wrong'));
    });
  });
  
  const noteSur20 = totalQuestions > 0 ? (totalScore / totalQuestions) * 20 : 0;
  
  document.getElementById('note-value').textContent = noteSur20.toFixed(2);
  document.getElementById('points-obtenus').textContent = totalScore.toFixed(1);
  document.getElementById('points-total').textContent = totalQuestions;
  document.getElementById('questions-valid').textContent = Object.values(progress.answers).filter(a => a.validated).length;
  document.getElementById('questions-total').textContent = totalQuestions;
  
  if (progress.chronoEnabled) {
    const s = progress.elapsedSeconds || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    document.getElementById('temps-total').textContent = 
      `${h}h ${m}min ${sec}s`;
  }
  
  const totalRep = concordantes + discordantes + nonRepondues;
  document.getElementById('nb-concordantes').textContent = concordantes;
  document.getElementById('nb-discordantes').textContent = discordantes;
  document.getElementById('nb-nonrep').textContent = nonRepondues;
  
  document.getElementById('rep-concordantes').style.width = `${(concordantes/totalRep)*100}%`;
  document.getElementById('rep-discordantes').style.width = `${(discordantes/totalRep)*100}%`;
  document.getElementById('rep-nonrep').style.width = `${(nonRepondues/totalRep)*100}%`;
  
  document.getElementById('questions-correction').innerHTML = questionsHtml.join('');
}

function calculateScore(question, ans) {
  if (!ans.validated) return { score: 0, discordances: null };
  
  if (question.type === 'QROC') {
    const userText = (ans.selected?.[0] || '').toLowerCase().trim();
    const accepted = (question.accepted_answers || []).map(a => a.toLowerCase().trim());
    const correct = accepted.some(a => userText.includes(a) || a.includes(userText));
    return { score: correct ? 1 : 0, discordances: correct ? 0 : 1 };
  }
  
  const activeItems = question.items.filter(i => !i.neutralized);
  let discordances = 0;
  
  for (const item of activeItems) {
    const userChecked = ans.selected.includes(item.letter);
    if (userChecked !== item.expected) discordances++;
  }
  
  if (question.type === 'QRU') {
    return { score: discordances === 0 ? 1 : 0, discordances };
  }
  
  const scoreMap = { 0: 1, 1: 0.5, 2: 0.2 };
  const score = discordances >= 3 ? 0 : (scoreMap[discordances] || 0);
  return { score, discordances };
}

function renderQuestionCorrection(q, ans, score, status) {
  const qKey = q.id || 'q';
  const statusClass = status === 'correct' ? 'score-correct' : status === 'partial' ? 'score-partial' : status === 'wrong' ? 'score-wrong' : '';
  const statusText = status === 'correct' ? '✓ Correct' : status === 'partial' ? '⚠ Partiel' : status === 'wrong' ? '✗ Faux' : '— Non répondu';
  
  let tableRows = '';
  if (q.type !== 'QROC') {
    tableRows = q.items.map(item => {
      const userAns = ans.selected.includes(item.letter);
      const expected = item.expected;
      const concord = userAns === expected;
      
      return `
        <tr>
          <td><strong>${item.letter}</strong></td>
          <td>${expected ? '☑' : '☐'}</td>
          <td>${userAns ? '☑' : '—'}</td>
          <td style="color:${concord ? 'var(--success)' : 'var(--error)'}">${concord ? 'Oui' : 'Non'}</td>
          <td>${item.text}</td>
        </tr>
      `;
    }).join('');
  }
  
  const tableHtml = q.type !== 'QROC' ? `
    <table class="correction-table">
      <thead>
        <tr><th>Item</th><th>Attendu</th><th>Votre rép.</th><th>OK</th><th>Libellé</th></tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  ` : `
    <div style="margin:1rem 0">
      <p><strong>Votre réponse :</strong> ${ans.selected?.[0] || '—'}</p>
      <p><strong>Réponses acceptées :</strong> ${q.accepted_answers?.join(', ') || '—'}</p>
    </div>
  `;
  
  const commentHtml = q.correction_comment ? `
    <div class="correction-comment">
      <strong>💡 Explication :</strong> ${q.correction_comment}
    </div>
  ` : '';
  
  return `
    <div class="question-correction">
      <div class="question-correction-header">
        <span class="question-correction-title">Question ${q.number}</span>
        <span class="question-score ${statusClass}">${statusText} · ${score.toFixed(1)} / 1 pt</span>
      </div>
      <p>${q.statement}</p>
      ${tableHtml}
      ${commentHtml}
    </div>
  `;
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

document.addEventListener('DOMContentLoaded', initCorrection);