import * as THREE from 'three';

// Presentation only: the existing EyeController remains the source of behavior.
export function createPresence({ renderer, controller, tracker, macroConfig, photoConfig, applyPersonality }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.createElement('section');
  root.className = 'presence';
  root.setAttribute('aria-label', 'EyeSeeYou — Présence');
  root.innerHTML = `
    <header><div><p class="wordmark">EYE SEE YOU</p><span class="edition">PRÉSENCE / ÉTUDE DU VIVANT · 05</span></div>
      <div class="top-actions"><button id="presence-camera">Activer la caméra</button><button id="presence-immerse" aria-label="Immersion plein écran">↗ Immersion</button></div></header>
    <div class="caption"><p class="eyebrow" id="presence-chapter">01 / RENCONTRE</p><h1 id="presence-title">Qui regarde qui ?</h1><p class="hint" id="presence-hint">Déplacez-vous. Le regard vous suit.<br>À la souris, au toucher, ou face à la caméra.</p></div>
    <footer><div><div class="palette" aria-label="Couleur des iris">
      <button data-palette="amber" aria-pressed="true">Ambre</button><button data-palette="glacier" aria-pressed="false">Glacier</button><button data-palette="olive" aria-pressed="false">Olive</button></div>
      <div class="controls"><button data-scene="encounter" aria-pressed="true">01 Rencontre</button><button data-scene="macro" aria-pressed="false">02 Iris</button><button data-scene="night" aria-pressed="false">03 Obscur</button><button id="presence-film" aria-pressed="false">▷ Voyage</button></div></div>
      <div class="signal"><strong id="presence-input" role="status" aria-live="polite">SUIVI AU POINTEUR</strong><br><span>MOLETTE : APPROCHER · L : ATELIER</span><div class="progress" aria-hidden="true"><span></span></div></div></footer>`;
  document.body.append(root);
  const $ = s => root.querySelector(s);
  const p = controller.params;
  const original = { light: p.lightIntensity, angle: p.lightAngle, fill: p.fillLight, skin: !!p.lid3d, drift: photoConfig.cameraDrift };
  const palettes = { amber:['#b07830','#5a3214'], glacier:['#9b9874','#345c68'], olive:['#b69b52','#47543b'] };
  const inner = new THREE.Color(p.irisColorA), outer = new THREE.Color(p.irisColorB);
  const targetInner = inner.clone(), targetOuter = outer.clone();
  const chapters = {
    encounter: ['01 / RENCONTRE', 'Qui regarde qui ?', 'Déplacez-vous. Le regard vous suit.'],
    macro: ['02 / INTIMITÉ', 'Un monde dans un regard.', 'Approchez avec la molette. Chaque fibre prend vie.'],
    night: ['03 / OBSCUR', 'Il reste une présence.', 'Dans le noir, le regard ne vous quitte pas.'],
  };
  let scene = 'encounter', film = false, filmTime = 0, elapsed = 0, cameraBusy = false;
  let lastPhase = -1, colorMoving = false, lastColorTime = -1;
  let targetLight = original.light, targetAngle = original.angle, targetFill = original.fill;
  function setScene(name, automatic = false) {
    if (!automatic) stopFilm();
    scene = name;
    macroConfig.enabled = name === 'macro';
    macroConfig.zoom = 1.12;
    renderer.setLid3d(name === 'night' ? false : original.skin);
    p.lid3d = name === 'night' ? 0 : Number(original.skin);
    targetLight = name === 'night' ? original.light * .55 : original.light;
    targetAngle = name === 'night' ? 2.65 : original.angle;
    targetFill = name === 'night' ? .12 : original.fill;
    const c = chapters[name];
    $('#presence-chapter').textContent = c[0];
    $('#presence-title').textContent = c[1];
    $('#presence-hint').textContent = c[2];
    root.querySelectorAll('[data-scene]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scene === name)));
    if (!reduced.matches) controller.triggerBlink(false, true);
  }
  function stopFilm() {
    film = false;
    $('#presence-film').setAttribute('aria-pressed', 'false');
    $('#presence-film').textContent = '▷ Voyage';
    $('.progress span').style.transform = 'scaleX(0)';
  }
  root.querySelectorAll('[data-scene]').forEach(b => b.addEventListener('click', () => setScene(b.dataset.scene)));
  root.querySelectorAll('[data-palette]').forEach(b => b.addEventListener('click', () => {
    const colors = palettes[b.dataset.palette];
    targetInner.set(colors[0]); targetOuter.set(colors[1]); colorMoving = true;
    root.querySelectorAll('[data-palette]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('#presence-film').addEventListener('click', () => {
    if (film) { stopFilm(); return; }
    if (reduced.matches) { $('#presence-hint').textContent = 'Animations réduites : explorez les trois vues avec les boutons.'; return; }
    film = true; filmTime = 0; lastPhase = -1;
    $('#presence-film').textContent = 'Ⅱ Arrêter';
    $('#presence-film').setAttribute('aria-pressed', 'true');
  });
  $('#presence-immerse').addEventListener('click', async () => {
    document.body.classList.add('immersed');
    try { await document.documentElement.requestFullscreen?.(); } catch { /* immersion also works windowed */ }
  });
  $('#presence-camera').addEventListener('click', async () => {
    if (tracker.video?.srcObject?.active) {
      tracker.stop();
      cameraBusy = false;
      $('#presence-camera').textContent = 'Activer la caméra';
      $('#presence-input').textContent = 'SUIVI AU POINTEUR';
      return;
    }
    if (cameraBusy) return;
    cameraBusy = true;
    const button = $('#presence-camera');
    button.disabled = true; button.textContent = 'Connexion…';
    $('#presence-input').textContent = 'CHARGEMENT DU SUIVI VISUEL…';
    try {
      await tracker.init();
      button.disabled = false;
      button.textContent = 'Couper la caméra';
      $('#presence-input').textContent = 'SUIVI DU VISAGE ACTIF';
    } catch (error) {
      tracker.stop();
      cameraBusy = false; button.disabled = false; button.textContent = 'Réessayer la caméra';
      $('#presence-input').textContent = 'CAMÉRA INDISPONIBLE · POINTEUR ACTIF';
      console.warn('Camera unavailable:', error);
    }
  });
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() === 'l') { stopFilm(); document.body.classList.toggle('laboratory'); }
    if (e.key === 'Escape') { document.body.classList.remove('laboratory'); stopFilm(); }
  });
  renderer.renderer.domElement.addEventListener('wheel', e => {
    if (document.body.classList.contains('laboratory')) return;
    e.preventDefault(); stopFilm();
    if (scene !== 'macro' && e.deltaY > 0) setScene('macro');
    else if (scene === 'macro') {
      macroConfig.zoom = THREE.MathUtils.clamp(macroConfig.zoom + e.deltaY * .001, .55, 2.2);
      if (macroConfig.zoom <= .55 && e.deltaY < 0) setScene('encounter');
    }
  }, { passive:false });
  function motionPreference() {
    if (reduced.matches) { stopFilm(); photoConfig.cameraDrift = 0; applyPersonality('neutral'); }
    else photoConfig.cameraDrift = original.drift;
  }
  reduced.addEventListener('change', motionPreference);
  motionPreference();
  tracker.initPointerFallback();
  document.getElementById('loading').classList.add('hidden');
  document.body.classList.add('presence-ready');
  return {
    update(dt) {
      if (document.hidden) return;
      const step = Math.min(Math.max(dt, 0), .05);
      elapsed += step;
      if (document.body.classList.contains('laboratory')) return;
      if (film) {
        filmTime += step;
        const phase = Math.min(2, Math.floor(filmTime / 12));
        if (phase !== lastPhase) { setScene(['encounter','macro','night'][phase], true); lastPhase = phase; }
        if (scene === 'macro') macroConfig.zoom = .85 + ((filmTime - 12) / 12) * .6;
        $('.progress span').style.transform = `scaleX(${Math.min(1, filmTime / 36)})`;
        if (filmTime >= 36) { stopFilm(); setScene('encounter'); }
      }
      const k = reduced.matches ? 1 : 1 - Math.exp(-step * 2);
      p.lightIntensity += (targetLight - p.lightIntensity) * k;
      p.lightAngle += (targetAngle - p.lightAngle) * k;
      renderer.fillLight.intensity += (targetFill - renderer.fillLight.intensity) * k;
      if (colorMoving) {
        inner.lerp(targetInner,k); outer.lerp(targetOuter,k);
        // Uniforms use linear colors; UI values use sRGB hex strings.
        if (elapsed - lastColorTime > 1/30) {
          renderer.setIrisColorA(inner); renderer.setIrisColorB(outer);
          p.irisColorA = '#' + inner.getHexString(); p.irisColorB = '#' + outer.getHexString();
          lastColorTime = elapsed;
        }
        if (Math.abs(inner.r-targetInner.r)+Math.abs(inner.g-targetInner.g)+Math.abs(inner.b-targetInner.b) < .0001) {
          renderer.setIrisColorA(targetInner); renderer.setIrisColorB(targetOuter); colorMoving = false;
        }
      }
    },
  };
}
