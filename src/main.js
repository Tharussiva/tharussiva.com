import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fetchProjects } from './sanity.js';
import './style.css';

gsap.registerPlugin(ScrollTrigger);

// Videos are served directly from Cloudflare R2 as .mp4 files.
// In Sanity, the `videoKey` field stores the R2 object key (filename),
// e.g. "matangia-game-theory.mp4". Upload your videos to R2, then
// add those filenames to the Sanity records.
const R2 = import.meta.env.VITE_R2_PUBLIC_URL;

// ── Preloader ──
// Starts immediately — does not need project data
(function () {
  const nav         = document.querySelector('.nav-wrapper');
  const logo        = document.querySelector('.nav-logo');
  const links       = document.querySelectorAll('nav a.nav-item');
  const preloaderBg = document.querySelector('.preloader-bg');

  document.body.style.overflow = 'hidden';

  links.forEach(link => {
    link.innerHTML = [...link.textContent].map(ch =>
      `<span class="char-outer"><span class="char-inner">${ch === ' ' ? '&nbsp;' : ch}</span></span>`
    ).join('');
  });

  document.fonts.ready.then(() => {
    nav.classList.remove('is-preloading');

    const naturalTop    = nav.getBoundingClientRect().top;
    const naturalHeight = nav.offsetHeight;

    nav.dataset.naturalTop    = naturalTop;
    nav.dataset.naturalHeight = naturalHeight;

    const logoRect = logo.getBoundingClientRect();
    const cx = window.innerWidth  / 2 - logoRect.left - logoRect.width  / 2;
    const cy = window.innerHeight / 2 - logoRect.top  - logoRect.height / 2;
    gsap.set(logo, { x: cx, y: cy });

    gsap.set('.char-inner', { xPercent: -110 });
    gsap.set(preloaderBg, { height: preloaderBg.offsetHeight, bottom: 'auto' });

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    gsap.timeline({
      delay: 1,
      onComplete() {
        preloaderBg.style.display = 'none';
        gsap.set(logo, { clearProps: 'x,y' });
        document.body.style.overflow = '';
        ScrollTrigger.refresh();
      },
    })
    .to(preloaderBg, {
      top: naturalTop,
      height: naturalHeight,
      duration: isMobile ? 0.8 : 1,
      ease: 'power3.inOut',
    })
    .to(logo, {
      x: 0, y: 0,
      duration: isMobile ? 0.9 : 1.3,
      ease: 'power3.inOut',
    }, 0)
    .to('.char-inner', {
      xPercent: 0,
      duration: isMobile ? 0.4 : 0.5,
      ease: 'power2.out',
      stagger: 0.033,
    }, isMobile ? '>' : '<0.25');
  });
})();
// ── End Preloader ──

// ── Introduction Overlay ──
(function () {
  const nav           = document.querySelector('.nav-wrapper');
  const navLogo       = nav.querySelector('.nav-logo');
  const navRight      = nav.querySelector('.nav-right');
  const introLink     = document.querySelector('a[href="#about"]');
  const introOverlay  = document.querySelector('.intro-overlay');
  const introClose    = document.querySelector('.intro-close');
  const introSections = document.querySelectorAll('.intro-section');

  let isOpen = false;
  let tl = null;

  introLink.addEventListener('click', e => {
    e.preventDefault();
    if (isOpen) return;
    isOpen = true;
    document.body.style.overflow = 'hidden';

    const targetY = -(window.innerHeight / 2 - navLogo.offsetHeight / 2 - 8);

    if (tl) tl.kill();
    tl = gsap.timeline()
      .to(nav, { top: 0, height: '100dvh', duration: 0.8, ease: 'power3.inOut' })
      .to([navLogo, navRight], { y: targetY, duration: 0.8, ease: 'power3.inOut' }, 0)
      .to(introOverlay, { autoAlpha: 1, duration: 0.3 }, '-=0.1')
      .fromTo(introSections,
        { y: 12, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.12, ease: 'power2.out' },
        '-=0.15'
      );
  });

  introClose.addEventListener('click', () => {
    if (!isOpen) return;
    isOpen = false;

    const naturalTop    = parseFloat(nav.dataset.naturalTop);
    const naturalHeight = parseFloat(nav.dataset.naturalHeight);

    if (tl) tl.kill();
    tl = gsap.timeline({
      onComplete() {
        gsap.set(nav, { clearProps: 'top,height' });
        gsap.set([navLogo, navRight], { clearProps: 'y' });
        document.body.style.overflow = '';
      },
    })
    .to(introSections, { y: -8, autoAlpha: 0, duration: 0.2, stagger: 0.05, ease: 'power2.in' })
    .to(introOverlay, { autoAlpha: 0, duration: 0.25 }, '-=0.1')
    .to([navLogo, navRight], { y: 0, duration: 0.7, ease: 'power3.inOut' }, '-=0.15')
    .to(nav, { top: naturalTop, height: naturalHeight, duration: 0.7, ease: 'power3.inOut' }, '-=0.7');
  });
})();
// ── End Introduction Overlay ──

