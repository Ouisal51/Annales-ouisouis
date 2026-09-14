const STORAGE_PREFIX = 'annale_progress_';

function getStorageKey(annaleId) {
  return STORAGE_PREFIX + annaleId;
}

function createFreshProgress(annaleId) {
  return {
    annaleId,
    startedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    elapsedSeconds: 0,
    isPaused: false,
    chronoEnabled: false,
    answers: {},
    viewedQuestions: [],
    currentQuestionId: null,
    completed: false,
    completedAt: null,
    mode: 'exam',
    autoScrollEnabled: false,
    progressBarVisible: true,
  };
}

function loadProgress(annaleId) {
  try {
    const raw = localStorage.getItem(getStorageKey(annaleId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erreur lecture localStorage:', e);
    return null;
  }
}

function saveProgress(annaleId, progress) {
  try {
    localStorage.setItem(getStorageKey(annaleId), JSON.stringify(progress));
  } catch (e) {
    console.error('Erreur écriture localStorage:', e);
  }
}

function getAnnaleStatus(annaleId) {
  const progress = loadProgress(annaleId);
  if (!progress) return 'not_started';
  if (progress.completed) return 'completed';
  return 'in_progress';
}

function getProgressStats(progress) {
  if (!progress) return { validated: 0, answered: 0 };
  let validated = 0;
  let answered = 0;
  for (const key in progress.answers) {
    const ans = progress.answers[key];
    if (ans.validated) validated++;
    if (ans.selected && ans.selected.length > 0) answered++;
  }
  return { validated, answered };
}

function getAllRecentAnnales(maxCount = 3) {
  const results = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    const annaleId = key.slice(STORAGE_PREFIX.length);
    const progress = loadProgress(annaleId);
    if (!progress) continue;
    results.push({ annaleId, progress });
  }
  results.sort((a, b) => {
    const ta = b.progress.lastOpenedAt || b.progress.startedAt || '';
    const tb = a.progress.lastOpenedAt || a.progress.startedAt || '';
    return ta.localeCompare(tb);
  });
  return results.slice(0, maxCount);
}