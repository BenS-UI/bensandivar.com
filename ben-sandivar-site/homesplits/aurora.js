// Aurora Glow Background
const auroraContainer = document.querySelector('.aurora'); // Your existing aurora container
auroraContainer.style.position = 'absolute';
auroraContainer.style.inset = '0';
auroraContainer.style.overflow = 'hidden';
auroraContainer.style.zIndex = '-1';
auroraContainer.style.filter = 'blur(90px)'; // Master blur

const colors = [
  'rgba(2,121,235,0.8)',   // Cyan
  'rgba(255,214,10,0.8)',  // Yellow
  'rgba(255,69,148,0.8)',  // Magenta
  'rgba(0,139,255,0.8)',   // Blue
  'rgba(255,97,39,0.8)'    // Orange
];

// Create blobs
colors.forEach((c, i) => {
  const blob = document.createElement('div');
  blob.style.position = 'absolute';
  blob.style.width = '60vmax';
  blob.style.height = '60vmax';
  blob.style.background = `radial-gradient(circle at center, ${c} 0%, transparent 70%)`;
  blob.style.borderRadius = '50%';
  blob.style.mixBlendMode = 'screen';
  blob.style.animation = `auroraMove ${20 + i * 4}s ease-in-out infinite alternate`;
  blob.style.left = `${Math.random() * 100 - 50}vw`;
  blob.style.top = `${Math.random() * 100 - 50}vh`;
  auroraContainer.appendChild(blob);
});

// Animation keyframes
const styleSheet = document.createElement('style');
styleSheet.textContent = `
@keyframes auroraMove {
  0%   { transform: translate(0,0) scale(1); }
  50%  { transform: translate(20px, -30px) scale(1.05); }
  100% { transform: translate(-30px, 40px) scale(1); }
}
`;
document.head.appendChild(styleSheet);