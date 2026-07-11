# EyeSeeYou — Project Tracker

> **Version actuelle : v3.0** (`eyeseeyou_v3.html`)
> Suivi des sprints, TODO et roadmap du projet EyeSeeYou (rendu 3D réaliste d'yeux en Three.js)
> Cadrage produit : voir `PRODUCT.md` · Système visuel : voir `DESIGN.md`

## Stack

- Three.js r170 (ES modules, CDN importmap)
- Single HTML file: `eyeseeyou_v3.html` (v1/v2 conservés pour référence)
- **Yeux 100% procéduraux** — plus de GLB ; eye-shader unifié sur MeshPhysicalMaterial
- MediaPipe FaceLandmarker (tasks-vision, 478 landmarks + blendshapes)
- Serveur: `npx http-server . -p 8080`

## Architecture

- **EyeRenderer** : charge le GLB, crée les 2 yeux, gère materials + stencil buffer
- **EyeController** : params UI (sliders, color pickers), gaze modes, microexpressions
- **FaceTracker** : MediaPipe face tracking via webcam
- **Rendering order** : Ghost(0) → Sclera(1) → Iris(2) → Limbus(2.1) → Shadow(2.5) → Lids(3) → TearFilm(3.1) → Lashes(3.5) → BackCap(4) → Cornea(11) → CatchLight(12)

---

## Sprints terminés

### Sprint 1 — Setup initial
- Chargement GLB, dual eye, stencil buffer rendering
- Iris texture mapping (fix TEXCOORD remap par GLTFLoader)
- Cornea refraction, sclera texture

### Sprint 2 — Lid system
- Eyelids 3D (upper/lower) avec morph targets
- Lid color pickers (skin, lower, edge)
- Lid shadow strip (opacity slider)
- Lid 3D toggle (stdMat/flatMat switch)

### Sprint 3 — Gaze system
- 3 modes : continuous, motion, jumpscare/lurk
- Microexpression idle (3-layer sine saccades)
- Smoothing exponentiel, vergence, parallax
- Face tracking integration (BlazeFace)

### Sprint 4 — Bugfixes & polish
- Fix lower lid color (root cause: inner mesh BackSide visible, pas outer FrontSide)
- Fix backCap sphere (radius réduit à scleraR * 0.99, bande étroite)
- Shadow maps testées puis retirées (artefacts sur géométrie courbe)
- Revert sclera MeshStandardMaterial → MeshBasicMaterial (artefact d'ombre)

---

### Sprint 5 — Réalisme & Comportement (v0.6)
- Micro-saccades réalistes (bursts 25-55ms, drift inter-saccadique, amplitude variable)
- Blink amélioré (double-blinks 15%, vitesse variable, blink réactif aux saccades)
- Smooth pursuit vs saccade (switching basé sur la vélocité de la cible)
- Limbus ring (anneau sombre iris/sclera, opacity slider)
- Tear film / wet line (reflet spéculaire le long des bords de paupières)
- Iris parallax (offset XY dynamique basé sur la rotation de l'oeil)
- Catch lights (disque lumineux sur cornée, suit le key light)
- Listing's law (torsion contrainte : rotation.z = -h*v*k sur mouvements diagonaux)
- Cils procéduraux (50 upper + 30 lower, toggleable)
- Skin texture (bump map procédural canvas, slider intensité)

---

## Sprint 7 — v3 : Eye shader unifié (2026-07-11)

- Fork `eyeseeyou_v3.html` depuis v2.11
- **Eye-shader unifié** : iris procédural (fibres radiales périodiques, cryptes, collarette),
  pupille SDF (formes cat/goat/oval/reptile/heart en warp), **réfraction cornéenne physique**
  (Snell, IOR, plan iris en retrait), limbus dégradé, sclère éclairée (veines, blush, rim SSS)
- Supprimés : GLB + stencil ghost + limbus ring mesh + catchlight discs + iris parallax hack
- Paupières chair : profil drapé (marge/creux/pli), ramp albedo (ligne de cils, marbrures),
  ombre de contact alpha-gradient, waterline humide (clearcoat) ; mode flat noir préservé
- **MediaPipe FaceLandmarker** remplace BlazeFace : distance réelle (écart inter-iris),
  blendshapes (blink mirroring, sourire → dilatation), multi-visages (attention alternée)
- **4 personnalités** (neutral/uncanny/charming/curious) pilotant state + gaze mode + blink + pupille
- `prefers-reduced-motion` respecté ; localStorage v3 séparé
- Cadrage : PRODUCT.md + DESIGN.md créés (workflow Impeccable)

---

## Sprint 8 — v3.4 : Hand tracking (2026-07-11)

- **MediaPipe GestureRecognizer** ajouté à côté du FaceLandmarker (même flux webcam,
  passe mains 1 tick sur 2 ≈ 15 Hz) — 21 landmarks + gestes classifiés en un modèle
- **Doigt pointé > visage** : index tendu (toute direction, détection custom tip/PIP)
  → l'œil verrouille le bout du doigt de la main la plus proche (plus grande taille
  apparente poignet→MCP majeur) dans TOUS les gaze modes
- **Louchement max** : taille apparente de la main → profondeur ; targetZ autorisé
  jusqu'à 1.35 (> 1 = zone cross-eye), `faceDist` flooré dans setGaze pour ne jamais
  passer derrière les yeux. Triade de près : convergence + accommodation pupille
- **Réactions gestuelles** : poing = squint + myosis (tension) ; pouce/victory/ILY =
  joie soutenue (paupière inf. remonte, mydriase légère) ; coucou paume ouverte
  (≥3 inversions de direction en 1,5 s) = squint joyeux + double-blink ; main qui
  fonce vers l'objectif = flinch (blink réflexe + paupières écarquillées + spike pupille)
- lil-gui folder « Hand tracking » (enabled, reactions, proximity gain, max cross-eye,
  flinch threshold) + persistance localStorage + HUD/overlay webcam (anneau cyan doigt)
- `window.__eye` : handle debug console (controller, tracker, handConfig)

### v3.5 — Emotion pulses + la totale des réactions (même jour)

- **EmotionPulse** : liaison unifiée émotions ↔ paramètres. Les gestes passent par les
  MÊMES tables `EMOTIONS` (lids, tilts, slant, width, pupille) + `EMOTION_STATE`
  (tension/curiosité/alertness/fatigue → saccades, tremor, réactivité, BPM) que les
  boutons emoji. `pulseEmotion(name, k, hold)` : attaque rapide (startle), decay expo ;
  `hold` soutient tant que le geste dure. `getEffState()` = état global + blend du pulse
  (les vitals lisent ça, jamais de mutation des sliders lil-gui)
- Recâblage : flinch→fear, poing→anger (hold), 👍/✌️/🤟→joy (hold), wave→joy pulse
- **🤏 Pince** : détection pouce+index (thumbExt vs pinky-MCP, gap normalisé) → contrôle
  DIRECT de la pupille (gap 0→0.07, gap max→0.80). Prioritaire sur pointing
- **🖕** : majeur seul tendu → contempt pulse + regard détourné ostensible 2,2 s
  (côté opposé à la main, légèrement vers le haut) + blink lent dédaigneux
- **✋ Stop** : paume ouverte proche immobile ≥600 ms → freeze (retenue de souffle) :
  drift/saccades/tremor amortis à zéro, blinks supprimés (réflexes forcent le passage)
- **👆🌀 Vertige** : rotation cumulée de la direction du doigt ≥ ~1,75 tour → spirale
  oculaire rentrante 1,1 s + blink de reset + pulse surprise (rate-limit 6 s)
- **🫣 Cache-cache** : visage perdu 0,5–5 s avec une main plein cadre → surprise + blink
  à la réapparition
- Ordre de priorité du regard : dizzy > lookAway > doigt pointé > modes (Track/Motion/Lurk)
- HUD : lignes hand (geste/pinch/z) + pulse (nom/intensité/hold) + freeze

### v3.6 — Anti-jitter doigt (même jour)

- **Filtre One-Euro-lite** sur la cible doigt (x/y/z) : lissage fort au repos (blend
  `handConfig.smoothing` 0.3), facteur qui monte avec la vitesse → balayages rapides
  réactifs. Testé : −72 % de jitter, grand mouvement suivi en 2 ticks
- **Hystérésis pointing** : engage après 2 ticks consécutifs, relâche après 4 —
  la pose brute clignote aux angles limites, le regard ne flippe plus doigt/visage
- Flinch calculé sur le z BRUT (le lissage masquerait la ruée) ; détecteurs
  wave/cercle/paume immobile restent sur la position brute
- Webcam feed affiché par défaut (+ touche `d` toggle vidéo ET overlay ensemble)
- Slider « finger snappiness » dans le folder Hand tracking

---

## Sprint suivant — Sprint 9 : pistes

### TODO réalisme visuel
- [ ] **SSS sclera** — Subsurface scattering léger sur la sclera (veinules rougeâtres translucides)
- [ ] **Caroncule** — Coin interne rose de l'oeil
- [ ] **Iris détails** — Fibres radiales, cryptes, collarette

### TODO technique
- [ ] **Performance** — Profiling, LOD, instancing si besoin
- [ ] **Export presets** — Sauvegarder/charger des configurations de paramètres
- [ ] **Responsive** — Adapter le canvas et l'UI à différentes tailles d'écran

---

## Bugs connus

| Bug | Statut | Notes |
|-----|--------|-------|
| Shadow maps → artefacts sur géométrie courbe | Abandonné | Éclairage envmap + ombre de contact alpha-gradient suffisent |
| Pupille non-ronde | **Résolu (v3)** | Pupille = SDF shader, ronde par construction — le GLB n'est plus utilisé |
| SSS paupières invisible (v2) | **Résolu (v3)** | Material.clone() ne copie pas onBeforeCompile → shader appliqué par instance |

---

## Décisions techniques

- **MeshBasicMaterial pour la sclera** — Pas de MeshStandardMaterial car le lighting directionnel crée des artefacts sombres sur la sphère. La texture sclera fournit déjà les nuances de couleur.
- **Pas de shadow maps** — PCFSoftShadowMap testée, shadow acne impossible à éliminer sur la géométrie courbe de l'oeil. Shadow strip (mesh semi-transparent) suffit pour l'illusion.
- **Lower lid color = inner + outer** — Sur la paupière inférieure, c'est le mesh `inner` (BackSide) qui est visible car les normales du mesh `outer` (FrontSide) pointent à l'opposé de la caméra.
- **Single HTML file** — Tout le code dans un seul fichier pour simplicité de déploiement et itération rapide.
