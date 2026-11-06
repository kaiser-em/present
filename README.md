# Present v2.5 — Habitudes mesurables + Minuteur + Time blocking + Coach IA

PWA mobile-first, **100 % vanilla** (HTML / CSS / JS, aucune dépendance, aucun build), hors-ligne, données en local.
Design repris de *Structured* : fond gris clair, feuille blanche arrondie, accent corail, pastilles de couleur, Roboto.

## Lancer
```
pip install -r requirements.txt                # edge-tts (voix) + pywebpush (optionnel, notifications app fermée)
cd present && python3 server.py                # puis http://127.0.0.1:8765 dans Chrome
python3 server.py --host 0.0.0.0 --token SECRET   # ouvrir au réseau local (jeton obligatoire)
```
Menu Chrome → « Ajouter à l'écran d'accueil » pour l'installer. (Le service worker exige http(s) ou localhost.)

## Base de données `db.json`
`server.py` sert l'app **et** écrit `db.json` à la racine du projet (même format que l'export : `habits`, `completions`, `tasks`, …, plus `rev` et `updatedAt`).
- **Temps réel** : chaque changement est envoyé ~1 s après. Une modification externe de `db.json` (script, édition manuelle) est détectée (toutes les 20 s, ou au retour sur l'app) et rechargée.
- **Hors-ligne** : le localStorage sert de cache ; les changements partent dès que le serveur répond.
- **Conflit** (fichier et app modifiés en même temps) : l'app demande quelle version garder.
- **Sécurité** : écriture atomique, sauvegardes tournantes dans `backups/` (toutes les 5 min, 30 conservées), `db.json` invalide jamais écrasé, accès limité à `localhost` (contrôle Host/Origin), jeton optionnel.
- **Profil → Synchronisation** : état en direct, « Enregistrer maintenant », « Recharger depuis db.json ». Sans `server.py` (serveur statique, `file://`) l'app passe en **mode manuel** : export/import JSON.
- Les scripts shell lisent `db.json` directement : `./sync-progress.sh` (sans argument) l'utilise par défaut.

## Coach IA (onglet « Coach »)
Un coach qui lit ton suivi (`db.json`), te répond par chat et te prêche des **sermons audio** lisibles directement dans la conversation.
1. **Connexion** : Coach → réglages → URL d'API (protocole OpenAI : OpenAI, OpenRouter, Ollama `http://localhost:11434/v1`, …), modèle, clé. La clé est stockée **côté serveur** (`data/coach.secret.json`, mode 600), jamais renvoyée à l'app ni écrite dans `db.json`. Tes données de suivi sont envoyées au fournisseur choisi.
2. **Voix** (pastille en haut) — 4 moteurs au choix :
   - **Edge** (gratuit, par défaut) : 10 voix avec aperçu — EN : **Ava**, **Andrew**, Emma, Brian (US, multilingues) et Sonia (UK) ; FR : Vivienne, Rémy (multilingues), Denise, Henri, Sylvie (CA). Les voix multilingues lisent aussi bien le français. Vitesse réglable.
   - **OpenAI / compatible** (`/audio/speech`, ex. `gpt-4o-mini-tts` qui accepte des consignes de ton) avec **URL et clé propres à la voix** : le chat peut tourner sur Ollama/OpenRouter et la voix sur OpenAI.
   - **ElevenLabs** : clé, Voice ID, modèle (`eleven_multilingual_v2`).
   - **Texte seul**.
   Repli automatique sur Edge si un moteur payant échoue (désactivable). Le bouton « Tester » du coach synthétise réellement un mot pour valider la voix. Les textes longs sont découpés (limite ~4000 caractères par requête).
3. **Lecteur inline** : lecture/pause, curseur de position, vitesse 1× / 1,25× / 1,5× / 0,85×, contrôles écran verrouillé (Media Session), « Lire le texte ».
4. **Sermons** : du jour, bilan, encouragement, correction, sur un sujet. Styles : sermon pastoral, coach direct, bienveillant, exigeant ; durée ≈ 1 / 2-3 / 5 min.
5. **Autonome** (sans prompt) : sermon du matin, bilan du soir (avec rattrapage si plusieurs jours sans rien, ou série à risque), bilan hebdomadaire, relances quand une habitude planifiée n'est pas faite, avec heures calmes et plafond quotidien. Tourne dans `server.py`, app ouverte ou non.
6. **Notifications** : app ouverte → toast / notification locale ; app fermée → Web Push (`pip install pywebpush`, activation dans les réglages du coach).
7. **Propositions d'ajustements** : le coach peut proposer (max 2 par message) de *créer une tâche*, *déplacer une tâche* ou *déplacer l'heure d'une habitude*, avec boutons **Accepter / Ignorer** et **Annuler**. Les propositions sont validées côté serveur (ids existants, heures et dates valides) ; l'application les exécute localement, donc `db.json` n'a toujours qu'un seul écrivain.
8. **Examen du soir guidé** : 5 étapes (se poser, gratitude, revue de la journée, grâce et correction, demain), chacune avec sa voix et un **silence guidé** avec compte à rebours ; précédent / suivant / pause, écran maintenu allumé, contrôles écran verrouillé. À la fin : bouton pour valider l'habitude « Examen du soir ». Déclenchable à la main (puce « Examen du soir ») ou automatiquement à l'heure de l'habitude (réglable).
9. **Versets à mémoriser** (onglet *Verset*) : banque de 14 versets (Louis Segond 1910 / King James, domaine public — à vérifier dans ta Bible) ou **tes propres versets** ; modes *Lire*, *Compléter* (mots cachés) et *Réciter* ; écoute du verset ; **révision espacée** (boîtes de Leitner : 1, 2, 4, 7, 14, 30 jours). Noter « Je l'ai su » ou « Difficile » valide l'habitude « Mémorisation ». Le coach connaît le verset à réviser (sermon du matin) et l'accueil affiche une carte « Verset à réviser ».
10. **Résumé hebdomadaire exportable** (Stats → *Résumé*) : régularité, comparaison à la semaine précédente, série, habitudes, time blocking, mot du coach (bilan hebdo) ; export **Markdown**, **HTML** imprimable, **PDF** (impression du navigateur), copie ou partage.
11. Dictée vocale du message (si le navigateur la supporte), carte « Coach » sur l'accueil, pastille de messages non lus.

Un seul sermon automatique à la fois (≥ 45 min d'écart) ; relances limitées par jour, heures calmes respectées.

Fichiers : `coach.py` (logique), `data/` (historique, audio, clé, VAPID — ignoré par git, non servi). `python3 server.py --no-coach` désactive tout.

## Habitudes mesurables (v2.4)
Chaque habitude est **Coche**, **Quantité** (pages, chapitres, verres…) ou **Temps** (minutes/heures). Appuyer sur la ligne ouvre la saisie rapide : boutons +10 min / +1 page…, champ libre (`30`, `0,5h`, `1h30`), note du jour. La coche à droite reste un appui = objectif atteint. La régularité compte 5/10 pages pour 50 % ; la série exige un seuil réglable par habitude. Voir `CHANGELOG.md` pour l'historique des versions.

## Minuteur (v2.5)
Sur la timeline, **Démarrer** chronomètre un bloc ou une habitude. La barre flottante reste visible partout ; le temps réel est enregistré à l'arrêt et nourrit les statistiques et le coach. Un minuteur reste actif si l'app est fermée puis rouverte.

## Écrans
| Écran | Contenu |
|---|---|
| Accueil | anneau du jour, série, prochaine tâche, habitudes cochables, tâches du jour, objectif suivant |
| Timeline | style Structured : bandeau semaine avec pastilles, pilules proportionnelles à la durée, connecteurs, « temps libre » (+ pour ajouter), ligne « maintenant », progression en cours, chevauchements, sous-tâches, notes, inbox |
| Calendrier | vue Mois (anneau de complétion par jour) et vue Agenda 14 jours |
| Statistiques | régularité 7/30/90 j vs période précédente, séries, graphique, heatmap 16 semaines, performance par habitude, time blocking, enseignements |
| Profil | thème auto/clair/sombre, FR/EN, rappels, export/import JSON, import HABBIT, installation |

Timeline : toucher = détail, **appui long** = actions (terminer, décaler ±15 min/1 h, demain, dupliquer, supprimer), **balayage** = jour précédent/suivant.
Une habitude avec une heure apparaît automatiquement dans la timeline ; cocher à un endroit la coche partout.

## Corrections majeures vs v1
- Dates en **heure locale** (v1 utilisait l'UTC : mauvais jour entre 00h et 03h à Madagascar).
- Écran Timeline jamais branché (`timeline` vs `timeblocker`), `TimelinePage` inexistante, FAB et navigation incohérents.
- Calendrier : décalage de semaine, jours de la semaine dimanche/lundi mélangés.
- Série calculée correctement (jours sans habitude prévue ignorés, la journée en cours ne casse pas la série).
- Habitudes planifiées par jours de semaine, archivage, historique modifiable.
- Viewport accessible (zoom autorisé), safe-areas, bouton retour Android géré pour les feuilles, mise à jour du SW signalée.
- Migration automatique des données v1 → v2.

## Limites connues
- Rappels des habitudes : notifications locales, fiables **app ouverte ou récemment utilisée**. Les messages du coach, eux, peuvent arriver app fermée via Web Push (optionnel).
- edge-tts s'appuie sur un service Microsoft **non officiel** : gratuit mais sans garantie (peut changer ou être limité). Le moteur OpenAI TTS sert de plan B.
- Le coach voit `db.json` : il faut que l'app soit synchronisée (mode serveur) pour qu'il ait tes données à jour.
- Pas de glisser-déposer sur la timeline : décalage via appui long ou édition.
- Un seul serveur = une seule source de vérité ; plusieurs appareils en parallèle passent par la détection de conflit.
- `db.json` reste en clair : à ne pas exposer sur internet.

## HABBIT
`Profil → Importer la progression HABBIT` lit `progress-data.json`. `sync-progress.sh` utilise la clé `pillar` stockée dans les habitudes.
