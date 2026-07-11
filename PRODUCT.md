# Product

## Register

brand

## Platform

web

## Users

Trois contextes d'usage, tous prioritaires :

1. **Installation / écran dédié** — les yeux tournent en plein écran (expo, vitrine, écran domestique). Le spectateur ne voit que les yeux ; l'expérience immersive prime. Ambiance : pièce sombre ou pénombre, écran comme seule source narrative.
2. **Démo web publique** — visiteurs sur `eyes.partiqle.studio`, desktop et mobile, webcam facultative (fallback pointeur). Première impression en < 5 s : « ils me regardent vraiment ».
3. **Banc d'essai EyeMech** — Quentin lui-même, en tant que jumeau numérique des yeux physiques (EyeMech Epsilon, 4 servos de paupières TL/TR/BL/BR). Le comportement (gaze, blinks, springs, vitals) doit rester exportable vers les servos.

## Product Purpose

EyeSeeYou est une paire d'yeux virtuels hyperréalistes qui observent le spectateur via la webcam. Le succès = le moment où quelqu'un se sent *réellement observé* — pas « joli rendu 3D », mais l'inconfort/fascination d'un regard vivant. À terme, le même cerveau comportemental pilote les yeux virtuels et une paire d'yeux animatroniques physiques, synchronisés.

## Brand Personality

**Vivant, troublant, précis.**

Quatre personnalités sélectionnables (elles pilotent le système d'états curiosity/tension/fatigue/alertness et les modes de gaze) :

- **Uncanny** — on se sent observé, c'est troublant, on ne peut pas détourner le regard (mode Lurk, tension haute, saccades sèches).
- **Charming** — chaleureux, expressif, séducteur (blinks doux, pupilles dilatées, micro-sourires de paupières).
- **Curious** — explorateur, vif, attentif au moindre mouvement (saccades fréquentes, curiosity haute).
- **Neutral** — présence calme, minimale, presque clinique (baseline physiologique pure).

L'inquiétude vient du réalisme comportemental et optique, jamais du gore ou de l'artifice.

## Anti-references

- **Œil robot / HAL 9000** — mécanique, LED, iris géométrique, coque rigide. C'est exactement le rendu actuel à fuir : toute lecture « pièces assemblées / plastique » est un échec.
- **Cartoon / mascotte** — yeux Pixar/emoji stylisés. Aucune simplification mignonne.
- **Horreur gore** — injecté de sang, chair à vif, jumpscare visuel. L'inquiétude reste subtile, physiologique.
- **Démo tech WebGL générique** — le look « three.js example » : sphère flottante dans le noir + sliders apparents. L'UI de contrôle reste un outil de dev caché (raccourci), le public ne voit que les yeux.

## Design Principles

1. **La physique avant le truquage** — chaque effet visuel doit émerger d'un modèle plausible (réfraction cornéenne, SDF, springs, envmap) plutôt que d'une couche fake plaquée. Un fake incohérent avec la lumière se voit toujours.
2. **Le comportement est le produit** — micro-saccades, tremor, vergence, blinks réactifs : c'est ce qui rend vivant. Aucun polish visuel ne compense un regard mort, et inversement le comportement porte même un rendu imparfait.
3. **Deux modes de blend, un seul moteur** — le rendu doit fonctionner en mode « peau texturée » (paupières chair) ET en mode « paupières noires flat » pour fondre les yeux dans des contextes sombres. Les deux modes partagent géométrie et comportement ; seul le matériau change.
4. **Un cerveau, deux corps** — toute logique comportementale doit rester découplée du rendu pour piloter indifféremment le WebGL et les servos EyeMech (mapping TL/TR/BL/BR déjà présent).
5. **L'immersion ne se casse jamais** — pas d'UI visible en mode immersif, pas de chargement brutal, dégradation gracieuse sans webcam (pointeur) et sur mobile (perf adaptée).

## Accessibility & Inclusion

- Respecter `prefers-reduced-motion` : réduire micro-saccades/tremor à un mouvement lent et prévisible, désactiver le mode Lurk (surgissement).
- L'expérience ne doit jamais dépendre de la webcam : fallback pointeur toujours fonctionnel, et l'app doit l'annoncer discrètement.
- Épilepsie/photosensibilité : aucun flash, aucun strobe — les catchlights et blinks restent dans des fréquences lentes.
- Mobile : viser 30 fps minimum sur mobile milieu de gamme (résolutions de géométrie et pixelRatio déjà adaptatifs — à préserver).
