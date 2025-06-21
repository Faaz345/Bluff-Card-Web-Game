# CONTEXT.md

## Project: Multiplayer Bluffing Card Game

### Overview

This is a realtime web-based bluffing card game (inspired by games like "BS" and "Coup") for 1–8 players on individual devices. Users connect via account, form lobbies, and play in real-time from their mobile or desktop browsers. The application is built using Next.js, styled with Tailwind CSS, and uses Supabase for authentication, database storage, and realtime data sync. Deployment is targeted to Vercel or Netlify.

---

## User Stories

- As a player, I can securely create an account or log in (magic link, email).
- As a host, I can create a game/lobby and invite friends with a code.
- As a guest, I can join friends’ lobbies using the shared code.
- I can see all players in the lobby; the host can start the game once we're all ready.
- On my turn: I play card(s) by dragging/selecting them and declaring a rank.
- Other players can, in real-time, challenge my claim.
- On a challenge, all players see the outcome and penalties resolved properly.
- The game continues: all state/resolution is kept in sync across clients.
- At game end, winners are shown and I can rematch or return to lobby.

---

## Tech Stack

- **Frontend:** Next.js (React), Tailwind CSS, Framer Motion (UI animations)
- **Backend/Realtime/Auth:** Supabase
    - Postgres (tables for users, games, players, cards, moves)
    - Auth (magic link or email/password)
    - Realtime (Supabase channels to broadcast state updates instantly)
- **Deployment:** Vercel or Netlify

---

## Database Schema (Supabase Postgres Tables)

### USERS

Supabase Auth handles.
- id (uuid, PK)
- email

### GAMES

- id (uuid, PK)
- created_by (user id)
- code (unique room code)
- status (waiting, started, finished)
- created_at

### PLAYERS

- id (uuid, PK)
- user_id (FK)
- game_id (FK)
- display_name
- is_host (bool)
- hand (array of card ids)
- status (active, eliminated, left)
- current_turn (bool)
- join_time

### CARDS

- id (uuid, PK)
- game_id (FK)
- value (“A”, “2”, … “K”)
- suit (“hearts”, etc)
- owner_player_id (nullable)
- in_deck, in_discard, in_play (bool)

### MOVES

- id (uuid, PK)
- game_id (FK)
- player_id (FK)
- action_type (play, bluff, challenge, reveal, penalty)
- cards_played (array)
- claimed_rank (string)
- timestamp

---

## Game State Design

- All stateful tables (games, players, moves, cards) are updated by game server logic and listened to via Supabase realtime in the client, so every player sees instant sync.
- Player hand is only shown to authenticated player (via row-level security rules).
- Game flow logic (turns, resolving challenges, applying penalties) handled in the server logic/API (can be via Next.js API routes or edge functions).

---

## Core Components (UI & Logic)

- **AuthPage:** Sign up/in (magic link, email)
- **LobbyPage:** Show players, room code, “Start game” (host only)
- **GameBoardPage:** Show own hand, play/discard area, status, action log
- **PlayerList:** All players, who's turn, avatars, active status
- **ChallengeDialog:** UI for challenging a play; animated reveal/penalty
- **ChatPanel:** (Optional) real-time chat/messages during game
- **VictoryScreen:** Show results, rematch/new game options
- **StateBar:** Info (turn, phase, who’s move, alerts)

---

## Game Rules (Simplified BS variant)

- All cards are shuffled and dealt equally.
- On a turn, a player must play 1+ card(s) to the center face-down, calling out a rank (e.g., “2 Kings”). Player selects the cards from their hand and declares the rank. Cards are NOT revealed immediately.
- Other players, in turn, can “call bluff” or “pass.” First to challenge proceeds to check.
- If challenged:
    - If the declared rank matches actual cards, challenger draws a penalty card.
    - If bluffing (any non-matching card), player must pick up discard pile as penalty.
- Turn passes clockwise.

---

## Security / Realtime

- Row-level security on Supabase: Players only see their own cards; table updates trigger client UIs.
- All main tables subscribe via Supabase’s client libraries for instant sync.

---

## Responsive & Accessible UI

- All screens must be mobile-first, accessible, visually clear (Tailwind CSS).
- Animations for card motions, reveals (Framer Motion recommended).
- Provide clear feedback for actions, errors, and game events.

---

## Extras / Future

- Basic chat in lobby/game
- Profile avatars/customization
- Long-term leaderboard/stats

---

## Errata

- All code must be modular, well-commented, and ready for handoff to other devs.
- All user-facing errors must be handled gracefully, especially regarding state desyncs or reconnects.

---