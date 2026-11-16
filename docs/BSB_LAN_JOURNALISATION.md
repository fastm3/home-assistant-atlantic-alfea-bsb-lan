# Journalisation BSB-LAN et lectures de l'intégration

## Pourquoi

Le bus BSB de la PAC traite une demande à la fois. Chaque paramètre lu, que ce
soit par le journal MQTT de BSB-LAN, par une demande `BSB-LAN/poll` ou par une
requête JSON `/JQ`, occupe le bus. Regrouper les paramètres dans une requête
soulage l'ESP32 et le réseau, **pas le bus** : la PAC répond toujours
paramètre par paramètre. Ce qui soulage réellement le bus, c'est :

1. de ne jamais lire deux fois la même valeur ;
2. de lire chaque valeur au rythme dont on a besoin, pas plus.

## Ce que fait l'intégration

- Au démarrage puis toutes les 6 h, elle lit `/JI` (lecture seule) :
  mode de journalisation, intervalle et liste des paramètres journalisés.
- Au même rythme, elle lit en une requête `/JQ` la configuration de
  l'installation et la loi d'eau (voir plus bas) : ces valeurs n'ont pas
  besoin d'être journalisées.
- Chaque paramètre utilisé a une **période cible** :
  - **1 min** : états (8000, 8001, 8003, 8006, 8400, 8820, 8821),
    circulateurs (8760, 9031), modes (700, 901, 1000, 1201, 1600),
    températures (8410, 8412, 8413, 8700, 8740, 8741, 8743, 8770, 8771,
    8773, 8830) ;
  - **5 min** : 701, 1001, 8004, 8025, 8411, 8703, 8744, 8772, 8774, 10062 ;
  - **15 min** : consignes (710, 712, 902, 903, 1010, 1012, 1202, 1203,
    1610, 1612), compteurs (3113, 8450, 8451, 7073) ;
  - **1 h** : constantes d'installation (2842, 2843, 5731, 7072).
- Un paramètre est **couvert** si le journal MQTT le publie avec un intervalle
  inférieur ou égal à sa période cible. Il n'est alors plus interrogé.
- Les paramètres non couverts sont lus :
  - en une seule requête JSON par minute pour 8740/8770/8830/8821 (si l'URL
    BSB-LAN est configurée) ;
  - par `BSB-LAN/poll` pour les autres, chacun à sa période.
- Les régimes 700/1000 sont lus depuis le select MQTT quand le journal les
  publie chaque minute ; sinon par JSON.
- Après une écriture depuis Home Assistant (mode, consigne), le paramètre est
  redemandé immédiatement.
- Seuls les paramètres qui existent sur l'installation (entité source trouvée)
  sont interrogés.
- Si `/JI` est illisible, l'intégration garde les anciennes listes fixes.

## Réglage recommandé de BSB-LAN

En résumé, dans BSB-LAN :

1. **Settings → Logging** : mode MQTT, intervalle 60 s, liste ci-dessous ;
2. **adresse HTTP de BSB-LAN** renseignée dans les options de l'intégration
   (programmes horaires, loi d'eau, configuration de l'installation, horloge) ;
3. **droits d'écriture** (*Write access*) sur *Standard* ou *Complete* pour
   modifier modes, consignes et programmes depuis Home Assistant.

*Settings → Logging* :

- **Logging mode** : MQTT ;
- **Log interval** : 60 s ;
- **Parameters** :

```text
700,901,1000,1201,1600,8000,8001,8003,8006,8400,8410,8412,8413,8700,
8740,8741,8743,8760,8770,8771,8773,8820,8821,8830,9031
```

Avec ce réglage, l'intégration n'a plus rien à interroger chaque minute ;
elle ne lit elle-même que les valeurs lentes. Ordre de grandeur :
**≈ 28 lectures bus par minute**.

Un intervalle de 30 s reste possible : il double simplement la charge du bus
pour ces 25 paramètres. Au-delà de 60 s, ces paramètres ne sont plus
considérés comme couverts et l'intégration les lit elle-même chaque minute.

### Lus par l'intégration : inutile de les journaliser

Avec l'adresse HTTP de BSB-LAN configurée, l'intégration lit elle-même, au
démarrage puis toutes les 6 h :

| Paramètres | Usage |
|---|---|
| 5710, 5711, 5715, 5716, 5731 | circuits présents, rafraîchissement, ballon ECS (détection de l'installation) |
| 720, 721, 730, 740, 741, 750 | loi d'eau C1 : pente, décalage, bascule été/hiver, départ min/max, influence ambiante |
| 1020, 1021, 1030, 1040, 1041, 1050 | loi d'eau C2 (mêmes réglages) |
| 501…507, 521…527, 561…567 (ou 501.1…501.6, etc.) | programmes horaires, sur demande |

La carte « Loi d'eau » utilise les capteurs MQTT de ces paramètres s'ils
existent, sinon les valeurs lues par l'intégration. **Sans adresse HTTP**,
ajoutez `720,721,730,740,741,750,1020,1021,1030,1040,1041,1050` au journal :
la carte ne reconnaît alors ces capteurs que sous leur nom anglais
(« 720 - Heating curve slope »…), BSB-LAN doit donc être réglé en anglais.

### Paramètres à retirer du journal

Ils ne sont pas utilisés par l'intégration. Gardez-les seulement si vos
propres tableaux de bord ou automatisations les utilisent :

```text
1212, 4761, 5061, 5070, 5072, 8499, 8704, 8730, 8735
```

Les consignes et compteurs (710, 712, 902, 1010, 1012, 1202, 1610, 1612,
3113, 8411, 8703, 8744) peuvent aussi quitter le journal : l'intégration
les lit à leur propre rythme. De même pour la loi d'eau et la configuration
(720…750, 1020…1050, 5710…5731) quand l'adresse HTTP est configurée.

## Capteur de diagnostic

**BSB-LAN - Journalisation** (catégorie diagnostic) :

| Attribut | Contenu |
|---|---|
| `mqtt_actif`, `intervalle_s` | configuration lue dans BSB-LAN |
| `emplacements_utilises` | places occupées sur 40 |
| `couverts_par_journal` | paramètres utiles déjà publiés assez souvent |
| `lus_en_json` | paramètres lus par la requête JSON minute |
| `interroges_par_integration` | paramètres demandés par `BSB-LAN/poll` → période (s) |
| `lectures_bus_par_minute` | estimation de la charge du bus |
| `recommandes_manquants` | paramètres « 1 min » absents du journal |
| `journalises_inutiles` | paramètres journalisés que l'intégration n'utilise pas |
| `liste_recommandee`, `intervalle_recommande_s` | réglage conseillé |

## Sécurité

`/JI` et `/JL` sont lisibles sans authentification si l'authentification HTTP
de BSB-LAN est désactivée ; `/JL` contient notamment le mot de passe Wi-Fi.
Activez *HTTP authentication* dans BSB-LAN si le réseau n'est pas de confiance
(l'intégration n'utilise alors que l'URL configurée).
