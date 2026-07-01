(function() {
  var btn = document.getElementById('musicBtn');
  var slider = document.getElementById('volumeSlider');
  var audio = document.getElementById('bgMusic');
  if (!btn || !audio) return;

  var playing = false;
  audio.volume = 0.3;

  function updateUI() { btn.classList.toggle('playing', playing); }

  function doPlay() {
    audio.play().then(function() { playing = true; updateUI(); }).catch(function(){});
  }

  function doStop() {
    audio.pause();
    audio.currentTime = 0;
    playing = false;
    updateUI();
  }

  // First click starts
  document.addEventListener('click', function first(e) {
    if (playing) return;
    if (e.target && e.target.closest && e.target.closest('#musicBtn,#volumeSlider')) return;
    doPlay();
    document.removeEventListener('click', first);
  });
  document.addEventListener('touchstart', function first() {
    if (!playing) doPlay();
  }, { once: true });

  // Button play/stop
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (playing) { doStop(); } else { doPlay(); }
  });

  // Volume slider
  if (slider) {
    slider.addEventListener('input', function() {
      audio.volume = this.value / 100;
    });
  }
})();
