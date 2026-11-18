/**
 * Hobak Market - Dynamic UI Theme Switcher
 * Allows user to toggle between:
 * 1. 'classic'     - Warm Orange Hobak / Carrot Market Theme
 * 2. 'starbucks'   - Starbucks Deep Green & Holiday Cup Red Theme
 * 3. 'antigravity' - 3D Spatial Canvas, Weightless Glassmorphism & Isometric Mode
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'hobak_selected_ui_theme';
  const DEFAULT_THEME = 'starbucks'; // 기본값

  function getSavedTheme() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  }

  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem(STORAGE_KEY, themeName);

    // 독 버튼 active 상태 업데이트
    document.querySelectorAll('.dock-btn').forEach(btn => {
      if (btn.getAttribute('data-set-theme') === themeName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 로고 태그 및 텍스트 맞춤 변경
    const ribbonTag = document.querySelector('.logo-ribbon-tag');
    const subText = document.querySelector('.logo-text-en');
    if (ribbonTag && subText) {
      if (themeName === 'classic') {
        ribbonTag.textContent = 'ORIGINAL';
        ribbonTag.style.background = '#FF6F0F';
        subText.textContent = 'CARROT STYLE';
        subText.style.color = '#FF6F0F';
      } else if (themeName === 'starbucks') {
        ribbonTag.textContent = 'HOLIDAY';
        ribbonTag.style.background = '#C8102E';
        subText.textContent = 'STARBUCKS EDITION';
        subText.style.color = '#006241';
      } else if (themeName === 'antigravity') {
        ribbonTag.textContent = '3D SPATIAL';
        ribbonTag.style.background = 'linear-gradient(135deg, #006241, #C8102E)';
        subText.textContent = 'ANTIGRAVITY EXPERT';
        subText.style.color = '#006241';
      }
    }

    // Antigravity 모드 진입/해제 시 모션 엔진 트리거
    if (window.AntigravityExpert) {
      window.AntigravityExpert.onThemeChange(themeName);
    }
  }

  function createSwitcherDock() {
    if (document.querySelector('.ui-switcher-dock')) return;

    const dock = document.createElement('div');
    dock.className = 'ui-switcher-dock';
    dock.setAttribute('role', 'region');
    dock.setAttribute('aria-label', 'UI 테마 선택기');

    dock.innerHTML = `
      <div class="dock-label">
        <span>🎨</span>
        <span>UI 모드</span>
      </div>
      <button type="button" class="dock-btn" data-set-theme="classic" title="따뜻한 주황색 클래식 호박마켓">
        <span>🥕</span>
        <span>호박 클래식</span>
      </button>
      <button type="button" class="dock-btn" data-set-theme="starbucks" title="스타벅스 딥 그린 & 홀리데이 레드 테마">
        <span>☕</span>
        <span>스타벅스</span>
      </button>
      <button type="button" class="dock-btn" data-set-theme="antigravity" title="무중력 글래스모피즘 & 3D 공간 깊이감">
        <span>🌌</span>
        <span>Antigravity 3D</span>
      </button>
      <button type="button" class="dock-isometric-btn" id="btnToggleIsometric" title="아이소메트릭 3D 뷰 전환 (Antigravity 모드 전용)">
        <span>📐</span>
        <span>3D 틸트 뷰</span>
      </button>
    `;

    document.body.appendChild(dock);

    // 이벤트 리스너 바인딩
    dock.querySelectorAll('.dock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-set-theme');
        applyTheme(selected);
      });
    });

    const isoBtn = dock.querySelector('#btnToggleIsometric');
    if (isoBtn) {
      isoBtn.addEventListener('click', () => {
        document.body.classList.toggle('isometric-grid-mode');
        isoBtn.classList.toggle('is-active');
      });
    }
  }

  function init() {
    const currentTheme = getSavedTheme();
    document.documentElement.setAttribute('data-theme', currentTheme);
    createSwitcherDock();
    applyTheme(currentTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HobakTheme = {
    applyTheme,
    getSavedTheme
  };
})();
