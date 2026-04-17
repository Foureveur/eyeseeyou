# EyeSeeYou — Project Tracker

> **Version actuelle : v0.6**
> Suivi des sprints, TODO et roadmap du projet EyeSeeYou (rendu 3D réaliste d'yeux en Three.js)

## Stack

- Three.js r170 (ES modules, CDN importmap)
- Single HTML file: `eyeseeyou_v1.html`
- GLB model: `eye.glb` (TinyEye — iris + sclera, 12 morph targets)
- BlazeFace face tracking (MediaPipe)
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

## Sprint actuel — Sprint 6 : Polish & Features avancées

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
| Shadow maps → artefacts sur géométrie courbe | Abandonné | Approche shadow strip suffisante pour l'instant |
| Pupille non-ronde | À fixer dans Blender | Le mesh iris du GLB n'est pas un cercle parfait |

---

## Décisions techniques

- **MeshBasicMaterial pour la sclera** — Pas de MeshStandardMaterial car le lighting directionnel crée des artefacts sombres sur la sphère. La texture sclera fournit déjà les nuances de couleur.
- **Pas de shadow maps** — PCFSoftShadowMap testée, shadow acne impossible à éliminer sur la géométrie courbe de l'oeil. Shadow strip (mesh semi-transparent) suffit pour l'illusion.
- **Lower lid color = inner + outer** — Sur la paupière inférieure, c'est le mesh `inner` (BackSide) qui est visible car les normales du mesh `outer` (FrontSide) pointent à l'opposé de la caméra.
- **Single HTML file** — Tout le code dans un seul fichier pour simplicité de déploiement et itération rapide.