// ── Render projects from Sanity, set up scroll effects ──
const container  = document.getElementById('projects');
const navEl      = document.querySelector('nav');
const navTitle   = document.querySelector('.nav-project-title');
const viewToggle = document.querySelector('.view-toggle');

gsap.set(navTitle, { opacity: 0, y: 6 });
gsap.set(viewToggle, { autoAlpha: 0 });

fetchProjects().then(projects => {
  document.body.style.overflow = '';

  // ── Render feed ──
  projects.forEach(project => {
    project.media.forEach(item => {
      const section = document.createElement('section');
      section.className = 'project-section';
      section.dataset.title = project.title;

      const mediaWrapper = document.createElement('div');
      mediaWrapper.className = 'project-media';

      let el;
      if (item.type === 'video') {
        el = document.createElement('video');
        el.muted       = true;
        el.playsInline = true;
        el.loop        = true;
        el.preload     = 'none';
        el.src         = `${R2}/${item.src}`;
      } else {
        el = document.createElement('img');
        el.src     = item.src;
        el.alt     = project.title;
        el.loading = 'lazy';
      }

      mediaWrapper.appendChild(el);
      section.appendChild(mediaWrapper);
      container.appendChild(section);

      if (item.type === 'video') {
        ScrollTrigger.create({
          trigger: section,
          start: 'top 80%',
          end: 'bottom 20%',
          onEnter:      () => el.play().catch(() => {}),
          onEnterBack:  () => el.play().catch(() => {}),
          onLeave:      () => el.pause(),
          onLeaveBack:  () => el.pause(),
        });
      }
    });
  });

  // Refresh ScrollTrigger now that all sections are in the DOM
  ScrollTrigger.refresh();

  // Play any videos already in the viewport when sections first render
  container.querySelectorAll('.project-section').forEach(section => {
    const video = section.querySelector('video');
    if (!video) return;
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.8 && rect.bottom > 0) {
      video.play().catch(() => {});
    }
  });

  // ── Nav background fade ──
  const firstSection = container.querySelector('.project-section');
  if (firstSection) {
    gsap.to('.nav-wrapper', {
      backgroundColor: 'rgba(0,0,0,0)',
      immediateRender: false,
      scrollTrigger: {
        trigger: firstSection,
        start: 'top 50%',
        end: 'top 30%',
        scrub: true,
      },
    });

    ScrollTrigger.create({
      trigger: firstSection,
      start: 'top 50%',
      onEnter: () => {
        gsap.to(navEl.querySelectorAll('a.nav-item'), { opacity: 0, y: -6, duration: 0.18, ease: 'power2.out', pointerEvents: 'none' });
        gsap.to(navTitle, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' });
        if (!document.documentElement.classList.contains('list-view-mode')) {
          gsap.to(viewToggle, { autoAlpha: 1, duration: 0.18, ease: 'power2.out' });
        }
      },
      onLeaveBack: () => {
        gsap.to(navEl.querySelectorAll('a.nav-item'), { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out', pointerEvents: 'auto' });
        gsap.to(navTitle, { opacity: 0, y: 6, duration: 0.18, ease: 'power2.out' });
        if (!document.documentElement.classList.contains('list-view-mode')) {
          gsap.to(viewToggle, { autoAlpha: 0, duration: 0.18, ease: 'power2.out' });
        }
      },
    });
  }

  // ── Nav title text per section ──
  container.querySelectorAll('.project-section').forEach(section => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      onEnter:     () => { navTitle.textContent = section.dataset.title; },
      onEnterBack: () => { navTitle.textContent = section.dataset.title; },
    });
  });

  // ── List View ──
  (function () {
    const feedBtn    = document.querySelector('.view-btn--feed');
    const listBtn    = document.querySelector('.view-btn--list');
    const listEl     = document.getElementById('list-view');
    const projectsEl = document.getElementById('projects');
    const heroEl     = document.querySelector('.page-section-full');
    const html       = document.documentElement;
    const navWrapper = document.querySelector('.nav-wrapper');

    let built = false;

    const preview = document.createElement('div');
    preview.className = 'list-bg-preview';
    const prevImg = document.createElement('img');
    const prevVid = document.createElement('video');
    prevVid.muted       = true;
    prevVid.playsInline = true;
    prevVid.loop        = true;
    preview.append(prevImg, prevVid);
    document.body.appendChild(preview);

    function showPreview(type, src) {
      if (type === 'image') {
        prevImg.style.display = 'block';
        prevVid.style.display = 'none';
        prevImg.src = src;
      } else {
        prevImg.style.display = 'none';
        prevVid.style.display = 'block';
        prevVid.src = `${R2}/${src}`;
        prevVid.play().catch(() => {});
      }
      preview.classList.add('is-visible');
    }

    function hidePreview() {
      preview.classList.remove('is-visible');
      prevVid.pause();
      prevVid.removeAttribute('src');
    }

    function buildList() {
      if (built) return;
      built = true;

      const items = [];
      projects.forEach(p => p.media.forEach(m => items.push({ title: p.title, type: m.type, src: m.src })));

      const images = items.filter(i => i.type === 'image').length;
      const videos = items.filter(i => i.type === 'video').length;

      const header = document.createElement('p');
      header.className = 'list-count nav-item';
      header.textContent = `${items.length} indexed — ${images} images, ${videos} videos`;
      listEl.appendChild(header);

      const ul = document.createElement('ul');
      ul.className = 'list-tree';

      items.forEach((item, i) => {
        const li = document.createElement('li');
        li.className = 'list-row';

        const head = document.createElement('div');
        head.className = 'list-row-head';

        const conn = document.createElement('span');
        conn.className = 'list-connector';
        conn.textContent = `[${i + 1}]`;

        const title = document.createElement('span');
        title.className = 'list-title';
        title.textContent = item.title;

        head.append(conn, title);

        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'list-row-media';

        li.append(head, mediaDiv);

        head.addEventListener('mouseenter', () => {
          if (window.matchMedia('(hover: hover)').matches) {
            showPreview(item.type, item.src);
            navWrapper.classList.add('list-preview-active');
          }
        });
        head.addEventListener('mouseleave', () => {
          if (window.matchMedia('(hover: hover)').matches) {
            hidePreview();
            navWrapper.classList.remove('list-preview-active');
          }
        });

        head.addEventListener('click', () => {
          if (window.matchMedia('(hover: hover)').matches) {
            hidePreview();
            enterFeed();
            requestAnimationFrame(() => {
              const target = container.querySelectorAll('.project-section')[i];
              if (!target) return;
              target.scrollIntoView({ behavior: 'instant' });
              target.classList.add('is-highlighted');
              target.addEventListener('animationend', () => target.classList.remove('is-highlighted'), { once: true });
            });
          } else {
            const expanded = li.classList.contains('is-expanded');
            ul.querySelectorAll('.list-row.is-expanded').forEach(r => collapseRow(r));
            if (!expanded) expandRow(li, item, mediaDiv);
          }
        });

        ul.appendChild(li);
      });

      listEl.appendChild(ul);
    }

    function expandRow(li, item, mediaDiv) {
      li.classList.add('is-expanded');
      if (item.type === 'image') {
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.title;
        mediaDiv.appendChild(img);
      } else {
        const vid = document.createElement('video');
        vid.muted       = true;
        vid.playsInline = true;
        vid.loop        = true;
        vid.src         = `${R2}/${item.src}`;
        vid.play().catch(() => {});
        mediaDiv.appendChild(vid);
      }
    }

    function collapseRow(li) {
      li.classList.remove('is-expanded');
      const mediaDiv = li.querySelector('.list-row-media');
      const vid = mediaDiv.querySelector('video');
      if (vid) vid.pause();
      mediaDiv.innerHTML = '';
    }

    function enterList() {
      buildList();
      projectsEl.querySelectorAll('video').forEach(v => v.pause());
      html.classList.add('list-view-mode');
      listEl.classList.add('is-active');
      heroEl.style.display     = 'none';
      projectsEl.style.display = 'none';
      document.body.style.overflow = 'hidden';
      listBtn.classList.add('is-active');
      feedBtn.classList.remove('is-active');
      gsap.set(viewToggle, { autoAlpha: 1 });
    }

    function enterFeed() {
      html.classList.remove('list-view-mode');
      listEl.classList.remove('is-active');
      heroEl.style.display     = '';
      projectsEl.style.display = '';
      document.body.style.overflow = '';
      feedBtn.classList.add('is-active');
      listBtn.classList.remove('is-active');
      hidePreview();
      if (built) listEl.querySelectorAll('.list-row.is-expanded').forEach(r => collapseRow(r));
      const firstSection = container.querySelector('.project-section');
      const pastTrigger = firstSection && firstSection.getBoundingClientRect().top < window.innerHeight * 0.5;
      gsap.set(viewToggle, { autoAlpha: pastTrigger ? 1 : 0 });
      ScrollTrigger.refresh();
    }

    listBtn.addEventListener('click', enterList);
    feedBtn.addEventListener('click', enterFeed);
  })();
  // ── End List View ──

}).catch(err => {
  document.body.style.overflow = '';
  console.error('Failed to load projects from Sanity:', err);
  container.innerHTML = `<p style="color:white;padding:2rem;font-family:monospace">Sanity error: ${err.message}</p>`;
});
