# Journal des versions

## 2.6.0 — Timeline minimaliste + minuteur automatique
- Anneau de progression des habitudes corrigé (SVG, extrémités arrondies, plus d'encoches).
- Timeline épurée : pastille fine, progression en dégradé, heure actuelle en gras à gauche (plus de barre horizontale), « 58 min restantes ».
- Le minuteur démarre tout seul au début d'un bloc et s'arrête (et enregistre) à sa fin, avec notification de début et de fin. Abandonner/terminer manuellement empêche le redémarrage automatique.

## 2.5.0 — Minuteur sur les blocs de la timeline
- Bouton **Démarrer** sur les éléments de la timeline qui ont une durée (tâches, habitudes) ; barre flottante avec temps écoulé, pause/reprise, terminer, abandonner.
- Le **temps réellement passé** est enregistré (`spent` dans `db.json`). Habitude de type Temps : il s'ajoute à la valeur du jour. Tâche : terminée automatiquement si la durée prévue est atteinte, sinon proposition « Terminer la tâche ».
- Statistiques de time blocking : « Réalisé » = temps réel (à défaut, durée prévue des éléments terminés).
- Le minuteur survit au rechargement de l'app (horodatage) ; alerte quand la durée prévue est atteinte ; confirmation avant de basculer d'un minuteur à un autre ; < 30 s non enregistré.
- Le coach voit `spent_minutes` et peut comparer avec le temps prévu.

## 2.4.0 — Habitudes mesurables + notes
- Trois types d'habitude : **Coche**, **Quantité** (unité libre, décimales) et **Temps** (30 min, 0,5h, 1h30, 3h… sans limite).
- Saisie flexible (`30`, `30 min`, `0,5h`, `1h30`, `1:30`, `2 heures`), boutons rapides réglables par habitude (+10 min, +1 page…), « Objectif atteint », correction (−), remise à zéro.
- Régularité pondérée (5/10 pages = 50 %) ; la **série** exige un seuil réglable par habitude (100 % par défaut).
- Une note par jour et par habitude, un « Pourquoi » permanent, option « ne pas partager avec le coach ».
- Le coach reçoit valeurs, objectifs, 7 derniers jours, notes (si partagées) et « pourquoi ».
- Fiche habitude : volume sur 14 jours, total / moyenne / meilleur jour, journal de notes.
- `db.json` : nouveau champ optionnel `entries` (valeurs + notes) ; `completions` reste « jours atteints » (scripts inchangés).
- Conversion en un appui d'un objectif texte (« 180 min », « 10 chapitres »).
- Correction : liste des boutons rapides (virgule décimale préservée).

## 2.3.0 — Coach : propositions, examen guidé, versets, résumé hebdo, fournisseurs de voix
## 2.2.0 — Coach IA (chat, sermons audio, autonomie, Web Push)
## 2.1.0 — Synchronisation `db.json` via `server.py`
## 2.0.0 — Réécriture : thème Structured, timeline, calendrier, statistiques, PWA
