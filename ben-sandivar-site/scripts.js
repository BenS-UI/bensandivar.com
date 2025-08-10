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

  // GALLERY: prevent context menu on images to discourage downloading and randomize order
  const galleryContainer = document.getElementById('gallery-container');
  if (galleryContainer) {
    // Disable right-click context menu on the gallery
    galleryContainer.addEventListener('contextmenu', e => {
      e.preventDefault();
    });
    // Randomize the order of the gallery items on each page load. This creates a fresh layout
    // when used in combination with CSS columns.
    const items = Array.from(galleryContainer.children);
    const shuffled = items.slice().sort(() => Math.random() - 0.5);
    shuffled.forEach(item => galleryContainer.appendChild(item));
  }

  // Initialize VanillaTilt with glare on project cards and gallery items
  const tiltTargets = document.querySelectorAll('.project-card, #gallery .grid-item');
  if (typeof VanillaTilt !== 'undefined' && tiltTargets.length) {
    // Configure tilt options to create a smooth, repelling effect. Increase max a bit and
    // slow down the movement for desktop; on mobile reduce the intensity to avoid jitter.
    const tiltOptions = {
      max: 10,         // Slightly lower tilt for smoother, repelling effect
      speed: 800,      // Increase duration for slower movement
      reverse: true,   // Repel the corners away from the cursor
      glare: true,
      'max-glare': 0.35,
      gyroscope: false
    };
    // On mobile, reduce tilt intensity and speed to avoid jitter
    if (window.matchMedia('(max-width: 768px)').matches) {
      tiltOptions.max = 6;
      tiltOptions.speed = 500;
    }
    VanillaTilt.init(tiltTargets, tiltOptions);
  }

  // Ensure only one audio track plays at a time in the music player. When a track starts
  // playing, pause all other tracks. This prevents multiple songs from playing simultaneously.
  const audioPlayers = document.querySelectorAll('.music-card audio');
  if (audioPlayers.length > 1) {
    audioPlayers.forEach(player => {
      player.addEventListener('play', () => {
        audioPlayers.forEach(other => {
          if (other !== player) {
            other.pause();
          }
        });
      });
    });
  }

  // Equalizer animation for music cards
  const eqIntervals = new Map();
  audioPlayers.forEach(player => {
    const card = player.closest('.music-card');
    const bars = card ? card.querySelectorAll('.eq-bar') : null;
    // Helper to start updating the bar heights randomly
    const startEq = () => {
      if (!bars) return;
      // Clear any existing interval for this player
      if (eqIntervals.has(player)) {
        clearInterval(eqIntervals.get(player));
      }
      const intervalId = setInterval(() => {
        bars.forEach(bar => {
          // Generate a random height between 20% and 100%
          const randomHeight = Math.random() * 0.8 + 0.2;
          bar.style.height = `${randomHeight * 1}rem`;
        });
      }, 200);
      eqIntervals.set(player, intervalId);
    };
    // Helper to stop the equalizer animation
    const stopEq = () => {
      if (!bars) return;
      const id = eqIntervals.get(player);
      if (id) {
        clearInterval(id);
        eqIntervals.delete(player);
      }
      // Reset bars to minimal height
      bars.forEach(bar => {
        bar.style.height = '0.2rem';
      });
    };
    player.addEventListener('play', () => {
      // Pause other players and stop their equalizers
      audioPlayers.forEach(other => {
        if (other !== player) {
          other.pause();
          // Stop EQ for the other
          const id = eqIntervals.get(other);
          if (id) {
            clearInterval(id);
            eqIntervals.delete(other);
            const otherCard = other.closest('.music-card');
            const otherBars = otherCard ? otherCard.querySelectorAll('.eq-bar') : null;
            if (otherBars) {
              otherBars.forEach(bar => bar.style.height = '0.2rem');
            }
          }
        }
      });
      startEq();
    });
    player.addEventListener('pause', stopEq);
    player.addEventListener('ended', stopEq);
  });

  // Apply dynamic backlight effect to gallery images by sampling colors along the image edges.
  const applyBacklight = () => {
    const galleryImages = document.querySelectorAll('#gallery .grid-item img');
    galleryImages.forEach(img => {
      // Skip remote images due to cross-origin restrictions
      if (img.src.startsWith('http')) return;
      const parent = img.closest('.grid-item');
      if (!parent) return;
      // Ensure image is loaded
      if (!img.complete) {
        img.addEventListener('load', () => applyBacklight());
        return;
      }
      // Create offscreen canvas to sample colors
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      canvas.width = width;
      canvas.height = height;
      try {
        ctx.drawImage(img, 0, 0, width, height);
      } catch (e) {
        // If drawImage fails due to security restrictions, skip
        return;
      }
      // Sample a square region at each corner (~10% of the smaller dimension). This
      // focuses on a border of roughly 2–3rem on typical screens, capturing the
      // most representative edge colors for the backlight.
      const sampleSize = Math.floor(Math.min(width, height) * 0.1);
      const avgColor = (x, y) => {
        const data = ctx.getImageData(x, y, sampleSize, sampleSize).data;
        let r = 0, g = 0, b = 0;
        const count = sampleSize * sampleSize;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        return {
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count)
        };
      };
      const tl = avgColor(0, 0);
      const tr = avgColor(width - sampleSize, 0);
      const bl = avgColor(0, height - sampleSize);
      const br = avgColor(width - sampleSize, height - sampleSize);
      // Build box-shadow with multiple colored glows based on corner colors
      const shadows = [tl, tr, bl, br].map(c => `0 0 30px 5px rgba(${c.r},${c.g},${c.b},0.6)`).join(',');
      parent.style.boxShadow = shadows;
    });
  };
  // Invoke backlight effect after window load to ensure images are ready
  window.addEventListener('load', applyBacklight);

  // Speed up and reverse the letter columns when hovering over the design section
  const systemsSection = document.getElementById('systems');
  if (systemsSection) {
    const adjustLetterAnimation = (reverse, duration) => {
      const columns = document.querySelectorAll('.letters-column');
      columns.forEach((column, idx) => {
        // Determine base direction: odd columns start in reverse; even columns start normal
        let baseDirection = idx % 2 === 0 ? 'normal' : 'reverse';
        // If reverse flag is true, flip the direction
        if (reverse) {
          baseDirection = baseDirection === 'normal' ? 'reverse' : 'normal';
        }
        column.style.animation = `scroll-letters ${duration}s linear infinite ${baseDirection}`;
      });
    };
    // When pointer is over the systems section, invert directions and speed up
    systemsSection.addEventListener('mousemove', () => {
      adjustLetterAnimation(true, 20);
    });
    // On leaving the section, restore original animation
    systemsSection.addEventListener('mouseleave', () => {
      adjustLetterAnimation(false, 60);
    });
  }
});