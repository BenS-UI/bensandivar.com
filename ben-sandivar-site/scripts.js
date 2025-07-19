// NAV SCROLL DETECTION
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if (nav) {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }
});

// PAGE TRANSITION (FADE-IN)
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-loaded');

  // MORE BUTTON
  const moreBtn = document.querySelector('.more-btn');
  const navLinks = document.querySelector('.nav-links');

  if (moreBtn && navLinks) {
    moreBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // CUSTOM CURSOR
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

  // Updated hover targets to include carousel-card
  const hoverTargets = document.querySelectorAll('a, button, .carousel-card');
  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });

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
  const elements = document.querySelectorAll('.fade-in, .carousel-section, .carousel-card, .carousel-btn');
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

  // MAKE ENTIRE CAROUSEL CARD CLICKABLE - MODIFIED
  document.querySelectorAll('.carousel-card').forEach(card => {
    const linkHref = card.dataset.href; // Get href from data-href attribute
    if (linkHref) { // Ensure there is a href to navigate to
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        // Prevent default behavior if the click was on an actual link inside the card
        if (e.target.tagName === 'A' || e.target.closest('A')) {
          return; // Let the actual link handle it if it exists
        }
        e.preventDefault(); // Prevent default if clicking the card background
        window.location.href = linkHref;
      });
    }
  });
});