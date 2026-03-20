gsap.registerPlugin(ScrollTrigger);

// ── Preloader ──
(function () {
  const nav   = document.querySelector('.nav-wrapper');
  const logo  = document.querySelector('.nav-logo');
  const links = document.querySelectorAll('nav a.nav-item');

  // Lock scroll during animation
  document.body.style.overflow = 'hidden';

  // 1. Split each link's text into masked chars first
  links.forEach(link => {
    link.innerHTML = [...link.textContent].map(ch =>
      `<span class="char-outer"><span class="char-inner">${ch === ' ' ? '&nbsp;' : ch}</span></span>`
    ).join('');
  });

  // 2. Capture natural nav dimensions after split so height is accurate
  const naturalTop    = nav.getBoundingClientRect().top;
  const naturalHeight = nav.offsetHeight;

  // Store for use by intro overlay
  nav.dataset.naturalTop    = naturalTop;
  nav.dataset.naturalHeight = naturalHeight;

  // 3. Set full-screen initial state
  gsap.set(nav, { top: 0, height: '100vh' });

  // Measure logo position inside full-screen nav, calculate center offset
  const logoRect = logo.getBoundingClientRect();
  const cx = window.innerWidth  / 2 - logoRect.left - logoRect.width  / 2;
  const cy = window.innerHeight / 2 - logoRect.top  - logoRect.height / 2;
  gsap.set(logo, { x: cx, y: cy });

  // Hide chars below their mask
  gsap.set('.char-inner', { xPercent: -110 });

  // 4. Build timeline
  gsap.timeline({
    delay: 1,
    onComplete() {
      // Hand control back to CSS so the nav stays responsive on resize
      gsap.set(nav,  { clearProps: 'top,height' });
      gsap.set(logo, { clearProps: 'x,y' });
      document.body.style.overflow = '';
      ScrollTrigger.refresh();
    },
  })
  .to(nav, {
    top: naturalTop,
    height: naturalHeight,
    duration: 1,
    ease: 'power3.inOut',
  })
  .to(logo, {
    x: 0, y: 0,
    duration: 1.3,
    ease: 'power3.inOut',
  }, 0) // starts at the same time as nav collapse
  .to('.char-inner', {
    xPercent: 0,
    duration: 0.5,
    ease: 'power2.out',
    stagger: 0.033,
  }, '<0.25'); // slight offset after logo starts
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
    if (item.type === 'video') {
      el = document.createElement('video');
      el.src = item.src;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.preload = 'none';
      el.setAttribute('playsinline', '');
    } else {
      el = document.createElement('img');
      el.src = item.src;
      el.alt = project.title;
      el.loading = 'lazy';
    }

    mediaWrapper.appendChild(el);
    section.appendChild(mediaWrapper);
    container.appendChild(section);

    // Play/pause video as section enters/leaves view
    if (item.type === 'video') {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 80%',
        end: 'bottom 20%',
        onEnter:      () => el.play(),
        onEnterBack:  () => el.play(),
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

if (firstSection) {
  ScrollTrigger.create({
    trigger: firstSection,
    start: 'top 50%',
    onEnter: () => {
      gsap.to(navEl,    { opacity: 0, y: -6, duration: 0.18, ease: 'power2.out' });
      gsap.to(navTitle, { opacity: 1, y: 0,  duration: 0.18, ease: 'power2.out' });
    },
    onLeaveBack: () => {
      gsap.to(navEl,    { opacity: 1, y: 0,  duration: 0.18, ease: 'power2.out' });
      gsap.to(navTitle, { opacity: 0, y: 6,  duration: 0.18, ease: 'power2.out' });
    },
  });
}

// ── Introduction Overlay ──
(function () {
  const nav          = document.querySelector('.nav-wrapper');
  const introLink    = document.querySelector('a[href="#about"]');
  const introOverlay = document.querySelector('.intro-overlay');
  const introClose   = document.querySelector('.intro-close');
  const introSections = document.querySelectorAll('.intro-section');

  let isOpen = false;
  let tl = null;

  introLink.addEventListener('click', e => {
    e.preventDefault();
    if (isOpen) return;
    isOpen = true;
    document.body.style.overflow = 'hidden';

    if (tl) tl.kill();
    tl = gsap.timeline()
      .to(nav, { top: 0, height: '100vh', duration: 0.8, ease: 'power3.inOut' })
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
        document.body.style.overflow = '';
      },
    })
    .to(introSections, { y: -8, autoAlpha: 0, duration: 0.2, stagger: 0.05, ease: 'power2.in' })
    .to(introOverlay, { autoAlpha: 0, duration: 0.25 }, '-=0.1')
    .to(nav, { top: naturalTop, height: naturalHeight, duration: 0.7, ease: 'power3.inOut' }, '-=0.15');
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
