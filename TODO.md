# IFY - Plan de développement

## 🎯 Vue d'ensemble
Application de groupe d'écoute Spotify avec contrôle collaboratif via WebSockets.

## 📋 Fonctionnalités principales

### 🔐 Authentification
- [ ] Connexion via Spotify OAuth uniquement
- [ ] Pas d'inscription utilisateur requise
- [ ] Création automatique du groupe après liaison Spotify

### 👥 Gestion des groupes
- [ ] Génération de code/QR code pour invitation
- [ ] Groupes temporaires (fermés quand admin se déconnecte)
- [ ] Admin peut expulser les membres
- [ ] Pas de limite de membres
- [ ] Pas de délégation de droits admin

### 🎵 Contrôle musical
- [ ] Ajout de musiques à la queue par tous les membres
- [ ] Vote pour passer à la suivante (majorité = 50%)
- [ ] Pas de contrôle play/pause dans l'app (géré sur Spotify)
- [ ] Affichage musique actuelle + artiste + couverture
- [ ] Affichage de la queue complète

### 🎨 Interface
- [ ] Design mobile-first avec support desktop
- [ ] Interface simple et épurée
- [ ] Mode sombre uniquement (style Spotify)
- [ ] QR Code pour partage facile

### 📊 Données
- [ ] Historique simple des écoutes
- [ ] Pas de statistiques avancées

## 🏗️ Architecture technique

### Backend (Nuxt Server API)
- [ ] **Authentification Spotify OAuth**
  - Route de connexion `/api/auth/spotify`
  - Callback handler `/api/auth/callback`
  - Gestion des tokens (access + refresh)

- [ ] **Gestion des groupes**
  - Création de groupe `/api/groups/create`
  - Rejoindre un groupe `/api/groups/join/:code`
  - Informations du groupe `/api/groups/:id`
  - Expulsion de membre `/api/groups/:id/kick/:userId`

- [ ] **API Spotify Integration**
  - Service de polling des données Spotify
  - Gestion de la queue Spotify
  - Ajout de musiques à la queue
  - Récupération de l'état de lecture actuel

- [ ] **WebSocket Server**
  - Connexions temps réel par groupe
  - Diffusion des mises à jour (musique actuelle, queue, votes)
  - Gestion des votes pour skip
  - Synchronisation des données entre clients

### Frontend (Nuxt Pages)
- [ ] **Pages principales**
  - `/` - Accueil avec connexion Spotify
  - `/group/[id]` - Interface du groupe d'écoute
  - `/join/[code]` - Page de rejoindre un groupe

- [ ] **Composants**
  - `SpotifyAuth` - Bouton de connexion
  - `CurrentTrack` - Affichage musique actuelle
  - `QueueList` - Liste de la queue
  - `AddTrack` - Recherche et ajout de musiques
  - `MembersList` - Liste des membres avec options admin
  - `VoteSkip` - Bouton et compteur de votes
  - `QRCodeShare` - Génération et affichage du QR code

### Base de données (en mémoire pour MVP)
- [ ] **Sessions utilisateur**
  - Stockage des tokens Spotify
  - Mapping user ↔ groupe

- [ ] **Groupes**
  - ID unique, code d'invitation
  - Admin, liste des membres
  - Queue actuelle, votes en cours

- [ ] **Historique simple**
  - Tracks écoutées par groupe

## 🚀 Phases de développement

### Phase 1: Foundation & Setup
- [ ] Downgrade vers Nuxt 3 pour compatibilité
- [ ] Installation des dépendances compatibles
- [ ] Configuration TailwindCSS + mode sombre
- [ ] Structure de base du projet

### Phase 2: Authentication & Groups
- [ ] Setup Spotify OAuth avec @sidebase/nuxt-auth
- [ ] Interface de connexion
- [ ] Création et gestion des groupes
- [ ] Système d'invitation avec codes

### Phase 3: Core Features
- [ ] WebSocket setup avec nuxt-socket-io
- [ ] Affichage musique actuelle + queue
- [ ] Ajout de musiques à la queue
- [ ] Interface mobile-first

### Phase 4: Collaboration
- [ ] Système de votes pour skip
- [ ] Gestion des membres (expulsion)
- [ ] Synchronisation temps réel
- [ ] QR Code pour partage

### Phase 5: Polish
- [ ] Gestion d'erreurs robuste
- [ ] Tests et optimisations
- [ ] Historique des écoutes

## 📦 Librairies Nuxt 3

### Modules Nuxt
```bash
@sidebase/nuxt-auth    # OAuth Spotify
@nuxtjs/tailwindcss    # Styling mobile-first
nuxt-socket-io         # WebSockets temps réel
```

### Packages NPM
```bash
# Backend
spotify-web-api-node   # API Spotify officielle
qrcode                 # Génération QR codes
uuid                   # IDs uniques groupes
node-cron              # Polling Spotify

# Frontend
@headlessui/vue        # Composants UI
@heroicons/vue         # Icônes
qrcode-generator       # QR côté client

# Styling
@tailwindcss/forms     # Forms styling
tailwind-scrollbar     # Custom scrollbars
```

## 🔧 Configuration requise
- Spotify Developer App (Client ID + Secret)
- Variables d'environnement pour OAuth
- Domaine SSL pour callbacks Spotify