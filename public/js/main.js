// Custom cursor
const cursor = document.getElementById('cursor');
if (cursor) {
  document.addEventListener('mousemove', e => {
    cursor.style.display = 'block';
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
  document.addEventListener('mouseleave', () => cursor.style.display = 'none');
  document.querySelectorAll('a, button, .social-btn, .profile-link, .music-btn').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
}

// Copy discord
function copyDiscord(e, discord) {
  e.preventDefault();
  navigator.clipboard.writeText(discord).then(() => {
    showToast('Discord copied: ' + discord);
    // Track click
    fetch('/click').then(r => r.json()).then(d => {
      const badge = document.querySelector('.status-badge');
      if (badge) badge.textContent = 'Online';
    }).catch(() => {});
  }).catch(() => {});
}

// Toast
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// Smooth reveal animation on scroll
document.addEventListener('DOMContentLoaded', () => {
  const card = document.querySelector('.profile-card');
  if (card) card.style.animation = 'fadeIn 1s ease-out forwards';
});
