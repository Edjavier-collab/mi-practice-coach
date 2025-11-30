# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MI Practice Coach is a React-based Motivational Interviewing training application that uses Google's Gemini AI to simulate patient conversations. It features a freemium subscription model with Stripe payments, Supabase authentication and database, AI-powered feedback generation, and PWA support for offline use.

## Development Commands

```bash
# Install dependencies
npm install

# Start frontend development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy Edge Functions to Supabase
supabase functions deploy

# Or use the deployment script
./scripts/deploy-edge-functions.sh
```

## Environment Setup

Create a `.env.local` file in the project root with:

```env
# Required: Gemini AI for chat functionality
VITE_GEMINI_API_KEY=your_gemini_api_key

# Required: Supabase for auth, database, and Edge Functions
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Required: Stripe for payments (publishable key only - secrets are in Supabase)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Supabase Secrets (set via CLI)

```bash
supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key
supabase secrets set STRIPE_PRICE_MONTHLY=price_id_for_monthly_plan
supabase secrets set STRIPE_PRICE_ANNUAL=price_id_for_annual_plan
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## Architecture

### Serverless Architecture

The app uses Supabase for all backend functionality:

1. **Frontend (Vite)** - Port 3000
   - React SPA with TypeScript
   - PWA-enabled with service worker for offline support
   - Handles UI, routing, and client-side logic
   - Direct communication with Gemini AI and Supabase

2. **Supabase Edge Functions** - Serverless
   - Located in `supabase/functions/`
   - Handles Stripe checkout session creation
   - Processes Stripe webhooks for tier upgrades
   - Direct tier updates after payment (no webhook wait)
   - Updates user tier in Supabase when payments complete

### Core Application Flow

**App.tsx** is the main orchestrator:
- Wraps app in `AuthProvider` context
- Manages view state (Login, Dashboard, Practice, etc.)
- Handles session persistence to Supabase
- Coordinates tier checking and subscription limits
- Uses custom hooks for state management

**ViewRenderer.tsx** handles view routing:
- React.lazy() for code splitting
- Suspense with loading fallback
- Error boundary integration

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

### Custom Hooks

The `hooks/` directory contains reusable logic:

- **useAppRouter.ts** - View navigation and routing logic
- **useAppState.ts** - Application state management
- **useAuthCallback.ts** - Authentication callback handling
- **useSessionManager.ts** - Session CRUD operations
- **useSetupCheck.ts** - Backend health/configuration checks
- **useSpeechRecognition.ts** - Voice input for practice sessions
- **useStripeCallback.ts** - Stripe checkout handling with direct tier updates
- **useTierManager.ts** - Tier synchronization between local and remote

### Data Persistence

The app uses a hybrid approach:

**Supabase (Primary):**
- `profiles` table: user_id, email, tier, timestamps
- `sessions` table: user_id, session_data (JSONB), created_at
- RLS policies protect user data

**localStorage (Fallback):**
- Used when Supabase is unavailable
- Stores: tier, sessions, onboarding state, review prompts

**Service Architecture:**
- `databaseService.ts` - Supabase CRUD operations
- `subscriptionService.ts` - Tier limits and session counting
- `sessionLoader.ts` - Session persistence logic
- Falls back gracefully if Supabase fails

### Payment Integration

**Stripe Flow (via Edge Functions):**
1. User clicks upgrade → `stripeService.ts` calls Edge Function
2. Edge Function (`create-checkout-session`) creates Checkout Session
3. User completes payment on Stripe
4. Frontend attempts direct tier update via `update-tier-from-session`
5. Stripe webhook hits Edge Function (`stripe-webhook`) as backup
6. Edge Function updates user tier to "premium" in Supabase

**Edge Functions:**
- `create-checkout-session` - Creates Stripe checkout sessions
- `stripe-webhook` - Processes Stripe webhook events
- `update-tier-from-session` - Immediate tier update from checkout session
- `get-subscription` - Retrieves subscription details
- `cancel-subscription` - Handles cancellation with retention offers
- `apply-retention-discount` - Applies 30% retention discount
- `restore-subscription` - Restores cancelled subscriptions
- `upgrade-subscription` - Upgrades monthly to annual

### AI Integration

**services/geminiService.ts:**
- Creates chat sessions with AI patients
- Generates detailed feedback after practice
- Creates coaching summaries for premium users
- Uses structured prompts for consistent MI-focused responses

