# Bluff Card Game - Multiplayer Web App

A real-time multiplayer bluffing card game (similar to BS/Coup) built with Next.js, Tailwind CSS, and Supabase.

## Features

- **Real-time Multiplayer:** Play with 2-8 players on any device
- **Authentication:** Secure login via Supabase Auth
- **Game Lobby:** Create or join games with unique codes
- **Bluffing Mechanics:** Play cards face-down and call others' bluffs
- **Mobile-Friendly:** Responsive design for all device sizes
- **Real-time Updates:** Game state syncs across all clients using Supabase Realtime

## Tech Stack

- **Frontend:**
  - Next.js (React framework)
  - TypeScript
  - Tailwind CSS

- **Backend:**
  - Supabase (Postgres database)
  - Supabase Auth
  - Supabase Realtime

- **Deployment:**
  - Vercel

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier works fine)

## Project Structure

```
.
├── app/                  # Next.js app directory
│   ├── auth/             # Authentication pages
│   ├── game/             # Game-related pages
│   │   ├── lobby/        # Game lobby
│   │   └── play/         # Game play
│   └── page.tsx          # Homepage (redirect to login/lobby)
├── components/           # React components
│   ├── auth/             # Auth-related components
│   ├── game/             # Game-related components
│   └── ui/               # Reusable UI components
├── lib/                  # Utility functions
│   ├── hooks/            # Custom React hooks
│   └── supabase/         # Supabase client setup
├── public/               # Static assets
├── styles/               # Global styles
├── types/                # TypeScript type definitions
├── supabase/             # Supabase schema and configuration
│   └── schema.sql        # Database schema with RLS policies
├── .env.example          # Environment variables example
├── next.config.js        # Next.js configuration
├── package.json          # Project dependencies
├── tailwind.config.js    # Tailwind CSS configuration
└── README.md             # Project documentation
```

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd bluff-card-game
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your project URL and anon/public key
3. Copy `.env.example` to `.env.local` and update the values:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Run the SQL schema from `supabase/schema.sql` in the Supabase SQL editor to create tables and policies

### 4. Run the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## Game Flow

1. **Authentication:** Users sign up/log in via Supabase Auth
2. **Game Creation:** Create a new game or join an existing one via game code
3. **Lobby:** Wait for players to join (up to 8 players)
4. **Game Start:** Game creator starts the game which deals cards to all players
5. **Gameplay:**
   - On your turn, play one or more cards face down, claiming they are a specific value
   - Other players can call your bluff or pass
   - If someone calls bluff:
     - If you were bluffing: you take all cards in the play area
     - If you were honest: the challenger takes all cards
6. **Win Condition:** First player to get rid of all their cards wins

## Row-Level Security (RLS)

The project implements strict row-level security policies to ensure:

- Players can only see their own cards
- Game state is only available to game participants
- Players can only make moves during their turn
- Player data is protected from unauthorized access

## Deployment

### Deploying to Vercel

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Import the project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## TODO / Potential Improvements

- [ ] Add chat/emoji reactions in game rooms
- [ ] Create a leaderboard based on games played/win-rates
- [ ] Implement spectator mode for completed games
- [ ] Add game settings customization (card deck, rules variants)
- [ ] Improve animations and transitions
- [ ] Add sound effects

## Security Notes

- Never expose the Supabase service role key in client-side code
- All sensitive operations should be protected by RLS policies
- User data is protected through proper authentication checks

## License

MIT 