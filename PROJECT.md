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

### v3.7 — Modal gestes + cils anatomiques + poids + binoculaire (2026-07-12)

- **Modal d'aide gestes** : bouton ✋ dans la bottombar (+ touche `h`), 11 gestes
  documentés, blur d'arrière-plan, fermeture Esc/clic-hors/×
- **Cils refondus** (réf. PMC6147748, StatPearls, Amador 2015) : modèle par touffes
  qui PAVENT l'arc en continu (chaque touffe possède un slot contigu ; les cils ne
  jittent qu'à l'intérieur → plus de trous). Gradients : densité max au centre,
  longueur max en temporal (« cat-eye »), courbure max en médial/central. Le slider
  `clumping` contrôle la séparation des touffes sans jamais créer de trou nu
- **Poids / gravité** (`weightConfig`, folder lil-gui) : (a) inertie du regard —
  masse virtuelle sous-amortie → overshoot/glissade post-saccadique (0% au défaut
  0.45, jusqu'à 12% au max) ; (b) affaissement gravitaire des paupières sup. entre
  les clignements, effacé à chaque blink, amplifié par la fatigue ; (c) fermeture de
  blink accélérée (22% vs 78% réouverture) + rebond
- **Cohérence binoculaire** (fix « part en couille ») : `setGaze` décompose désormais
  le regard en VERSION (direction commune) + VERGENCE (croisement symétrique plafonné
  à `maxVergence`=28°, +`crossVergence`=20° doigt au ras). Version et vergence clampées
  SÉPARÉMENT puis recomposées → les 2 yeux restent exactement symétriques quelle que
  soit la distance/le jitter (saut de vergence : 15.7°→1.3° en test de wiggle latéral).
  Le floor de `faceDist` relevé à camZ×0.32 pour éviter la singularité du look-at
- **Toggle « per-eye tracking »** : désormais le modèle par-œil EST le modèle cohérent
  (version+vergence). Le toggle OFF bascule sur le fallback V1 parallèle (moins réaliste).
  Recommandation : garder ON (défaut forcé au load) ; le toggle ne sert plus qu'à l'A/B debug
- `window.__eye` expose maintenant renderer, weightConfig, convergenceConfig

---

### v3.8–v3.9 — Cils : hair-cards à texture alpha (2026-07-13)

- v3.8 (modèle wisp géométrique) jugé « immonde » de face : rubans plats vus bout-à-bout
  = crocs/duvet. Cause racine = rendu géométrique de face, pas la répartition.
- **v3.9 = technique du métier : hair-cards alpha.** `createLashTexture()` dessine sur
  un canvas une frange de poils fins, courbés, effilés (bande de racines sombre en bas,
  pointes translucides en haut, dégradé racine→pointe quasi-noir→brun). `createLashGeometry`
  pose des **rubans texturés courbés** (peu, larges, chevauchants) le long de la marge :
  la texture porte la densité des poils, le ruban porte la courbure C + le flux directionnel.
- Matériau : `map` + `transparent` + `alphaTest 0.04` + `depthWrite:false` → frange sombre
  douce mélangée (pas de découpe dure ni de tri de transparence). Texture mise en cache.
- Curseur **féminité** (`lashConfig.femininity`) + presets ♀/♂ dans le folder Lashes :
  ♀ = long/courbé/dense/soyeux, ♂ = court/droit/clairsemé (ligne discrète). Distinction nette.
- Limite assumée : la réf photo est de 3/4 profil (cils vus de côté = lush) ; nous sommes
  de face → les hair-cards donnent la densité soyeuse là où la géométrie plate échouait.
- `window.__eye` expose `lashConfig` pour le tuning console.

## Sprint A (v3.11) — « L'œil est vivant » (2026-07-18, branche v4-realism)

> Audit complet + roadmap 5 sprints : voir `ROADMAP.md`. Cible visuelle : TinyEye (tinynocky).

- **Fix majeur** : drift/micro-saccades/tremor ne tournaient QUE sans visage détecté
  (`_updateMicro` = branche else du tracking) → zéro vie fixationnelle en usage réel.
  Nouvelle couche `_updateFixational` ADDITIVE, active dans tous les modes (atténuée
  ×0.65 en tracking) : drift Ornstein-Uhlenbeck (fini les sinus), micro-saccades
  CORRECTIVES (déclenchées par l'erreur de drift ou Poisson ~1.7 Hz, dirigées vers la
  fixation, main-sequence), square-wave jerks (~35 s), glissade post-saccadique (~85 ms).
  `femConfig` + folder Vitals.
- **Scan-path facial** : en Track, l'œil fixe œil-G / œil-D / bouche du spectateur
  (landmarks MediaPipe 473/468/13, dwell 0.3–2.5 s) au lieu de poursuivre le barycentre.
- **Pupille physiologique** (`pupilPhysConfig`) : réflexe photomoteur depuis la luminance
  webcam (8×8 downsample ~4 Hz, latence 250 ms, constriction τ=0.3 s / dilatation τ=2.5 s
  — l'asymétrie est LE tell), hippus permanent (amplitude ∝ obscurité), micro-redilatation
  post-blink. Testé : constriction pleine en 0.5 s, dilatation ~4× plus lente.
- **Blinks** : 18 % partiels (amplitude 0.45–0.75), désync G/D 5–15 ms propagée jusqu'aux
  springs et à la géométrie (updateLids accepte {l,r} par œil), dépression du regard ~2°
  pendant la fermeture, re-dilatation pupillaire post-blink.
- **Respiration** : bob vertical du rig ~0.23 Hz + seconde harmonique.
- **Quick wins matérialité** : zonage wet/dry de la roughness du globe (film lacrymal
  glossy sur la zone exposée via uLidUp/uLidLow, mat sous les paupières) ; cils passés
  de MeshBasicMaterial (non éclairé) à MeshStandardMaterial (sheen kératine).
- Idle refondu : fixations « look-around » (dwell + saccades, wide glances 18 %).
- `window.__eye` expose femConfig + pupilPhysConfig.

## Sprints B+C+E (v4.0) — la version « banger » (2026-07-18, branche v4-realism)

- **Cils = brins 3D réels** (Sprint B) : `createLashGeometry` refondu — ~110/62 brins par
  paupière, tubes effilés (12 seg × section triangulaire) sur béziers J-curl, racines
  plantées SOUS la marge en 2–3 rangées quinconce, clumping par attracteurs partagés,
  gradient kératine racine→pointe en vertex colors. UN BufferGeometry OPAQUE par paupière
  (depthWrite on → fini les halos de tri des cards v3.9). Matériau MeshPhysical
  vertexColors + sheen + clearcoat. Les hair-cards + createLashTexture supprimés.
  Gradients anatomiques v3.7 et sliders lashConfig conservés.
- **Iris en relief 3D — POM** (Sprint C, la signature TinyEye) : height field `irisH`
  (bol montant, collerette charnue bosselée, sillons radiaux, cryptes), le rayon réfracté
  marche 12 pas dans le relief (parallax occlusion) au lieu de frapper un plan ; normale
  dérivée + self-shadow 3 taps vers la lumière ; slider `Relief` (uIrisRelief, défaut 0.55).
- **Tissu irien dynamique** : fibres échantillonnées en espace tissu `rT` — elles se
  COMPRIMENT quand la pupille se dilate au lieu d'être rognées (testé à pupilSize 0.85 :
  bande fibreuse dense autour de la pupille géante).
- **Protrusion cornéenne par défaut** : `corneaBulge` défaut 0 → 0.8 (profil + catchlight).
- **Chaîne photo** (Sprint E cœur) : EffectComposer — RenderPass → UnrealBloom subtil
  (threshold 0.88 : catchlights seulement) → OutputPass (ACES+sRGB) → pass grain film +
  vignette custom. Micro-dérive caméra « hand-held » (~±0.013 @ 0.13 Hz). `photoConfig`
  + folder « Photo (v4) », désactivé sur mobile, persisté avec le left-bar.
- Perf mesurée : ~0.7 ms/frame composer inclus (Apple Silicon). Titre → EyeSeeYou v4.
- Persistance étendue : photo/fem/pupilPhys dans `eyeseeyou_v3_behavior`.

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