**services/geminiMockService.ts:**
- Mock responses for testing without API calls

**services/geminiTextProcessor.ts:**
- Text transformation and formatting utilities

**Feedback Tiers:**
- Free: Basic "what went right" summary
- Premium: Empathy score, constructive feedback, key skills, next steps

### Key Services

**patientService.ts:**
- Generates random patient profiles from templates
- Filters by topic, stage of change, difficulty
- Each profile includes: demographics, history, presenting problem, stage of change

**stripeService.ts:**
- Creates checkout sessions via Supabase Edge Functions
- Redirects to Stripe Checkout
- Uses `VITE_SUPABASE_URL/functions/v1` for Edge Function calls

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
- Custom hooks for complex logic extraction
- No Redux or external state libraries
- AuthContext for global auth state
- Optimistic updates for better UX (update local state, then sync to Supabase)

### Component Architecture

Components are organized into three categories:

**views/** - Page-level components (18 total):
- **Dashboard** - Home screen, session stats, tier-gated "Start Practice"
- **PracticeView** - AI chat interface with patient
- **FeedbackView** - Post-session AI feedback display
- **HistoryView** - Past session review with tier-based filtering
- **ResourceLibrary** - MI educational content (some premium-gated)
- **CoachingSummaryView** - AI coaching report from multiple sessions (premium)
- **PaywallView** - Stripe checkout integration
- **ScenarioSelectionView** - Premium scenario filtering
- **CalendarView** - Session calendar with coaching summary generation
- **SettingsView** - Account management, subscription, logout
- **CancelSubscriptionView** - Cancellation flow with retention offers
- **SupportView** - Help and support options
- **LoginView**, **ForgotPasswordView**, **ResetPasswordView**, **EmailConfirmationView** - Auth views
- **Onboarding** - New user onboarding flow
- **ViewRenderer** - View router with lazy loading

**ui/** - Reusable UI components (12 total):
- **BottomNavBar** - Mobile navigation
- **ChatBubble** - Message display in practice
- **CookieConsent** - GDPR cookie banner
- **ErrorBoundary** - Error handling with fallback UI
- **FeedbackCard** - Feedback display cards
- **LoadingSpinner** - Loading states
- **OfflineIndicator** - PWA offline status
- **PasswordStrengthIndicator** - Password validation UI
- **PatientProfileCard** - Patient info display
- **ReviewPrompt** - App review prompt
- **Timer** - Practice session timer
- **UpgradeModal** - Premium upsell modal

**legal/** - Legal/compliance pages (5 total):
- **CookiePolicy**, **Disclaimer**, **PrivacyPolicy**, **SubscriptionTerms**, **TermsOfService**

### PWA Support

The app is a Progressive Web App with:

**Service Worker (vite.config.ts with Workbox):**
- NetworkFirst for Supabase API calls (24h cache)
- CacheFirst for Google Fonts (1 year)
- CacheFirst for Font Awesome (1 year)
- NetworkFirst for Tailwind CDN (30 days)
- CacheFirst for images (30 days)

**Manifest (public/manifest.json):**
- App shortcuts: "Start Practice", "View History"
- Standalone display mode
- Theme colors and icons

**Icons (public/icons/):**
- All standard sizes (72x72 to 512x512)
- Maskable icons for Android
- Shortcut icons

**Offline Support:**
- OfflineIndicator component shows connection status
- Cached data available offline
- Graceful degradation when offline

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

Webhooks are handled by the `stripe-webhook` Edge Function. To test locally:

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve --env-file .env.local

# Forward Stripe webhooks to local function
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

### Session Saving Flow

1. User finishes practice → creates Session object
2. Optimistically update local state (immediate UI feedback)
3. Save to Supabase in background
4. Update remaining free session count
5. If Supabase fails, session remains in local state

### Tier Upgrade Flow

After successful Stripe payment:
1. Frontend receives success redirect with `session_id` parameter
2. **Direct Update:** Calls `update-tier-from-session` Edge Function for immediate tier change
3. **Fallback:** If direct update fails, polls `getUserProfile()` up to 5 times with exponential backoff
4. Waits for Edge Function webhook to update tier to "premium"
5. Shows success message when tier changes
6. Clears remaining free session limit

## Deploying Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or use the deployment script (recommended)
./scripts/deploy-edge-functions.sh

# Deploy specific function
supabase functions deploy create-checkout-session

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_PRICE_MONTHLY=price_xxx
supabase secrets set STRIPE_PRICE_ANNUAL=price_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Utility Scripts

The `scripts/` directory contains helpful utilities:

- **deploy-edge-functions.sh** - Interactive Edge Function deployment with secret setup
- **generate-icons.js** - Generate PWA icons in all required sizes
- **confirm-user.js** - Manually confirm user email
- **setup-email-config.js** - Configure email service settings
- **setup-supabase-cli.sh** - Supabase CLI installation and setup
- **update-user-tier.js** - Manually update user subscription tier

## Common Gotchas

- **No separate backend needed**: All payment processing is handled by Supabase Edge Functions
- **Email confirmation**: Supabase sends confirmation emails on signup; check spam folder
- **Environment variables**: Use `VITE_` prefix for frontend vars; Stripe secrets are in Supabase
- **Mock mode**: App gracefully falls back to mock auth if Supabase is not configured
- **Test payments**: Use Stripe test mode with test card numbers (4242 4242 4242 4242)
- **PWA testing**: Use Chrome DevTools Application tab to test service worker
- **Offline mode**: Test offline functionality using DevTools Network throttling

## Project Structure

```
├── App.tsx                    # Main app component and orchestrator
├── index.tsx                  # Entry point
├── index.css                  # Global styles
├── types.ts                   # All TypeScript interfaces and enums
├── contexts/
│   └── AuthContext.tsx        # Supabase auth with mock fallback
├── hooks/
│   ├── useAppRouter.ts        # View navigation
│   ├── useAppState.ts         # App state management
│   ├── useAuthCallback.ts     # Auth callbacks
│   ├── useSessionManager.ts   # Session operations
│   ├── useSetupCheck.ts       # Backend health checks
│   ├── useSpeechRecognition.ts# Voice input
│   ├── useStripeCallback.ts   # Stripe checkout handling
│   └── useTierManager.ts      # Tier sync
├── services/
│   ├── geminiService.ts       # AI chat and feedback generation
│   ├── geminiMockService.ts   # AI mock responses
│   ├── geminiTextProcessor.ts # Text processing
│   ├── patientService.ts      # Patient profile generation
│   ├── databaseService.ts     # Supabase database operations
│   ├── subscriptionService.ts # Tier limits and session counting
│   ├── stripeService.ts       # Stripe checkout via Edge Functions
│   └── sessionLoader.ts       # Session persistence
├── components/
│   ├── ViewRenderer.tsx       # View router with lazy loading
│   ├── ErrorBoundary.tsx      # Top-level error handling
│   ├── views/                 # Page-level components (18 files)
│   │   ├── Dashboard.tsx
│   │   ├── PracticeView.tsx
│   │   ├── FeedbackView.tsx
│   │   ├── HistoryView.tsx
│   │   ├── PaywallView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── CancelSubscriptionView.tsx
│   │   └── ...
│   ├── ui/                    # Reusable UI components (12 files)
│   │   ├── BottomNavBar.tsx
│   │   ├── ChatBubble.tsx
│   │   ├── Timer.tsx
│   │   ├── OfflineIndicator.tsx
│   │   └── ...
│   └── legal/                 # Legal pages (5 files)
│       ├── PrivacyPolicy.tsx
│       ├── TermsOfService.tsx
│       └── ...
├── lib/
│   └── supabase.ts            # Supabase client configuration
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── icons/                 # PWA icons (all sizes)
│   └── screenshots/           # PWA store screenshots
├── scripts/                   # Utility scripts
│   ├── deploy-edge-functions.sh
│   ├── generate-icons.js
│   └── ...
├── supabase/
│   └── functions/             # Edge Functions for Stripe
│       ├── _shared/           # Shared utilities (cors, stripe, supabase)
│       ├── create-checkout-session/
│       ├── stripe-webhook/
│       ├── update-tier-from-session/
│       ├── get-subscription/
│       ├── cancel-subscription/
│       ├── apply-retention-discount/
│       ├── restore-subscription/
│       └── upgrade-subscription/
└── archive/                   # Deprecated code (reference only)
    └── server/                # Old Express backend (no longer used)
```

## Code Audit

See `CODE_AUDIT.md` for a comprehensive security and code quality audit with prioritized recommendations for improvements.
