---
name: EyeSeeYou
description: Paire d'yeux virtuels hyperréalistes qui observent le spectateur — rendu Three.js à eye-shader unifié, comportement physiologique simulé
colors:
  void-bg: "#050508"
  iris-inner: "#b07830"
  iris-outer: "#5a3214"
  pupil: "#030202"
  sclera-tint: "#f4ece2"
  vein-red: "#992620"
  lid-skin: "#c4956a"
  lid-edge: "#a56a60"
  inner-lid: "#d4857a"
  lash-brow: "#1a0e08"
  ui-panel-bg: "#05050ae8"
  ui-text-dim: "#ffffff59"
typography:
  ui-mono:
    fontFamily: "Space Mono, monospace"
    fontSize: "9px"
    fontWeight: 400
    letterSpacing: "1px"
  ui-heading:
    fontFamily: "Space Mono, monospace"
    fontSize: "9px"
    fontWeight: 700
    letterSpacing: "3px"
  loading-title:
    fontFamily: "Space Mono, monospace"
    fontSize: "38px"
    fontWeight: 700
    letterSpacing: "5px"
rounded:
  sm: "4px"
  pill: "22px"
  circle: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
components:
  panel:
    backgroundColor: "{colors.ui-panel-bg}"
    textColor: "{colors.ui-text-dim}"
    width: "310px"
  emo-button:
    rounded: "{rounded.circle}"
    size: "34px"
  mode-button:
    rounded: "{rounded.pill}"
    padding: "6px 10px"
---

## Overview

EyeSeeYou est un objet d'art numérique : deux yeux hyperréalistes qui suivent le spectateur via webcam (MediaPipe FaceLandmarker) ou pointeur. **Le rendu 3D est le design** ; l'interface de contrôle (panel droit + lil-gui gauche) est un outil de dev caché, monospace et sombre, jamais montrée au public (mode Immerse).

Le système visuel v3 repose sur un **eye-shader unifié** (un `MeshPhysicalMaterial` par globe, `onBeforeCompile`) : iris procédural (fibres radiales périodiques, cryptes fbm, collarette bruitée), pupille SDF (ronde par construction, formes cat/goat/oval/reptile/heart par warp), réfraction cornéenne physique (Snell, IOR 1.376, plan iris en retrait `uIrisRecess`), limbus en dégradé, sclère procédurale éclairée (veines périodiques, blush capillaire, rim SSS chaud). Une coque cornée transmission (clearcoat) fournit la couche humide et les catchlights réels depuis l'envmap. Paupières procédurales en amande avec profil de peau drapée (bourrelet de marge → creux → pli), ramp d'albedo shader (ligne de cils sombre/rouge, marbrures), ombre de contact en dégradé alpha.

Deux modes de rendu à préserver absolument (PRODUCT.md) : **peau texturée** (défaut) et **paupières noires flat** (`lid3d = 0`) pour fondre les yeux dans un contexte sombre.

## Colors

- **Fond** : `void-bg` quasi-noir — la scène est une pénombre d'où seuls les yeux émergent. Ne jamais éclaircir le fond par défaut.
- **Iris** : dégradé radial `iris-inner` (ambre) → `iris-outer` (brun sombre), pilotable par sliders (Color Inner/Outer/Tint). Le limbus est un assombrissement en dégradé, jamais un anneau dur.
- **Sclère** : `sclera-tint` blanc cassé chaud — jamais blanc pur (#fff lit "plastique"). Veines `vein-red` subtiles (slider Veins), visibilité croissante en s'éloignant du limbe.
- **Peau** : `lid-skin` base, marge ciliaire tirée vers `lid-edge` (plus sombre, plus rouge) par la ramp shader — la chaleur vient du SSS rim et des marbrures, pas d'une saturation uniforme.
- **UI** : monochrome sombre, blanc à faible opacité. Aucune couleur d'accent — l'œil est la seule couleur de l'écran.

## Typography

Une seule famille : **Space Mono** (Google Fonts), uppercase + letter-spacing large pour tous les libellés UI. La typographie signale "instrument de laboratoire" — froide, précise, en retrait. Pas de seconde famille, pas d'italique.

## Elevation

Pas d'ombres portées UI : les surfaces flottantes (panel, bottombar, boutons) utilisent `backdrop-filter: blur` + bordure `rgba(255,255,255,0.06-0.12)` sur fond translucide sombre. Dans la scène 3D, la profondeur vient du rendu physique (réfraction, ombre de contact des paupières, backCap) — jamais d'ombres fake plaquées (leçon des sprints 4-5).

## Components

- **Eyeball** (`_makeEyeballMaterial`) : sphère 128×96, tous les paramètres via uniforms (`uPupil`, `uIrisAngle`, `uIrisRecess`, `uRefract`, `uVeins`…). Toute nouvelle feature visuelle de l'œil doit entrer dans ce shader, pas en mesh séparé.
- **Cornea shell** : sphère ×1.002, transmission 1.0, clearcoat 1.0 — seule source de spéculaire/catchlights.
- **Eyelids** : calottes amande (`createAlmondLidGeometry`), profil de peau par vertex (`vertParams.prof`), matériaux clonés puis `applyLidSkinShader()` **par instance** (Material.clone() ne copie pas onBeforeCompile).
- **Panel droit** (`#panel`) : sliders debug par domaine anatomique ; double-clic sur la valeur = saisie libre. Tab pour toggler.
- **lil-gui gauche** : comportement (personality, state, vitals, blink, tracking, heartbeat).
- **Bottombar** : émotions emoji + modes de gaze (Track/Motion/Lurk) — la seule UI potentiellement publique.

## Do's and Don'ts

- ✅ Tout effet optique doit émerger du modèle physique (réfraction, SDF, envmap) — si un effet exige un mesh-décalque plaqué, repenser.
- ✅ Préserver la paire de modes peau/flat (`lid3d`) dans toute évolution des paupières.
- ✅ Garder le comportement (EyeController, springs, vitals) découplé du rendu — il doit pouvoir piloter les servos EyeMech (TL/TR/BL/BR).
- ✅ `prefers-reduced-motion` désactive tremor + microsaccades.
- ❌ Jamais de LED, d'iris géométrique, de coque plastique — anti-référence HAL 9000 (PRODUCT.md).
- ❌ Pas de flash/strobe (photosensibilité), pas de gore.
- ❌ Ne pas réintroduire de shadow maps sur la géométrie courbe (artefacts, Sprint 4) ni de couches stencil.
- ❌ L'UI ne prend jamais le pas sur les yeux : pas d'accent coloré, pas d'UI visible en mode immersif.
