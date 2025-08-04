// Initialize Lenis for smooth scrolling
const lenis = new Lenis({
  smoothWheel: true,
  smoothTouch: true,
  wheelMultiplier: 0.8,
  lerp: 0.1
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// NAV SCROLL DETECTION
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if (nav) {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }
});

// Parallax effect
const applyParallax = () => {
  document.querySelectorAll('[data-parallax-speed]').forEach(el => {
    const speed = parseFloat(el.dataset.parallaxSpeed);
    const rect = el.getBoundingClientRect();
    const centerOfViewport = window.innerHeight / 2;
    const elementCenter = rect.top + rect.height / 2;
    const distanceToCenter = centerOfViewport - elementCenter;
    const translateY = distanceToCenter * speed;

    if (el.classList.contains('hero-bg')) {
      el.style.transform = `translateY(${translateY * 0.5}px) scale(1.1)`;
    } else {
      el.style.transform = `translateY(${translateY}px)`;
    }
  });
};

lenis.on('scroll', applyParallax);
window.addEventListener('resize', applyParallax);

// PAGE TRANSITION (FADE-IN)
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-loaded');
  applyParallax();

  // MORE BUTTON
  const moreBtn = document.querySelector('.more-btn');
  const navLinks = document.querySelector('.nav-links');

  if (moreBtn && navLinks) {
    moreBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // CUSTOM CURSOR
  if (window.matchMedia('(pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    document.body.appendChild(cursor);

    let mouseX = 0, mouseY = 0, posX = 0, posY = 0;

    const lerp = (start, end, factor) => start + (end - start) * factor;

    function animateCursor() {
      posX = lerp(posX, mouseX, 1);
      posY = lerp(posY, mouseY, 1);
      cursor.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const hoverTargets = document.querySelectorAll('a, button, .carousel-card, .blog-card, .project-card');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  // I DESIGN LETTERS SPEED-UP ON MOUSE MOVE
  const lettersSection = document.getElementById('systems');
  const lettersColumns = document.querySelectorAll('.letters-column');

  if (lettersSection && lettersColumns.length > 0) {
    lettersSection.addEventListener('mousemove', (e) => {
      const rect = lettersSection.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const speedFactor = Math.min(1 + (mouseX / rect.width) * 2, 3);
      lettersColumns.forEach(column => {
        column.style.animationDuration = `${60 / speedFactor}s`;
      });
    });

    lettersSection.addEventListener('mouseleave', () => {
      lettersColumns.forEach(column => {
        column.style.animationDuration = '60s';
      });
    });
  }

  // PHOTO SLIDER
  const slides = document.querySelector('.photo-slider .slides');
  const navButtons = document.querySelectorAll('.photo-slider .nav button');
  let currentSlide = 0;

  if (slides && navButtons.length > 0) {
    const totalSlides = slides.children.length;

    function updateSlide() {
      slides.style.transform = `translateX(-${currentSlide * 100}%)`;
      navButtons.forEach((btn, index) => {
        btn.classList.toggle('active', index === currentSlide);
      });
    }

    navButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        currentSlide = index;
        updateSlide();
      });
    });

    updateSlide();
  }

  // INTERSECTION OBSERVER FOR FADE-IN ANIMATIONS
  const elements = document.querySelectorAll('.fade-in, .carousel-section, .carousel-card, .carousel-btn, .project-card, .blog-card');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
  elements.forEach(element => observer.observe(element));

  // THREE.JS KLEIN BOTTLE
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg'), alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.position.z = 5;

  const geometry = new THREE.ParametricGeometry((u, v, target) => {
    const a = 2, b = 1;
    const x = (a + b * Math.cos(2 * Math.PI * u)) * Math.cos(2 * Math.PI * v);
    const y = (a + b * Math.cos(2 * Math.PI * u)) * Math.sin(2 * Math.PI * v);
    const z = b * Math.sin(2 * Math.PI * u);
    target.set(x, y, z);
  }, 48, 48);

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#A5D8FF'),
    wireframe: true,
    side: THREE.DoubleSide
  });
  const kleinBottle = new THREE.Mesh(geometry, material);
  scene.add(kleinBottle);

  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
  });

  function animate() {
    requestAnimationFrame(animate);
    kleinBottle.rotation.x += mouseY * 0.01;
    kleinBottle.rotation.y += mouseX * 0.01;
    const time = Date.now() * 0.001;
    material.color.setHSL(Math.abs(Math.sin(time * 0.1)), 0.7, 0.5);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Make entire project cards clickable
  document.querySelectorAll('.project-card').forEach(card => {
    const linkHref = card.querySelector('a').href;
    if (linkHref) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        if (e.target.tagName === 'A' || e.target.closest('A')) return;
        window.location.href = linkHref;
      });
    }
  });

  // THEME TOGGLE FUNCTIONALITY
  const themeToggleBtn = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme');

  const applyTheme = (themeName) => {
    document.body.dataset.theme = themeName;
    localStorage.setItem('theme', themeName);
    const icon = themeToggleBtn.querySelector('.theme-icon');
    if (themeName === 'dark') {
      icon.textContent = 'light_mode';
    } else {
      icon.textContent = 'dark_mode';
    }
  };

  if (currentTheme) {
    applyTheme(currentTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }

  themeToggleBtn.addEventListener('click', () => {
    const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  });
});