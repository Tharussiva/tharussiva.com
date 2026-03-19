gsap.registerPlugin(ScrollTrigger);

const container = document.getElementById('projects');

// View toggle (Feed / Grid)
const feedBtn = document.getElementById('feed-toggle');
const gridBtn = document.getElementById('grid-toggle');

feedBtn.addEventListener('click', () => {
  container.classList.remove('grid-mode');
  document.documentElement.classList.remove('grid-mode');
  feedBtn.classList.add('active');
  gridBtn.classList.remove('active');
  ScrollTrigger.refresh();
});

gridBtn.addEventListener('click', () => {
  container.classList.add('grid-mode');
  document.documentElement.classList.add('grid-mode');
  gridBtn.classList.add('active');
  feedBtn.classList.remove('active');
  ScrollTrigger.refresh();
});

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
        onEnter:      () => /** @type {HTMLVideoElement} */ (el).play(),
        onEnterBack:  () => /** @type {HTMLVideoElement} */ (el).play(),
        onLeave:      () => /** @type {HTMLVideoElement} */ (el).pause(),
        onLeaveBack:  () => /** @type {HTMLVideoElement} */ (el).pause(),
      });
    }
  });
});

// Fade nav background to transparent + show grid button when first project reaches the nav
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

  gsap.to('.view-toggle-bottom', {
    opacity: 1,
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
      gsap.to(navEl,    { opacity: 0, y: -6, duration: 0.3, ease: 'power2.inOut' });
      gsap.to(navTitle, { opacity: 1, y: 0,  duration: 0.3, ease: 'power2.inOut' });
    },
    onLeaveBack: () => {
      gsap.to(navEl,    { opacity: 1, y: 0,  duration: 0.3, ease: 'power2.inOut' });
      gsap.to(navTitle, { opacity: 0, y: 6,  duration: 0.3, ease: 'power2.inOut' });
    },
  });
}

// Update nav title text as each section scrolls into view
container.querySelectorAll('.project-section').forEach(section => {
  ScrollTrigger.create({
    trigger: section,
    start: 'top 50%',
    onEnter:     () => { navTitle.textContent = section.dataset.title; },
    onEnterBack: () => { navTitle.textContent = section.dataset.title; },
  });
});
