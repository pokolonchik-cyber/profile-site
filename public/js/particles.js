(function(){
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let w, h;

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const count = parseInt(document.querySelector('.profile-card')?.dataset?.particles) || 60;
  const accent = document.querySelector('.profile-card')?.getAttribute('data-accent') || '#8b5cf6';

  function hexToRgb(h){
    const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
    return {r,g,b};
  }
  const c = hexToRgb(accent);

  class Particle{
    constructor(){
      this.reset();
    }
    reset(){
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * 3 + 1;
      this.speedX = (Math.random() - .5) * .5;
      this.speedY = (Math.random() - .5) * .5;
    }
    update(){
      this.x += this.speedX;
      this.y += this.speedY;
      if(this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
    }
    draw(){
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${this.size/5})`;
      ctx.fill();
    }
  }

  function init(){
    particles = [];
    for(let i = 0; i < count; i++) particles.push(new Particle());
  }
  init();
  window.addEventListener('resize', init);

  function animate(){
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => { p.update(); p.draw(); });
    // Draw connections
    for(let i = 0; i < particles.length; i++){
      for(let j = i + 1; j < particles.length; j++){
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 150){
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${(1 - dist/150) * .15})`;
          ctx.lineWidth = .5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
})();
