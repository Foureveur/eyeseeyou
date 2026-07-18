# EyeSeeYou — Analyse critique & Roadmap réalisme (v3.10 → v4)

> Audit complet du code `eyeseeyou_v3.html` (2026-07-18).
> Objectif : passer de « bon rendu 3D temps réel » à « on jurerait une vraie paire d'yeux filmée ».
> Chaque constat ci-dessous est ancré dans une ligne de code précise, pas dans une impression.

---

## 0. Le diagnostic en une phrase

Le projet a accumulé d'excellents **systèmes** (vergence version/vergence, pulses émotionnels,
réfraction cornéenne, springs de paupières) mais trois choses tuent le résultat perçu :

1. **Les vitals (micro-saccades, drift, tremor) sont litteralement désactivés en mode expérience.**
   Dans `_updateGazeMode` (continuous) : `if (f.detected) { target = face } else this._updateMicro(dt)`.
   `_updateMicro` contient TOUT : drift, micro-saccades, tremor. Dès que ton visage est détecté
   (= 100 % du temps en usage réel), l'œil fait une poursuite lissée pure, zéro vie fixationnelle.
   Tout le travail des sprints 5–7 sur les saccades **ne tourne jamais** quand tu regardes l'œil.
2. **La physique est réglée pour être invisible.** `weightConfig.gaze = 0.45` → raideur ~580,
   amortissement ~38 → ratio d'amortissement ζ ≈ 0.79 : quasi-critique, aucun overshoot visible
   (le commentaire du code l'admet : « 0 % au défaut 0.45 »). Le lid droop plafonne à ~0.05
   d'ouverture et est effacé par chaque blink (toutes les 4 s) : il n'a jamais le temps d'exister.
3. **Les cils sont à la mauvaise échelle de technique.** Les hair-cards alpha (v3.9) sont la
   technique des personnages vus à 2 m. Ici les yeux remplissent l'écran : c'est du « hero
   close-up », le territoire des **brins 3D réels** (MetaHuman, VFX). En plus le matériau est
   `MeshBasicMaterial` (non éclairé → papier découpé noir), `depthWrite:false` + DoubleSide
   (halos de tri), une seule texture cachée pour tous les cards (répétition visible).

Le reste de l'audit détaille chaque pilier, puis la roadmap en 5 sprints ordonnés par
impact-perçu / effort.

---

## 0bis. La cible visuelle nommée : TinyEye (tinynocky)

Quentin a fixé la cible : le rendu hero de https://tinynocky.gumroad.com/l/tinyeye.
Analyse de la cible (2026-07-18) — trois faits qui changent la stratégie :

1. **TinyEye est un œil « stylised », pas photoréaliste humain**, rendu en Cycles (raytracing
   offline). La cible n'est donc PAS « macro photo d'œil humain » mais « hyperdétail stylisé
   parfaitement éclairé » : iris géant, matières léchées, peau de poupée SSS. Bonne nouvelle :
   ce look est **atteignable en WebGL temps réel** — c'est du shading maîtrisé, pas de la
   complexité biologique infinie.
2. **La signature n°1 du look TinyEye est l'iris en relief 3D.** Dans Blender c'est de la vraie
   géométrie déplacée : bol irien creusé, collerette charnue en bourrelets qui castent de vraies
   micro-ombres, sillons radiaux profonds, le tout vu à travers la réfraction cornéenne.
   Notre iris est un plan plat avec du bruit de valeur → c'est LE gap principal de matérialité.
   Équivalent temps réel : **heightfield irien procédural + Parallax Occlusion Mapping**
   (8–16 pas dans la fenêtre cornéenne, déjà en espace objet dans notre shader), normale
   dérivée du heightfield pour le shading, self-shadowing par marche vers la lumière.
   S'insère dans `EYE_GLSL_COLOR` existant.
3. **Les 5 autres signatures du hero** : (a) dôme cornéen bombé très glossy avec catchlight
   fenêtre étiré par la courbure (+ bloom) ; (b) peau bébé SSS mate avec blush rosé au canthus ;
   (c) **peach fuzz** — duvet vellus visible sur la silhouette des paupières ; (d) cils =
   brins fins individuels, wispy, translucides en pointe (confirme le Sprint B) ; (e) DOF doux
   + grade chaud (confirme le Sprint E).

À noter : les textures `TinyEye_*.png` du repo sont des bakes de cet asset (licence : usage
et remix commerciaux OK, pas de revente standalone). Les maps sclera **normal / roughness /
transmission** ne sont branchées nulle part dans v3 — quick win immédiat comme base de
matière sclère. v3 s'inspire déjà des propriétés TinyEye (pupilles cat/goat/heart/reptile,
grow/shrink, veins) — il manque le relief et la lumière, pas les features.

