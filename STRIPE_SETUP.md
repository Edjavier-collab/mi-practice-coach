# Stripe Payment Integration Setup Guide

## Prerequisites
✅ Stripe API keys are already configured in `.env.local`
✅ Stripe dependencies are installed

## Step 1: Create Stripe Products & Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Click **"+ Add product"**

### Create Monthly Plan:
- **Name**: "MI Practice Coach Premium - Monthly"
- **Description**: "Unlimited practice sessions, billed monthly"
- **Pricing**: 
  - **Price**: $9.99
  - **Billing period**: Monthly (recurring)
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_...`)

### Create Annual Plan:
- **Name**: "MI Practice Coach Premium - Annual"
- **Description**: "Unlimited practice sessions, billed annually (save 2 months!)"
- **Pricing**:
  - **Price**: $99.99
  - **Billing period**: Yearly (recurring)
- Click **"Save product"**
- **Copy the Price ID** (starts with `price_...`)

## Step 2: Add Price IDs to Environment

Add the Price IDs to `.env.local`:

```env
STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ANNUAL=price_xxxxxxxxxxxxx
```

## Step 3: Set Up Webhook (for Production)

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"+ Add endpoint"**
3. **Endpoint URL**: `https://your-domain.com/api/stripe-webhook`
4. **Events to send**: Select `checkout.session.completed`
5. **Copy the Webhook Signing Secret** (starts with `whsec_...`)
6. Add to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### For Local Development:
Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3001/api/stripe-webhook
```

This will give you a webhook signing secret - add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`.

## Step 4: Start the Backend Server

In a separate terminal, run:

```bash
npm run dev:server
```

The server will run on `http://localhost:3001`

## Step 5: Test the Payment Flow

1. Start both servers:
   - Frontend: `npm run dev` (port 3000)
   - Backend: `npm run dev:server` (port 3001)

2. In your app:
   - Complete 3 free sessions
   - Click "Subscribe Monthly" or "Subscribe Annually"
   - You'll be redirected to Stripe Checkout

3. Use Stripe test card:
   - **Card**: `4242 4242 4242 4242`
   - **Expiry**: Any future date (e.g., `12/34`)
   - **CVC**: Any 3 digits (e.g., `123`)
   - **ZIP**: Any 5 digits (e.g., `12345`)

4. Complete payment → You'll be redirected back to the app
5. Your tier should automatically update to "premium" via webhook

## Troubleshooting

### "Failed to create checkout session"
- Make sure backend server is running (`npm run dev:server`)
- Check that `VITE_BACKEND_URL` in `.env.local` matches your backend URL
- Verify Stripe secret key is correct

### "Price ID not found"
- Make sure you've created products in Stripe Dashboard
- Verify `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_ANNUAL` are set in `.env.local`
- Restart backend server after adding environment variables

### "Webhook signature verification failed"
- Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
- If using Stripe CLI, use the secret it provides
- Restart backend server after adding webhook secret

### Tier not updating after payment
- Check backend server logs for webhook errors
- Verify Supabase credentials are correct in `.env.local`
- Check that `profiles` table exists and has correct RLS policies
- Manually verify webhook is being received: Check Stripe Dashboard → Webhooks → Recent events

## Production Deployment

1. **Deploy backend server** to a service like:
   - Railway
   - Render
   - Heroku
   - AWS Lambda (with API Gateway)

2. **Update environment variables**:
   - Set `VITE_BACKEND_URL` to your deployed backend URL
   - Set `FRONTEND_URL` in backend `.env` to your frontend URL

3. **Configure Stripe webhook**:
   - Point webhook URL to your deployed backend: `https://your-backend.com/api/stripe-webhook`
   - Use production webhook signing secret

4. **Switch to production Stripe keys**:
   - Replace test keys (`pk_test_...`, `sk_test_...`) with production keys (`pk_live_...`, `sk_live_...`)
   - Update Price IDs to production price IDs

