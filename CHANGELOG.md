# Changelog

## 2.4.1 — Programmes horaires et loi d'eau sur toutes les installations

### Intégration

- **Programmes horaires natifs** : selon la version de BSB-LAN et la liste de paramètres
  du régulateur, les jours mardi → dimanche sont numérotés 502…507 (522…, 562…) ou
  501.1…501.6 (521.1…, 561.1…). La numérotation est maintenant détectée pour chaque
  programme, en lecture comme en écriture. Corrige l'import en erreur
  « Réponse BSB-LAN invalide pour 502: None » sur certaines installations.
- **Loi d'eau lue par l'intégration** : pente, décalage, bascule été/hiver, départ
  min/max et influence ambiante des deux circuits (720…750, 1020…1050) sont lus avec la
  configuration de l'installation, au démarrage puis toutes les 6 h, et publiés dans
  l'attribut `loi_d_eau` du capteur « Installation - Configuration ». Plus besoin de les
  journaliser dans BSB-LAN.

### Carte PAC Synoptique photo (2.4.1)

- **Loi d'eau** : quand BSB-LAN ne publie pas 720/1020 en MQTT (paramètres absents du
  journal, ou BSB-LAN réglé dans une autre langue que l'anglais), la carte utilise les
  valeurs lues par l'intégration au lieu d'afficher « Loi d'eau indisponible ».
- Manifest **2.4.1**. Redémarrage de Home Assistant nécessaire.

### Documentation

- `docs/BSB_LAN_JOURNALISATION.md` : réglages BSB-LAN en trois points, et liste des
  paramètres lus par l'intégration qu'il est inutile de journaliser.

## 2.4.0 — Première installation guidée

### Intégration

- **Installation guidée** : après la détection des entités BSB-LAN, un écran
  « Équipement » pré-rempli (adresse BSB-LAN trouvée sur le réseau, entité météo,
  puissance et énergie de la ligne PAC proposées d'après leur type et leur nom), puis un
  écran « Configuration de l'installation » qui affiche ce qui a été lu dans la PAC
  (circuits, émetteurs, ballon) et permet de le corriger.
- **Découverte réseau** : BSB-LAN trouvé avant toute installation → Home Assistant
  propose directement l'intégration, adresse pré-remplie (auparavant : seulement mise à
  jour de l'adresse d'une intégration existante).
- **Options** : entité météo et puissance électrique de la PAC, à côté du compteur
  d'énergie. Publiées par le capteur « Installation - Configuration » (attributs
  `entite_meteo`, `entite_puissance`, `entite_energie`).

### Carte PAC Synoptique photo (2.4.0)

- Météo, puissance et énergie reprises des options de l'intégration quand la carte n'en
  définit pas : une carte ajoutée sans réglage est complète. Le réglage de la carte reste
  prioritaire.
- Manifest **2.4.0**. Redémarrage de Home Assistant nécessaire.

## 2.3.1 — Horloge de la PAC, prérequis

### Intégration

