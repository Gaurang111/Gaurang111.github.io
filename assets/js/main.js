/**
 * iPortfolio Advanced JS
 * Combines particle animation, Typed.js, Isotope, scroll animations, and UI interactions
 */
(function() {
  "use strict";

  /*** ---------------- PARTICLE NET ANIMATION ---------------- ***/
  const canvas = document.getElementById("netCanvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const hero = document.getElementById("hero");
    const mouse = { x: null, y: null };
    const CONNECT_RADIUS = 150;
    let particles = [];

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.15;
        this.vy = (Math.random() - 0.5) * 0.15;
        this.size = Math.random() * 1.5 + 0.5;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8 + 0.2})`;
        ctx.fill();
      }
    }

    function calculateParticleCount() {
      const area = canvas.width * canvas.height;
      const baseArea = 1920 * 1080;
      return Math.floor((area / baseArea) * 220);
    }

    function initParticles() {
      particles = [];
      const count = calculateParticleCount();
      for (let i = 0; i < count; i++) particles.push(new Particle());
    }

    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        if (mouse.x !== null) {
          const dx = p1.x - mouse.x;
          const dy = p1.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_RADIUS) {
            ctx.strokeStyle = `rgba(255,255,255,${1 - dist / CONNECT_RADIUS})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_RADIUS) {
            ctx.strokeStyle = `rgba(255,255,255,${1 - dist / CONNECT_RADIUS})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    }

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      drawConnections();
      requestAnimationFrame(animateParticles);
    }

    function resizeCanvas() {
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      initParticles();
    }

    window.addEventListener("mousemove", e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    animateParticles();
  }

  /*** ---------------- HEADER & NAV ---------------- ***/
  const headerToggleBtn = document.querySelector('.header-toggle');
  if (headerToggleBtn) {
    headerToggleBtn.addEventListener('click', () => {
      document.querySelector('#header').classList.toggle('header-show');
      headerToggleBtn.classList.toggle('bi-list');
      headerToggleBtn.classList.toggle('bi-x');
    });
  }

  document.querySelectorAll('#navmenu a').forEach(link => {
    link.addEventListener('click', () => {
      if (document.querySelector('.header-show')) {
        document.querySelector('#header').classList.remove('header-show');
        headerToggleBtn.classList.add('bi-list');
        headerToggleBtn.classList.remove('bi-x');
      }
    });
  });

  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      btn.parentNode.classList.toggle('active');
      btn.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });

  /*** ---------------- PRELOADER ---------------- ***/
  const preloader = document.querySelector('#preloader');
  if (preloader) window.addEventListener('load', () => preloader.remove());

  /*** ---------------- SCROLL TOP ---------------- ***/
  const scrollTopBtn = document.querySelector('.scroll-top');
  function toggleScrollTop() {
    if (scrollTopBtn) window.scrollY > 100 ? scrollTopBtn.classList.add('active') : scrollTopBtn.classList.remove('active');
  }
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop);

  /*** ---------------- TYPED.JS ROLE PITCH ---------------- ***/
  const rolePitches = {
      "Data Scientist": "I extract insights from data and drive decisions.",
      "ML Engineer": "I build and train models for real-world impact.",
      "Developer": "I build solutions that deploy and optimize ML models."
    };

    const typed = new Typed('#typedRoles', {
      strings: Object.keys(rolePitches),
      typeSpeed: 40,
      backSpeed: 40,
      backDelay: 3000,
      loop: true,
      onStringTyped: function(arrayPos, self) {
        const pitchEl = document.getElementById('rolePitch');
        pitchEl.classList.add('fade-out');           
        setTimeout(() => {
          const role = self.strings[arrayPos];
          pitchEl.textContent = rolePitches[role];  
          pitchEl.classList.remove('fade-out');     
        }, 300); 
      }
    });

  /*** ---------------- AOS INIT ---------------- ***/
  function aosInit() {
    AOS.init({ duration: 600, easing: 'ease-in-out', once: true, mirror: false });
  }
  window.addEventListener('load', aosInit);

  /*** ---------------- PURE COUNTER ---------------- ***/
  if (typeof PureCounter !== "undefined") new PureCounter();

  /*** ---------------- SKILLS PROGRESS ANIMATION ---------------- ***/
  document.querySelectorAll('.skills-animation').forEach(item => {
    new Waypoint({
      element: item,
      offset: '80%',
      handler: function() {
        item.querySelectorAll('.progress .progress-bar').forEach(el => {
          el.style.width = el.getAttribute('aria-valuenow') + '%';
        });
      }
    });
  });

  /*** ---------------- GLIGHTBOX ---------------- ***/
  if (typeof GLightbox !== "undefined") GLightbox({ selector: '.glightbox' });

  /*** ---------------- SWIPER SLIDERS ---------------- ***/
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(swiperEl => {
      const config = JSON.parse(swiperEl.querySelector(".swiper-config").innerHTML.trim());
      if (swiperEl.classList.contains("swiper-tab")) initSwiperWithCustomPagination(swiperEl, config);
      else new Swiper(swiperEl, config);
    });
  }
  window.addEventListener("load", initSwiper);

  /*** ---------------- ISOTOPE FILTERS ---------------- ***/
  window.addEventListener('load', () => {
    document.querySelectorAll('.isotope-layout').forEach(isotopeItem => {
      const layout = isotopeItem.getAttribute('data-layout') ?? 'masonry';
      const filter = isotopeItem.getAttribute('data-default-filter') ?? '*';
      const sort = isotopeItem.getAttribute('data-sort') ?? 'original-order';
      const container = isotopeItem.querySelector('.isotope-container');

      imagesLoaded(container, () => {
        const iso = new Isotope(container, {
          itemSelector: '.isotope-item',
          layoutMode: layout,
          filter: filter,
          sortBy: sort
        });

        // Filter buttons
        isotopeItem.querySelectorAll('.isotope-filters li').forEach(btn => {
          btn.addEventListener('click', () => {
            isotopeItem.querySelector('.filter-active').classList.remove('filter-active');
            btn.classList.add('filter-active');
            iso.arrange({ filter: btn.getAttribute('data-filter') });
          });
        });
      });
    });
  });

  /*** ---------------- SCROLLSPY ---------------- ***/
  const navLinks = document.querySelectorAll('.navmenu a');
  function scrollSpy() {
    navLinks.forEach(link => {
      if (!link.hash) return;
      const section = document.querySelector(link.hash);
      if (!section) return;
      const pos = window.scrollY + 200;
      if (pos >= section.offsetTop && pos <= section.offsetTop + section.offsetHeight) {
        document.querySelectorAll('.navmenu a.active').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  window.addEventListener('load', scrollSpy);
  document.addEventListener('scroll', scrollSpy);

  /*** ---------------- HASH SCROLL CORRECTION ---------------- ***/
  window.addEventListener('load', () => {
    if (window.location.hash && document.querySelector(window.location.hash)) {
      const section = document.querySelector(window.location.hash);
      setTimeout(() => {
        const scrollMarginTop = parseInt(getComputedStyle(section).scrollMarginTop) || 0;
        window.scrollTo({ top: section.offsetTop - scrollMarginTop, behavior: 'smooth' });
      }, 100);
    }
  });

})();
