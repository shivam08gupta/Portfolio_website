(() => {
  // ==========================================================================
  // CONFIGURATION & STATE
  // ==========================================================================
  const CONFIG = {
    frameCount: 240,
    framePath: (index) => `frames/frame_${String(index).padStart(6, '0')}.png`,
    lerpDamping: 0.14,            // Silky smooth inertia factor
    scrollSensitivity: 1 / 2200, // Scroll distance for 0-240 frames
    fitMode: 'cover',
  };

  const state = {
    progress: 0,
    targetProgress: 0,
    loadedCount: 0,
    images: [],
    isLoaded: false,
    lastRenderedFrame: -1,
    lastValidImg: null,
  };

  // DOM Elements
  const heroSection = document.getElementById('hero');
  const canvas = document.getElementById('scroll-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = document.getElementById('loader');
  const loaderCircle = document.getElementById('loader-circle');
  const loaderPercent = document.getElementById('loader-percent');
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  const navLinks = document.querySelectorAll('.nav-link');
  const copyEmailBtn = document.getElementById('copy-email-btn');
  const copyText = document.getElementById('copy-text');

  // ==========================================================================
  // CANVAS RENDERING & PRELOAD PIPELINE
  // ==========================================================================
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    state.lastRenderedFrame = -1;
    const currentFrame = Math.round(state.progress * (CONFIG.frameCount - 1));
    renderFrame(currentFrame);
  }

  function renderFrame(index) {
    let img = state.images[index];

    // Fallback caching so canvas is never blank or black
    if (!img || !img.complete || img.naturalWidth === 0) {
      if (state.lastValidImg) {
        img = state.lastValidImg;
      } else {
        img = state.images.find((im) => im && im.complete && im.naturalWidth > 0);
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return;

    if (state.lastRenderedFrame === index && canvas.width === img._lastCanvasW && canvas.height === img._lastCanvasH) {
      return;
    }

    const cW = canvas.width;
    const cH = canvas.height;
    const iW = img.naturalWidth;
    const iH = img.naturalHeight;

    let renderW, renderH, offsetX, offsetY;

    if (CONFIG.fitMode === 'cover') {
      const scale = Math.max(cW / iW, cH / iH);
      renderW = iW * scale;
      renderH = iH * scale;
    } else {
      const scale = Math.min(cW / iW, cH / iH);
      renderW = iW * scale;
      renderH = iH * scale;
    }

    offsetX = (cW - renderW) / 2;
    offsetY = (cH - renderH) / 2;

    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, cW, cH);
    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

    state.lastValidImg = img;
    state.lastRenderedFrame = index;
    img._lastCanvasW = cW;
    img._lastCanvasH = cH;
  }

  function animationLoop() {
    const diff = state.targetProgress - state.progress;
    if (Math.abs(diff) > 0.0001) {
      state.progress += diff * CONFIG.lerpDamping;
    } else {
      state.progress = state.targetProgress;
    }

    const frameToDraw = Math.max(
      0,
      Math.min(CONFIG.frameCount - 1, Math.round(state.progress * (CONFIG.frameCount - 1)))
    );
    renderFrame(frameToDraw);

    requestAnimationFrame(animationLoop);
  }

  function preloadImages() {
    let loaded = 0;
    const total = CONFIG.frameCount;

    for (let i = 0; i < total; i++) {
      const img = new Image();
      img.src = CONFIG.framePath(i);

      img.onload = () => {
        loaded++;
        state.loadedCount = loaded;
        const percent = Math.round((loaded / total) * 100);

        if (loaderPercent) loaderPercent.textContent = `${percent}%`;
        if (loaderCircle) loaderCircle.setAttribute('stroke-dasharray', `${percent}, 100`);

        if (i === 0) {
          state.lastValidImg = img;
          renderFrame(0);
        }

        if (loaded === total) {
          onLoadingComplete();
        }
      };

      img.onerror = () => {
        loaded++;
        if (loaded === total) {
          onLoadingComplete();
        }
      };

      state.images.push(img);
    }
  }

  function onLoadingComplete() {
    state.isLoaded = true;
    setTimeout(() => {
      if (loader) loader.classList.add('loaded');
      renderFrame(Math.round(state.progress * (CONFIG.frameCount - 1)));
    }, 200);
  }

  // ==========================================================================
  // SCROLL-LOCK INTERACTION ENGINE
  // ==========================================================================
  function handleWheel(e) {
    const isAtPageTop = window.scrollY <= 4;
    let delta = e.deltaY;

    if (e.deltaMode === 1) delta *= 33;
    else if (e.deltaMode === 2) delta *= window.innerHeight;

    // When at top of page (on hero)
    if (isAtPageTop) {
      // Scrubbing down towards frame 240
      if (delta > 0 && state.targetProgress < 1.0) {
        e.preventDefault();
        state.targetProgress = Math.min(1.0, state.targetProgress + delta * CONFIG.scrollSensitivity);
        return;
      }

      // Scrubbing back up towards frame 0
      if (delta < 0 && state.targetProgress > 0.0) {
        e.preventDefault();
        state.targetProgress = Math.max(0.0, state.targetProgress + delta * CONFIG.scrollSensitivity);
        return;
      }
    }
  }

  let touchStartY = 0;

  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  }

  function handleTouchMove(e) {
    if (e.touches.length !== 1) return;

    const touchY = e.touches[0].clientY;
    const deltaY = touchStartY - touchY;
    touchStartY = touchY;

    const isAtPageTop = window.scrollY <= 4;

    if (isAtPageTop) {
      if (deltaY > 0 && state.targetProgress < 1.0) {
        e.preventDefault();
        state.targetProgress = Math.min(1.0, state.targetProgress + deltaY * CONFIG.scrollSensitivity * 1.5);
        return;
      }

      if (deltaY < 0 && state.targetProgress > 0.0) {
        e.preventDefault();
        state.targetProgress = Math.max(0.0, state.targetProgress + deltaY * CONFIG.scrollSensitivity * 1.5);
        return;
      }
    }
  }

  function handleKeyDown(e) {
    const isAtPageTop = window.scrollY <= 4;
    if (!isAtPageTop) return;

    const step = 0.04;

    if (['ArrowDown', 'PageDown', ' '].includes(e.key) && state.targetProgress < 1.0) {
      e.preventDefault();
      state.targetProgress = Math.min(1.0, state.targetProgress + step);
    } else if (['ArrowUp', 'PageUp'].includes(e.key) && state.targetProgress > 0.0) {
      e.preventDefault();
      state.targetProgress = Math.max(0.0, state.targetProgress - step);
    }
  }

  // ==========================================================================
  // NAVBAR & UI INTERACTIONS
  // ==========================================================================
  function handleScrollUI() {
    // Navbar glass effect on scroll
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active navigation spy
    const sections = ['hero', 'about', 'projects', 'experience', 'skills', 'contact'];
    let currentActive = 'hero';

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 200 && rect.bottom >= 200) {
          currentActive = id;
        }
      }
    });

    navLinks.forEach((link) => {
      if (link.getAttribute('href') === `#${currentActive}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Mobile menu toggle
  if (menuToggle && mobileDrawer) {
    menuToggle.addEventListener('click', () => {
      mobileDrawer.classList.toggle('active');
    });

    mobileNavLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('active');
      });
    });
  }

  // Theme toggle (Dark / Light mode)
  const themeToggleBtn = document.getElementById('theme-toggle');

  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  initTheme();

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
    });
  }

  // Copy email button functionality
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      const email = 'gupta.shivam.sp26@gmail.com';
      navigator.clipboard.writeText(email).then(() => {
        if (copyText) {
          copyText.textContent = 'Copied to Clipboard! ✓';
          setTimeout(() => {
            copyText.textContent = 'Copy Email';
          }, 2500);
        }
      });
    });
  }

  // ==========================================================================
  // FEATURED PROJECTS CAROUSEL CONTROLLER
  // ==========================================================================
  function initFeaturedCarousel() {
    const wrapper = document.getElementById('projects-carousel');
    const track = document.getElementById('projects-track');
    const prevBtn = document.getElementById('featured-prev-btn');
    const nextBtn = document.getElementById('featured-next-btn');
    const currentNumEl = document.getElementById('carousel-current');
    const totalNumEl = document.getElementById('carousel-total');

    if (!wrapper || !track || !prevBtn || !nextBtn) return;

    const cards = Array.from(track.children);
    const totalCards = cards.length;
    let currentIndex = 0;
    let isDragging = false;
    let startX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let draggedDistance = 0;
    let hasMoved = false;

    function getVisibleCount() {
      return window.innerWidth > 768 ? 2 : 1;
    }

    function getMaxIndex() {
      const visible = getVisibleCount();
      return Math.max(0, totalCards - visible);
    }

    function getStepDistance() {
      if (cards.length === 0) return 0;
      const cardRect = cards[0].getBoundingClientRect();
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.gap) || 0;
      return cardRect.width + gap;
    }

    function updateCarousel(animate = true) {
      const maxIndex = getMaxIndex();
      currentIndex = Math.max(0, Math.min(currentIndex, maxIndex));

      const step = getStepDistance();
      const targetTranslate = -currentIndex * step;
      currentTranslate = targetTranslate;
      prevTranslate = targetTranslate;

      if (animate) {
        track.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
      } else {
        track.style.transition = 'none';
      }
      track.style.transform = `translateX(${targetTranslate}px)`;

      // Update button disabled state
      prevBtn.disabled = currentIndex <= 0;
      nextBtn.disabled = currentIndex >= maxIndex;

      // Update counter
      if (currentNumEl) {
        currentNumEl.textContent = String(currentIndex + 1).padStart(2, '0');
      }
      if (totalNumEl) {
        totalNumEl.textContent = String(maxIndex + 1).padStart(2, '0');
      }
    }

    function slideNext() {
      const maxIndex = getMaxIndex();
      if (currentIndex < maxIndex) {
        currentIndex++;
        updateCarousel(true);
      }
    }

    function slidePrev() {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel(true);
      }
    }

    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      slidePrev();
    });

    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      slideNext();
    });

    // Touch & Mouse Dragging Engine
    function onPointerDown(e) {
      if (e.type === 'mousedown' && e.button !== 0) return;

      isDragging = true;
      hasMoved = false;
      draggedDistance = 0;
      startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      track.style.transition = 'none';
      wrapper.classList.add('is-dragging');
    }

    function onPointerMove(e) {
      if (!isDragging) return;

      const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const diffX = currentX - startX;
      draggedDistance = diffX;

      if (Math.abs(diffX) > 6) {
        hasMoved = true;
      }

      const maxIndex = getMaxIndex();
      const step = getStepDistance();
      const minTranslate = -maxIndex * step;
      const maxTranslate = 0;

      let newTranslate = prevTranslate + diffX;
      // Rubber-band resistance at boundaries
      if (newTranslate > maxTranslate) {
        newTranslate = maxTranslate + (newTranslate - maxTranslate) * 0.25;
      } else if (newTranslate < minTranslate) {
        newTranslate = minTranslate + (newTranslate - minTranslate) * 0.25;
      }

      currentTranslate = newTranslate;
      track.style.transform = `translateX(${newTranslate}px)`;
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      wrapper.classList.remove('is-dragging');

      const maxIndex = getMaxIndex();
      const threshold = 45; // Minimum px drag to trigger slide advance

      if (draggedDistance < -threshold && currentIndex < maxIndex) {
        currentIndex++;
      } else if (draggedDistance > threshold && currentIndex > 0) {
        currentIndex--;
      }

      updateCarousel(true);

      // Prevent link activation if user was dragging
      if (hasMoved) {
        const cancelClick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          window.removeEventListener('click', cancelClick, true);
        };
        window.addEventListener('click', cancelClick, true);
      }
    }

    // Touch listeners
    wrapper.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);

    // Mouse listeners
    wrapper.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    wrapper.addEventListener('mouseleave', () => {
      if (isDragging) onPointerUp();
    });

    // Keyboard navigation when focused on carousel
    wrapper.setAttribute('tabindex', '0');
    wrapper.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        slidePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        slideNext();
      }
    });

    // Window resize handler
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateCarousel(false);
      }, 80);
    });

    // Initial render
    updateCarousel(false);
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  function init() {
    resizeCanvas();
    preloadImages();
    initFeaturedCarousel();

    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('scroll', handleScrollUI, { passive: true });

    requestAnimationFrame(animationLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
