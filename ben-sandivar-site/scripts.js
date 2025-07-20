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
    const hoverTargets = document.querySelectorAll('a, button, .carousel-card, .blog-card');
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

  // BLOG CARD INTERACTIVE TILT EFFECT
  document.querySelectorAll('.blog-card').forEach(card => {
    const tiltAmount = 10; // Max tilt in degrees
    const hoverScale = 1.02; // Scale factor on hover
    const shadowSpread = 24; // Shadow spread on hover

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // Mouse x relative to card
      const y = e.clientY - rect.top;  // Mouse y relative to card

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate position relative to center, normalized to -1 to 1
      const offsetX = (x - centerX) / centerX; // -1 to 1
      const offsetY = (y - centerY) / centerY; // -1 to 1

      // Apply rotation for a subtle 3D tilt
      const rotateY = offsetX * tiltAmount; // Tilt card horizontally based on mouse X
      const rotateX = -offsetY * tiltAmount; // Tilt card vertically based on mouse Y (inverted for natural feel)

      // Apply translation for "magnetic" effect (slight pull towards mouse)
      const translateX = offsetX * 5; // Slight horizontal shift
      const translateY = offsetY * 5; // Slight vertical shift

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateX(${translateX}px) translateY(${translateY}px) scale(${hoverScale})`;
      // Adjust box shadow for a deeper effect on hover
      card.style.boxShadow = `0 ${shadowSpread}px ${shadowSpread * 2}px var(--color-shadow)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateX(0px) translateY(0px) scale(1)';
      card.style.boxShadow = '0 8px 32px var(--color-shadow)'; // Revert to original shadow
    });
  });

  // CONTACT PAGE BLOB ANIMATION
  const contactMainColumn = document.querySelector('#contact .main-column');
  const contactBlob = document.querySelector('.contact-blob');

  if (contactMainColumn && contactBlob && window.matchMedia('(pointer: fine)').matches) {
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let animationFrameId;
    let resetTimeoutId;

    const blobWidth = 400; // Initial blob width
    const blobHeight = 400; // Initial blob height
    const lerpFactor = 0.05; // Smoothness of movement (lower = smoother, more jelly-like)
    const maxOffset = 50; // Max movement from center for the blob in pixels
    const scaleFactor = 0.1; // How much it scales on hover
    const resetDelay = 2000; // 2 seconds delay to stop following

    // Set initial size and position (centered)
    contactBlob.style.width = `${blobWidth}px`;
    contactBlob.style.height = `${blobHeight}px`;
    contactBlob.style.top = `calc(50% - ${blobHeight / 2}px)`;
    contactBlob.style.left = `calc(50% - ${blobWidth / 2}px)`;

    const updateBlobPosition = () => {
      const deltaX = targetX - currentX;
      const deltaY = targetY - currentY;

      currentX += deltaX * lerpFactor;
      currentY += deltaY * lerpFactor;

      // Apply a subtle scale based on movement speed to simulate squishiness
      const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const scale = 1 + Math.min(speed / 200, 0.05); // Max 5% squish/stretch
      const inverseScale = 1 - Math.min(speed / 200, 0.05);

      // Rotate to match direction of movement for a more organic feel
      const rotation = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      
      contactBlob.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg) scaleX(${scale}) scaleY(${inverseScale})`;

      if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
        animationFrameId = requestAnimationFrame(updateBlobPosition);
      } else {
        contactBlob.style.transform = `translate(${currentX}px, ${currentY}px) scaleX(1) scaleY(1)`; // Reset scale when stopped
        cancelAnimationFrame(animationFrameId);
      }
    };

    contactMainColumn.addEventListener('mousemove', (e) => {
      // Clear any pending reset timeout
      clearTimeout(resetTimeoutId);

      const rect = contactMainColumn.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - (rect.width / 2); // Mouse X relative to center of main-column
      const mouseY = e.clientY - rect.top - (rect.height / 2); // Mouse Y relative to center of main-column

      // Map mouse position to a constrained target for the blob
      targetX = Math.max(-maxOffset, Math.min(maxOffset, mouseX * (maxOffset / (rect.width / 2))));
      targetY = Math.max(-maxOffset, Math.min(maxOffset, mouseY * (maxOffset / (rect.height / 2))));

      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(updateBlobPosition);
      }

      // Set a timeout to reset if mouse stops moving
      resetTimeoutId = setTimeout(() => {
        targetX = 0; // Reset target to center
        targetY = 0;
        if (!animationFrameId) {
           animationFrameId = requestAnimationFrame(updateBlobPosition);
        }
      }, resetDelay);
    });

    contactMainColumn.addEventListener('mouseleave', () => {
      clearTimeout(resetTimeoutId);
      targetX = 0; // Reset target to center
      targetY = 0;
      if (!animationFrameId) {
         animationFrameId = requestAnimationFrame(updateBlobPosition);
      }
    });
  }
});