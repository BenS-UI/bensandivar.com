// NAV SCROLL DETECTION
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  nav.classList.toggle('scrolled', window.scrollY > 50);
});

// PAGE TRANSITION (FADE-IN)
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-loaded');

  // CAROUSEL SCROLL BUTTONS AND FADE EFFECTS
  const carousels = document.querySelectorAll('.work-page .carousel-container');
  carousels.forEach(container => {
    const track = container.querySelector('.carousel-track');
    const btnLeft = container.querySelector('.carousel-btn.left');
    const btnRight = container.querySelector('.carousel-btn.right');

    if (btnLeft && btnRight && track) {
      btnLeft.addEventListener('click', () => {
        track.scrollBy({ left: -240, behavior: 'smooth' }); // Updated to match carousel-card width
      });
      btnRight.addEventListener('click', () => {
        track.scrollBy({ left: 240, behavior: 'smooth' }); // Updated to match carousel-card width
      });

      // Handle fade-start and fade-end classes for gradient overlays
      const updateFadeClasses = () => {
        const scrollLeft = track.scrollLeft;
        const maxScroll = track.scrollWidth - track.clientWidth;
        container.classList.toggle('fade-start', scrollLeft > 0);
        container.classList.toggle('fade-end', scrollLeft < maxScroll - 1); // Small buffer for precision
        btnLeft.disabled = scrollLeft <= 0;
        btnRight.disabled = scrollLeft >= maxScroll - 1;
      };

      track.addEventListener('scroll', updateFadeClasses);
      updateFadeClasses(); // Initial check
    }
  });

  // INTERSECTION OBSERVER FOR FADE-IN ANIMATIONS
  const elements = document.querySelectorAll('.fade-in, .carousel-section, .carousel-card, .carousel-btn');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        entry.target.classList.remove('visible'); // Ensure fade-out when out of view
      }
    });
  }, { threshold: 0.1 });
  elements.forEach(element => observer.observe(element));

  // LIGHTBOX MODAL FOR PROJECT GALLERY
  const galleryImages = Array.from(document.querySelectorAll('.project-gallery img'));
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

  // CUSTOM CURSOR
  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  document.body.appendChild(cursor);

  let mouseX = 0, mouseY = 0, posX = 0, posY = 0;

  const lerp = (start, end, factor) => start + (end - start) * factor;

  function animateCursor() {
    posX = lerp(posX, mouseX, 0.1);
    posY = lerp(posY, mouseY, 0.1);
    cursor.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const hoverTargets = document.querySelectorAll('a, button');
  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
});