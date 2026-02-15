# Quizexe - Real-Time 1v1 Quiz Battle Platform

<div align="center">

**⚡ Fast • 🎯 Fair • 🔥 Real-Time**

A production-grade, server-authoritative multiplayer quiz game built with Supabase, React, and modern web technologies.

[Features](#features) • [Architecture](#architecture) • [Setup](#setup) • [Deployment](#deployment)

</div>

---

## 🎯 Features

### Core Gameplay
- **Real-Time 1v1 Battles** - Compete head-to-head with instant score updates
- **Server-Authoritative Logic** - All scoring and validation happens server-side
- **Anti-Cheat System** - Time validation, replay protection, and audit logging
- **Latency Compensation** - 200ms grace period for fair network handling
- **Streak Multipliers** - Build combos for bonus points (1.0x → 1.1x → 1.3x)

### Game Modes
- **5 Topics**: General Knowledge, Science, History, Pop Culture, Sports
- **3 Difficulties**: Easy, Medium, Hard
- **Flexible Settings**: 5/10/15 questions, 10/15/20/30 seconds per question

### Technical Excellence
- **Supabase Realtime** - Live score updates and presence tracking
- **PostgreSQL** - Production-grade database with RLS and triggers
- **Edge Functions** - Serverless game logic with global deployment
- **Mobile-First UI** - Cyber-modern design optimized for all devices

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime + Edge Functions)
- **Auth**: Anonymous authentication (instant play)
- **Deployment**: Vercel (frontend) + Supabase (backend)

### Database Schema
```
players → rooms → matches → match_questions → questions
                    ↓
            player_answers → match_scores → match_summaries
```

**Elite Production Features:**
- ✅ Game state enum (`waiting`, `active`, `finished`, `abandoned`)
- ✅ Deterministic question ordering (reconnection safety)
- ✅ Match summary analytics (auto-populated via trigger)
- ✅ 200ms latency compensation buffer

### Security Model
```
Client (Sends Intent) → Edge Function (Validates) → Database (Updates) → Realtime (Broadcasts)
```

**Zero-Trust Principles:**
- Client NEVER controls scores, time validation, or correct answers
- Server is the single source of truth
- All game logic executed server-side
- Row-level security on all tables

---

## 🚀 Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd QuizzAttacc
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Supabase

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for database to initialize (~2 minutes)

#### Run Database Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

Or manually:
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260215_initial_schema.sql`
3. Run the SQL
4. Copy contents of `supabase/migrations/20260215_seed_questions.sql`
5. Run the SQL

#### Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy create-room
supabase functions deploy join-room
supabase functions deploy submit-answer
supabase functions deploy cleanup-expired-rooms

# Set up cron job for cleanup (Supabase Dashboard → Database → Cron Jobs)
# Schedule: */15 * * * * (every 15 minutes)
# Function: cleanup-expired-rooms
```

### 4. Configure Environment Variables

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from Supabase Dashboard → Settings → API

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 📦 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your repository
4. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

### Backend (Supabase)

Already deployed via Supabase! Just ensure:
- ✅ Migrations applied
- ✅ Edge Functions deployed
- ✅ Cron job configured for cleanup

### Custom Domain (Optional)

**Vercel:**
- Settings → Domains → Add Domain

**Supabase:**
- Already uses Supabase's global CDN

---

## 🎮 How to Play

### Host a Game
1. Click "Create Room"
2. Enter your name and choose settings
3. Share the 6-character room code with your opponent
4. Game starts automatically when they join

### Join a Game
1. Click "Join Room"
2. Enter your name and the room code
3. Game starts immediately

### During the Game
- Answer questions as fast as possible
- Build streaks for bonus multipliers
- Watch live scores update in real-time
- Timer shows remaining time with color transitions

### Scoring Formula
```
Base: 100 points (correct answer)
Time Bonus: 0-50 points (faster = higher)
Streak Multiplier:
  - 1st correct: 1.0x
  - 2nd correct: 1.1x
  - 3rd+ correct: 1.3x (capped)

Total = (Base + Bonus) × Multiplier
```

### Win Condition
- Highest total score wins
- Tie-breaker: Fastest cumulative answer time

---

## 🔧 Development

### Project Structure
```
QuizzAttacc/
├── supabase/
│   ├── migrations/          # Database schema
│   └── functions/           # Edge Functions
├── src/
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utilities and Supabase client
│   ├── pages/               # Route pages
│   ├── index.css            # Global styles
│   └── main.tsx             # App entry point
├── docs/
│   └── event-flows.md       # Architecture diagrams
└── package.json
```

### Key Files
- **Database**: `supabase/migrations/20260215_initial_schema.sql`
- **Questions**: `supabase/migrations/20260215_seed_questions.sql`
- **Edge Functions**: `supabase/functions/*/index.ts`
- **Supabase Client**: `src/lib/supabase.ts`
- **Game Logic**: `src/lib/gameLogic.ts`

### Adding Questions

Edit `supabase/migrations/20260215_seed_questions.sql`:
```sql
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('Topic', 'difficulty', 'Question text?', 
 '["Option A", "Option B", "Option C", "Option D"]', 2, 
 'Explanation text');
```

Then re-run migrations or execute SQL directly.

### Customizing Topics

1. Edit `TOPICS` array in `src/pages/CreateRoom.tsx`
2. Add corresponding questions to database
3. Update `docs/event-flows.md` if needed

---

## 📊 Scaling Considerations

### Current Capacity
- ~1,000 concurrent matches (2,000 players)
- Supabase free tier: 500MB database, 2GB bandwidth/month

### To Scale Beyond
1. **Database**: Add read replicas for question queries
2. **Realtime**: Upgrade Supabase plan for more connections
3. **Edge Functions**: Auto-scale (no action needed)
4. **CDN**: Add Cloudflare for static assets
5. **Monitoring**: Add Sentry for errors, PostHog for analytics

### Cost Estimate (1,000 concurrent matches)
- Supabase Pro: $25/month
- Vercel Pro: $20/month (optional)
- **Total**: ~$25-45/month

---

## 🔒 Security Features

- ✅ Server-authoritative scoring (no client control)
- ✅ Time validation with 200ms latency buffer
- ✅ One answer per question enforcement
- ✅ Replay protection (timestamp validation)
- ✅ Rate limiting (5 rooms per hour per player)
- ✅ Input validation and sanitization
- ✅ Row-level security policies
- ✅ Audit logging (all answers recorded)

---

## 🐛 Troubleshooting

### "Failed to create room"
- Check Supabase connection
- Verify environment variables
- Check browser console for errors

### "Room not found"
- Room may have expired (1-hour limit)
- Verify room code is correct
- Check if room was deleted

### Realtime not working
- Verify Supabase Realtime is enabled (Dashboard → Settings → API)
- Check browser console for WebSocket errors
- Try refreshing the page

### Questions not loading
- Verify seed data was inserted
- Check Supabase logs for errors
- Ensure RLS policies allow reading questions

---

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes.

---

## 🙏 Acknowledgments

Built with:
- [Supabase](https://supabase.com) - Backend infrastructure
- [React](https://react.dev) - UI framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Vite](https://vitejs.dev) - Build tool

---

<div align="center">

**Made with ⚡ by the Quizexe Team**

[Report Bug](https://github.com/your-repo/issues) • [Request Feature](https://github.com/your-repo/issues)

</div>
