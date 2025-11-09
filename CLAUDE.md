# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MI Practice Coach is a React-based Motivational Interviewing training application that uses Google's Gemini AI to simulate patient conversations. It features a freemium subscription model with Stripe payments, Supabase authentication and database, and AI-powered feedback generation.

## Development Commands

```bash
# Install dependencies
npm install

# Start frontend development server (port 3000)
npm run dev

# Start backend Stripe server (port 3001) - required for payment features
npm run dev:server

# Build for production
npm run build

# Preview production build
npm run preview
```

**Important:** For full functionality during development, run BOTH servers in separate terminal windows:
- Terminal 1: `npm run dev` (frontend)
- Terminal 2: `npm run dev:server` (backend)

## Environment Setup

Create a `.env.local` file in the project root with:

```env
# Required: Gemini AI for chat functionality
VITE_GEMINI_API_KEY=your_gemini_api_key

# Required: Supabase for auth and database
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required: Stripe for payments
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_PRICE_MONTHLY=price_id_for_monthly_plan
STRIPE_PRICE_ANNUAL=price_id_for_annual_plan
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## Architecture

### Dual-Server Architecture

The app runs two servers simultaneously:

1. **Frontend (Vite)** - Port 3000
   - React SPA with TypeScript
   - Handles UI, routing, and client-side logic
   - Direct communication with Gemini AI and Supabase

2. **Backend (Express)** - Port 3001
   - Located in `server/stripe-server.js`
   - Handles Stripe checkout session creation
   - Processes Stripe webhooks for tier upgrades
   - Updates user tier in Supabase when payments complete

### Core Application Flow

**App.tsx** is the main orchestrator:
- Wraps app in `AuthProvider` context
- Manages view state (Login, Dashboard, Practice, etc.)
- Handles session persistence to Supabase
- Coordinates tier checking and subscription limits
- Implements retry logic for Stripe webhook processing

### Authentication System

**contexts/AuthContext.tsx** provides:
- Supabase authentication with fallback to mock mode
- Sign up, sign in, sign out, password reset
- Automatic session restoration on page load
- Mock authentication when Supabase is not configured

**Auth Flow:**
1. User signs up → Supabase sends confirmation email
2. User confirms email → Can log in
3. AuthContext listens for auth state changes
4. App.tsx loads user profile and tier from Supabase

### Data Persistence

The app uses a hybrid approach:

**Supabase (Primary):**
- `profiles` table: user_id, tier, timestamps
- `sessions` table: user_id, session_data (JSONB), created_at
- RLS policies protect user data

**localStorage (Fallback):**
- Used when Supabase is unavailable
- Stores: tier, sessions, onboarding state, review prompts

**Service Architecture:**
- `databaseService.ts` - Supabase CRUD operations
- `subscriptionService.ts` - Tier limits and session counting
- Falls back gracefully if Supabase fails

### Payment Integration

**Stripe Flow:**
1. User clicks upgrade → `stripeService.ts` calls backend
2. Backend (`server/stripe-server.js`) creates Checkout Session
3. User completes payment on Stripe
4. Stripe webhook hits `/api/stripe-webhook`
5. Backend updates user tier to "premium" in Supabase
6. Frontend polls user profile to detect tier change

**Key Configuration:**
- Automatic tax disabled in development mode
- Webhook signature verification in production
- Retry logic with exponential backoff for tier updates

### AI Integration

**services/geminiService.ts:**
- Creates chat sessions with AI patients
- Generates detailed feedback after practice
- Creates coaching summaries for premium users
- Uses structured prompts for consistent MI-focused responses

**Feedback Tiers:**
- Free: Basic "what went right" summary
- Premium: Empathy score, constructive feedback, key skills, next steps

### Key Services

**patientService.ts:**
- Generates random patient profiles from templates
- Filters by topic, stage of change, difficulty
- Each profile includes: demographics, history, presenting problem, stage of change

**stripeService.ts:**
- Creates checkout sessions via backend API
- Redirects to Stripe Checkout
- Default backend URL: `http://localhost:3001`

