# 1.5.24 — Historique 3 h au clic

## Nouveautés

- **Températures mesurées cliquables** dans le synoptique :
  - air extérieur ;
  - départ PAC et retour PAC ;
  - température ambiante C1 et C2 ;
  - température ballon ECS.
- Un clic ouvre un **graphique des 3 dernières heures** :
  - statistiques **5 minutes** (`recorder/statistics_during_period`) en priorité,
    jusqu'à ~36 points ;
  - repli sur l'historique brut pour les entités sans statistiques long terme ;
  - ajout du point actuel ;
  - légende **Min / Max / Actuel**.
- Fermeture par `×`, **Fermer**, clic sur le fond ou **Échap**.
  `Échap` ferme aussi le panneau de réglage de consigne.
- Les **consignes** (chauffage / rafraîchissement, consigne départ, ECS
  confort / éco) et les commandes ne sont pas cliquables.
- **73 correspondances d'entités** (ajout des températures ambiantes 8740/8770).

## Mise à jour

1. HACS → dépôt personnalisé :
   `https://github.com/fastm3/home-assistant-atlantic-alfea-bsb-lan` (Integration).
2. Installer / mettre à jour en **1.5.24**, puis **redémarrer Home Assistant**
   (les changements backend `climate.py` / `number.py` ne sont chargés qu'au redémarrage).
3. Ressource Lovelace (module JavaScript) :
   `/alfea-synoptique/pac-synoptique-card.js?v=1.5.24`
4. Hard refresh (`Ctrl+Shift+R`) ou reset du cache frontend.

## Limites

- Les statistiques 5 minutes nécessitent un `state_class` sur l'entité. Pour les
  entités qui n'en ont pas, le graphique utilise l'historique brut (moins de points).
- Le graphique est une fenêtre fixe de 3 h ; il ne remplace pas l'historique
  complet de Home Assistant.

## Tests

- Tous les tests carte passent (`test_card_*.js`).
- Test `test_card_controls_v1523.js` étendu : graphique 3 h et fermeture par Échap.
