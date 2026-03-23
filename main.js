gsap.registerPlugin(ScrollTrigger);

// ── Preloader ──
(function () {
  const nav         = document.querySelector('.nav-wrapper');
  const logo        = document.querySelector('.nav-logo');
  const links       = document.querySelectorAll('nav a.nav-item');
  const preloaderBg = document.querySelector('.preloader-bg');

  // Lock scroll and split chars immediately — before any async wait
  document.body.style.overflow = 'hidden';

  links.forEach(link => {
    link.innerHTML = [...link.textContent].map(ch =>
      `<span class="char-outer"><span class="char-inner">${ch === ' ' ? '&nbsp;' : ch}</span></span>`
    ).join('');
  });

  // Wait for fonts before measuring — custom font changes logo dimensions,
  // causing wrong cx/cy if measured before it loads (first visit, no cache)
  document.fonts.ready.then(() => {
    // Reveal nav now that we're about to position the logo — prevents the
    // flash of nav content visible above the preloader-bg before JS runs
    nav.classList.remove('is-preloading');

    // Measure nav's natural position (nav sits at its final position throughout)
    const naturalTop    = nav.getBoundingClientRect().top;
    const naturalHeight = nav.offsetHeight;

    nav.dataset.naturalTop    = naturalTop;
    nav.dataset.naturalHeight = naturalHeight;

    // Center logo via pure x/y transform — no layout properties, fully GPU composited
    const logoRect = logo.getBoundingClientRect();
    const cx = window.innerWidth  / 2 - logoRect.left - logoRect.width  / 2;
    const cy = window.innerHeight / 2 - logoRect.top  - logoRect.height / 2;
    gsap.set(logo, { x: cx, y: cy });

    // Hide chars below their mask
    gsap.set('.char-inner', { xPercent: -110 });

    // Lock preloader-bg to a concrete pixel height before animating
    // (inset:0 in CSS covers all edges; we convert to explicit px so GSAP
    // can tween height/top cleanly without fighting the CSS bottom:0)
    gsap.set(preloaderBg, { height: preloaderBg.offsetHeight, bottom: 'auto' });

    // Build timeline — preloader-bg collapses via height (no clip-path, avoids
    // a mobile Safari first-paint bug where fixed+clip-path can render invisible)
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
    }, isMobile ? '>-0.6' : '<0.25');
  });
})();
// ── End Preloader ──

const container = document.getElementById('projects');

projects.forEach(project => {
  project.media.forEach(item => {
    const section = document.createElement('section');
    section.className = 'project-section';
    section.dataset.title = project.title;

    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'project-media';

    let el;
    let loadVideo;
    if (item.type === 'video') {
      el = document.createElement('video');
      el.muted = true;
      el.playsInline = true;
      const hlsUrl = `https://customer-trj51pd1actx761y.cloudflarestream.com/${item.src}/manifest/video.m3u8?clientBandwidthHint=5`;
      let hlsLoaded = false;

      loadVideo = () => {
        if (hlsLoaded) return;
        hlsLoaded = true;
        if (el.canPlayType('application/vnd.apple.mpegurl')) {
          el.src = hlsUrl;
          el.loop = true;
        } else if (window.Hls && Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(hlsUrl);
          hls.attachMedia(el);
          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            hls.currentLevel = data.levels.length - 1;
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (!data.fatal) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              hls.destroy();
            }
          });
          el.addEventListener('ended', () => {
            el.currentTime = 0;
            el.play().catch(() => {});
          });
        }
      };
    } else {
      el = document.createElement('img');
      el.src = item.src;
      el.alt = project.title;
      el.loading = 'lazy';
    }

    mediaWrapper.appendChild(el);
    section.appendChild(mediaWrapper);
    container.appendChild(section);

    // Load and play/pause video as section enters/leaves view
    if (item.type === 'video') {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 120%',
        end: 'bottom 20%',
        onEnter:      () => { loadVideo(); el.play().catch(() => {}); },
        onEnterBack:  () => { loadVideo(); el.play().catch(() => {}); },
        onLeave:      () => el.pause(),
        onLeaveBack:  () => el.pause(),
      });
    }
  });
});

// Fade nav background to transparent when first project reaches the nav
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
    }
  });
}

// Nav items ↑ out / project title ↑ in swap
const navEl = document.querySelector('nav');
const navTitle = document.querySelector('.nav-project-title');

gsap.set(navTitle, { opacity: 0, y: 6 });
gsap.set('.view-toggle', { autoAlpha: 0 });

