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

window.addEventListener('scroll', applyParallax);
window.addEventListener('resize', applyParallax);

// PAGE TRANSITION (FADE-IN)
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-loaded');

  // Initial parallax application on load
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

    const hoverTargets = document.querySelectorAll('a, button, .project-card');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  // INTERSECTION OBSERVER FOR FADE-IN ANIMATIONS
  const elements = document.querySelectorAll('.fade-in, .project-card');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
  elements.forEach(element => observer.observe(element));

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

  // GALLERY MASONRY LAYOUT
  const galleryContainer = document.getElementById('gallery-container');
  if (galleryContainer) {
    // Preserve the original list of items for shuffling
    const items = Array.from(galleryContainer.children);

    function layoutGallery() {
      // Clear existing columns
      galleryContainer.innerHTML = '';
      // Determine number of columns based on viewport width
      let columnsCount = 3;
      if (window.innerWidth < 600) {
        columnsCount = 1;
      } else if (window.innerWidth < 900) {
        columnsCount = 2;
      }
      // Create column containers
      const columns = [];
      for (let i = 0; i < columnsCount; i++) {
        const col = document.createElement('div');
        col.className = 'masonry-column';
        columns.push(col);
        galleryContainer.appendChild(col);
      }
      // Shuffle items so layout changes on every load
      const shuffled = items.slice().sort(() => Math.random() - 0.5);
      // Assign items to the shortest column once images are loaded
      shuffled.forEach(item => {
        const img = item.querySelector('img');
        const assign = () => {
          // find column with smallest height
          let shortest = columns[0];
          for (const col of columns) {
            if (col.scrollHeight < shortest.scrollHeight) shortest = col;
          }
          shortest.appendChild(item);
        };
        if (img.complete) {
          assign();
        } else {
          img.onload = assign;
        }
      });
    }
    // Prevent context menu on the gallery images
    galleryContainer.addEventListener('contextmenu', e => {
      e.preventDefault();
    });
    // Invoke layout after images and on resize
    window.addEventListener('load', layoutGallery);
    window.addEventListener('resize', layoutGallery);
  }
});