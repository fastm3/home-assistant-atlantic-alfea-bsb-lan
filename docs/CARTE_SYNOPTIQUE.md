# Cartes Lovelace

Les cartes sont livrées avec l'intégration (`custom_components/atlantic_alfea_controller/www/`)
et servies par Home Assistant sous `/alfea-synoptique/`.

## Installation

1. Redémarrer Home Assistant après l'installation ou la mise à jour.
2. **Paramètres → Tableaux de bord → Ressources** → ajouter une fois, type
   *Module JavaScript* :
   - `/alfea-synoptique/pac-synoptique-card.js?v=<version>`
   - `/alfea-synoptique/pac-programmes-card.js?v=<version>`
3. À chaque mise à jour, changer la valeur `?v=` puis recharger la page
   (`Ctrl+Maj+R`). Supprimer toute ancienne ressource `/local/pac-synoptique-card.js`.

## PAC Synoptique (`custom:pac-synoptique-card`)

Vue d'ensemble : compresseur, PAC (départ, retour, consigne départ,
modulation), circuits C1/C2 (mode, état du régulateur, température ambiante,
consigne, température de départ, circulateur), ECS (température, consignes,
état, appoint électrique, COP de session), alarmes et diagnostics repliables.

Comportement :

- les animations reflètent l'état réel (compresseur en marche, circulation
  d'un circuit, charge ECS) ; aucune valeur n'est inventée ;
- un circuit dont la pompe tourne sans demande d'ambiance affiche
  « Demande circulation par régulation » ;
- clic sur une température mesurée : historique (statistiques 5 min) ; clic sur
  départ/retour/consigne départ PAC : historique 24 h des trois courbes ;
- panneau **Graphes** : consommation ECS et C1+C2 empilée, 7 jours et heure
  par heure aujourd'hui (capteurs *ECS / C1+C2 - Énergie consommée*) ;
- panneau **Loi d'eau** : courbes de chauffe 720/1020 et point de
  fonctionnement actuel ;
- commandes optionnelles : mode de la PAC, Off/Auto et régime par circuit,
  consignes (clic sur la consigne → curseur), consigne ECS. Elles passent par
  les entités de l'intégration et sont confirmées par BSB-LAN.

### Options

| Option | Valeurs | Défaut | Rôle |
|---|---|---|---|
| `title` | texte | Atlantic Alféa Extensa Duo | titre |
| `theme_mode` | `auto`, `light`, `dark` | `auto` | suit le thème HA ou force clair/sombre |
| `layout_orientation` | `auto`, `landscape`, `portrait` | `auto` | disposition selon la largeur de la carte |
| `layout_style` | `classic`, `clean`, `aerien` | `classic` | présentation |
| `circuit_1_name`, `circuit_2_name` | texte | RDC, Étage | libellés affichés |
| `show_controls` | booléen | `true` | commandes dans la carte |
| `show_simulation` | booléen | `true` | case « Simulation dérogation » |
| `show_diagnostics` | booléen | `true` | panneau diagnostics |
| `show_graphs` | booléen | `true` | panneau Graphes |
| `show_curve` | booléen | `true` | panneau Loi d'eau |
| `show_links`, `animate_flows`, `show_pump_badges` | booléen | `true` | liaisons, animations, badges circulateurs |
| `power_entity` | entity_id | — | puissance électrique PAC affichée |
| `energy_entity` | entity_id | — | compteur électrique global |
| `energy_circuits_entity`, `energy_ecs_entity` | entity_id | détection auto | capteurs des graphes d'énergie |
| `ecs_eco_delta` | nombre ≥ 0 | 3 | consigne ECS Éco = Confort − delta |
| `entities` | objet | — | correspondances d'entités forcées |

L'éditeur visuel de Home Assistant expose les principales options.

```yaml
type: custom:pac-synoptique-card
theme_mode: auto
layout_orientation: auto
circuit_1_name: Étage
circuit_2_name: RDC
show_controls: true
show_graphs: true
show_curve: true
power_entity: sensor.puissance_pac
energy_entity: sensor.energie_pac
grid_options:
  columns: full
  rows: auto
```

## Programmes PAC (`custom:pac-programmes-card`)

Affiche les programmes horaires natifs (chauffage C1/C2, ECS, rafraîchissement
C1/C2) importés depuis la PAC. Lecture seule : l'import se fait avec le bouton
*Programmes natifs - Actualiser* ; aucun programme n'est écrit.

```yaml
type: custom:pac-programmes-card
title: Programmes PAC
chauffage_c1: sensor.<prefixe>_programme_natif_chauffage_rdc
chauffage_c2: sensor.<prefixe>_programme_natif_chauffage_etage
ecs: sensor.<prefixe>_programme_natif_eau_chaude_sanitaire
rafraichissement_c1: sensor.<prefixe>_programme_natif_rafraichissement_rdc
rafraichissement_c2: sensor.<prefixe>_programme_natif_rafraichissement_etage
refresh_button: button.<prefixe>_programmes_natifs_actualiser
```

## Dépannage

- **Carte inconnue** : vérifier qu'une seule ressource est déclarée et que
  Home Assistant a redémarré après l'installation.
- **Erreur 404 sur le fichier** : l'intégration n'est pas chargée.
- **Ancien affichage** : changer `?v=` sur la ressource et vider le cache du
  navigateur.
- **Valeur « — »** : entité absente, désactivée ou paramètre non publié par
  BSB-LAN (voir le capteur *BSB-LAN - Journalisation*).