if (firstSection) {
  ScrollTrigger.create({
    trigger: firstSection,
    start: 'top 50%',
    onEnter: () => {
      gsap.to(navEl.querySelectorAll('a.nav-item'), { opacity: 0, y: -6, duration: 0.18, ease: 'power2.out', pointerEvents: 'none' });
      gsap.to(navTitle, { opacity: 1, y: 0,  duration: 0.18, ease: 'power2.out' });
      if (!document.documentElement.classList.contains('list-view-mode')) {
        gsap.to('.view-toggle', { autoAlpha: 1, duration: 0.18, ease: 'power2.out' });
      }
    },
    onLeaveBack: () => {
      gsap.to(navEl.querySelectorAll('a.nav-item'), { opacity: 1, y: 0,  duration: 0.18, ease: 'power2.out', pointerEvents: 'auto' });
      gsap.to(navTitle, { opacity: 0, y: 6,  duration: 0.18, ease: 'power2.out' });
      if (!document.documentElement.classList.contains('list-view-mode')) {
        gsap.to('.view-toggle', { autoAlpha: 0, duration: 0.18, ease: 'power2.out' });
      }
    },
  });
}

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

    // Distance to move nav items from vertical center to near the top
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

// Update nav title text as each section scrolls into view
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
  const viewToggle = document.querySelector('.view-toggle');
  const feedBtn    = document.querySelector('.view-btn--feed');
  const listBtn    = document.querySelector('.view-btn--list');
  const listEl     = document.getElementById('list-view');
  const projectsEl = document.getElementById('projects');
  const heroEl    = document.querySelector('.page-section-full');
  const html      = document.documentElement;

  let built = false;

  // ── Shared background preview ──
  const preview = document.createElement('div');
  preview.className = 'list-bg-preview';
  const prevImg = document.createElement('img');
  const prevVid = document.createElement('video');
  prevVid.muted       = true;
  prevVid.playsInline = true;
  prevVid.loop        = true;
  preview.append(prevImg, prevVid);
  document.body.appendChild(preview);

  let hlsInstance = null;
  const navWrapper = document.querySelector('.nav-wrapper');

  function showPreview(type, src) {
    if (type === 'image') {
      prevImg.style.display = 'block';
      prevVid.style.display = 'none';
      prevImg.src = src;
    } else {
      prevImg.style.display = 'none';
      prevVid.style.display = 'block';
      loadHlsInto(src, prevVid, true);
    }
    preview.classList.add('is-visible');
  }

  function hidePreview() {
    preview.classList.remove('is-visible');
    prevVid.pause();
    destroySharedHls();
    prevVid.removeAttribute('src');
  }

  function loadHlsInto(id, videoEl, isShared) {
    if (isShared) destroySharedHls();
    const url = `https://customer-trj51pd1actx761y.cloudflarestream.com/${id}/manifest/video.m3u8?clientBandwidthHint=5`;
    if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = url;
      videoEl.play().catch(() => {});
      return null;
    } else if (window.Hls && Hls.isSupported()) {
      const h = new Hls();
      h.loadSource(url);
      h.attachMedia(videoEl);
      h.on(Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(() => {}));
      if (isShared) hlsInstance = h;
      return h;
    }
    return null;
  }

  function destroySharedHls() {
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  }

  // ── Build list from projects data ──
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

      // Desktop: background preview on hover (pointer devices only)
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
          // Desktop: exit list, jump to the corresponding feed section
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
          // Mobile: tap to expand/collapse inline
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
      mediaDiv.appendChild(vid);
      mediaDiv._hls = loadHlsInto(item.src, vid, false);
    }
  }

  function collapseRow(li) {
    li.classList.remove('is-expanded');
    const mediaDiv = li.querySelector('.list-row-media');
    const vid = mediaDiv.querySelector('video');
    if (vid) {
      vid.pause();
      if (mediaDiv._hls) { mediaDiv._hls.destroy(); mediaDiv._hls = null; }
    }
    mediaDiv.innerHTML = '';
  }

  // ── Toggle ──
  function enterList() {
    buildList();
    // Pause all feed videos before hiding them — stops HLS segment fetching
    projectsEl.querySelectorAll('video').forEach(v => v.pause());
    html.classList.add('list-view-mode');
    listEl.classList.add('is-active');
    heroEl.style.display    = 'none';
    projectsEl.style.display = 'none';
    document.body.style.overflow = 'hidden';
    listBtn.classList.add('is-active');
    feedBtn.classList.remove('is-active');
    gsap.set(viewToggle, { autoAlpha: 1 });
  }

  function enterFeed() {
    html.classList.remove('list-view-mode');
    listEl.classList.remove('is-active');
    heroEl.style.display    = '';
    projectsEl.style.display = '';
    document.body.style.overflow = '';
    feedBtn.classList.add('is-active');
    listBtn.classList.remove('is-active');
    hidePreview();
    if (built) listEl.querySelectorAll('.list-row.is-expanded').forEach(r => collapseRow(r));
    const pastTrigger = firstSection && firstSection.getBoundingClientRect().top < window.innerHeight * 0.5;
    gsap.set(viewToggle, { autoAlpha: pastTrigger ? 1 : 0 });
    ScrollTrigger.refresh();
  }

  listBtn.addEventListener('click', enterList);
  feedBtn.addEventListener('click', enterFeed);
})();
// ── End List View ──
