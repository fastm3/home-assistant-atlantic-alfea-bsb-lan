# Supervision PAC — chantier 2,5D / 3D photoréaliste

## Statut

- Branche de travail : `feature/supervision-3d`
- Point de retour stable : branche `stable-ui-20261111`, commit `c38770a`
- Sauvegarde locale : `C:\Users\fcouq\AppData\Local\Temp\alfea-supervision-backup-20261111`
- La carte actuelle reste le seul rendu installé tant que la nouvelle n'est pas validée.
- Aucun remplacement de la ressource Lovelace existante pendant la phase de conception.

## Principe de sécurité

1. Nouvelle carte indépendante : `pac-supervision-card.js`.
2. Nouvel élément : `pac-supervision-card`.
3. Aucune modification de `pac-synoptique-card.js` pendant le prototype.
4. Test sur un tableau de bord séparé, jamais sur le tableau de bord principal.
5. Retour arrière = remettre l'ancienne carte ou retirer la ressource de test.

## Direction retenue

**Phase 1 — 2,5D photoréaliste**

Rendus fixes en coupe, calques, gradients, ombres et animations SVG/CSS. Meilleur rapport
rendu / performance pour une tablette, sans dépendance WebGL.

**Phase 2 — 3D WebGL**

Si la phase 1 est validée : Three.js, modèle GLB, matériaux PBR, vitrages transparents,
caméra orbitale. La carte 2,5D reste le fallback.

## Scène

### Groupe extérieur
- ventilateur animé selon la modulation du compresseur ;
- flux d'air uniquement si compresseur actif ;
- givre / buée / dégivrage selon la température et l'état `defrost` ;
- vibration légère du compresseur.

### Module hydraulique
- coupe transparente : échangeur, compresseur, circulateur, vanne 3 voies ;
- eau visible dans les tuyaux ;
- sens et couleur du flux selon le mode ;
- pompes animées uniquement si actives.

### Circuits
- radiateurs Étage : lueur proportionnelle au ΔT départ/retour ;
- plancher RDC : diffusion thermique plus lente ;
- aucun effet si circuit Off ou en attente.

### ECS
- cuve semi-transparente avec gradient de température ;
- charge animée si production ECS ;
- résistance électrique en rouge si appoint ;
- serpentin animé seulement si actif.

## Mapping des états

| Élément | Source |
|---|---|
| Vitesse ventilateur | modulation compresseur / RPM si disponible |
| Flux d'air | compresseur + mode |
| Dégivrage | `defrost` + température extérieure |
| Circulateurs | pompes C1/C2 |
| Sens de l'eau | mode chauffage / froid / ECS |
| Diffusion radiateur | circuit actif + ΔT |
| Diffusion plancher | circuit actif + inertie |
| Température ECS | température ballon |
| Charge ECS | production / appoint |
| Alarmes | binary sensors |

## Architecture prévue

- carte indépendante, sans dépendance à la carte synoptique ;
- découverte automatique des entités Atlantic / BSB-LAN ;
- état visuel calculé à partir des entités réelles ;
- aucune animation décorative si l'équipement est inactif ;
- `prefers-reduced-motion` et mode performance ;
- arrêt du rendu quand l'onglet est masqué ;
- clic sur un composant → `hass-more-info`.

## Étapes

1. Maquette 2,5D et squelette de carte.
2. Mapping des entités et moteur d'états.
3. Animations extérieur / hydraulique / ECS.
4. Tableau de bord de test séparé.
5. Validation visuelle et performance tablette.
6. Décision : conserver la 2,5D ou passer à la 3D WebGL.

## Prérequis pour le rendu photoréaliste

Fournir si possible :
- photos de face, de côté et de dessus du groupe extérieur ;
- photos du module intérieur, portes ouvertes ;
- dimensions approximatives ;
- couleur exacte de la carrosserie ;
- emplacement du ballon ECS.
