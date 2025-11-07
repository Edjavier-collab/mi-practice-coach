# Supabase Tier Setup Guide

This guide explains how to set up Supabase for the MI Practice Coach app with Free and Premium tier management.

## Overview

The app uses Supabase to:
- Authenticate users (email/password, optional Google SSO)
- Store user profiles with subscription tier (Free or Premium)
- Track practice sessions
- Manage session limits for Free tier (3 per month) vs unlimited for Premium

## Prerequisites

1. Supabase project (create at https://supabase.com)
2. Environment variables configured in `.env.local`
3. Database tables and Row Level Security policies

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign up or log in
2. Click "New project"
3. Enter project name, password, and region
4. Wait for project to initialize
5. Go to Settings → API to find your credentials:
   - `VITE_SUPABASE_URL`: Project URL (looks like `https://xxxx.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Anon/public key

## Step 2: Environment Variables

Create `.env.local` in the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Restart the dev server after adding these.

## Step 3: Set Up Authentication

1. In Supabase dashboard, go to **Authentication → Providers**
2. Enable **Email** provider (should be on by default)
3. Go to **Authentication → Settings**
4. Under "Site URL", set to `http://localhost:3000` (development)
5. Under "Redirect URLs", add:
   - `http://localhost:3000`
   - `http://localhost:3000/reset-password` (optional, for password resets)

## Step 4: Create Database Tables

Run the following SQL in the Supabase SQL editor (**SQL Editor** → **New Query**):

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Sessions table: stores practice session data
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_data jsonb not null,
  created_at timestamp with time zone not null default timezone('utc', now())
);

-- Profiles table: stores user subscription tier and metadata
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'premium')),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

-- Create indexes for better query performance
create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists profiles_user_id_idx on public.profiles(user_id);
```

## Step 5: Enable Row Level Security (RLS)

RLS ensures users can only access their own data. Run this SQL:

```sql
-- Enable RLS on tables
alter table public.sessions enable row level security;
alter table public.profiles enable row level security;

-- Sessions policies: Users can only see/manage their own sessions
create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- Profiles policies: Users can only see/manage their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Step 6: Create Auto-Profile Trigger (Optional but Recommended)

This automatically creates a profile when a user signs up:

```sql
-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, tier, created_at, updated_at)
  values (new.id, 'free', timezone('utc', now()), timezone('utc', now()));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Trigger to call the function
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## Step 7: Understanding Tier Behavior

### Free Tier
- **Session Limit**: 3 practice sessions per calendar month
- **Features**:
  - Basic practice sessions (2 minutes)
  - Session feedback
  - Session history (limited view)
  - Resource library (basic)
- **Paywall**: After 3 sessions, user sees upgrade prompt

### Premium Tier
- **Session Limit**: Unlimited
- **Features**:
  - Unlimited practice sessions (up to 5 minutes)
  - Detailed AI feedback
  - Full session history & calendar view
  - Coaching summaries (AI-generated analysis)
  - All resources & scenario selection
  - Advanced analytics
- **Upgrade**: Via Paywall view ($9.99/month or $99.99/year)

## Step 8: Testing Free vs Premium Flows

### Test Free Tier:
1. Sign up with a new email
2. App automatically creates profile with `tier: 'free'`
3. Start 3 practice sessions
4. On 4th attempt, Paywall appears
5. Dashboard shows "3 Practices Remaining"

### Test Premium Tier:
1. Sign up with new email (starts as Free)
2. Complete a practice session
3. Go to Feedback view
4. Click "View Coaching Summary"
5. Click "Upgrade" on Paywall
6. After upgrade, run more sessions (should be unlimited)
7. No session counter on Dashboard

### Manually Change Tier in Supabase:
1. Go to **SQL Editor**
2. Run:
```sql
update public.profiles
set tier = 'premium', updated_at = timezone('utc', now())
where user_id = 'user-id-here';
```
3. Log out and back in to refresh

## Step 9: Code Integration

The app automatically handles tier management:

1. **On Login**: 
   - Loads user's profile from Supabase
   - If profile doesn't exist, creates one with Free tier
   - Displays correct features based on tier

2. **On Session Completion**:
   - Saves session to Supabase
   - For Free tier, counts sessions this month
   - Shows Paywall if limit reached

3. **On Upgrade**:
   - Updates profile tier in Supabase
   - Enables Premium features
   - Session limit check is bypassed

4. **On Logout**:
   - Clears tier from state
   - Clears sessions from state
   - Returns to Login screen

## Troubleshooting

### "Supabase is not configured" warning

This means environment variables are missing:
```bash
# Add to .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Restart: npm run dev
```

### Profile not created automatically

If the auto-trigger didn't work:
1. Manually insert a profile in SQL Editor:
```sql
insert into public.profiles (user_id, tier, created_at, updated_at)
values ('user-uuid-here', 'free', timezone('utc', now()), timezone('utc', now()));
```

2. Or sign up again (new user = fresh profile creation)

### Session count not working

Check:
1. RLS policies are enabled
2. Sessions are being saved with correct `user_id`
3. User's profile exists in `profiles` table

### Paywall not showing after 3 sessions

Check:
1. All 3 sessions are saved in Supabase `sessions` table
2. User's profile has `tier: 'free'`
3. Browser console for errors: `[App]` or `[subscriptionService]` messages

## Production Deployment

1. Create new Supabase project (separate from development)
2. Add environment variables to hosting provider:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Update Auth redirect URLs to production domain
4. Run the same SQL scripts in production database
5. Test tier system before going live

## Related Files

- `services/databaseService.ts`: Database operations (sessions, profiles)
- `services/subscriptionService.ts`: Tier checking and session limits
- `contexts/AuthContext.tsx`: Authentication flow
- `App.tsx`: Tier loading and state management
- `.env.local`: Environment variables (not committed to git)