---

## 1. Audit détaillé

### 1.1 Comportement oculaire (micro-saccades, drift, poursuite)

| Constat | Ligne / code | Gravité |
|---|---|---|
| Vitals coupés dès que le visage est détecté | `_updateGazeMode` : `_updateMicro` seulement en `else` | ★★★ bloquant |
| Drift = sinus déterministes (`sin(t*0.7)+sin(t*2.3)`) → périodique, robotique | `_updateMicro` | ★★ |
| Micro-saccades en direction **uniformément aléatoire** ; les vraies sont surtout horizontales et **correctives** (elles ramènent vers la cible après que le drift a dérivé) | `angle = Math.random()*2π` | ★★ |
| Profil de saccade = cosinus ease-in-out symétrique ; les vraies suivent la « main sequence » (pic de vélocité ∝ amplitude, décélération plus longue) + glissade post-saccadique | `p = 0.5-0.5*cos(pπ)` | ★ |
| Pas de square-wave jerks (paire aller-retour ~200 ms) — signature ultra-reconnaissable de l'œil vivant | absent | ★★ |
| En poursuite du visage : suivi continu du **point milieu inter-iris**. Un humain ne fait jamais ça : il **fixe ton œil gauche, saccade vers ton œil droit, parfois la bouche** (scan-path triangulaire), avec des dwell de 0.3–2 s | `face.x = (ir.x+il.x)/2` | ★★★ le vrai « eye contact » |
| Pas de saccades paupière (les paupières twitchent avec chaque saccade verticale) | absent | ★ |

### 1.2 Pupille