**subscriptionService.ts:**
- Enforces free tier limit (3 sessions/month)
- Counts sessions by date range
- Premium users: unlimited sessions

**databaseService.ts:**
- Saves/retrieves sessions from Supabase
- Creates and updates user profiles
- Implements retry logic for reliability

### State Management

- Pure React hooks (useState, useEffect, useCallback)
- No Redux or external state libraries
- AuthContext for global auth state
- Optimistic updates for better UX (update local state, then sync to Supabase)

### View Components

The app uses a view-based routing system (no react-router):

- **Dashboard**: Home screen, session stats, tier-gated "Start Practice"
- **PracticeView**: AI chat interface with patient
- **FeedbackView**: Post-session AI feedback display
- **HistoryView**: Past session review with tier-based filtering
- **ResourceLibrary**: MI educational content (some premium-gated)
- **CoachingSummaryView**: AI coaching report from multiple sessions (premium)
- **PaywallView**: Stripe checkout integration
- **ScenarioSelectionView**: Premium scenario filtering
- **CalendarView**: Session calendar with coaching summary generation
- **SettingsView**: Account management, logout, legal links

### TypeScript Configuration

- Path alias `@/` → project root (configured in `vite.config.ts` and `tsconfig.json`)
- `types.ts` defines all core interfaces: UserTier, View, PatientProfile, Session, Feedback, CoachingSummary
- Enum-based type safety for tiers, views, stages of change

### Styling

- Tailwind CSS utility classes only
- No separate CSS files
- Font Awesome icons (`fa` classes)
- Responsive mobile-first design

## Important Implementation Details

### Supabase Realtime Configuration

The Supabase client is configured to minimize WebSocket connection attempts (in `lib/supabase.ts`):
- Long timeout (60s) and heartbeat intervals (60s)
- Reconnect delay set to 1 hour to prevent aggressive retries
- App uses REST API only, not realtime subscriptions

### Stripe Webhook Handling

In development, webhooks require manual triggering or Stripe CLI:
```bash
stripe listen --forward-to localhost:3001/api/stripe-webhook
```

The backend validates Supabase setup before processing webhooks and provides detailed error logging.

### Session Saving Flow

1. User finishes practice → creates Session object
2. Optimistically update local state (immediate UI feedback)
3. Save to Supabase in background
4. Update remaining free session count
5. If Supabase fails, session remains in local state

### Tier Upgrade Flow

After successful Stripe payment:
1. Frontend receives success redirect with `session_id` parameter
2. Frontend polls `getUserProfile()` up to 5 times with exponential backoff
3. Waits for backend webhook to update tier to "premium"
4. Shows success message when tier changes
5. Clears remaining free session limit

## Common Gotchas

- **Two servers required**: Both `npm run dev` and `npm run dev:server` must run for payments
- **Email confirmation**: Supabase sends confirmation emails on signup; check spam folder
- **Webhook delays**: In development, tier updates require manual webhook trigger or Stripe CLI
- **Environment variables**: Use `VITE_` prefix for frontend vars, no prefix for backend-only vars
- **Mock mode**: App gracefully falls back to mock auth if Supabase is not configured

## Project Structure

```
├── App.tsx                 # Main app component and orchestrator
├── types.ts               # All TypeScript interfaces and enums
├── contexts/
│   └── AuthContext.tsx    # Supabase auth with mock fallback
├── services/
│   ├── geminiService.ts   # AI chat and feedback generation
│   ├── patientService.ts  # Patient profile generation
│   ├── databaseService.ts # Supabase database operations
│   ├── subscriptionService.ts # Tier limits and session counting
│   └── stripeService.ts   # Stripe checkout integration
├── components/
│   ├── Dashboard.tsx
│   ├── PracticeView.tsx
│   ├── FeedbackView.tsx
│   └── ...                # Other view components
├── lib/
│   └── supabase.ts        # Supabase client configuration
└── server/
    └── stripe-server.js   # Express backend for Stripe webhooks
```
