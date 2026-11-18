/**
 * Antigravity Design Expert Motion Engine
 * Based on sickn33/agentic-awesome-skills (skills/antigravity-design-expert/SKILL.md)
 * Principles:
 * - Weightlessness: Soft layered diffused drop shadows
 * - Spatial Depth: Z-axis layering & perspective (1200px)
 * - Glassmorphism: Specular glare tracking & background blur
 * - Isometric Snapping: 3D transforms (rotateX, rotateZ)
 */

(function () {
  'use strict';

  let ambientContainer = null;
  let isAntigravityActive = false;

  function ensureAmbientOrbs(active) {
    if (active) {
      if (!ambientContainer) {
        ambientContainer = document.createElement('div');
        ambientContainer.className = 'antigravity-ambient-container';
        ambientContainer.innerHTML = `
          <div class="ambient-orb orb-green-1"></div>
          <div class="ambient-orb orb-red-1"></div>
          <div class="ambient-orb orb-green-2"></div>
          <div class="ambient-orb orb-gold-1"></div>
        `;
        document.body.prepend(ambientContainer);
      }
      ambientContainer.style.display = 'block';
    } else {
      if (ambientContainer) {
        ambientContainer.style.display = 'none';
      }
    }
  }

  function init3DTilt() {
    const cards = document.querySelectorAll('.product-card, .detail-main-card, .write-card-box');

    cards.forEach(card => {
      if (card.dataset.tiltInitialized) return;
      card.dataset.tiltInitialized = 'true';

      let glare = card.querySelector('.antigravity-glare');
      if (!glare) {
        glare = document.createElement('div');
        glare.className = 'antigravity-glare';
        card.appendChild(glare);
      }

      card.addEventListener('mousemove', e => {
        if (!isAntigravityActive) return;

        const rect = card.getBoundingClientRect();
        const cardX = e.clientX - rect.left;
        const cardY = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((cardY - centerY) / centerY) * -8;
        const rotateY = ((cardX - centerX) / centerX) * 8;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(10px) translateY(-6px)`;

        const glareX = (cardX / rect.width) * 100;
        const glareY = (cardY / rect.height) * 100;
        glare.style.opacity = '1';
        glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 65%)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        if (glare) glare.style.opacity = '0';
      });
    });
  }

  function onThemeChange(themeName) {
    isAntigravityActive = (themeName === 'antigravity');
    ensureAmbientOrbs(isAntigravityActive);

    if (!isAntigravityActive) {
      document.body.classList.remove('isometric-grid-mode');
      const isoBtn = document.getElementById('btnToggleIsometric');
      if (isoBtn) isoBtn.classList.remove('is-active');

      document.querySelectorAll('.product-card, .detail-main-card, .write-card-box').forEach(card => {
        card.style.transform = '';
      });
    } else {
      init3DTilt();
    }
  }

  function init() {
    init3DTilt();
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'starbucks';
    onThemeChange(currentTheme);

    const observer = new MutationObserver(() => {
      init3DTilt();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.AntigravityExpert = {
    onThemeChange,
    init3DTilt
  };
})();
