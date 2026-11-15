# Fabrication de la carte synoptique photo

La carte `pac-synoptique-photo-card` affiche une image photoréaliste fixe, sur
laquelle s'ajoutent des calques lumineux (fusion additive), des flux SVG et des
effets animés. Une diffusion pure ne respecte pas la topologie (nombre de
tuyaux, radiateur trop haut…) : la géométrie est donc fixée en 3D, puis
seulement « habillée » par le modèle d'image. Les calques sont extraits de
l'image finale elle-même, ce qui les aligne au pixel près.

## Chaîne

1. **Blender** (`blender/`) : `build_blockout.py` construit la maquette
   (groupe extérieur et 2 liaisons frigorifiques, module intérieur et ballon,
   4 tuyaux muraux, radiateur bas, collecteur 2 départs / 2 retours, 2 boucles
   de plancher en spirale, coupe du sol) ; `materials_night.py` pose matériaux
   et éclairage de nuit. `alfea_duo_nuit.blend` est la scène finale.
2. **Habillage photoréaliste** : `oai_edit.mjs` envoie le rendu Blender et une
   référence de style au modèle d'image (OpenAI `gpt-image-2`, édition,
   2048×1152) avec `prompts/nuit.txt`. La clé est lue dans `OPENAI_API_KEY` :

   ```sh
   OPENAI_API_KEY=... node oai_edit.mjs nuit.png gpt-image-2 2048x1152 prompts/nuit.txt rendu_blender.png reference.jpg
   ```

3. **Variantes** : chaque décor (jour, neige, pluie, brouillard, en jour et en
   nuit) est une édition de l'image de nuit ou de jour avec le prompt
   correspondant de `prompts/`, qui impose une géométrie identique. L'écart
   mesuré par corrélation de phase sur les zones clés reste sous le pixel :
   les calques de nuit servent pour tous les décors.
4. **Calques** : `extract_layers_cv.py image.png dossier/` (OpenCV) isole les
   éléments à éclairer (tuyaux chauds et froids, liaisons frigorifiques,
   hélice, échangeur, serpentin, résistance, plancher, radiateur) par couleur,
   contraste local et zones, puis produit un PNG lumineux par élément
   (`calque_*.png`).
5. **Flux** : `build_flows.py image.png flows.json apercu.png` trace les
   chemins SVG des flux animés (et un aperçu de calage).
6. **Carte** : `build_card.py` assemble `tabs_engine.js` (moteur des onglets,
   issu de l'ancienne carte `pac-synoptique-card`) et `card_template.js` avec
   `flows.json`, et écrit
   `custom_components/atlantic_alfea_controller/www/pac-synoptique-photo-card.js`.
   `--images DIR --set NOM` convertit en WebP un jeu d'images (`base.png` et
   `calque_*.png`) dans `www/pac_synoptique/NOM/`.

Les décors météo ne contiennent que `base.webp` (`jour_neige/`, `nuit_pluie/`…) ;
la carte prend les calques dans `jour/` ou `nuit/`.

Dépendances Python : `numpy`, `opencv-python-headless`, `pillow`.

## Repères dans l'image (pixels, 2048×1152)

Définis dans `card_template.js` : `RADIATOR` (radiateur, effet de chaleur),
`FAN` (hélice : centre et rayon), `TANK` et `HEATER` (intérieur du ballon et
tige de la résistance), `OUTDOOR` (polygone du paysage pour les effets météo).
À reprendre si l'image de base change.
