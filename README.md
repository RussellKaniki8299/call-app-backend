# Rudless · Serveur temps réel (Socket.IO)

Chat privé, présence, appels 1-à-1, rooms de visio / lives, streaming 1→N, commentaires,
compteurs poussés par Laravel, push Expo et upload/compression de médias.

## Démarrage

```bash
cp .env.example .env     # renseigner SOCKET_NOTIFY_KEY, LARAVEL_API_URL…
npm install
npm run dev              # ou npm start
npm test                 # test de fumée de la logique temps réel (sans réseau)
```

## Architecture

```
src/
├─ index.js                  Bootstrap HTTP + Socket.IO + arrêt propre
├─ app.js                    Application Express (CORS, logs, statiques, erreurs)
├─ config/env.js             Toute la configuration (.env) validée au démarrage
├─ lib/                      logger, ids (noms de rooms), time
├─ store/                    État mémoire : presence · rooms · calls
├─ services/                 realtime (émission) · laravel · push · media
├─ sockets/
│  ├─ index.js               Connexion + déconnexion centralisée
│  ├─ events.js              Contrat des événements
│  └─ handlers/              presence · chat · call · room · signaling · stream · comment · counters
└─ http/
   ├─ routes/ · controllers/ · middlewares/
```

## Ce qui a été corrigé / amélioré

| Sujet | Avant | Maintenant |
|---|---|---|
| Présence | 1 socket par utilisateur (`users[id]`), « hors ligne » dès qu'un onglet se ferme | Multi-appareils, hors ligne seulement à la dernière socket + 5 s de grâce (plus de clignotement au rechargement) |
| Rooms Socket.IO | `12` = utilisateur 12 **et** post 12 (collision) | Préfixes `user:` / `post:` |
| Signalisation WebRTC | `offer/answer/ice` dupliqués rooms + lives | Un seul handler, vérifie que la cible existe |
| Lives | `liveHandlers.js` jamais branché | Rooms unifiées + streaming 1→N (`start-stream`, `join-stream`…) qui n'existait pas côté serveur |
| Appels | Aucun état | `user-busy`, timeout de sonnerie (`CALL_RING_TIMEOUT_MS`), `call-ended` à la déconnexion |
| `user-joined` | sans `userInfo` (attendu par le client) | `{ userId, userInfo, message }` |
| `user-left` | objet via `leave-room`, id brut à la déconnexion | Toujours `{ userId, message }` |
| Historique de room | illimité | 200 derniers messages, nettoyage 30 min après la dernière sortie |
| Secrets | clé `rud@@##less` en dur | `.env` obligatoire en production, comparaison à temps constant |
| URLs | `api.rudless.com` en dur | `LARAVEL_API_URL` |
| Push | 1 requête / appel | Lots de 100 (limite Expo), renvoie `invalidTokens` |
| Médias | chemin ffmpeg Windows en dur | `FFMPEG_PATH` ; orientation EXIF respectée ; `faststart` pour la lecture web |
| Code mort | `*- Copie.js`, `room2.js` | Retirés (fonctions utiles fusionnées) |

## Compatibilité

Tous les noms d'événements et routes HTTP existants sont conservés
(`/count-*`, `/send-push`, `/api/chat/upload`, `/api/media/*`).

Deux points à connaître :
- **`user-left` mobile** : l'ancien `RoomLive.tsx` attendait un `userId` brut ; il est adapté dans le projet mobile fourni.
- **`/send-push`** n'était pas protégé : Laravel ne transmet pas la clé. Mettre `PUSH_REQUIRE_KEY=true`
  une fois Laravel mis à jour pour envoyer `?key=`.
- **`room-full`** : limite par défaut `ROOM_MAX_PARTICIPANTS=10` (valeur de ton `room2.js`) ; `0` = illimité.
