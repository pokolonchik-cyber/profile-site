// Custom cursor with trail
(function() {
  var cursor = document.getElementById('cursor');
  if (!cursor) return;

  var trailPool = [];

  document.addEventListener('mousemove', function(e) {
    cursor.style.display = 'block';
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    spawnTrail(e.clientX, e.clientY);
  });
  document.addEventListener('mouseleave', function() {
    cursor.style.display = 'none';
  });

  // Hover effects
  document.querySelectorAll('a, button, .social-btn, .profile-link, .music-btn, .volume-slider, .progress-bar').forEach(function(el) {
    el.addEventListener('mouseenter', function() { cursor.classList.add('hover'); });
    el.addEventListener('mouseleave', function() { cursor.classList.remove('hover'); });
  });

  // Trail particles
  var trailTick = 0;
  function spawnTrail(x, y) {
    trailTick++;
    if (trailTick % 2 !== 0) return;
    for (var i = 0; i < 4; i++) {
      var dot = document.createElement('div');
      dot.className = 'trail-dot';
      var s = 6 + Math.random() * 6;
      dot.style.width = s + 'px';
      dot.style.height = s + 'px';
      dot.style.left = (x + (Math.random() - 0.5) * 16) + 'px';
      dot.style.top = (y + (Math.random() - 0.5) * 16) + 'px';
      dot.style.animationDelay = (Math.random() * 0.1) + 's';
      dot.style.background = 'rgba(255,255,255,' + (0.4 + Math.random() * 0.4) + ')';
      document.body.appendChild(dot);
      setTimeout(function() {
        if (dot.parentNode) dot.parentNode.removeChild(dot);
      }, 600);
    }
  }
})();

// Copy discord
function copyDiscord(e, discord) {
  e.preventDefault();
  navigator.clipboard.writeText(discord).then(function() {
    showToast('Discord copied: ' + discord);
    fetch('/click').then(function(r) { return r.json(); }).then(function() {
      var badge = document.querySelector('.status-badge');
      if (badge) badge.textContent = 'Online';
    }).catch(function() {});
  }).catch(function() {});
}

// Toast
function showToast(msg) {
  var toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function() { toast.classList.remove('show'); }, 2500);
}

// Smooth reveal animation
document.addEventListener('DOMContentLoaded', function() {
  var card = document.querySelector('.profile-card');
  if (card) card.style.animation = 'fadeIn 1s ease-out forwards';
});