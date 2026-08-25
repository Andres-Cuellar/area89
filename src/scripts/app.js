import gsap from 'gsap';

let cleanupFns = [];

function on(el, event, handler, opts) {
  if (!el) return;
  el.addEventListener(event, handler, opts);
  cleanupFns.push(() => el.removeEventListener(event, handler, opts));
}

function cleanup() {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  document.body.classList.remove('menu-open');
  document.documentElement.classList.remove('menu-open');
}

function initMenu() {
  const toggle = document.getElementById('menu-toggle');
  const overlay = document.getElementById('menu-overlay');
  const nav = document.getElementById('site-nav');
  if (!toggle || !overlay || !nav) return;

  const links = overlay.querySelectorAll('.menu-link');

  const setClosedNoAnimate = () => {
    overlay.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    document.body.classList.remove('menu-open');
    document.documentElement.classList.remove('menu-open');
    nav.classList.remove('menu-active');
    gsap.set(overlay, { opacity: 0, y: -12, visibility: 'hidden', pointerEvents: 'none' });
    gsap.set(links, { opacity: 0, y: 28 });
  };

  const setOpen = (open, animate = true) => {
    const wasOpen = overlay.classList.contains('is-open');
    if (open === wasOpen) return;

    overlay.classList.toggle('is-open', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.classList.toggle('menu-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    nav.classList.toggle('menu-active', open);

    if (!animate) {
      if (open) {
        gsap.set(overlay, { opacity: 1, y: 0, visibility: 'visible', pointerEvents: 'auto' });
        gsap.set(links, { opacity: 1, y: 0 });
      } else {
        gsap.set(overlay, { opacity: 0, y: -12, visibility: 'hidden', pointerEvents: 'none' });
        gsap.set(links, { opacity: 0, y: 28 });
      }
      return;
    }

    if (open) {
      gsap.killTweensOf([overlay, ...links]);
      gsap.set(overlay, { visibility: 'visible', pointerEvents: 'auto' });
      gsap.fromTo(
        overlay,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
      );
      gsap.fromTo(
        links,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out', delay: 0.1 },
      );
    } else {
      gsap.killTweensOf([overlay, ...links]);
      gsap.set(overlay, { opacity: 0, visibility: 'hidden', pointerEvents: 'none' });
      gsap.set(links, { opacity: 0, y: 28 });
    }
  };

  const closeMenu = () => setOpen(false);
  const openMenu = () => setOpen(true);
  const toggleMenu = () => setOpen(!overlay.classList.contains('is-open'));

  setClosedNoAnimate();

  on(toggle, 'click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });

  links.forEach((link) => on(link, 'click', closeMenu));
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  on(document, 'astro:before-preparation', () => {
    if (overlay.classList.contains('is-open')) {
      setOpen(false, false);
    }
  });

  window.__area89CloseMenu = closeMenu;
}

function initNavScroll() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const update = () => {
    if (document.body.classList.contains('menu-open')) {
      nav.classList.add('has-bg');
      return;
    }
    const hero = document.querySelector('.hero-section, .page-hero');
    if (!hero) {
      nav.classList.add('has-bg');
      return;
    }
    const past = hero.getBoundingClientRect().bottom < 80;
    nav.classList.toggle('has-bg', past || window.scrollY > 40);
  };

  update();
  on(window, 'scroll', update, { passive: true });
  on(window, 'resize', update);
}

function initScrollReveal() {
  const els = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur, .stagger-children',
  );
  if (!els.length) return;

  els.forEach((el) => el.classList.remove('visible'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );

  els.forEach((el) => observer.observe(el));
  cleanupFns.push(() => observer.disconnect());
}

function initPageIntro() {
  const main = document.querySelector('main');
  if (!main) return;

  gsap.killTweensOf(main);
  gsap.set(main, { opacity: 0, y: 20 });
  requestAnimationFrame(() => {
    gsap.to(main, {
      opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
      onComplete: () => gsap.set(main, { clearProps: 'transform,opacity' }),
    });
  });

  const heroTitle = document.querySelector('.page-hero h1, .hero-title');
  if (heroTitle) {
    gsap.killTweensOf(heroTitle);
    gsap.set(heroTitle, { opacity: 0, y: 24 });
    requestAnimationFrame(() => {
      gsap.to(heroTitle, {
        opacity: 1, y: 0, duration: 0.65, ease: 'power3.out',
      });
    });
  }
}

function initHeroSlideshow() {
  const slides = document.querySelectorAll('#hero-slideshow .hero-slide');
  const dots = document.querySelectorAll('#hero-dots .hero-dot');
  const text = document.getElementById('hero-text');
  if (!slides.length) return;

  if (text) text.classList.add('revealed');

  let index = 0;
  let timer;

  const goTo = (next) => {
    slides[index]?.classList.remove('is-active');
    dots[index]?.classList.remove('is-active');
    dots[index]?.setAttribute('aria-selected', 'false');
    index = next;
    slides[index]?.classList.add('is-active');
    dots[index]?.classList.add('is-active');
    dots[index]?.setAttribute('aria-selected', 'true');
  };

  const start = () => {
    clearInterval(timer);
    timer = setInterval(() => goTo((index + 1) % slides.length), 4500);
  };

  dots.forEach((dot, i) => {
    on(dot, 'click', () => {
      goTo(i);
      start();
    });
  });

  start();
  cleanupFns.push(() => clearInterval(timer));
}

function initExperienceSlideshow() {
  const slides = document.querySelectorAll('#experience-slideshow .experience-slide');
  if (slides.length < 2) return;

  let index = 0;
  const timer = setInterval(() => {
    slides[index].classList.remove('is-active');
    index = (index + 1) % slides.length;
    slides[index].classList.add('is-active');
  }, 3500);

  cleanupFns.push(() => clearInterval(timer));
}

function initRoomSlideshows() {
  const containers = document.querySelectorAll('[data-room-slideshow]');
  if (!containers.length) return;

  containers.forEach((container) => {
    const slides = container.querySelectorAll('img');
    const dots = container.querySelectorAll('.room-slideshow-dot');
    if (slides.length < 2) return;

    let index = 0;
    let timer;

    const goTo = (next) => {
      slides[index]?.classList.remove('is-active');
      dots[index]?.classList.remove('is-active');
      index = next;
      slides[index]?.classList.add('is-active');
      dots[index]?.classList.add('is-active');
    };

    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => goTo((index + 1) % slides.length), 4000);
    };

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        goTo(i);
        start();
      });
    });

    start();
    cleanupFns.push(() => clearInterval(timer));
  });
}

function initCountUp() {
  const nodes = document.querySelectorAll('[data-count]');
  if (!nodes.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const end = Number(el.getAttribute('data-count') || 0);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: end,
          duration: 1.8,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = String(Math.round(obj.val));
          },
        });
        observer.unobserve(el);
      });
    },
    { threshold: 0.4 },
  );

  nodes.forEach((n) => observer.observe(n));
  cleanupFns.push(() => observer.disconnect());
}

function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader || preloader.dataset.done === '1') return;
  if (sessionStorage.getItem('a89-preloader') === '1') {
    preloader.remove();
    return;
  }

  setTimeout(() => {
    preloader.classList.add('lifting');
    sessionStorage.setItem('a89-preloader', '1');
    preloader.dataset.done = '1';
    setTimeout(() => preloader.remove(), 1600);
  }, 1200);
}

function boot() {
  cleanup();
  initMenu();
  initNavScroll();
  initScrollReveal();
  initPageIntro();
  initHeroSlideshow();
  initExperienceSlideshow();
  initRoomSlideshows();
  initCountUp();
  initPreloader();
}

document.addEventListener('astro:page-load', boot);
if (document.readyState !== 'loading') boot();
else document.addEventListener('DOMContentLoaded', boot);