- **Horloge PAC - Synchroniser** : utilisable même quand BSB-LAN publie le paramètre 0
  en simple capteur (écriture par HTTP `/JS`), avec relecture de l'heure. Un refus du
  régulateur (statut 0) ou une heure non appliquée est signalé clairement (message,
  journal, attributs du bouton et de l'alarme horloge) avec le conseil de régler l'heure
  sur la PAC. Constaté sur un régulateur Atlantic : le réglage de l'heure par le bus est
  refusé.
- README : prérequis pour exploiter l'intégration à 100 % (entité météo, compteur
  électrique puissance + énergie de l'ensemble de la PAC).
- Manifest **2.3.1**. Redémarrage de Home Assistant nécessaire.

## 2.3.0 — Configuration de l'installation détectée, variantes du synoptique

### Intégration

- **Détection de l'installation** : lecture au démarrage puis toutes les 6 h des
  paramètres 5710/5715 (circuits), 5711/5716 (rafraîchissement), 5731 (ECS),
  720/1020 (pente de loi d'eau) et 741/1041 (départ maximal). Émetteur deviné pour
  chaque circuit : rafraîchissement actif → plancher, sinon pente (≤ 0,6 plancher,
  ≥ 0,8 radiateurs), sinon départ maximal. Nouveau capteur de diagnostic
  **Installation - Configuration** (configuration, raison et confiance de chaque
  choix, réponse brute du régulateur).
- **Réglages dans les options** : « Installation — ballon d'eau chaude » et
  « Installation — émetteurs des circuits », limités aux configurations que le
  synoptique sait dessiner (C1 radiateurs + C2 plancher, C1 plancher + C2 radiateurs,
  un seul circuit). Ils corrigent la détection ; le capteur publie la configuration
  effective, reprise par toutes les cartes.
- **Diagnostics téléchargeables** (Appareils et services → ⋮ → Télécharger les
  diagnostics) : relecture des paramètres, détection, réglages, journal BSB-LAN ;
  adresse BSB-LAN masquée. Journal détaillé à chaque détection, avertissement quand
  elle est incertaine. Formulaire de ticket « Détection de l'installation incorrecte ».

### Carte PAC Synoptique photo (2.3.0)

- **Variantes d'installation**, dans les 8 décors et avec le groupe simple ou double :
  sans ballon (module mural, tuyaux frigo redessinés), radiateurs seuls (sol fini à la
  place du plancher), plancher seul (radiateur effacé, plancher animé par le circuit
  qui l'alimente, C1 compris), zones inversées (C1 plancher + C2 radiateurs).
  Panneaux, historique et animations suivent la configuration. Options `ecs` et
  `emitters` (section « Installation » de l'éditeur, « Automatique » = intégration).
- **Panneau ECS** : énergie de la charge en cours ou de la dernière charge et COP sur
  deux lignes (le cumul de toutes les charges n'est plus affiché, il reste dans
  l'historique).
- **Panneau PAC** : énergie du jour (statistiques de HA depuis minuit, suivie en
  direct), total du compteur en infobulle.
- Onglet « Graphes » renommé « Consommation énergétique ».
- Manifest **2.3.0**. Redémarrage de Home Assistant nécessaire (nouveau capteur,
  options et diagnostics).

## 2.2.2 — Post-circulation, panneau étage simplifié

### Carte PAC Synoptique photo (2.2.2)

- **Post-circulation** (BSB « Overrun active ») reconnue : puce
  « Post-circulation » sur le circuit 2, « Pompe primaire ON ·
  post-circulation » dans le panneau PAC, flux de l'étage toujours animé
  (l'eau traverse les radiateurs) sans volutes de chauffe.
- **Panneau Étage sans puce de pompe** : la pompe primaire (QX1) n'est
  affichée que dans le panneau PAC ; l'état du circuit (chauffe,
  post-circulation…) suffit sur l'étage.
- Éditeur : « Clic sur un panneau » et « Durée de l'historique » visibles dans
  « Avancé » (valeurs texte pour le sélecteur de HA).
- Manifest **2.2.2**.

## 2.2.1 — Historique au clic, éditeur du logo, chaleur du radiateur

### Carte PAC Synoptique photo (2.2.1)

- **Clic sur un panneau = popup d'historique** de toutes ses entités (carte
  Historique de HA) : unité extérieure (T. extérieure, modulation,
  compresseur, dégivrage), PAC (départ, retour, consigne, puissance, pompe
  primaire, état, mode), circuits (thermostat, départ, circulateur, état),
  ECS (ballon, confort, chauffe-eau, pompe, appoint, état). Boutons 6 h / 24 h
  / 48 h / 7 j, accès à la fiche de l'entité, fermeture par Échap. Options
  `panel_click` (`history` ou `more-info`, l'ancien comportement) et
  `history_hours`.
- **Éditeur : section « Logo du groupe extérieur »** : menu toujours présent
  (Aucun, logos de la liste, « URL personnalisée… » → `logo: personnalisé` +
  `logo_url`), liste `logos` modifiable sans YAML (nom, URL, position x / y /
  largeur facultatives). Les anciennes configurations (`logo_url` seul)
  restent valables.
- **Volutes du radiateur** nettement plus visibles (plus nombreuses, plus
  épaisses), intensité minimale même départ froid ; masques de l'air chaud
  fondus sur tous les bords (plus de rectangle au-dessus du radiateur).
  Forçage debug du circuit 1 : volutes visibles même PAC arrêtée.
- Manifest **2.2.1**.

## 2.2.0 — Groupe extérieur double, logos, modes relus aussitôt

### Carte PAC Synoptique photo (2.2.0)

- **Groupe extérieur double** en option (`outdoor_unit: double`) : deux blocs
  identiques empilés, deux ventilateurs animés (légèrement décalés), calque
  lumineux des deux grilles, neige sur le bloc du haut. Disponible pour les
  8 décors (jour/nuit × normal, neige, pluie, brouillard). Le panneau
  « Unité extérieure » remonte au-dessus du groupe.
- **Logo sur le groupe extérieur** : `logo_url` (+ `logo_box`), ou une liste
  `logos` (`name`, `url`, `box`, `box_double` facultatif) avec un menu
  « Logo » dans l'éditeur pour choisir. Le logo est une image HTML calée en
  haut, quel que soit son format (SVG allongé compris). En groupe double, il
  passe sur le bloc du haut, réduit pour tenir dans le panneau lisse. Aucun
  logo de marque n'est fourni : héberger le fichier soi-même (`/local/...`).

### Intégration

- **Consigne et état relus aussitôt après un changement de mode** (C1, C2,
  mode global, ECS) : relecture des consignes effectives et de l'état du
  circuit à 2 s puis 6 s, au lieu d'attendre le cycle normal.
- **Mode ECS confirmé** comme les circuits : attente de la confirmation,
  renvoi par HTTP `/JS` si besoin, erreur affichée si la valeur n'est pas
  appliquée.
- Manifest **2.2.0**.

## 2.1.1 — Chaleur du radiateur plus visible

### Carte PAC Synoptique photo (2.1.1)

- Radiateur de l'étage en chauffe : effluves de chaleur qui montent en
  ondulant, air qui ondule plus haut et plus fort, voile chaud léger, avec des
  contours fondus.
- Intensité selon la température de départ du circuit 1 (8743, sinon départ
  PAC) : discrète vers 30 °C, pleine vers 47 °C.
- Panneau « Circuit 1 » remonté (y 26 % → 12,5 %) pour dégager le panache ;
  position réglable avec `positions`.
- Manifest **2.1.1**.

## 2.1.0 — Renvoi HTTP des modes, pompe primaire, puissance réglable

### Intégration

- **Renvoi par HTTP des commandes de mode** (700/901/1000/1201 : Off/Auto des
  circuits, mode global) : sans confirmation MQTT au bout de 10 s, la même
  valeur est renvoyée par BSB-LAN `/JS` si l'adresse est configurée, le statut
  du régulateur est contrôlé puis la valeur relue (délai total inchangé :
  30 s). Chaque étape est journalisée (renvoi, accepté, refusé, en échec,
  non confirmé « MQTT seul » ou « MQTT puis HTTP »). Cas observé : commande
  MQTT publiée mais jamais appliquée par BSB-LAN, acceptée par `/JS`.
- Le capteur « C1 - Circulateur » devient **« Pompe primaire (QX1) »** : le
  relais QX1 (9031) commande la pompe primaire de la PAC, partagée par le
  circuit direct C1 et la charge ECS (V3V). Attribut `usage` ajouté ;
  `unique_id` et `entity_id` existants conservés.

### Carte PAC Synoptique photo (2.1.0)

- Réglages explicites **Puissance électrique PAC** (`power_entity`) et
  **Énergie électrique PAC** (`energy_entity`, vide = compteur des options de
  l'intégration). La puissance n'est plus déduite de l'appareil du compteur
  (sur un compteur multi-voies, une autre voie pouvait être affichée).
- L'étage n'est plus animé par la pompe primaire pendant une charge ECS ou
  quand le circuit est à l'arrêt ; puce « Pompe primaire (charge ECS) ».
- Les deux **circulateurs du module** s'animent (pompe primaire QX1 et pompe
  C2) ; le module s'éclaire aussi quand la pompe primaire tourne ; le
  panneau PAC indique « Pompe primaire ON · ECS / chauffage ».
- Onglets : la tuile « Puissance PAC » se met à jour à chaque changement de
  la puissance (elle pouvait rester figée).

### Tests

- Renvoi HTTP : accepté, refusé, BSB-LAN injoignable, adresse absente,
  confirmation MQTT rapide sans renvoi.
- jsdom : pompe primaire / charge ECS, nouvel `entity_id`, puissance réglable.
- Manifest **2.1.0**.

## 2.0.0 — Synoptique photo, écriture des programmes, noms des circuits

Version majeure : nouvelle carte synoptique, programmes horaires modifiables
depuis Home Assistant, suppression de l'ancienne carte.

### ⚠️ Changements incompatibles

- **Carte `custom:pac-synoptique-card` supprimée**, remplacée par
  `custom:pac-synoptique-photo-card`. Supprimer la ressource
  `/alfea-synoptique/pac-synoptique-card.js`, ajouter
  `/alfea-synoptique/pac-synoptique-photo-card.js?v=2.0.0` et remplacer les
  cartes. Ses panneaux (alarmes, diagnostics, graphes, loi d'eau, commandes)
  sont repris en onglets dans la nouvelle carte. Correspondance des options
  dans `docs/CARTE_SYNOPTIQUE.md`.
- Les **capteurs de programme natif** portent le nom configuré du circuit
  (C1 = programme 501, C2 = 521) au lieu de « RDC » / « étage » fixés quel que
  soit le câblage. Les `entity_id` déjà créés ne changent pas.

### Carte PAC Synoptique photo (nouvelle)

- Vue en coupe photoréaliste de l'Alféa Extensa Duo (groupe extérieur, module
  avec ballon 180 L et appoint, C1 radiateur, C2 plancher chauffant), avec
  panneaux de valeurs en surimpression près de chaque élément.
- Animations d'après l'état réel : lueurs par élément, flux dont la vitesse
  suit la modulation, hélice du groupe extérieur et filets d'air, dégivrage,
  chaleur au-dessus du radiateur, eau du ballon qui chauffe (teinte selon la
  température, convection) et foyer de l'appoint électrique.
- Décor **jour / nuit** automatique (`sun.sun`) et **météo** facultative :
  encart discret dans le ciel, fonds neige / pluie / brouillard en jour et en
  nuit, animations de pluie, averse, orage, neige, brume et vent limitées au
  paysage.
- Onglets repris de l'ancienne carte, chacun masquable ; régime déduit du
  programme natif quand l'intégration le donne « indéterminé ».
- Entités résolues depuis l'appareil PAC (détecté automatiquement) ; compteur
  d'énergie repris des options de l'intégration, puissance lue sur le même
  appareil ; éditeur visuel réduit à l'essentiel ; barre de test (`debug`).
- Images (8 décors WebP, ~3,4 Mo) servies par l'intégration sous
  `/alfea-synoptique/pac_synoptique/`. Chaîne de fabrication documentée dans
  `tools/synoptique_photo/`.

### Programmes horaires

- Nouveau service **`set_weekly_program`** : écriture des programmes chauffage
  C1/C2 et ECS jour par jour (`/JS`), validation complète avant envoi, accusé
  BSB-LAN, relecture de chaque jour et restauration automatique en cas
  d'écart. Le rafraîchissement reste en lecture seule.
- **Import automatique** des programmes une minute après le démarrage de Home
  Assistant, puis chaque jour à 04:00 (le bouton reste disponible).
- Carte Programmes (v0.5.0) : **mode édition** (poignées à glisser, saisie,
  copier/coller d'un jour ou d'un modèle vers un jour, Lun–Ven, le week-end ou
  la semaine, validation en direct, récapitulatif avant écriture, écriture
  regroupée), noms des circuits depuis l'intégration, éditeur visuel, message
  explicite quand la PAC n'a pas de programme de rafraîchissement.
- Corrections : l'affichage revenait à l'ancien programme après une écriture
  (état modifié en place, non transmis à l'interface) ; une consigne absente
  s'affichait 0,0 °C au lieu de « — ».

### Options de l'intégration

- Nouvelles options **Nom du circuit 1 / 2**, exposées dans l'attribut
  `nom_circuit` des thermostats et des capteurs de programme.
- Texte d'aide pour chaque option du formulaire.

### Tests et CI

- Tests de l'ancienne carte reportés sur le moteur des onglets embarqué.
- Nouveaux tests en navigateur simulé (`tests/dom/`, jsdom) : météo et décors,
  résolution des entités, mode édition et copier/coller des programmes.
- Workflows : contrôle des deux cartes, tests jsdom avant chaque release.
- Manifest **2.0.0**.

## 1.5.46 — Compteur d'énergie dans les options, documentation

- Nouvelle option **Compteur d'énergie global de la PAC** : capteur `kWh` utilisé
  pour la répartition ECS / C1+C2 et le COP ECS. Vide = capteurs désactivés.
  L'ancien défaut implicite n'est conservé que s'il existe et qu'aucune option
  n'a été enregistrée.
- Libellés français des options (adresse BSB-LAN, compteur d'énergie).
- README recentré sur l'état actuel et les objectifs du fork ; options des cartes
  dans `docs/CARTE_SYNOPTIQUE.md` ; anciennes notes de version supprimées
  (historique conservé ici).
- Suppression des workflows de publication obsolètes ; CI renommée
  (`ci-integration.yml`, `ci-synoptique.yml`).
- Nouveau workflow `release.yml` : pousser un tag `vX.Y.Z` crée la release
  GitHub (suivie par HACS / le Marketplace) après vérification de la version
  et des tests.
- Manifest **1.5.46**.

## 1.5.45 — Lectures adaptées au journal BSB-LAN

- Lecture de la configuration de journalisation BSB-LAN (`/JI`, lecture seule)
  au démarrage puis toutes les 6 h.
- Chaque paramètre a une période cible (1 min, 5 min, 15 min, 1 h) ; seuls les
  paramètres que le journal MQTT ne publie pas assez souvent sont interrogés
  (`BSB-LAN/poll` ou JSON). Plus de double lecture sur le bus.
- Régimes 700/1000 lus depuis le select MQTT quand ils sont journalisés.
- Nouveau capteur de diagnostic **BSB-LAN - Journalisation**.
- Nouvelle recommandation : journal MQTT 60 s avec 25 paramètres
  (`docs/BSB_LAN_JOURNALISATION.md`).
- Manifest **1.5.45**.

## 1.5.44 — Confirmation des modes circuit plus tolérante

- Off/Auto des circuits et mode global : la confirmation BSB-LAN (700/901/1000/1201)
  attend désormais 30 s au lieu de 10 s. Si le retour MQTT tarde, l'intégration
  redemande la publication du paramètre (poll MQTT en lecture seule) au bout de
  4 s puis toutes les 6 s. Corrige l'erreur « Le régulateur n'a pas confirmé
  1 - Automatique… après 10 secondes » alors que la commande avait bien abouti (~12 s).
- Manifest **1.5.44**.

## 1.5.43 — Graphes énergie C1+C2 / ECS

- Le panneau **Graphes** de la carte synoptique remplace la barre unique du
  compteur global (10 jours) par deux graphiques empilés C1+C2 / ECS issus des
  capteurs `…_c1_c2_energie_consommee` et `…_ecs_energie_consommee` :
  - consommation quotidienne sur 7 jours (jour courant mis en évidence) ;
  - aujourd'hui heure par heure (heures à venir hachurées).
- Totaux de période, répartition C1+C2 / ECS et infobulle détaillée par barre.
- Options facultatives `energy_circuits_entity` / `energy_ecs_entity`.
- Manifest **1.5.43**.

## 1.5.42 — Énergie précise intégrée et accès BSB-LAN sérialisé

- Nouveaux capteurs intégrés **ECS - Énergie consommée** et
  **C1+C2 - Énergie consommée** (`total_increasing`, restaurés au redémarrage) :
  chaque incrément du compteur global configuré est affecté à l'ECS pendant une
  charge ECS (8003), sinon aux circuits C1+C2. Les compteurs PAC arrondis
  3124/3125/3126 ne sont pas utilisés ; les helpers template ne sont plus nécessaires.
- Le COP de session ECS n'expose plus les attributs de cumul (`energie_totale_kwh`…).
- Toutes les requêtes JSON BSB-LAN passent par un client partagé (`bsb_http.py`) :
  une seule requête à la fois vers l'ESP, 0,2 s entre deux accès.
- Les polls 60 s températures (8740/8770/8830) et résistance ECS (8821) sont
  fusionnés en une seule requête `/JQ` (`json_poller.py`).
- Correctif : les capteurs proxy définissaient deux `async_added_to_hass`, la
  seconde masquait l'abonnement au poll JSON ; 8740/8770/8830 se rafraîchissent
  désormais dès la réponse JSON.
- Suppression définitive des capteurs PAC 3124/3125/3126 (recréés puis supprimés
  à chaque démarrage) et de leur poll MQTT.
- Manifest : `iot_class` → `local_polling`, version **1.5.42**.

## 1.5.41 — Compteurs énergie depuis une référence

- Le capteur ECS expose le cumul des sessions depuis la référence.
- Le capteur C1+C2 expose le compteur global moins cette consommation ECS.
- Les compteurs PAC arrondis 3124/3125/3126 ne sont plus utilisés.
- Manifest **1.5.41**.

## 1.5.40 — Énergie ECS basée sur le compteur global

- Les compteurs PAC 3124/3125/3126, arrondis au kWh, ne sont plus utilisés
  pour les bilans énergétiques.
- L'énergie ECS cumulée est calculée à partir des sessions ECS et du compteur
  d'énergie global configuré.
- Le capteur C1+C2 se déduit du compteur global moins l'énergie ECS.
- Manifest **1.5.40**.

## 1.5.39 — Énergie ECS et circuits

- Ajout de l'énergie électrique consommée par l'ECS (3125).
- Ajout des énergies électriques chauffage (3124) et refroidissement (3126)
  des circuits C1/C2.
- Un capteur combiné C1+C2 pourra être créé à partir de ces deux compteurs.
- Manifest **1.5.39**.

## 1.5.38 — Capteurs refroidissement et température extérieure atténuée

- Ajout du statut de refroidissement C2 (10062).
- Ajout de la température modèle d'ambiance C2 (8772).
- Ajout de la température extérieure atténuée (8703).
- Ces trois valeurs sont disponibles sous le préfixe
  `chaufferie_atlantic_alfea_bsb_lan_`.
- Manifest **1.5.38**.

## 1.5.37 — Départ par circuit et priorité ECS

- Ajout de la température de départ réelle **C1 (8743)** et **C2 (8773)**
  dans les cartes de circuit.
- Les tuyaux C1/C2 ne sont plus animés pendant une priorité ECS, même si le
  circulateur reste actif.
- BSB-LAN n'expose pas la position absolue de la vanne 3/4 voies ; seules les
  sorties d'ouverture/fermeture des vannes mélangeuses sont disponibles.
- Manifest **1.5.37**.

## 1.5.36 — Historique PAC groupé

- Les valeurs **Départ PAC**, **Retour PAC** et **Consigne départ** sont
  cliquables.
- Un clic ouvre une fenêtre avec la carte historique standard Home Assistant
  sur 24 h et les trois entités superposées.
- Le ΔT reste affiché mais n'est pas cliquable, faute de capteur dédié.
- Manifest **1.5.36**.

## 1.5.35 — Circulation par régulation

- Quand le circulateur C1/C2 tourne sans demande d'ambiance, l'état affiche
  **Demande circulation par régulation** au lieu de « En attente ».
- Si la température de départ est inférieure à la consigne de départ, l'écart
  est indiqué dans l'état.
- Les tuyaux C1/C2 sont animés dès que leur circulateur est actif, même sans
  demande thermique de la pièce.
- Manifest **1.5.35**.

## 1.5.34 — Températures rafraîchies directement

- Les températures d'ambiance C1, C2 et ballon ECS sont relues toutes les
  60 secondes via l'API JSON de BSB-LAN.
- La publication MQTT de la sonde C2 (8770) pouvait rester figée à sa valeur
  de démarrage ; la valeur affichée est désormais la valeur réelle du
  régulateur.
- La correction alimente aussi les entités climat C1/C2 et les cartes de
  supervision.
- Manifest **1.5.34**.

## 1.5.33 — Activité circuit corrigée

- C1/C2 ne sont plus annoncés « en chauffe » ou « en froid » uniquement
  parce que leur circulateur tourne.
- L'activité tient compte de l'écart entre l'ambiance et la consigne
  effective, avec une petite bande morte pour éviter le clignotement.
- Une pièce déjà à consigne reste **En attente**, même pendant la
  post-circulation.
- Suppression de la petite barre animée de branchement devant les cartes
  C1, C2 et ECS.
- Manifest **1.5.33**.

## 1.5.32 — Loi d'eau, dérogation simulée et modes de circuit

- Nouvelle section **Loi d'eau** dans le synoptique : courbes C1/C2,
  pente, décalage, limites, influence ambiante et bascule été/hiver.
- **Simulation de dérogation** par circuit : durée réglable, compte à rebours,
  consigne d'origine restaurée automatiquement.
- La dérogation simulée suit le régime actif (confort ou réduit) et restaure
  la bonne consigne.
- Cartes programmes : consignes confort/réduit affichées et modifiables dans
  chaque onglet, y compris ECS et rafraîchissement.
- Nouveaux boutons **Auto / Confort / Réduit** par circuit, avec retour visuel
  pendant la confirmation BSB et reprise en cas de bus occupé.
- Rafraîchissement immédiat de la consigne effective après modification.
- Options d'affichage pour masquer la simulation, les graphes ou la loi d'eau.
- Corrections d'alignement, de double état actif et de rafraîchissement de la
  carte programmes.
- Manifest **1.5.32**.

## 1.5.31 — Corrections ECS et animations

- Reconnaissance des états ECS anglais **Charging / Charged** : l'alerte
  « écart départ / consigne » est bien suspendue pendant une charge ECS.
- La liaison extérieur → intérieur ne s'anime plus que si le **compresseur**
  tourne réellement ; l'overrun et la chauffe électrique ECS ne l'animent plus.
- Manifest **1.5.31**.

## 1.5.30 — Intégration autonome, découverte MQTT et diagnostics enrichis

- **Découverte Zeroconf** du BSB-LAN : l'adresse JSON est mise à jour
  automatiquement lorsque l'IP du boîtier change.
- **MQTT discovery intégré** pour les entités ECS (1600/1610/1612) et les
  consignes circuits (710/712/1010/1012/1202/1203 + select 1201). Ces entités
  n'ont plus besoin d'être déclarées dans `bsb-lan.yaml`.
- Nouveau capteur **`Installation - État`** : mappings manquants, sources
  indisponibles, water_heater Atlantic, dépendances externes et intervalles de
  polling.
- Polling ECS dédié : **8830 toutes les 60 s** pour éviter une température
  ballon figée.
- Bouton **`Forçage cycle ECS`** créé par l'intégration (commande 5072 pendant
  10 s), avec retour visuel actif dans la carte.
- Carte synoptique :
  - activité récente dans les diagnostics, avec fusion multi-entités, filtrage
    des états inutiles et déduplication ;
  - historique ECS déplacé à côté de l'activité ;
  - nouvelle section **Graphes** avec consommation quotidienne sur 10 jours ;
  - entités de puissance **et d'énergie** configurables dans l'éditeur ;
  - suppression du petit trait animé redondant sur la carte ECS ;
  - affichage « session en cours » au lieu d'un COP nul pendant une charge.
- Compatibilité HA 2027.11 : passage aux API natives
  `native_current_temperature`, `native_target_temperature` et
  `native_temperature_unit`.
- Correction d'un appel `async_write_ha_state` hors boucle événementielle.
- Migration automatique des anciens mappings YAML vers les entités MQTT
  Atlantic.
- Manifest **1.5.30**.

## 1.5.29 — Historique des sessions ECS

- Ajoute la conservation des **4 dernières sessions ECS** dans l'attribut
  `sessions` du capteur `ECS - COP session`.
- L'historique est restauré après un redémarrage Home Assistant, et la dernière
  session connue est reprise pour ne pas perdre l'historique existant.
- La carte affiche un bloc repliable **« Historique · n sessions »** avec, pour
  chaque session : date, COP, durée, températures départ/fin et énergie.
- Complète la version 1.5.28, qui ne contenait que le bilan de la dernière
  session.
- Manifest **1.5.29**.

## 1.5.28 — COP ECS interne et carte enrichie

- Nouveau capteur interne **`ECS - COP session`** : calcul du COP moyen de la
  dernière session ECS, durée, températures départ/fin, énergie électrique et
  heure de début. Aucun helper externe n'est utilisé pour ce calcul.
- Carte synoptique : affichage compact du bilan de la dernière session.
- Commandes ECS **Off / On** dans la barre de commandes.
- Libellés **Échangeur air (extérieur)** / **Échangeur eau (intérieur)** et
  panneau **PAC · Échangeurs**.
- Badge **Post-circulation** pour un circulateur actif alors que le circuit est
  arrêté ; animations limitées aux circuits réellement actifs.
- Manifest **1.5.28**.

## 1.5.27 — Fusion upstream (programmes natifs, Q3, historique défauts)

- Intègre la branche principale upstream jusqu'à **1.5.27** : programmes horaires
  natifs en lecture seule (chauffage, ECS, rafraîchissement), capteurs
  hebdomadaires, carte **`pac-programmes-card`**, vanne Q3, historique des
  défauts, ECS JSON, démarrage MQTT résilient et correctif de thread safety.
- Conserve les apports du fork : carte **`pac-synoptique-card` v2.11.0** avec
  commandes optionnelles, noms de circuits configurables et **historique 3 h
  au clic**.
- Manifest **1.5.27** avec `after_dependencies: ["mqtt"]`.


## 1.5.24 — Historique 3 h au clic

- **Températures mesurées cliquables** : air extérieur, départ PAC, retour PAC,
  température ambiante C1/C2 et température ballon ECS. Un clic ouvre un
  graphique des 3 dernières heures.
- Le graphique privilégie les **statistiques 5 minutes**
  (`recorder/statistics_during_period`) et retombe sur l'historique brut ;
  le point actuel est ajouté.
- Fermeture par `×`, **Fermer**, clic sur le fond ou **Échap** (ferme aussi
  le panneau de consigne).
- Les consignes et les commandes ne sont pas cliquables.
- **73 correspondances d'entités** (ajout des températures ambiantes 8740/8770).
- Tests carte mis à jour.

## 1.5.23 — Noms de circuits configurables et commandes optionnelles (fork fastm3)

- `circuit_1_name` / `circuit_2_name` : libellés des circuits configurables
  (défaut RDC / Étage), sans changer les entités C1/C2.
- Barre de commandes optionnelle (`show_controls`, vrai par défaut) :
  mode PAC Off / Chauffage / Refroidissement, Off / Auto par circuit.
- Consigne circuit : **clic sur la valeur affichée dans la carte** (Consigne
  chauffage / rafraîch.) ouvre un panneau avec **slider** (pas de 0,5 °C).
  Plus de popup navigateur. Écriture de la consigne programmée
  710/902/1010/1202 via les entités `number` de l'intégration, avec
  confirmation BSB. Les boutons `−` / `+` restent disponibles.
- Consigne ECS : **clic sur « Consigne confort »** ouvre un slider 40–65 °C
  (pas de 1 °C) : écrit 1610 à la valeur demandée puis 1612 à
  `confort − ecs_eco_delta` (écart paramétrable, défaut 3 °C).
- Les sliders permanents de la barre de commandes sont retirés.
- Repli du Climate : si 701/1001/10991 ne sont pas disponibles en écriture,
  `climate.set_temperature` écrit la consigne programmée au lieu d'échouer.
- Délai de confirmation des consignes porté à 30 s (le round-trip BSB/MQTT
  peut dépasser 10 s sur cette installation).
- Ventilateur du synoptique : arrêt à 0 % de modulation, puis vitesse
  proportionnelle jusqu'à 100 % (0,6 s par tour à 100 %, plafond 12 s).
- Éditeur visuel : noms des circuits, écart ECS et affichage des commandes.
- 71 correspondances d'entités (ajout des consignes ECS et des consignes
  programmées C1/C2).
- Tests carte mis à jour ; nouveau test `test_card_controls_v1523.js`.

## 1.5.22 — Style Aérien du synoptique

- Troisième style graphique **Aérien** sélectionnable, styles Classique/Épurée inchangés.
- Dessin COMP frontal et compact, sans côté ni logo ; quatre pales SVG identiques et centrées.
- Échangeurs symboliques dans le même langage graphique, mouvement réduit.
- Fond clair/sombre adaptatif ; panneaux et liaisons allégés ; raccordements et
  couleurs animés uniquement à partir des activités confirmées.
- Adaptation automatique au mobile et portrait sans branches superposées.
- Les 65 entités, modes natifs, états BSB bruts, circulateurs, ECS, alarmes et
  diagnostics restent présents. Aucun changement backend ni service PAC.


## 1.5.16 — Afficher les états BSB-LAN sans interprétation

- Annule uniquement la transformation du badge des circuits en « Régime : Confort/Éco ».
- Affiche à nouveau le libellé d'origine remonté par les capteurs « C1/C2 - État actuel ».
- 10112/10122 restent disponibles séparément dans les diagnostics.
- Préserve intégralement la correction des connexions en mode portrait de V1.5.15.
- Aucune commande PAC, aucune programmation native et aucun attribut Climate modifié.


## 1.5.15 — Portrait et programme Confort / Éco sur le synoptique

- Portrait/Auto : liaisons verticales courtes sans collecteur latéral superposé.
- Cartes RDC, Étage, ECS ajustées à la largeur des smartphones.
- Régime Confort/Éco prioritaire via les programmes actifs 10112/10122 ; valeurs
  d'état BSB brutes conservées en diagnostic.
- 65 correspondances d'entités conservées ; aucune commande PAC modifiée.
- V1.5.14 paysage conservé.


## 1.5.14 — Raccordements PAC → circuits et ECS en paysage

- Corrige le débordement des styles CSS des modes Portrait / Automatique sur le mode Paysage.
- La hauteur des liaisons entre PAC et RDC / Étage / ECS reste alignée sur les trois sorties.
- Les six groupes de sélecteurs CSS concernés sont maintenant préfixés individuellement.
- Test de non-régression des sélecteurs et du code visuel.
- Conserve les 65 correspondances d'entités, thèmes, orientations, animations, diagnostics et alarmes.
- Aucun changement fonctionnel de la PAC.


## 1.5.13 — Synoptique V2.8 compact et responsive

- Nouvelle configuration `layout_orientation: auto | landscape | portrait`, également accessible via l'éditeur visuel.
- Carte moins haute et blocs plus compacts, sans suppression de champs.
- Paysage forcé avec défilement horizontal sur écran trop étroit.
- Portrait optimisé pour smartphone, transitions CSS et liaisons verticales en mode classique.
- Les modes thème Automatique/Clair/Sombre et les présentations Classique/Épurée restent disponibles.
- 65 correspondances d'entités conservées, y compris diagnostics, alarmes et circulateurs.
- Aucune image externe, SVG incorporés dans le JavaScript ; filtres animés remplacés par animation d'opacité.
- Mouvements arrêtés si l'utilisateur demande des animations réduites.
- Aucun changement côté régulation, chauffage, rafraîchissement, ECS, programmation ou dérogations.


## 1.5.11 — Retours BSB natifs et synoptique adaptatif

- Restaure les états natifs BSB-LAN des circuits 1/2 (chauffage 8000/8001 ; refroidissement 8004/8025) sans interprétation Climate, et conserve leurs identifiants Home Assistant.
- Le synoptique affiche les valeurs « État actuel » directement dans la pastille de chacun des deux circuits.
- Affiche les circulateurs C1/C2 dans Diagnostics et dans une section dédiée aux capteurs complémentaires.
- Favorise le synoptique horizontal compact selon la largeur de la carte ; disposition verticale avec connexions COMP → PAC → C1/C2/ECS visibles et animées si nécessaire.
- Aucune modification des commandes PAC ou des programmations et dérogations natives.


## 1.5.10 — Circulateurs affichés sur le synoptique

- Ajoute les circulateurs C1 et C2 au synoptique (découverte des capteurs binaires existants).
- Affiche « Circulateur en marche / arrêté / indisponible » sur chaque bloc Circuit plutôt que « Régime : indéterminé ».
- Ajoute deux lignes « Circulateur » aux diagnostics Circuits 1 et 2.
- Conserve les capteurs « État actuel » basés sur Climate et les régimes BSB dans leurs attributs.
- Aucun changement des commandes PAC, programmations et dérogations.


## 1.5.9 — États des circuits et circulateurs

- Les capteurs C1 et C2 « État actuel » affichent Chauffage, Refroidissement, En attente ou Arrêt d'après l'action Climate, plutôt que le régime BSB brut.
- Le régime BSB natif reste disponible dans les attributs diagnostics des deux capteurs.
- Un état BSB manquant ne masque plus, à lui seul, le retour valide d'un circulateur.
- Surveillance en lecture seule : C1 (relais QX1, paramètre 9031) et C2 (pompe, paramètre 8760), avec retour MQTT de secours.
- Vérifications GitHub mises à jour. Aucune modification des commandes, consignes, programmations ou dérogations PAC.


## 1.5.7 — Éditeur visuel Lovelace

- Éditeur visuel natif de la carte PAC Synoptique (sans extension graphique externe).
- Liste déroulante Apparence : Automatique / Clair / Sombre (valeur enregistrée `theme_mode`).
- Case à cocher d'affichage des diagnostics complémentaires (`show_diagnostics`).
- Mise à jour en temps réel de l'aperçu, événement `config-changed` conforme à Home Assistant.
- Les réglages antérieurs en YAML et les associations d'entités personnalisées sont conservés.
- Aucun changement dans le fonctionnement de la PAC, les alarmes, les animations ou les sécurités.


## 1.5.6 — Compatibilité thèmes Home Assistant

- Synoptique V2.4.0 : nouveau paramètre YAML `theme_mode: auto | light | dark`.
- Par défaut, fond, panneaux, contrastes, textes et bordures suivent les variables CSS du thème Home Assistant.
- Deux modes forcés : clair ou sombre, indépendamment de l'apparence de Home Assistant.
- Mise à jour du visuel lors du changement de thème sans modification d'entités.
- Géométrie d'origine, animations, Confort/Éco, alarmes et diagnostics inchangés.
- Aucun changement des commandes PAC, programmations et dérogations.


## 1.5.5 — Carte synoptique et programme Confort/Éco

- Carte Lovelace `pac-synoptique-card` V2.3.3 incluse directement dans l'intégration/HACS.
- Endpoint HTTP local `/alfea-synoptique/pac-synoptique-card.js` sans copier dans `/config/www`.
- Mise en page horizontale à angles droits ; zone PAC compacte, trois sorties RDC/Étage/ECS.
- Bloc haut supprimé ; mode Chauffage/Refroidissement dans le bloc PAC.
- Alarmes et diagnostics repliables indépendamment ; mentions en pied retirées.
- Animation des serpentins et du ventilateur indicative, uniquement liée aux états.
- Lecture Confort/Éco prioritaire via les programmes natifs 10112/10122 :
  `1 = Réduit/Éco`, `2 = Confort`.
- Distinction entre programme et état de régulation (ex. code 122 : limitation ambiante).
- Aucun changement dans les sélecteurs de consignes, programmations internes, modes ou dérogations PAC.
- Tests hors ligne Python et contrôles de syntaxe JavaScript lors des PR.


## 1.3.3

Correctif graphique HACS / Home Assistant.

- Remplacement de l’icône erronée par l’icône validée issue du fichier fourni pour le projet.
- Validation PNG et empreinte SHA-256 avant publication.
- Aucun changement fonctionnel PAC, ECS ou dérogation.

## 1.3.2

Correctif visuel de la V1.3.1.

- Remplacement de l’icône provisoire par l’icône Atlantic Alfea BSB-LAN définie pour le projet.
- Ajout du logo Atlantic Alfea BSB-LAN correspondant.
- Ressources de marque installées à la racine `brand/` et dans `custom_components/atlantic_alfea_controller/brand/` pour HACS / Home Assistant.
- Aucun changement de la logique PAC, ECS ou dérogation par rapport à la V1.3.1.

## 1.3.1

Version de consolidation de la branche 1.3 pour validation via HACS.

### Corrigé

- Classement plus clair des entités avec un préfixe cohérent `Circuit 1` / `Circuit 2`.
- Temporisation de 2 secondes après le dernier clic `+/- 0,5 °C` dans le Climate ; chaque nouveau clic relance les 2 s et une seule commande BSB finale est envoyée.
- Le `water_heater` n'affiche plus le code numérique brut dans `etat_ecs_bsb` : `Charge, température nominale` remplace `99 - Charge, température nominale`.

### HACS / Home Assistant

- Ajout d'une icône locale pour HACS et Home Assistant 2026.3+.
- Ajout des liens `documentation` et `issue_tracker` au manifeste.

## 1.3.0

Première publication GitHub de la branche 1.3.

### Ajouté

- Intégration Home Assistant complète sous `custom_components/atlantic_alfea_controller`.
- Détection automatique des entités BSB-LAN avec association manuelle en cas d'ambiguïté.
- Mode global Arrêt / Chauffage / Rafraîchissement.
- Entités Climate pour les circuits 1 et 2.
- Lecture des consignes effectives 8741 / 8771.
- Gestion et suivi de l'ECS.
- Suivi du compresseur, de sa modulation, de ses heures et de ses démarrages.
- Surveillance des cycles courts, redémarrages rapprochés, démarrages fréquents et écarts départ/consigne.
- Lecture, surveillance et synchronisation de l'horloge PAC via le paramètre BSB 0.
- Polling ciblé de certains paramètres de diagnostic via MQTT.
- Suivi de la dérogation native des deux circuits et commande d'annulation lorsqu'elle est disponible.

### Dérogation native

- Création d'une dérogation depuis Home Assistant activée uniquement en mode rafraîchissement.
- Seule une demande plus froide a été validée et est autorisée dans cette version.
- Les programmations Confort / Réduit de la PAC ne sont pas remplacées par Home Assistant.

### Sécurité

- Les paramètres de commande déjà associés restent épinglés afin qu'une redétection automatique ne redirige pas une écriture vers une mauvaise entité.
- Une ambiguïté sur une entité de commande entraîne une demande de configuration manuelle plutôt qu'une écriture automatique.
