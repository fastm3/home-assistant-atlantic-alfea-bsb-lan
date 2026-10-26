# 1.5.23 — Synoptique pilotable : noms de circuits, consignes au clic, ECS avec delta éco

## Fork `fastm3` — synoptique pilotable

Cette version ajoute le pilotage depuis la carte PAC Synoptique, sans toucher aux
entités `climate` ni à la logique de régulation de l'intégration.

### Nouveautés

- **Noms de circuits configurables** : `circuit_1_name` / `circuit_2_name`
  (défaut `RDC` / `Étage`). Les entités restent `C1` / `C2`.
- **Commandes optionnelles** (`show_controls: true` par défaut) :
  - mode PAC `Off` / `Chauffage` / `Refroidissement` ;
  - `Off` / `Auto` par circuit ;
  - boutons `−` / `+` pour les consignes.
- **Consigne circuit au clic** : cliquer sur « Consigne chauffage » ou
  « Consigne rafraîch. » dans la carte ouvre un **slider** (plus de popup) :
  - 7–35 °C en chauffage, 7–30 °C en rafraîchissement, pas de 0,5 °C ;
  - écriture de la consigne programmée 710 / 902 / 1010 / 1202 via les entités
    `number` de l'intégration, avec confirmation BSB ;
  - la consigne effective reste affichée séparément (`Eff.`).
- **Consigne ECS au clic** : cliquer sur « Consigne confort » ouvre un slider
  40–65 °C (pas de 1 °C). Écrit 1610 à la valeur demandée, puis 1612 à
  `confort − ecs_eco_delta` (écart paramétrable, défaut 3 °C).
- **Ventilateur proportionnel** : arrêt à 0 % de modulation, puis vitesse
  proportionnelle jusqu'à 100 % (0,6 s/tour à 100 %, plafond 12 s).
- **Repli Climate** : si 701/1001/10991 ne sont pas disponibles en écriture,
  `climate.set_temperature` écrit la consigne programmée au lieu d'échouer.
- **Délai de confirmation** des consignes porté à 30 s (le round-trip BSB/MQTT
  peut dépasser 10 s sur certaines installations).
- **71 correspondances d'entités** (ajout des consignes ECS et des consignes
  programmées C1/C2).
- Éditeur visuel : noms des circuits, écart ECS, affichage des commandes.

### Configuration

```yaml
type: custom:pac-synoptique-card
circuit_1_name: Étage
circuit_2_name: RDC
show_controls: true
ecs_eco_delta: 3
```

### Mise à jour

1. HACS → dépôt personnalisé :
   `https://github.com/fastm3/home-assistant-atlantic-alfea-bsb-lan` (Integration).
2. Installer / mettre à jour en **1.5.23**, puis redémarrer Home Assistant
   (les changements backend `climate.py` / `number.py` ne sont chargés qu'au redémarrage).
3. Ressource Lovelace (module JavaScript) :
   `/alfea-synoptique/pac-synoptique-card.js?v=1.5.23`
4. Hard refresh (`Ctrl+Shift+R`) ou reset du cache frontend.

### Limites connues

- La **dérogation native** n'est modifiable directement que si 701/1001 et
  10991/10990 sont exposés en écriture par BSB-LAN. Sinon, le clic modifie la
  **consigne programmée** ; la consigne effective suit et reste affichée.
- L'ECS écrit les consignes 1610/1612 ; le programme du régulateur reste la
  source de vérité pour les horaires.
- Le ventilateur est une animation indicative basée sur la modulation du
  compresseur (8413), pas sur la vitesse réelle du ventilateur.

### Tests

- Tous les tests carte passent (`test_card_*.js`).
- Nouveau test `test_card_controls_v1523.js` : noms, commandes, sliders,
  consigne ECS et ventilateur proportionnel.

### Remerciements

Base : [Jrmysmallstep/home-assistant-atlantic-alfea-bsb-lan](https://github.com/Jrmysmallstep/home-assistant-atlantic-alfea-bsb-lan).
