# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

IFY is a collaborative Spotify listening app (Nuxt 3). One user signs in with Spotify OAuth and becomes the **admin** of a group; other users join as guests via a 6-character code or QR code. All members share the admin's Spotify playback: they search tracks, add them to the admin's native Spotify queue, and vote to skip. The app never plays audio itself — playback happens on the admin's Spotify device, and the app mirrors/controls it through the Web API.

The project is early-stage; `TODO.md` tracks the (partly stale) feature roadmap in French.

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml`, `pnpm-lock.yaml`). Dev server runs on **`http://127.0.0.1:3001`** (configured in `nuxt.config.ts`, not the Nuxt default 3000).

```bash
pnpm install          # install deps (runs `nuxt prepare` postinstall)
pnpm dev              # dev server on 127.0.0.1:3001
pnpm build            # production build
pnpm preview          # preview the production build
npx nuxt typecheck    # type-check (uses server/tsconfig for server code)
npx eslint .          # lint (flat config extends the generated .nuxt config)
```

There is **no test suite** — do not assume `pnpm test` exists.

## Environment

Copy `.env.example` to `.env`. Required: `NUXT_AUTH_SECRET`, `NUXT_SPOTIFY_CLIENT_ID`, `NUXT_SPOTIFY_CLIENT_SECRET`, `AUTH_ORIGIN` (must match the dev port, e.g. `http://127.0.0.1:3001`), `NEXT_PUBLIC_AUTH_URL`. Spotify OAuth callback URLs must be registered in the Spotify Developer Dashboard.

## Architecture

### State lives in memory, not a database
All group state is held in module-level `Map`s in `server/services/groups.ts` (`groups` by id, `codeToGroupId` by code). There is no persistence — **a server restart drops every group and session.** The `groupService` singleton is the single source of truth for members, votes, current track, and the set of connected SSE streams. When adding features, extend this service rather than introducing parallel state.

Key group lifecycle rules (in `GroupService`):
- Creating a group starts Spotify polling for it.
- When the **admin** leaves, the whole group is deleted and all clients get a `group_deleted` broadcast; polling stops.
- Skip passes when `skipVotes > totalMembers / 2`; votes are cleared automatically on track change.

### Two-way real-time = Spotify polling → SSE broadcast
There is no WebSocket layer (despite what `TODO.md` says). Real-time updates flow one direction from Spotify and are pushed to clients over Server-Sent Events:

1. `server/services/spotify-polling.ts` — a singleton that runs one `setInterval` per active group (5s). Each tick uses the **admin's** tokens to fetch current playback + queue, diffs against the last-seen essential fields, and only broadcasts on change (`playback_update`, `queue_update`, `vote_update` on track change).
2. `groupService.broadcastToGroup()` pushes JSON to every registered SSE `eventStream`.
3. Clients connect via the SSE route and receive typed messages.

Client-initiated actions (search, add-to-queue, skip, join, leave, vote) go through normal REST POST/GET handlers under `server/api/groups/[id]/`, which mutate `groupService` and call Spotify. Those mutations become visible to other clients on the next poll broadcast — the frontend does not push directly to peers.

### SSE route duplication — important gotcha
There are **two** events endpoints:
- `server/routes/groups/[id]/events.get.ts` → served at `/groups/:id/events` (this is the one the client uses).
- `server/api/groups/[id]/events.get.ts` → served at `/api/groups/:id/events`.

The composable `composables/useGroupSSE.ts` connects to `/groups/:id/events` (the `routes/` one). Keep that in mind before editing; changes to the `api/` copy have no effect on the running client.

### Frontend SSE consumption
- `composables/useSSE.ts` — generic `EventSource` wrapper: connection state, auto-reconnect, message parsing (falls back to a `raw` message type when JSON shape is unexpected).
- `composables/useGroupSSE.ts` — group-specific layer over `useSSE`. Defines the `GroupSSEData` message-type map and exposes typed `onPlaybackUpdate`/`onQueueUpdate`/`onVoteUpdate`/etc. callbacks plus REST action helpers (`joinGroup`, `leaveGroup`, `notifyTrackAdded`, `notifyVoteUpdate`). This is the primary integration point for the group page.

The main UI is `pages/group/[id].vue`, composed from `components/` (e.g. `CurrentTrack`, `SearchBar`, `QueueDrawer`, `NextButton`, `GroupCodeModal`, and the `track/`, `queue/`, `controls/` subfolders).

### Authentication (two provider types in one handler)
`server/api/auth/[...].ts` (`@sidebase/nuxt-auth` + `@auth/core`) registers two providers:
- **Spotify OAuth** — for admins. The `jwt`/`session` callbacks stash `accessToken`/`refreshToken` on the session. These tokens are what the group stores and the polling service uses.
- **Credentials ("Guest")** — for members who join by code without a Spotify account. Guest identity (`id`, `type: 'guest'`, `groupId`, `groupCode`) is threaded through the JWT/session callbacks. `server/api/auth/guest.post.ts` mints the guest user object and adds them to the group.

Guest user ids look like `guest_<timestamp>_<random>`; admin ids come from Spotify.

### Spotify API wrapper
`server/services/spotify.ts` (`SpotifyService`) wraps the Web API with automatic 401 refresh: on `401` it refreshes the access token via the client credentials, **writes the new token back into the group's stored admin tokens**, and retries once. Instantiate it per-request with the admin's tokens + groupId (as the polling service does). Uses native `fetch`, not a Spotify SDK.

## Conventions

- Server code uses Nitro auto-imports (`defineEventHandler`, `createError`, `getQuery`, `readBody`, `getRouterParam`, `createEventStream`, `useRuntimeConfig`) — no explicit imports needed for those.
- Group/track/session shapes are loosely typed (`any` is common for Spotify payloads and members). Match the surrounding style rather than introducing strict types piecemeal.
- Dynamic `import()` of `groups.ts` is used inside handlers/services in a few places to avoid circular-import issues — follow that pattern if you hit a cycle.
- UI is Tailwind (`@nuxtjs/tailwindcss`), dark-only (`app.vue` forces `bg-black`), mobile-first. Icons via `@nuxt/icon` (heroicons + simple-icons sets). QR scanning via `vue-qrcode-reader` / `nuxt-qrcode`.
