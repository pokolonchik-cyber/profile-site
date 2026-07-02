(function() {
  var btn = document.getElementById('musicBtn');
  var slider = document.getElementById('volumeSlider');
  var audio = document.getElementById('bgMusic');
  var progressBar = document.getElementById('progressBar');
  var timeCur = document.getElementById('timeCur');
  var timeTotal = document.getElementById('timeTotal');
  if (!btn || !audio) return;

  var playing = false;
  audio.volume = 0.3;

  function fmt(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function updateUI() { btn.classList.toggle('playing', playing); }

  function updateProgress() {
    if (!audio.duration) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    if (progressBar) progressBar.value = pct;
    if (timeCur) timeCur.textContent = fmt(audio.currentTime);
  }

  function doPlay() {
    audio.play().then(function() { playing = true; updateUI(); }).catch(function(){});
  }

  function doStop() {
    audio.pause();
    audio.currentTime = 0;
    playing = false;
    updateUI();
    if (progressBar) progressBar.value = 0;
    if (timeCur) timeCur.textContent = '0:00';
  }

  // Show duration when metadata loaded
  audio.addEventListener('loadedmetadata', function() {
    if (timeTotal) timeTotal.textContent = fmt(audio.duration);
  });

  // Update progress every 250ms
  audio.addEventListener('timeupdate', updateProgress);

  // Seek via progress bar
  if (progressBar) {
    progressBar.addEventListener('input', function() {
      if (!audio.duration) return;
      audio.currentTime = (this.value / 100) * audio.duration;
    });
  }

  // First click starts
  document.addEventListener('click', function first(e) {
    if (playing) return;
    if (e.target && e.target.closest && e.target.closest('#musicBtn,#volumeSlider,#progressBar')) return;
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