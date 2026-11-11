# Supervision photo — carte photoréaliste

Carte indépendante de `pac-synoptique-card`. Elle ne remplace pas la carte
stable et peut être retirée sans toucher au tableau de bord principal.

## Livraison

```text
Carte       : pac-supervision-photo-card
Fichier     : www/pac-supervision-photo-card.js
Fond        : www/supervision-bg.png
Route       : /alfea-synoptique/pac-supervision-photo-card.js
Tableau     : supervision-photo-test
URL         : http://192.168.31.112:8123/supervision-photo-test
Version     : 0.2.8
```

## Fonds selon l'état

```yaml
type: custom:pac-supervision-photo-card
background_images:
  stopped: /alfea-synoptique/supervision-bg-stopped.png
  heating: /alfea-synoptique/supervision-bg.png
  active: /alfea-synoptique/supervision-bg.png
```

La carte utilise le fond neutre `stopped` par défaut. Le fond actif orangé
n'est utilisé que si C1, C2 et l'ECS sont tous actifs. Une demande partielle
garde le fond neutre et ajoute une lueur localisée sur la zone concernée.

Les chemins peuvent pointer vers n'importe quelle image servie par Home
Assistant (`/local/...` ou `/alfea-synoptique/...`). Remplacer le fond ne
demande aucune modification du JavaScript.

## Ancrages des animations

Les positions sont configurables, en pourcentage de l'image :

```yaml
hotspots:
  fan:
    left: 9.2
    top: 37
    width: 17
  tank:
    left: 63.5
    top: 20
    width: 17
    height: 56
  c1:
    left: 78
    top: 23
    width: 17
    height: 25
  c2:
    left: 56
    top: 73
    width: 35
    height: 20
  outdoor:
    left: 6
    top: 29
    width: 21
    height: 34
```

Si le fond change de cadrage, on ajuste uniquement ces valeurs. Les panneaux,
les états et les animations restent inchangés.

## Configuration minimale

```yaml
type: custom:pac-supervision-photo-card
background_image: /alfea-synoptique/supervision-bg.png
```

## Données affichées

- unité extérieure : température, modulation, compresseur, état BSB, dégivrage ;
- unité intérieure : départ, retour, consigne de départ, ΔT, état PAC ;
- C1 Étage et C2 RDC : ambiance, consigne, mode, état BSB, consigne effective,
  activité et circulateur propre à chaque circuit ;
- ECS : température ballon, consigne confort, consigne actuelle, production,
  pompe, appoint électrique et mode Éco ;
- résistance électrique ECS indépendante, visible dans le ballon et animée
  lorsqu'elle est active ;
- dernier cycle ECS : COP, durée, température de départ et de fin, énergie,
  heure de fin.

Le dernier cycle est lu dans les attributs de :

```text
sensor.chaufferie_atlantic_alfea_bsb_lan_ecs_cop_session
```

## Règles d'état

- `Post-circulation` vient uniquement de `etat_circuit_bsb`, jamais du seul
  état de la pompe ;
- C1 et C2 utilisent chacun leur pompe ;
- `Arrêt`, `Chauffe actuellement`, `Refroidit actuellement` et `En attente`
  sont déduits de l'état du climate, de son `hvac_action` et de sa pompe ;
- les valeurs absentes restent `—` et ne sont pas converties en `0`.

## Retour arrière

La carte stable et son tableau de bord ne sont pas modifiés.

```text
Branche stable : stable-ui-20261111
Commit stable  : c38770a
Backup         : C:\Users\fcouq\AppData\Local\Temp\alfea-supervision-backup-20261111
```

Pour retirer seulement la carte photo :

1. supprimer la ressource
   `/alfea-synoptique/pac-supervision-photo-card.js` ;
2. supprimer le tableau de bord `supervision-photo-test` ;
3. laisser `pac-synoptique-card` et son tableau de bord intacts.

Pour revenir à l'état stable complet :

```text
git checkout stable-ui-20261111
```

## Variantes d'état

Le fond peut être remplacé ou complété par des calques générés avec ComfyUI.
Les tests Flux Fill ont montré que le masque doit préserver les éléments
techniques (serpentin, grille, tuyaux). Pour l'ECS, la lueur CSS actuelle reste
plus fidèle que l'inpainting tant que le serpentin n'est pas conservé.
