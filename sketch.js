on('load', () => {
  const c = $("canvas");
  const ctx = c.getContext("2d"); 
  
  function random(n=8) {
    let res = 0;
    for (let i = 0; i < n; i++)
      res += Math.random();
    return 2*res/n - 1;
  }

  const clamp = (v, a, b) => {
    if (Array.isArray(v)) return v.map(e=>clamp(e, a, b));
    if (v > b) return b;
    if (v < a) return a;
    return v;
  }
  
  const DPR = devicePixelRatio;
  
  let Ps = [...Array(8)].map((e, i) => ({
    i,
    reset(fade=0) {
      this.falling = false;
      this.x = random()*3/5;
      this.y = random()*3/5;
      this.angle = Math.random()*2*Math.PI;
      this.da = 10*random();
      this.radius = DPR*(14*random()+20);
      this.dir = Math.random()*Math.PI;
      this.dtm = 0.8+Math.random()*0.4;
      this.sides = choose([3,3,3,3, 4,4,4,4, 5,6]);
      this.xv = 0; this.yv = 0;
      this.fade = fade;
    },
    update(dt) {
      this.fade = clamp(this.fade + 50*dt, 0, 1);
      if (this.falling) {
        this.xv *= 0.99;
        this.yv += 0.0003;
        this.xv = clamp(this.xv, -0.02, 0.02);
        this.yv = clamp(this.yv, -0.02, 0.02);
        
        this.x += this.xv;
        this.y += this.yv;
        this.angle += this.da * 1.5 * this.dtm * dt;
        this.angle %= 360;
        
        if (Math.abs(this.y) > 0.5) {
          this.reset();
          if (Math.random() < 1/20) this.sides = 45;
        }
        return;
      }  
      const dist = Math.hypot(this.x, this.y);
      const dx =  this.dir * this.y/dist;
      const dy = -this.dir * this.x/dist;
      this.x += this.dtm * dt * dx;
      this.y += this.dtm * dt * dy;
      this.angle += this.da * 1.5 * this.dtm * dt * -this.dir / dist; this.a %= 360;
      if (this.x > 0.5 || this.x < -0.5 || this.y > 0.5 || this.y < -0.5) {
        let sides = this.sides;
        this.reset();
        this.sides = sides;
      }
    }
  }));
  
  on('resize', e => {
    c.width  = c.offsetWidth * DPR;
    c.height = c.offsetHeight * DPR;
  });
  trigger('resize');
  
  let lastSnipeHits = -1;
  let snipes = 0;
  const snipeAt = (X, Y) => {
    let [x, y] = [X*DPR, Y*DPR];
    let amnt = 0;
    lastSnipeHits = 0;
    for (let p of Ps) {
      const dx = c.width*(p.x+0.5) - x;
      const dy = c.height*(p.y+0.5) - y;
      const d = dx*dx + dy*dy;
      const mult = p.falling ? 2 : 1;
      if (d < mult*mult*p.radius*p.radius) {
        p.xv = 0.02 * random();
        p.yv = 0.01 * -Math.abs(0*random()+1);
        p.da = Math.random() < 0.5 ? -1000 : 1000;
        p.falling = true;
        lastSnipeHits++;
        snipes++;
      }
    }
  }
  
  on('click', e => snipeAt(e.clientX, e.clientY));
  on('touchstart', e => snipeAt(e.touches[0].clientX, e.touches[0].clientY));
  
  Ps.forEach(p => p.reset(1));
  
  let lt = 0;
  function animate(t) {
    const dt = t - lt;
    lt = t;
    
    ctx.clearRect(0, 0, c.width, c.height);
    for (let p of Ps) {
      ctx.fillStyle = `rgba(255,255,255,${p.fade*72/255})`;
      ctx.beginPath();
      ctx.moveTo(
        c.width*(p.x+0.5) + p.radius*Math.cos(p.angle),
        c.height*(p.y+0.5) + p.radius*Math.sin(p.angle)
      );
      for (let theta = p.angle; theta < 2*Math.PI+p.angle; theta += 2*Math.PI/p.sides)
        ctx.lineTo(
          c.width*(p.x+0.5) + p.radius*Math.cos(theta),
          c.height*(p.y+0.5) + p.radius*Math.sin(theta)
        );
      ctx.closePath();
      ctx.fill();
      p.update(dt/200000);
    }
    
    goals.forEach(goal => {
      if (!unlocked.has(goal.id) && goal.condition()) {
        unlockAchievement(goal.id);
      }
    });
    
    requestAnimationFrame(animate);
  }
  
  
  
  
  const $goals = $('.goals');
  
  const goals = [
    {
      id: 'first_fall',
      name: 'First Fall',
      desc: 'Make a shape fall for the first time.',
      condition: () => snipes >= 1,
    },
    {
      id: 'boop',
      name: 'Boop',
      desc: 'Snipe 10 times.',
      condition: () => snipes >= 10,
    },
    {
      id: 'snipe_master',
      name: 'Snipe Master',
      desc: 'Make at least 5 shapes fall at once.',
      condition: () => Ps.filter(p => p.falling).length >= 5,
    },
    {
      id: 'big_blast',
      name: 'Big Blast',
      desc: 'Make a circle fall.',
      condition: () => Ps.some(p => p.falling && p.sides >= 40),
    },
    {
      id: 'heaven',
      name: 'Space Program',
      desc: 'Make a shape go to heaven.',
      condition: () => Ps.some(p => p.falling && p.y < -0.49),
    },
    {
      id: 'fumble',
      name: 'Fumble',
      desc: 'Miss a shape.',
      condition: () => lastSnipeHits == 0,
    },
    {
      id: 'double_trouble',
      name: 'Double Trouble',
      desc: 'Make two shapes fall in a single click.',
      condition: () => lastSnipeHits == 2,
    },
    {
      id: 'hexagons',
      name: 'Hexagons Are The Bestagons',
      desc: 'Make all the shapes hexagons.',
      condition: () => Ps.every(p => p.sides == 6),
    },
  ];
  
  function showAchievement(achievement) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<strong>${achievement.name}</strong><br>${achievement.desc}`;
    Object.assign(el.style, {
      position: 'relative',
      background: 'rgba(0,0,0,0.5)',
      color: 'white',
      padding: '1rem',
      borderRadius: '0.5rem',
      zIndex: 9999,
      fontFamily: 'sans-serif',
      opacity: '0',
      transition: 'opacity 0.2s',
    });
    $('.toasts').appendChild(el);
    requestAnimationFrame(() => el.style.opacity = '1');
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 200);
    }, 3000);
  }

  
  const unlocked = new Set();
  
  const totalGoals = goals.length;
  const $progress = $('.progress-count');
  const updateProgress = () => {
    const found = unlocked.size;
    $progress.textContent = `(${found} of ${totalGoals})`;
    if (found == totalGoals) {
      $progress.textContent += ' 🎉';
    }
  };
  updateProgress();
  
  function unlockAchievement(id) {
    if (unlocked.has(id)) return;
    
    unlocked.add(id);
    
    const goal = goals.find(a => a.id === id);
    if (!goal) return;
    
    const goalEl = document.createElement('div');
    goalEl.className = 'goal';
    goalEl.textContent = goal.name;
    $goals.appendChild(goalEl);
    
    goalEl.style.transitionDelay = `${$$('.goal').length * 0.05}s`;
    
    
    updateProgress();
    console.log(`Achievement unlocked: ${goal.name}`);
    showAchievement(goal);
    
  }

  requestAnimationFrame(animate);
  
});
