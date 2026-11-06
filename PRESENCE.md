# EyeSeeYou — Présence

L'entrée `index.html` ouvre toujours `eyeseeyou_v3.html`. Cette version reprend
le moteur anatomique existant et ajoute une présentation interactive en français.

- **Rencontre** : paire d'yeux, suivi du pointeur ou du doigt.
- **Iris** : travelling vers un œil ; molette pour ajuster le rapprochement.
- **Obscur** : paupières noires, lumière plus rasante et remplissage atténué.
- **Voyage** : séquence Rencontre → Iris → Obscur, puis retour à Rencontre.
- **Ambre / Glacier / Olive** : transitions des couleurs dans le shader de l'iris.
- **Caméra** : chargement de MediaPipe à la demande, arrêt des pistes et des
  modèles au clic sur « Couper la caméra », pointeur conservé après un refus.
- **Immersion** : interface masquée, réapparition au mouvement ; Échap pour sortir.
- **L** : ouvrir/fermer l'atelier existant ; Tab ouvre le panneau anatomique dans
  l'atelier et conserve ensuite la navigation clavier dans ses contrôles.

Le rendu conserve les deux matériaux de paupières et le contrôleur EyeMech.
Les nouveaux sillons de contraction et îlots pigmentaires sont calculés dans
l'espace de l'iris. Les sillons sont filtrés avec `fwidth` pour limiter le
scintillement à distance. Le cadrage de la paire s'adapte au format portrait.

Le mode de mouvements réduits coupe le voyage et la dérive de caméra, et rend
les changements de cadrage immédiats. Les textures et bibliothèques CDN du
projet restent nécessaires ; la webcam exige HTTPS ou localhost.

## Vérification

`node tests/presence.cjs` : six tests de comportement, sans dépendances externes.
Ils couvrent le démarrage, les scènes, le voyage, les palettes, les mouvements
réduits et les chemins caméra/refus/arrêt. La syntaxe des modules a aussi été
vérifiée avec Node. Ces tests ne valident pas le rendu WebGL.

La validation visuelle reste à effectuer dans un navigateur : rendu des trois
scènes, transition macro, portrait mobile, caméra réelle et fréquence d'images.
Le pilote d'aperçu requis par l'environnement de développement était absent.
