# EyeSeeYou V1 — Contexte debug iris texture

## Probleme
L'iris est toujours blanc/noir au lieu d'afficher la texture ambre (`TinyEye_Iris_4096_basecolor.png`).

## Root cause identifiee
GLTFLoader r170 remappe les UVs selon les references material du GLB :
- Le material sclera reference `baseColorTexture.texCoord = 2` → GLTFLoader charge TEXCOORD_2 comme `uv`
- TEXCOORD_0 (le vrai UV de bake iris) est **drop** par GLTFLoader
- Resultat : l'iris `uv` contient des coords negatives [-0.58, -0.04] → mappe sur le noir de la texture

## Fix applique (pas encore fonctionnel)
```javascript
const irisUvAccessor = await gltf.parser.getDependency('accessor', 2);
child.geometry.setAttribute('uv', irisUvAccessor);
```
- Applique sur l'original ET le clone
- MeshBasicMaterial + depthTest:false pour isoler le debug texture

## Ce qui a ete verifie
- Texture charge OK (4096x4096, callback confirme)
- Mesh iris visible (test rouge MeshBasicMaterial = visible)
- Sclera occlusion geree (depthTest:false + renderOrder:10)
- clone() reapplique materials + UV dans _createEye
- L'oeil droit (clone) etait minuscule → scaling recalcule dans _createEye

## Pistes a explorer demain
1. **Verifier l'accessor index** : accessor 2 est-il vraiment TEXCOORD_0 de l'iris ? Parser le JSON du GLB pour confirmer les indices exacts
2. **Dumper les UV apres fix** : ajouter un log qui affiche les premieres valeurs UV APRES setAttribute pour confirmer qu'elles sont bien dans [0,1]
3. **Test UV-as-color** : shader qui affiche UV.x en rouge et UV.y en vert pour visualiser le mapping
4. **flipY** : tester flipY=true (la texture est un PNG externe, pas embarquee dans le GLB)
5. **Vertex colors** : l'iris a COLOR_0/1/2 — verifier qu'ils n'ecrasent pas la texture
6. **BufferAttribute vs InterleavedBufferAttribute** : getDependency retourne peut-etre un type incompatible avec setAttribute

## Fichiers
- `eyeseeyou_v1.html` — fichier principal (~880 lignes)
- `eye.glb` — modele TinyEye (1 mesh, 2 primitives: iris 193v + sclera 385v, 12 morph targets)
- `TinyEye_Iris_4096_basecolor.png` — texture iris ambre/brun sur fond noir
- `TinyEye_Sclera_4096_*.png` — textures sclera (basecolor, normal, roughness)

## Architecture
- EyeRenderer : charge le modele, cree les 2 yeux, gere materials
- EyeController : params (pupil size, iris color, etc) + sliders
- FaceTracker : MediaPipe face tracking
- DebugUI : panel lateral

## Serveur
HTTP sur port 8080 : `npx http-server . -p 8080` depuis le dossier projet
