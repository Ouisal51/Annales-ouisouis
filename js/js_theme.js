const THEME_KEY = 'app_theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme, false);
}

function applyTheme(theme, save = true) {
  document.documentElement.setAttribute('data-theme', theme);
  if (save) localStorage.setItem(THEME_KEY, theme);
  
  const icons = document.querySelectorAll('#theme-icon, #theme-icon-menu');
  icons.forEach(icon => {
    icon.textContent = theme === 'dark' ? '☀' : '🌙';
  });
  
  const input = document.getElementById('theme-toggle-input');
  if (input) input.checked = theme === 'dark';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

initTheme();

document.addEventListener('DOMContentLoaded', () => {
  const themeBtn = document.getElementById('home-theme-btn') || document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }
  
  const themeInput = document.getElementById('theme-toggle-input');
  if (themeInput) {
    themeInput.addEventListener('change', toggleTheme);
  }
});