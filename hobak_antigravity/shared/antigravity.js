/**
 * Antigravity Design Motion & 3D Spatial Engine
 * Based on antigravity-design-expert principles:
 * - Weightlessness (Floating micro-physics)
 * - Spatial Depth (Perspective 3D transforms & Tilt)
 * - Glassmorphism specular glare tracking
 * - Ambient Holiday Glow Orbs
 */

(function () {
  'use strict';

  // 1. 앰비언트 홀리데이 글로우 오브 생성 (스타벅스 그린 & 레드 부유 광원)
  function initAmbientOrbs() {
    if (document.querySelector('.antigravity-ambient-container')) return;

    const ambientContainer = document.createElement('div');
    ambientContainer.className = 'antigravity-ambient-container';
    ambientContainer.innerHTML = `
      <div class="ambient-orb orb-green-1"></div>
      <div class="ambient-orb orb-red-1"></div>
      <div class="ambient-orb orb-green-2"></div>
      <div class="ambient-orb orb-gold-1"></div>
    `;
    document.body.prepend(ambientContainer);
  }

  // 2. 카드 3D 틸트 및 스페큘러 글레어(반사광) 엔진
  function initCardTilt() {
    const cards = document.querySelectorAll('.product-card, .detail-main-card, .write-card-box, .seller-profile-card');

    cards.forEach((card) => {
      if (card.dataset.tiltInitialized) return;
      card.dataset.tiltInitialized = 'true';

      // 글레어(빛 반사) 레이어 추가
      let glare = card.querySelector('.antigravity-glare');
      if (!glare) {
        glare = document.createElement('div');
        glare.className = 'antigravity-glare';
        card.appendChild(glare);
      }

      const handleMouseMove = (e) => {
        const rect = card.getBoundingClientRect();
        const cardX = e.clientX - rect.left;
        const cardY = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((cardY - centerY) / centerY) * -9; // Max 9 deg
        const rotateY = ((cardX - centerX) / centerX) * 9;  // Max 9 deg

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(8px) translateY(-6px)`;

        // 빛 반사광 위치 이동
        const glareX = (cardX / rect.width) * 100;
        const glareY = (cardY / rect.height) * 100;
        glare.style.opacity = '1';
        glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 65%)`;
      };

      const handleMouseLeave = () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) translateY(0px)';
        glare.style.opacity = '0';
      };

      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
    });
  }

  // 3. 플로팅 스무스 패럴랙스 효과 (스크롤 시 살짝 부유)
  function initFloatingParallax() {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.pageYOffset;
          const orbs = document.querySelectorAll('.ambient-orb');
          orbs.forEach((orb, i) => {
            const speed = (i + 1) * 0.08;
            orb.style.transform = `translateY(${scrollY * speed}px)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // DOM 로드 시 자동 초기화 및 카드 렌더링 감지
  function init() {
    initAmbientOrbs();
    initCardTilt();
    initFloatingParallax();

    // 동적 생성 카드 감지를 위한 MutationObserver
    const observer = new MutationObserver(() => {
      initCardTilt();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.AntigravityMotion = {
    initCardTilt,
    initAmbientOrbs
  };
})();
