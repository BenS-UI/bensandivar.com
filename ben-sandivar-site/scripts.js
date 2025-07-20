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
    // Calculate how far the element is from the center of the viewport
    const centerOfViewport = window.innerHeight / 2;
    const elementCenter = rect.top + rect.height / 2;
    const distanceToCenter = centerOfViewport - elementCenter;
    const translateY = distanceToCenter * speed;

    if (el.classList.contains('hero-bg')) {
        el.style.transform = `translateY(${translateY * 0.5}px) scale(1.1)`; // Hero bg moves slower and is scaled up
    } else {
        el.style.transform = `translateY(${translateY}px)`;
    }
  });
};

window.addEventListener('scroll', applyParallax);
window.addEventListener('resize', applyParallax); // Recalculate on resize

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

  // CUSTOM CURSOR - Modified to disable on touch devices
  // Check if the primary input mechanism is a fine pointer (like a mouse)
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

    // Updated hover targets to include carousel-card and blog-card
    const hoverTargets = document.querySelectorAll('a, button, .carousel-card, .blog-card, .project-card');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  // CAROUSEL SCROLL BUTTONS AND FADE EFFECTS
  const carousels = document.querySelectorAll('.work-page .carousel-container');
  carousels.forEach(container => {
    const track = container.querySelector('.carousel-track');
    const btnLeft = container.querySelector('.carousel-btn.left');
    const btnRight = container.querySelector('.carousel-btn.right');

    if (btnLeft && btnRight && track) {
      btnLeft.addEventListener('click', () => {
        track.scrollBy({ left: -240, behavior: 'smooth' });
      });
      btnRight.addEventListener('click', () => {
        track.scrollBy({ left: 240, behavior: 'smooth' });
      });

      // Handle fade-start and fade-end classes for gradient overlays
      const updateFadeClasses = () => {
        const scrollLeft = track.scrollLeft;
        const maxScroll = track.scrollWidth - track.clientWidth;
        container.classList.toggle('fade-start', scrollLeft > 0);
        container.classList.toggle('fade-end', scrollLeft < maxScroll - 1);
        btnLeft.disabled = scrollLeft <= 0;
        btnRight.disabled = scrollLeft >= maxScroll - 1;
      };

      track.addEventListener('scroll', updateFadeClasses);
      updateFadeClasses(); // Initial check
    }
  });

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

  // LIGHTBOX MODAL FOR PROJECT GALLERY
  const galleryImages = Array.from(document.querySelectorAll('.project-gallery img'));
  if (galleryImages.length > 0) {
    let currentIndex = 0;

    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    Object.assign(lightbox.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.9)',
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    });
    document.body.appendChild(lightbox);

    const img = document.createElement('img');
    Object.assign(img.style, {
      maxWidth: '90%',
      maxHeight: '90%',
      borderRadius: '1rem'
    });
    lightbox.appendChild(img);

    function showImage(index) {
      currentIndex = index;
      img.src = galleryImages[index].src;
      lightbox.style.display = 'flex';
    }

    galleryImages.forEach((image, index) => {
      image.addEventListener('click', () => showImage(index));
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target !== img) lightbox.style.display = 'none';
    });

    document.addEventListener('keydown', e => {
      if (lightbox.style.display === 'flex') {
        if (e.key === 'Escape') lightbox.style.display = 'none';
        else if (e.key === 'ArrowRight') showImage((currentIndex + 1) % galleryImages.length);
        else if (e.key === 'ArrowLeft') showImage((currentIndex - 1 + galleryImages.length) % galleryImages.length);
      }
    });
  }

  // MAKE ENTIRE CAROUSEL CARDS CLICKABLE
  // Blog cards are now native <a> tags, so no JS handler is needed for them.
  document.querySelectorAll('.carousel-card').forEach(card => {
    const linkHref = card.dataset.href; // Get href from data-href attribute
    if (linkHref) { // Ensure there is a href to navigate to
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        // Prevent default behavior if the click was on an actual link inside the card
        if (e.target.tagName === 'A' || e.target.closest('A')) {
          return; // Let the actual link handle it if it exists
        } 
        // Only navigate if the click was directly on the card or its non-link children
        window.location.href = linkHref;
      });
    }
  });

  // Make entire project cards clickable on the index page
  document.querySelectorAll('.project-card').forEach(card => {
    const linkHref = card.querySelector('a').href;
    if (linkHref) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        if (e.target.tagName === 'A' || e.target.closest('A')) {
          return; // Let the actual link handle it
        }
        window.location.href = linkHref;
      });
    }
  });

  // Lightbox effect: dim other cards on hover
  function applyDimmingToCards(containerSelector, cardSelector) {
    document.querySelectorAll(containerSelector).forEach(container => {
      const cards = Array.from(container.querySelectorAll(cardSelector));

      cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
          cards.forEach(otherCard => {
            if (otherCard !== card) {
              otherCard.classList.add('dimmed');
            }
          });
        });

        card.addEventListener('mouseleave', () => {
          cards.forEach(otherCard => {
            otherCard.classList.remove('dimmed');
          });
        });
      });
    });
  }

  // Apply dimming to different card sections
  applyDimmingToCards('.carousel-track', '.carousel-card');   // For work page carousel cards
  applyDimmingToCards('.project-cards', '.project-card');     // For homepage featured project cards
  applyDimmingToCards('.blog-grid', '.blog-card');           // For blog page blog cards

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
    // Default to system preference if no theme is set
    applyTheme('dark');
  } else {
    applyTheme('light'); // Default to light if no preference and no system preference
  }

  themeToggleBtn.addEventListener('click', () => {
    const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  });

  // Blog Card Hover effect (reintroducing tilt and magnetic feel)
  // The CSS now handles the 'hover-tilt' class, ensuring the effect is subtle and elegant.
  document.querySelectorAll('.blog-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.classList.add('hover-tilt');
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('hover-tilt');
    });
  });
});
