/* ============================================================
   PING IT ON — Interaction script
   ============================================================ */

(() => {
  'use strict';

  /* ----------------------------------------------------------
     CUSTOM CURSOR — two position:fixed <img> lerped to pointer
     ---------------------------------------------------------- */
  const cursorImg     = document.getElementById('cursorImg');
  const cursorImgGrab = document.getElementById('cursorImgGrab');
  let cursorCx = window.innerWidth / 2, cursorCy = window.innerHeight / 2;
  let cursorTx = cursorCx, cursorTy = cursorCy;
  let pointerX = cursorCx, pointerY = cursorCy;

  function trackCursor(e) {
    cursorTx = e.clientX;
    cursorTy = e.clientY;
    pointerX  = e.clientX;
    pointerY  = e.clientY;
  }
  window.addEventListener('mousemove',   trackCursor, { passive: true });
  window.addEventListener('pointermove', trackCursor, { passive: true });

  function tickCursor() {
    cursorCx += (cursorTx - cursorCx) * 0.28;
    cursorCy += (cursorTy - cursorCy) * 0.28;
    const x = Math.round(cursorCx) - 8;
    const y = Math.round(cursorCy) - 3;
    if (cursorImg)     cursorImg.style.transform     = `translate(${x}px, ${y}px)`;
    if (cursorImgGrab) cursorImgGrab.style.transform = `translate(${x - 4}px, ${y - 12}px)`;
    requestAnimationFrame(tickCursor);
  }
  tickCursor();

  function setCursorGrab(on) {
    if (!cursorImg || !cursorImgGrab) return;
    cursorImg.style.display     = on ? 'none'  : '';
    cursorImgGrab.style.display = on ? ''      : 'none';
  }

  /* ----------------------------------------------------------
     SCROLL REVEAL
     ---------------------------------------------------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ----------------------------------------------------------
     WEB AUDIO PING
     ---------------------------------------------------------- */
  let audioCtx = null;
  let soundMuted = false;
  function getAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  /* sound on/off toggle */
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      soundMuted = !soundMuted;
      soundToggle.classList.toggle('muted', soundMuted);
      if (soundMuted && audioCtx && audioCtx.state === 'running') {
        audioCtx.suspend();
      } else if (!soundMuted && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    });
  }

  /* Synthesize a metallic ping:
       - sharp attack (≤ 5ms)
       - inharmonic partials (no clean octaves)
       - bandpass filter to focus the timbre
       - long exponential decay tail */
  function playPing(opts = {}) {
    if (soundMuted) return;
    const ctx = getAudio();
    const now = ctx.currentTime;
    const baseFreq = opts.freq || 1850;
    const decay = opts.decay || 1.6;
    const gain = opts.gain || 0.45;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(gain, now + 0.003);
    master.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = baseFreq * 1.1;
    bp.Q.value = 6;

    const partials = [1, 2.756, 5.404, 8.933, 13.345];
    const amps     = [1.0, 0.7,  0.5,   0.32,  0.18];
    partials.forEach((p, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * p;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(amps[i], now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay * (1 - i * 0.13));
      osc.connect(g).connect(bp);
      osc.start(now);
      osc.stop(now + decay + 0.05);
    });

    /* short noise burst for the strike transient */
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseHP = ctx.createBiquadFilter();
    noiseHP.type = 'highpass';
    noiseHP.frequency.value = 2500;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.18;
    noise.connect(noiseHP).connect(noiseGain).connect(master);
    noise.start(now);
    noise.stop(now + 0.06);

    bp.connect(master);
    master.connect(ctx.destination);
  }

  /* Bubbly hover "bloop" — quick sine pitch-rise, like a cartoon bubble lifting */
  let lastHoverAt = 0;
  function playHoverBloop() {
    if (soundMuted) return;
    const now = performance.now();
    if (now - lastHoverAt < 60) return;
    lastHoverAt = now;
    const ctx = getAudio();
    const t = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.09;
    master.connect(ctx.destination);

    /* small jitter so repeated hovers feel alive, not robotic */
    const f0 = 520 + (Math.random() * 60 - 30);
    const f1 = 1080 + (Math.random() * 80 - 40);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.07);

    /* slight detuned partner for a softer, rounder body */
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(f0 * 0.5, t);
    osc2.frequency.exponentialRampToValueAtTime(f1 * 0.5, t + 0.07);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.Q.value = 1.2;

    const g2 = ctx.createGain();
    g2.gain.value = 0.35;

    osc.connect(g);
    osc2.connect(g2).connect(g);
    g.connect(lp).connect(master);

    osc.start(t);  osc.stop(t + 0.13);
    osc2.start(t); osc2.stop(t + 0.13);
  }

  /* Click "pop" — punchier downward chirp, like a bubble bursting */
  let lastPopAt = 0;
  function playPop() {
    if (soundMuted) return;
    const now = performance.now();
    if (now - lastPopAt < 50) return;
    lastPopAt = now;
    const ctx = getAudio();
    const t = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.14;
    master.connect(ctx.destination);

    /* quick high→low sine sweep is the canonical cartoon "pop" */
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.09);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    /* tiny noise sparkle on the front for the "burst" */
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const n = ctx.createBufferSource();
    n.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2800;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.25, t + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    n.connect(hp).connect(ng).connect(master);
    n.start(t);
    n.stop(t + 0.04);

    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /* Angelic "choir" — detuned voices on a major triad with slow swell + vibrato */
  let lastHaloAt = 0;
  function playHeroicHalo() {
    if (soundMuted) return;
    const now = performance.now();
    if (now - lastHaloAt < 160) return;
    lastHaloAt = now;
    const ctx = getAudio();
    const t = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.06;
    master.connect(ctx.destination);

    /* warm bandpass-ish lowpass — vocal-y, not bright */
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    lp.Q.value = 0.7;
    lp.connect(master);

    /* shared vibrato LFO — gives the stacked voices a "breathing choir" feel */
    const vibrato = ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 5.2;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.value = 2.5; // ±2.5 Hz
    vibrato.connect(vibratoDepth);
    vibrato.start(t);
    vibrato.stop(t + 0.7);

    /* C5 / E5 / G5 — each note rendered as 3 slightly detuned sine "voices" */
    const notes = [523.25, 659.25, 783.99];
    const detunes = [-7, 0, 7]; // cents
    notes.forEach((f, i) => {
      const off = i * 0.06;
      detunes.forEach((cents, j) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.detune.value = cents;
        vibratoDepth.connect(osc.frequency);

        const g = ctx.createGain();
        /* slow swell in (~70ms), gentle release (~430ms) — choir-like */
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.32, t + off + 0.07);
        g.gain.setValueAtTime(0.32, t + off + 0.18);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.5);

        osc.connect(g).connect(lp);
        osc.start(t + off);
        osc.stop(t + off + 0.55);
      });
    });

    /* faint upper-octave "ah" — high sine that swells and fades, distant choir */
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 1567.98; // G6
    shimmer.detune.value = 4;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.exponentialRampToValueAtTime(0.05, t + 0.22);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    shimmer.connect(sg).connect(master);
    shimmer.start(t);
    shimmer.stop(t + 0.6);
  }

  /* Ticket flip whoosh — air-whip: noise through a focused BP that arcs up-then-down */
  function playFlipWhoosh(direction) {
    if (soundMuted) return;
    const ctx = getAudio();
    const t = ctx.currentTime;
    const dur = 0.7;
    const mid = dur * 0.42;

    const master = ctx.createGain();
    /* sharper attack, exponential decay tail — whip-like envelope */
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.16, t + 0.06);
    master.gain.exponentialRampToValueAtTime(0.09, t + mid);
    master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    master.connect(ctx.destination);

    /* lowpassed white noise — clean air, no hiss */
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = last * 0.55 + w * 0.45; // mild smoothing
      d[i] = last;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    /* tighter Q gives the focused, sleek "swish" character */
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3.2;

    /* doppler-style arc: starts low, peaks mid (closest pass), trails low again */
    const fLow  = direction >= 0 ? 320 : 2200;
    const fPeak = 2600;
    const fEnd  = direction >= 0 ? 700 : 380;
    bp.frequency.setValueAtTime(fLow, t);
    bp.frequency.exponentialRampToValueAtTime(fPeak, t + mid);
    bp.frequency.exponentialRampToValueAtTime(fEnd, t + dur);

    /* tame top-end so it reads as air, not hiss */
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    lp.Q.value = 0.5;

    src.connect(bp).connect(lp).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /* Polaroid slide — short paper swoosh with a soft thump landing.
     index 0..2 lightly varies pitch per photo for variety. */
  function playPhotoSlide(index) {
    if (soundMuted) return;
    const ctx = getAudio();
    const t = ctx.currentTime;
    const dur = 0.55;
    const i = index || 0;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.13, t + 0.05);
    master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    master.connect(ctx.destination);

    /* paper swoosh — filtered noise sweeping down */
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let k = 0; k < d.length; k++) {
      const w = Math.random() * 2 - 1;
      last = last * 0.6 + w * 0.4;
      d[k] = last;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.2;
    const fStart = 1800 + i * 180;
    const fEnd   = 520  + i * 60;
    bp.frequency.setValueAtTime(fStart, t);
    bp.frequency.exponentialRampToValueAtTime(fEnd, t + dur * 0.85);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;

    src.connect(bp).connect(lp).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);

    /* soft thump on landing */
    const thumpAt = t + dur * 0.78;
    const osc = ctx.createOscillator();
    const og  = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160 - i * 12, thumpAt);
    osc.frequency.exponentialRampToValueAtTime(70, thumpAt + 0.18);
    og.gain.setValueAtTime(0.0001, thumpAt);
    og.gain.exponentialRampToValueAtTime(0.18, thumpAt + 0.015);
    og.gain.exponentialRampToValueAtTime(0.0001, thumpAt + 0.22);
    osc.connect(og).connect(ctx.destination);
    osc.start(thumpAt);
    osc.stop(thumpAt + 0.25);
  }

  /* Subtle card "lift" — soft warm bloop for hoverable cards */
  let lastLiftAt = 0;
  function playCardLift() {
    if (soundMuted) return;
    const now = performance.now();
    if (now - lastLiftAt < 70) return;
    lastLiftAt = now;
    const ctx = getAudio();
    const t = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.045;
    master.connect(ctx.destination);

    const f0 = 280 + (Math.random() * 40 - 20);
    const f1 = 520 + (Math.random() * 50 - 25);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.06);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;

    osc.connect(g).connect(lp).connect(master);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /* Hover bloop on regular nav links + secondary buttons */
  const hoverTargets = document.querySelectorAll(
    '.nav .nav-links a:not(.nav-cta-inline), .copy-btn, .sound-toggle, .game-btn'
  );
  hoverTargets.forEach((el) => {
    el.addEventListener('mouseenter', playHoverBloop);
  });

  /* Heroic halo on primary CTAs */
  const haloTargets = document.querySelectorAll(
    '.nav-cta-inline, .cta-primary, .submit-btn'
  );
  haloTargets.forEach((el) => {
    el.addEventListener('mouseenter', playHeroicHalo);
  });

  /* Subtle lift on steps + merch cards */
  const liftTargets = document.querySelectorAll('.step, .m-item');
  liftTargets.forEach((el) => {
    el.addEventListener('mouseenter', playCardLift);
  });

  /* Click pop on nav pill links */
  const popTargets = document.querySelectorAll('.nav .nav-links a, .nav-cta-inline');
  popTargets.forEach((el) => {
    el.addEventListener('click', playPop);
  });

  /* ----------------------------------------------------------
     HERO BOTTLE — drag with tension, spring back, ping on release
     ---------------------------------------------------------- */
  const bottleStage = document.getElementById('bottleStage');
  const bottleWrap = document.getElementById('bottleWrap');
  const bottleBtn = document.getElementById('bottleBtn');
  const bottleImg = document.getElementById('bottleImg');
  const ripples = document.getElementById('ripples');
  const tapHint = document.getElementById('tapHint');
  const pingCounterEl = document.getElementById('pingCounter');
  const pingCounterNum = document.getElementById('pingCounterNum');
  let pingCount = 0;

  /* ping counter: counts rapid pings, fades after idle */
  let counterValue = 0;
  let counterFadeTimer = null;
  const COUNTER_FADE_MS = 1500;
  function bumpCounter() {
    counterValue++;
    pingCounterNum.textContent = counterValue;
    pingCounterEl.classList.add('show');
    pingCounterEl.classList.remove('bump');
    void pingCounterEl.offsetWidth;
    pingCounterEl.classList.add('bump');
    clearTimeout(counterFadeTimer);
    counterFadeTimer = setTimeout(() => {
      pingCounterEl.classList.remove('show');
      setTimeout(() => { counterValue = 0; pingCounterNum.textContent = '0'; }, 320);
    }, COUNTER_FADE_MS);
  }

  /* random rest tilt — each ping settles at a slightly different angle */
  function randomRestRot() {
    /* between ~-13deg and ~13deg, with a small floor so it's never perfectly upright */
    const sign = Math.random() < 0.5 ? -1 : 1;
    return (Math.random() * 9 + 4) * sign;
  }
  function applyRestTilt() {
    const r = randomRestRot();
    bottleWrap.style.setProperty('--rest-rot', r + 'deg');
    return r;
  }
  bottleWrap.style.setProperty('--rest-rot', '15deg');
  bottleWrap.classList.add('at-rest');

  /* parallax: bottle drifts a few px opposite the cursor while at rest.
     paused during drag / chaos animations so it never fights other transforms. */
  let parallaxX = 0, parallaxY = 0;
  let arcRotA = 0, arcRotB = 0;
  const PARALLAX_STRENGTH = 0.025;
  const PARALLAX_MAX = 14;  /* px */
  const arc1 = document.querySelector('.halo-arc-1');
  const arc2 = document.querySelector('.halo-arc-2');
  function tickParallax() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    let tx = (cx - pointerX) * PARALLAX_STRENGTH;
    let ty = (cy - pointerY) * PARALLAX_STRENGTH;
    tx = Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, tx));
    ty = Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, ty));
    parallaxX += (tx - parallaxX) * 0.08;
    parallaxY += (ty - parallaxY) * 0.08;
    const restable = bottleWrap.classList.contains('at-rest');
    if (restable) {
      bottleWrap.style.setProperty('--parallax-x', parallaxX.toFixed(2) + 'px');
      bottleWrap.style.setProperty('--parallax-y', parallaxY.toFixed(2) + 'px');
    }
    /* arcs: drift opposite to cursor at smaller magnitudes + slow rotate */
    const targetRotA = -((pointerX - cx) / window.innerWidth) * 16;
    const targetRotB =  ((pointerX - cx) / window.innerWidth) * 16;
    arcRotA += (targetRotA - arcRotA) * 0.06;
    arcRotB += (targetRotB - arcRotB) * 0.06;
    if (arc1) {
      arc1.style.setProperty('--arc-px', (parallaxX * 0.5).toFixed(2) + 'px');
      arc1.style.setProperty('--arc-py', (parallaxY * 0.5).toFixed(2) + 'px');
      arc1.style.setProperty('--arc-rot', arcRotA.toFixed(2) + 'deg');
    }
    if (arc2) {
      arc2.style.setProperty('--arc-px', (-parallaxX * 0.5).toFixed(2) + 'px');
      arc2.style.setProperty('--arc-py', (-parallaxY * 0.5).toFixed(2) + 'px');
      arc2.style.setProperty('--arc-rot', arcRotB.toFixed(2) + 'deg');
    }
    requestAnimationFrame(tickParallax);
  }
  requestAnimationFrame(tickParallax);

  /* random pop-up variants — only ping-themed per campaign */
  const pingVariants = [
    'ping!', 'piiing!', 'pinggg', 'pingping',
    'PING.', 'ping ping ping', 'piiiiiing', 'ping~',
    'PING!!', 'ping?', 'ping.', 'pingggg',
  ];
  const popColors = ['#FF2D3F', '#00B7FF', '#FFE100', '#0a0a0a'];

  function spawnPingPop(x, y) {
    const pop = document.createElement('span');
    pop.className = 'ping-pop';
    pop.textContent = pingVariants[Math.floor(Math.random() * pingVariants.length)];
    const jitter = 30;
    const ox = (Math.random() - 0.5) * jitter;
    const oy = (Math.random() - 0.5) * 16 - 4;
    pop.style.left = (x + ox) + 'px';
    pop.style.top = (y + oy) + 'px';
    pop.style.color = popColors[Math.floor(Math.random() * popColors.length)];
    pop.style.setProperty('--rot', `${(Math.random() * 18 - 9).toFixed(1)}deg`);
    pop.style.fontSize = (28 + Math.random() * 22) + 'px';
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1100);
  }

  /* one ripple per fire, throttled so rapid taps don't pile up.
     The static halo no longer scales — only the emitted wave moves. */
  let lastRippleAt = 0;
  const RIPPLE_MIN_GAP = 220;  /* ms */
  function fireRipple() {
    const now = performance.now();
    if (now - lastRippleAt < RIPPLE_MIN_GAP) return;
    lastRippleAt = now;
    const live = ripples.querySelectorAll('.ripple-out');
    if (live.length > 3) {
      for (let i = 0; i < 2; i++) live[i] && live[i].remove();
    }
    const out = document.createElement('span');
    out.className = 'ripple-out';
    ripples.appendChild(out);
    setTimeout(() => out.remove(), 1800);
  }

  /* ----------------------------------------------------------
     STRETCHY SOUND FX (rubber-band) — modulated while dragging
     ---------------------------------------------------------- */
  let stretchOsc = null, stretchGain = null, stretchFilter = null, stretchLfo = null, stretchLfoGain = null;
  function startStretch() {
    if (soundMuted) return;
    const ctx = getAudio();
    const now = ctx.currentTime;
    if (stretchOsc) stopStretch(true);
    stretchOsc = ctx.createOscillator();
    stretchOsc.type = 'sawtooth';
    stretchOsc.frequency.setValueAtTime(70, now);
    stretchFilter = ctx.createBiquadFilter();
    stretchFilter.type = 'lowpass';
    stretchFilter.frequency.setValueAtTime(420, now);
    stretchFilter.Q.value = 4;
    stretchGain = ctx.createGain();
    stretchGain.gain.setValueAtTime(0.0001, now);
    stretchGain.gain.exponentialRampToValueAtTime(0.04, now + 0.05);
    /* slight tremolo so it sounds alive */
    stretchLfo = ctx.createOscillator();
    stretchLfo.frequency.value = 7;
    stretchLfoGain = ctx.createGain();
    stretchLfoGain.gain.value = 12;
    stretchLfo.connect(stretchLfoGain).connect(stretchOsc.frequency);
    stretchOsc.connect(stretchFilter).connect(stretchGain).connect(ctx.destination);
    stretchOsc.start(now);
    stretchLfo.start(now);
  }
  function updateStretch(t /* 0..1 */) {
    if (!stretchOsc) return;
    const ctx = getAudio();
    const now = ctx.currentTime;
    stretchOsc.frequency.linearRampToValueAtTime(70 + t * 240, now + 0.06);
    stretchFilter.frequency.linearRampToValueAtTime(420 + t * 1700, now + 0.06);
    stretchGain.gain.linearRampToValueAtTime(0.03 + t * 0.07, now + 0.06);
    stretchLfoGain.gain.linearRampToValueAtTime(8 + t * 28, now + 0.06);
  }
  function stopStretch(immediate) {
    if (!stretchOsc) return;
    const ctx = getAudio();
    const now = ctx.currentTime;
    const tail = immediate ? 0.05 : 0.18;
    stretchGain.gain.cancelScheduledValues(now);
    stretchGain.gain.setValueAtTime(stretchGain.gain.value, now);
    stretchGain.gain.exponentialRampToValueAtTime(0.0001, now + tail);
    stretchOsc.stop(now + tail + 0.02);
    stretchLfo.stop(now + tail + 0.02);
    stretchOsc = stretchGain = stretchFilter = stretchLfo = stretchLfoGain = null;
  }

  /* ----------------------------------------------------------
     DRAG / TAP mechanics — two distinct interaction modes
     ---------------------------------------------------------- */
  const drag = {
    active: false,
    startX: 0, startY: 0,
    offX: 0, offY: 0,
    rot: 0,
    moved: false,
    moveAt: 0,            /* timestamp when drag motion first began */
    autoFireTimer: null,  /* timer for auto-fall while dragging */
    chaosFiring: false,
    rafId: 0,
  };
  const MAX_PULL = 420;
  const TENSION = 0.45;
  const DRAG_ENTER_PX = 6;  /* movement past this counts as a drag, not a tap */
  const AUTO_FALL_MS = 700; /* once dragging, auto-fall after this */

  function getStageCenter() {
    const r = bottleStage.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* additive vibrate jitter on the inner image, intensity ramps with pull magnitude */
  function vibrateLoop() {
    if (!drag.active) return;
    const t = Math.min(1, Math.hypot(drag.offX, drag.offY) / MAX_PULL);
    /* below ~30% pull no vibration; above ramps up to ±10px */
    const intensity = Math.max(0, t - 0.25) * 1.4;
    if (intensity > 0) {
      const jx = (Math.random() - 0.5) * 14 * intensity;
      const jy = (Math.random() - 0.5) * 14 * intensity;
      const jr = (Math.random() - 0.5) * 4 * intensity;
      bottleImg.style.transform = `translate(${jx}px, ${jy}px) rotate(${jr}deg)`;
    } else {
      bottleImg.style.transform = '';
    }
    drag.rafId = requestAnimationFrame(vibrateLoop);
  }
  function clearVibrate() {
    cancelAnimationFrame(drag.rafId);
    bottleImg.style.transform = '';
  }

  function applyTransform(dx, dy) {
    const rot = Math.max(-18, Math.min(18, dx * 0.05));
    drag.rot = rot;
    bottleWrap.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
  }

  function onPointerDown(e) {
    if (drag.chaosFiring) return;
    e.preventDefault();
    setCursorGrab(true);
    bottleWrap.classList.remove('springback', 'at-rest', 'vibrating');
    bottleWrap.classList.add('dragging');
    drag.active = true;
    drag.moved = false;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.offX = 0;
    drag.offY = 0;
    drag.rot = 0;
    drag.moveAt = 0;
    bottleBtn.setPointerCapture && bottleBtn.setPointerCapture(e.pointerId);
    /* prime audio + start the rubber-band sound */
    getAudio();
    startStretch();
    drag.rafId = requestAnimationFrame(vibrateLoop);
  }

  function onPointerMove(e) {
    if (!drag.active) return;
    const rawDx = e.clientX - drag.startX;
    const rawDy = e.clientY - drag.startY;
    const rawLen = Math.hypot(rawDx, rawDy);
    const k = rawLen === 0 ? 0 : Math.min(MAX_PULL, MAX_PULL * (1 - Math.exp(-rawLen / (MAX_PULL * TENSION)))) / rawLen;
    drag.offX = rawDx * k;
    drag.offY = rawDy * k;
    const pulledMag = Math.hypot(drag.offX, drag.offY);

    /* the moment user crosses the drag threshold, schedule the auto-fall */
    if (!drag.moved && pulledMag > DRAG_ENTER_PX) {
      drag.moved = true;
      drag.moveAt = performance.now();
      clearTimeout(drag.autoFireTimer);
      drag.autoFireTimer = setTimeout(triggerAutoFall, AUTO_FALL_MS);
    }
    applyTransform(drag.offX, drag.offY);
    /* modulate stretchy sound by pull magnitude */
    updateStretch(pulledMag / MAX_PULL);
  }

  /* auto-fall while user is still holding: bottle springs back regardless of release */
  function triggerAutoFall() {
    if (!drag.active) return;
    drag.chaosFiring = true;
    drag.active = false;
    setCursorGrab(false);
    clearTimeout(drag.autoFireTimer);
    bottleWrap.classList.remove('dragging');
    clearVibrate();
    stopStretch();
    /* freeze at current pulled position with rotation, brief intense vibrate */
    bottleWrap.style.transform = `translate(${drag.offX}px, ${drag.offY}px) rotate(${drag.rot}deg)`;
    bottleWrap.classList.add('vibrating');
    setTimeout(() => doPing(pointerX - 18, pointerY, { freq: 2100, decay: 0.35, gain: 0.18 }), 100);
    setTimeout(() => doPing(pointerX + 14, pointerY - 6, { freq: 2400, decay: 0.35, gain: 0.18 }), 240);
    setTimeout(() => {
      bottleWrap.classList.remove('vibrating');
      applyRestTilt();
      bottleWrap.style.setProperty('--from-x', drag.offX + 'px');
      bottleWrap.style.setProperty('--from-y', drag.offY + 'px');
      bottleWrap.style.setProperty('--from-rot', drag.rot + 'deg');
      bottleWrap.style.transform = '';
      bottleWrap.classList.add('springback');
      setTimeout(() => {
        const c = getStageCenter();
        doPing(c.x, c.y, { freq: 1500, decay: 2.0, gain: 0.5 });
      }, 220);
      setTimeout(() => {
        bottleWrap.classList.remove('springback');
        bottleWrap.classList.add('at-rest');
        drag.chaosFiring = false;
      }, 820);
    }, 480);
  }

  function onPointerUp(e) {
    if (!drag.active) return;
    drag.active = false;
    setCursorGrab(false);
    clearTimeout(drag.autoFireTimer);
    clearVibrate();
    stopStretch();
    bottleWrap.classList.remove('dragging');

    const popX = (e && e.clientX) || pointerX;
    const popY = (e && e.clientY) || pointerY;

    if (drag.moved) {
      /* released early — spring back to a new random tilt and ping mid-snap */
      applyRestTilt();
      bottleWrap.style.setProperty('--from-x', drag.offX + 'px');
      bottleWrap.style.setProperty('--from-y', drag.offY + 'px');
      bottleWrap.style.setProperty('--from-rot', drag.rot + 'deg');
      bottleWrap.style.transform = '';
      bottleWrap.classList.remove('at-rest');
      bottleWrap.classList.add('springback');
      setTimeout(() => {
        const c = getStageCenter();
        doPing(c.x, c.y);
      }, 240);
      setTimeout(() => {
        bottleWrap.classList.remove('springback');
        bottleWrap.classList.add('at-rest');
      }, 820);
    } else {
      /* pure tap — ping at cursor, fresh random tilt */
      applyRestTilt();
      bottleWrap.style.transform = '';
      bottleWrap.classList.remove('springback');
      bottleWrap.classList.add('at-rest');
      doPing(popX, popY);
    }
  }

  bottleBtn.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  const heroEl = document.querySelector('.hero');
  function flashDotGrid() {
    const flash = document.createElement('div');
    flash.className = 'dot-flash';
    heroEl.appendChild(flash);
    setTimeout(() => flash.remove(), 1400);
  }

  function doPing(popX, popY, audioOpts) {
    pingCount++;
    bumpCounter();
    if (tapHint) tapHint.classList.add('hide');
    bottleBtn.classList.remove('shaking');
    void bottleBtn.offsetWidth;
    bottleBtn.classList.add('shaking');
    fireRipple();
    flashDotGrid();
    spawnPingPop(popX, popY);
    const freq = (audioOpts && audioOpts.freq) || (1700 + (pingCount % 5) * 60 + (Math.random() * 40 - 20));
    playPing(Object.assign({ freq }, audioOpts || {}));
  }

  /* Museum frames are hardcoded in index.html — no JS builder needed */

  /* ----------------------------------------------------------
     SUBMISSION FORM
     ---------------------------------------------------------- */
  const form = document.getElementById('submitForm');
  const urlInput = document.getElementById('tiktokUrl');
  const status = document.getElementById('formStatus');
  const card = document.getElementById('revealCard');
  const pctEl = document.getElementById('revealPct');
  const codeEl = document.getElementById('revealCode');
  const copyBtn = document.getElementById('copyBtn');
  const confettiEl = document.getElementById('confetti');

  const tiktokRe = /^https?:\/\/((www|vm|m)\.)?tiktok\.com\/.+/i;

  function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return 'PING-' + s;
  }
  function randomPct() {
    return Math.floor(Math.random() * 16) + 10;
  }
  function fireConfetti() {
    confettiEl.innerHTML = '';
    const cols = ['#FF2D3F', '#00B7FF', '#FFE100', '#FFFFFF'];
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = cols[i % cols.length];
      piece.style.animationDelay = (Math.random() * 0.3) + 's';
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      confettiEl.appendChild(piece);
    }
    setTimeout(() => { confettiEl.innerHTML = ''; }, 1800);
  }

  /* Celebratory cheer: ascending major-chord arpeggio + shimmer noise burst */
  function playCelebration() {
    if (soundMuted) return;
    const ctx = getAudio();
    const t0 = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);

    /* arpeggio — C major triad climbing into the octave */
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const start = t0 + i * 0.07;
      const dur = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.55, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      const g2 = ctx.createGain();
      g2.gain.value = 0.25;
      osc.connect(g);
      osc2.connect(g2).connect(g);
      g.connect(master);
      osc.start(start); osc.stop(start + dur + 0.05);
      osc2.start(start); osc2.stop(start + dur + 0.05);
    });

    /* final stacked chord hit at the top of the arpeggio */
    const chord = [523.25, 659.25, 783.99, 1046.5];
    const chordStart = t0 + notes.length * 0.07 + 0.02;
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, chordStart);
      g.gain.exponentialRampToValueAtTime(0.4, chordStart + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.9);
      osc.connect(g).connect(master);
      osc.start(chordStart); osc.stop(chordStart + 0.95);
    });

    /* confetti shimmer — high-passed noise that swells then fades */
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.9, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    const noiseG = ctx.createGain();
    noiseG.gain.setValueAtTime(0.0001, t0);
    noiseG.gain.exponentialRampToValueAtTime(0.18, t0 + 0.18);
    noiseG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
    noise.connect(hp).connect(noiseG).connect(master);
    noise.start(t0); noise.stop(t0 + 0.9);
  }

  let revealed = false;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (revealed) return;
    const v = (urlInput.value || '').trim();
    status.className = 'form-status';
    if (!v) {
      status.textContent = 'Paste a link first.';
      status.classList.add('error');
      return;
    }
    if (!tiktokRe.test(v)) {
      status.textContent = 'That doesn\'t look like a TikTok link. Try a full tiktok.com URL.';
      status.classList.add('error');
      return;
    }
    const pct = randomPct();
    const code = randomCode();
    pctEl.textContent = `${pct}% OFF`;
    codeEl.textContent = code;
    card.classList.add('show');
    card.setAttribute('aria-hidden', 'false');
    status.textContent = 'Locked in. Your beat is on the wall.';
    status.classList.add('success');
    fireConfetti();
    playCelebration();
    revealed = true;
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codeEl.textContent);
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'COPIED';
      setTimeout(() => { copyBtn.textContent = orig; }, 1400);
    } catch (_) {
      copyBtn.textContent = 'SELECT';
    }
  });

  /* ----------------------------------------------------------
     MERCH ALARM TONE — preview
     ---------------------------------------------------------- */
  const alarmCard = document.getElementById('merchAlarm');
  if (alarmCard) {
    alarmCard.addEventListener('click', () => {
      let i = 0;
      const seq = [1700, 1850, 1700, 2000];
      const tick = () => {
        if (i >= seq.length) return;
        playPing({ freq: seq[i], decay: 0.6, gain: 0.3 });
        i++;
        setTimeout(tick, 220);
      };
      tick();
    });
  }

  /* ----------------------------------------------------------
     MINI-GAME
     ---------------------------------------------------------- */
  const board = document.getElementById('gameBoard');
  const overlay = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlaySub = document.getElementById('overlaySub');
  const startBtn = document.getElementById('gameBtn');
  const scoreEl = document.getElementById('gameScore');
  const bestEl = document.getElementById('gameBest');
  const missesEl = document.getElementById('gameMisses');
  const LANES = 4;
  const MAX_MISSES = 5;

  let game = {
    running: false,
    score: 0,
    best: Number(localStorage.getItem('pingBest') || 0),
    misses: 0,
    spawnTimer: null,
    raf: null,
    bottles: [], /* { el, x, y, lane, speed } */
    speed: 1.4,
    spawnInterval: 1000,
    lastTime: 0,
  };
  bestEl.textContent = game.best;

  function setOverlay(title, sub, show) {
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
    overlay.classList.toggle('hide', !show === false ? false : !show);
    if (show === false) overlay.classList.add('hide');
    else overlay.classList.remove('hide');
  }

  const GAME_BOTTLE_SRCS = [
    'Microsite Assets/Game Bottles/01 Pink.png',
    'Microsite Assets/Game Bottles/02 Light Blue.jpg',
    'Microsite Assets/Game Bottles/03 Yellow.png',
    'Microsite Assets/Game Bottles/04 Beige.png',
    'Microsite Assets/Game Bottles/05 Green.png',
    'Microsite Assets/Game Bottles/06 - White Sticker.png',
    'Microsite Assets/Game Bottles/07 Orange.png',
    'Microsite Assets/Game Bottles/08 Red.png',
  ];

  function spawnBottle() {
    if (!game.running) return;
    const lane = Math.floor(Math.random() * LANES);
    const el = document.createElement('div');
    el.className = 'game-bottle';
    const src = GAME_BOTTLE_SRCS[Math.floor(Math.random() * GAME_BOTTLE_SRCS.length)];
    el.innerHTML = `<img class="gb-img" src="${src}" alt="" draggable="false" />`;
    el.setAttribute('data-cursor', 'ping');
    const boardW = board.clientWidth;
    const laneW = boardW / LANES;
    const x = lane * laneW + (laneW - 84) / 2;
    el.style.left = x + 'px';
    el.style.top = '-100px';
    board.appendChild(el);
    const speed = game.speed + Math.random() * 0.6;
    const bottle = { el, y: -100, lane, speed, dead: false };
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (bottle.dead) return;
      bottle.dead = true;
      el.classList.add('smashed');
      playPing({ freq: 1900 + lane * 80, decay: 0.5, gain: 0.3 });
      game.score++;
      scoreEl.textContent = game.score;
      /* speed up gradually */
      if (game.score % 5 === 0) {
        game.speed += 0.25;
        game.spawnInterval = Math.max(380, game.spawnInterval - 80);
        clearInterval(game.spawnTimer);
        game.spawnTimer = setInterval(spawnBottle, game.spawnInterval);
      }
      setTimeout(() => el.remove(), 400);
    });
    game.bottles.push(bottle);
  }

  function loop(t) {
    if (!game.running) return;
    if (!game.lastTime) game.lastTime = t;
    const dt = Math.min(48, t - game.lastTime);
    game.lastTime = t;
    const floorY = board.clientHeight - 14 - 126; /* floor stripe + bottle height */
    for (let i = game.bottles.length - 1; i >= 0; i--) {
      const b = game.bottles[i];
      if (b.dead) {
        game.bottles.splice(i, 1);
        continue;
      }
      b.y += b.speed * dt * 0.18;
      b.el.style.top = b.y + 'px';
      if (b.y >= floorY) {
        /* missed */
        b.dead = true;
        b.el.style.transition = 'opacity .3s ease';
        b.el.style.opacity = '0';
        setTimeout(() => b.el.remove(), 300);
        game.misses++;
        missesEl.textContent = `${game.misses} / ${MAX_MISSES}`;
        flashFloor();
        if (game.misses >= MAX_MISSES) { endGame(); break; }
      }
    }
    game.raf = requestAnimationFrame(loop);
  }

  function flashFloor() {
    board.style.boxShadow = 'inset 0 -40px 60px rgba(255,45,63,.5)';
    setTimeout(() => { board.style.boxShadow = ''; }, 220);
  }

  function startGame() {
    if (game.running) return;
    game.running = true;
    game.score = 0;
    game.misses = 0;
    game.speed = 1.4;
    game.spawnInterval = 1000;
    game.lastTime = 0;
    scoreEl.textContent = '0';
    missesEl.textContent = `0 / ${MAX_MISSES}`;
    overlay.classList.add('hide');
    startBtn.textContent = 'STOP';
    /* clear leftover */
    game.bottles.forEach((b) => b.el.remove());
    game.bottles = [];
    game.spawnTimer = setInterval(spawnBottle, game.spawnInterval);
    spawnBottle();
    game.raf = requestAnimationFrame(loop);
    /* ensure audio is unlocked from user gesture */
    getAudio();
  }

  function endGame() {
    game.running = false;
    clearInterval(game.spawnTimer);
    cancelAnimationFrame(game.raf);
    if (game.score > game.best) {
      game.best = game.score;
      bestEl.textContent = game.best;
      try { localStorage.setItem('pingBest', String(game.best)); } catch (_) {}
    }
    overlayTitle.textContent = 'GAME OVER';
    overlaySub.textContent = `You caught ${game.score}. Tap START to go again.`;
    overlay.classList.remove('hide');
    startBtn.textContent = 'START';
  }

  function stopGame() {
    if (!game.running) return;
    endGame();
  }

  startBtn.addEventListener('click', () => {
    if (game.running) stopGame();
    else startGame();
  });

  /* nav stays consistent across scroll — no active-section coloring */

  /* ----------------------------------------------------------
     CONCERT TICKET FLIP — scroll progress drives rotateX 0→180deg
     ---------------------------------------------------------- */
  (function ticketFlip() {
    const ticket = document.getElementById('ticket3d');
    if (!ticket) return;
    const ticketTrack = ticket.closest('.ticket-track');
    if (!ticketTrack) return;
    const photos = Array.from(document.querySelectorAll('.concert-photo'));
    const presenting = document.querySelector('.concert-presenting');

    let raf = 0;

    /* Phases on overall track progress (0→1):
       0.00–0.22  ticket flips front→back
       0.22–0.95  ticket rises up while photos slide up at the same pace
       Photos staggered: p1 leads, p2/p3 follow behind. */
    const PHASES = {
      flip: [0.00, 0.22],
      rise: [0.22, 0.95],
      p1:   [0.22, 0.70],
      p2:   [0.37, 0.85],
      p3:   [0.52, 0.95],
    };
    function lerp(t, a, b) {
      if (t <= a) return 0;
      if (t >= b) return 1;
      return (t - a) / (b - a);
    }
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function apply(progress) {
      const flipP = lerp(progress, PHASES.flip[0], PHASES.flip[1]);
      const riseP = easeOut(lerp(progress, PHASES.rise[0], PHASES.rise[1]));
      const tiltZ = (flipP * 2 - 1) * 3;
      ticket.style.transform = `translateY(${-riseP * 130}vh) rotateZ(${tiltZ}deg) rotateX(${flipP * 180}deg)`;

      if (presenting) {
        presenting.style.setProperty('--rise', `${-riseP * 130}vh`);
        presenting.style.opacity = String(Math.max(0, Math.min(1, (flipP - 0.4) / 0.6)));
      }

      const phaseKeys = ['p1', 'p2', 'p3'];
      photos.forEach((el, i) => {
        const ph = PHASES[phaseKeys[i]];
        if (!ph) return;
        const slide = 1 - easeOut(lerp(progress, ph[0], ph[1]));
        el.style.setProperty('--slide', slide.toFixed(4));
      });
      return flipP;
    }

    function update() {
      raf = 0;
      const trackTop = ticketTrack.getBoundingClientRect().top + window.scrollY;
      const scrolled = window.scrollY - trackTop;
      const total = Math.max(1, ticketTrack.offsetHeight - window.innerHeight);
      let progress = scrolled / total;
      progress = Math.min(Math.max(progress, 0), 1);
      apply(progress);
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    // Manual override hook for screenshot tooling
    window.__setTicketFlip = (progress) => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      const p = Math.min(Math.max(progress, 0), 1);
      // legacy: progress here drives just the flip portion
      apply(p * PHASES.flip[1]);
    };
  })();

})();