| Constat | Code | Gravité |
|---|---|---|
| **Pas de hippus** (oscillation permanente 0.05–0.3 Hz, la pupille n'est JAMAIS immobile) | absent | ★★★ |
| **Pas de réflexe photomoteur** — alors que la webcam est déjà là : la luminance moyenne du flux pourrait piloter la pupille (tu éclaires la caméra → myosis). Feature spectaculaire en démo | absent | ★★★ |
| Constriction/dilatation **symétriques** (`responseSpeed 12` unique). Réalité : constriction rapide (~0.2–0.5 s), dilatation lente (~2–4 s). Cette asymétrie est LE tell de la vraie pupille | `pf.offset lerp unique` | ★★★ |
| L'iris ne se **déforme pas** quand la pupille change : le masque SDF s'ouvre sur une texture figée → « trou dans une photo imprimée ». Le tissu réel se comprime radialement (collerette quasi fixe, zone pupillaire compressée) | `EYE_GLSL_COLOR` : `rr` jamais remappé par `uPupil` | ★★★ |
| Latence absente : le réflexe réel a ~250 ms de retard | absent | ★ |

### 1.3 Matérialité — œil

| Constat | Code | Gravité |
|---|---|---|
| **L'œil est une sphère parfaite.** Aucune protrusion cornéenne (réel : rayon cornéen ~7.8 mm sur globe ~12 mm, apex ~2.5 mm en avant). Conséquences : silhouette fausse de profil, catchlight non déformé, pas de bombement de paupière au passage de la cornée | `corneaGeo = Sphere(Reye*1.002)`, bulge défaut 0 | ★★★ |
| Sclère : roughness **uniforme** (0.28). Réel : le film lacrymal rend la zone exposée glossy (~0.08) et les zones sous paupières/canthi plus mates. Les uniforms `uLidUp/uLidLow` existent déjà → zonage wet/dry quasi gratuit | `roughness: 0.28` constant | ★★★ |
| Veines = un seul champ fbm ridgé → vermicelles, pas des vaisseaux. Les vrais : arborescences radiales fines, plus denses aux canthi, quasi absentes en haut (couvert) | `veinField = eyeFbmP(...)` | ★★ |
| Iris : fibres = value noise (grille visible en macro), une seule profondeur. Le stroma réel est volumétrique → 2 couches de fibres parallaxées à des profondeurs différentes suffisent à donner le volume | 1 seul `irisPlaneZ` | ★★ |
| SSS sclère = rim additif fixe → lueur de silhouette, pas de la translucidité | `EYE_GLSL_RIM` | ★ |
| Transmission 0.99 sur **toute** la coquille sphérique (coût, tri) alors que seule la calotte cornéenne en a besoin | `corneaGeo` full sphere | ★ perf |
| Le film lacrymal n'a pas de cycle : après un blink réel, les reflets sont nets puis se dégradent doucement jusqu'au blink suivant (roughness qui monte de ~5 % sur 5–10 s, reset au blink) | absent | ★ délicieux détail |

### 1.4 Cils (le point noir)

État v3.9 : ~20 rubans texturés/paupière, texture canvas unique, `MeshBasicMaterial` non éclairé,
`alphaTest 0.04` + `depthWrite:false` + DoubleSide.

Pourquoi ça ne marchera **jamais** de face à cette échelle :
- Un card large suit l'arc → vu de face il est quasi tranche par endroits, la texture s'écrase.
- Non éclairé = aucun glint kératineux, aucun modelé — silhouette plate.
- Une seule texture partagée (flip U pour seule variété) → motif répétitif.
- Tri de transparence : halos aux chevauchements.
- Les racines flottent sur la surface au lieu d'émerger de la marge (ligne grise).

**La bonne technique ici : brins 3D réels.** ~150 cils sup + 75 inf par œil, chacun un tube
effilé sur bézier (16 segments, 5 côtés → pointe), fusionnés en un seul BufferGeometry par
paupière (~20 k verts/œil : trivial). Shading Kajiya-Kay (2 lobes spéculaires anisotropes le
long de la tangente) via onBeforeCompile, **opaque + depthWrite:true** (fini les halos), pointes
sub-pixel + alphaToCoverage. Racines plantées 0.5 mm SOUS la surface de la marge, 2–3 rangées
en quinconce. Clumping par attracteurs (centres de mèches le long de la marge, pointes attirées).
On conserve tous les acquis v3.7 (gradients anatomiques, féminité, presets ♀/♂).

### 1.5 Peau / paupières

| Constat | Code | Gravité |
|---|---|---|
| SSS = rim hack (mix vers orange à l'angle rasant). Le vrai gain : **pre-integrated skin shading** (wrap diffuse + décalage rouge fonction de la courbure) — implémentable dans le onBeforeCompile existant | `applyLidSkinShader` | ★★ |
| Fermer l'œil = rotation polaire des vertex → la paupière **glisse comme un volet**. La vraie peau se **plisse** : le pli s'accumule, des micro-rides horizontales apparaissent ∝ fermeture | `_displaceAlmondLid` | ★★ |
| bumpMap value-noise à 0.003 → invisible. Il faut une normal map dérivée (pores + rides orientées le long de l'arc, crow's feet au canthus temporal) | `generateSkinBumpTexture` | ★★ |
| **Caroncule et plica semilunaris absentes** — le coin interne est l'ancre anatomique n°1 du « c'est un vrai œil » (déjà dans le TODO Sprint 9) | absent | ★★★ |
| Socket = sprite dégradé radial → vignette flottante. Un vrai petit maillage périorbitaire (arcade, racine du nez) avec le shader peau, même grossier, ancrerait tout | `_socketTex` | ★★ |
| Déplacement des vertex de paupières **chaque frame** sur CPU (~10 k verts) même sans changement → à déplacer en vertex shader (uniforms d'ouverture), libère le CPU et permet segsV > 12 (facettes visibles en macro) | `updateLids` par frame | ★ perf |

### 1.6 Physique / poids

- L'inertie généraliste est sous-critique seulement à gaze > ~0.7 ; au défaut elle ne produit rien.
  → Remplacer par une **injection de glissade événementielle** : à la fin de chaque saccade,
  overshoot délibéré de 5–8 % de l'amplitude, décroissance 80–120 ms. Visible, contrôlé, jamais mou.
- Lid droop : soit on l'assume (amplitude ×3, période blink plus longue quand fatigue), soit on le coupe.
- Blink : ajouter blinks **partiels** (15–20 % des blinks, amplitude 40–70 %), désynchronisation
  G/D de 5–15 ms (les vrais yeux ne clignent jamais parfaitement en phase), et la légère
  dépression du regard pendant le blink (les globes descendent de ~2° pendant la fermeture).
- **Respiration** : bob vertical du rig ±0.15 % à ~0.25 Hz + micro-oscillation du socket.
  Trois lignes de code, présence énorme.

### 1.7 Photographie (le pilier absent)

Aucun post-processing. Or « bluffant » = « on dirait une photo », et une photo a :
- **Bloom subtil** sur les catchlights (le glint qui bave d'un demi-pixel),
- **Grain** film léger,
- **Vignettage + DOF** léger (netteté sur l'iris, canthi très légèrement soft),
- **Micro-dérive de caméra** en mode immersed (framing respirant ±0.2 %, 0.1 Hz) → « filmé », pas « rendu ».
EffectComposer (bloom + grain + vignette) : une après-midi, gain perçu massif.

### 1.8 Outillage réalisme (méta, mais décisif)

On itère à l'aveugle. Il faut :
- **Mode référence** : charger une photo macro d'œil réel, split-screen / blend slider par-dessus le rendu, même cadrage. C'est LA méthode pour fermer un gap de réalisme.
- **Mode macro** : caméra orbitale ×4 sur un œil, comportement figé, pour juger matière/cils.
- Touche screenshot + presets A/B.

---

## 2. Roadmap — 5 sprints ordonnés par (impact perçu / effort)

### Sprint A — « L'œil est vivant » (comportement, ~1 session) → v3.11
Le plus gros gain perçu du projet, quasi que du code comportemental déjà maîtrisé.

1. **FEM additifs toujours actifs** : sortir drift/micro-saccades/tremor de `_updateMicro` en couche
   `fixational` ADDITIVE sur la cible finale, quel que soit le mode (atténuée ×0.6 en poursuite active).
   - Drift = processus d'Ornstein-Uhlenbeck (marche aléatoire rappelée), plus de sinus.
   - Micro-saccades **correctives** : déclenchées quand l'erreur de drift dépasse un seuil (+ Poisson ~1.5 Hz),
     dirigées vers la cible avec bruit, cinématique main-sequence, glissade 5–8 %.
   - Square-wave jerks occasionnels (paire aller/retour 200 ms, toutes les 20–60 s).
2. **Scan-path facial** : quand la cible est un visage, scheduler de fixations œil-G / œil-D / bouche
   (MediaPipe fournit les landmarks) : dwell 0.3–2 s, saccades entre points, retour œil dominant.
   Fini la poursuite du barycentre. C'est ça, un regard qui te regarde.
3. **Pupille physiologique** :
   - Hippus (2 octaves de bruit lent, amplitude ∝ 1/luminance) ;
   - Réflexe photomoteur depuis la luminance webcam (échantillonnée à 5 Hz, latence 250 ms,
     constriction τ≈0.3 s / dilatation τ≈2.5 s — **asymétrique**) ;
   - Post-blink : micro-redilatation de 2 %.
4. **Physique visible** : glissade événementielle (remplace le spring invisible), blinks partiels,
   désync G/D 5–15 ms, dépression du regard pendant blink, respiration du rig.
5. Critère d'acceptation : webcam coupée OU visage fixe → l'œil doit rester manifestement vivant
   en le regardant 30 s. Lampe téléphone sur la caméra → myosis visible en <1 s.

### Sprint B — Cils v4 : brins 3D (~1 session) → v3.12
1. Générateur de brins : béziers cubiques, racines sous la marge, 2–3 rangées quinconce,
   gradients anatomiques v3.7 conservés, clumping par attracteurs, ♀/♂.
2. Un BufferGeometry fusionné par paupière, tubes effilés, **opaque**, depthWrite on.
3. Shader Kajiya-Kay (onBeforeCompile sur MeshPhysicalMaterial, ou anisotropy native r170) :
   2 lobes spéculaires décalés le long de la tangente, racine noir-brun → pointe +claire,
   rim translucide quand la lumière est derrière.
4. Ombre de cils sur le globe : moduler la shadow strip existante par la densité de cils
   (silhouette floutée dessinée en canvas → alphaMap).
5. Interaction blink : courbure accrue ∝ fermeture, entrelacement sup/inf à fermeture complète.
6. Critère : de face plein écran, la frange doit tenir la comparaison avec une photo macro
   (mode référence du Sprint E utilisable dès maintenant si fait en premier).

### Sprint C — Matérialité de l'œil (~1–2 sessions) → v3.13
0. **Iris en relief 3D — LA signature TinyEye (priorité absolue du sprint)** :
   heightfield irien procédural (bol creusé vers la pupille, collerette en bourrelets charnus,
   sillons radiaux, cryptes en creux — généré en shader ou baké en canvas au chargement),
   **Parallax Occlusion Mapping** 8–16 pas sur le plan irien (on a déjà le rayon réfracté en
   espace objet), normale dérivée du heightfield pour le modelé, self-shadowing par marche
   courte vers `uLightXY`. C'est ce qui transforme « image imprimée » en « tissu sculpté ».
1. **Profil cornéen réel** : déplacer la calotte avant du globe ET de la coquille vers le rayon
   cornéen (apex ~+4 % du rayon) ; limbe = raccord tangent. Restreindre la coquille transmission
   à la calotte. Bonus : bombement de la paupière au passage de la cornée (terme dans
   `_displaceAlmondLid` fonction du gaze). Avec le POM iris + bloom, c'est ce qui donne le
   look « bille de verre » du hero TinyEye.
2. **Dynamique du tissu irien** : remapper `rr` en fonction de `uPupil` (collerette ancrée,
   zone pupillaire compressée) → les fibres ET le heightfield se compriment quand la pupille bouge.
3. **Stroma 2 couches** : échantillonner le champ de fibres à 2 profondeurs (`irisPlaneZ` ± δ),
   blend → parallaxe interne, volume. (Optionnel si le POM du point 0 suffit visuellement.)
3bis. **Brancher les maps TinyEye du repo** : `TinyEye_Sclera_4096_normal/roughness/transmission`
   comme base de matière sclère (actuellement inutilisées), l'iris basecolor 4096 comme couche
   `uTexMix` de référence pour calibrer le procédural.
4. **Sclère** : texture de veines générée au chargement (marches aléatoires branchantes sur
   canvas 1024², seedées, denses aux canthi, absentes en haut) + normal map dérivée ;
   **zonage wet/dry de la roughness** via uLidUp/uLidLow (exposé = 0.08 glossy, couvert = 0.4) ;
   teinte : légère fraîcheur bleutée périlimbique, chaleur aux canthi.
5. **Cycle du film lacrymal** : roughness cornée/sclère +5 % entre deux blinks, reset au blink.
6. Limbe : bande semi-transparente où la cornée chevauche l'iris périphérique.

### Sprint D — Peau & anatomie (~1–2 sessions) → v3.14
1. Pre-integrated SSS (wrap + red shift par courbure) en remplacement du rim hack.
2. Normal map peau générée : pores isotropes + rides fines le long de l'arc + crow's feet
   temporales ; intensité ∝ fermeture pour les rides de compression.
3. **Caroncule + plica semilunaris** (petits meshes, shader peau + clearcoat humide) + lac lacrymal.
3bis. **Peach fuzz** (signature TinyEye) : duvet vellus court sur la silhouette des paupières —
   soit ~200 micro-brins clairs quasi transparents réutilisant le système de brins du Sprint B,
   soit un rim « fuzz » shader (halo diffus clair à l'angle rasant, bruité). + blush rosé
   au canthus interne dans le ramp albedo existant.
4. Pli palpébral dynamique : le fold s'accumule à la fermeture (translation + amplification du
   profil `profFold` ∝ closure).
5. Périorbitaire : remplacer le sprite socket par un maillage grossier (arcade sourcilière,
   racine du nez) avec le shader peau — ancrage spatial des deux yeux.
6. Déplacement des paupières en vertex shader (perf + segsV 24).

### Sprint E — Photographie & outillage (~0.5–1 session) → v4.0
1. EffectComposer : bloom subtil (threshold haut, les catchlights seulement), grain film,
   vignette, DOF léger.
2. Micro-dérive caméra en mode immersed.
3. **Mode référence** (photo overlay + blend slider) et **mode macro** (orbite ×4, comportement figé).
   → À faire EN PREMIER dans le sprint si on veut s'en servir pour valider B/C/D.
4. Screenshot (touche `s`), export/import de presets complets.

### Ordre recommandé
**A → B → E.3 (outillage) → C → D → E (reste)**.
A d'abord parce que le vivant est le gap le plus douloureux et le moins cher à combler.
B ensuite parce que les cils sont ton point de honte déclaré.
L'outillage de référence avant C/D pour ne plus juger à l'aveugle.

---

## 3. Quick wins (< 30 min chacun, faisables à tout moment)

| Fix | Effet |
|---|---|
| Activer les FEM en mode Track (le `else` de `_updateGazeMode`) | l'œil vit, immédiatement |
| Roughness sclère zonée wet/dry via uLidUp/uLidLow | matière × 2 |
| Pupille asymétrique (τ constriction ≠ τ dilatation) | pupille crédible |
| Hippus (2 sinus bruités lents sur la pupille) | plus jamais figée |
| Respiration du rig (±0.15 %, 0.25 Hz) | présence |
| Blink partiels (random 15 % → amplitude 0.5) | naturel |
| `MeshBasicMaterial` cils → matériau éclairé | même les cards actuels gagnent |
| Brancher `TinyEye_Sclera_4096_normal/roughness` sur le matériau sclère (maps déjà dans le repo, inutilisées) | matière sclère instantanée |

---

## 5. Ce que la cible TinyEye change à l'ordre

La cible étant un rendu **statique** hyperléché (Cycles), la matérialité pèse plus lourd
qu'estimé initialement. Ordre révisé si l'objectif prioritaire est « une frame qui bluffe » :
**C (iris POM + cornée) → B (cils) → E (bloom/DOF/référence) → A (vivant) → D (peau fine)**.
Si l'objectif prioritaire reste « une présence qui bluffe en interaction », garder
**A → B → C → D → E**. Les deux convergent ; seul le point d'entrée diffère.
