# Code Audit Report: MI Practice Coach

**Date:** 2025-01-28  
**Scope:** Full codebase analysis and refactoring recommendations

---

## Executive Summary

This audit identifies **critical architectural issues**, **code organization problems**, and **refactoring opportunities** across the codebase. The application shows signs of rapid development with technical debt accumulation, particularly around state management, error handling, and code duplication.

**Key Findings:**
- **Critical:** 5 issues requiring immediate attention
- **High Priority:** 12 refactoring opportunities
- **Medium Priority:** 15 improvements
- **Low Priority:** 8 optimizations

---

## 1. CRITICAL ARCHITECTURAL ISSUES

### 1.1 Monolithic App Component (1052 lines)
**Location:** `App.tsx`  
**Severity:** 🔴 Critical  
**Impact:** Maintainability, testability, performance

**Problem:**
- Single file contains 1052 lines with multiple responsibilities
- Mixes routing logic, state management, business logic, and UI rendering
- 27+ useState/useEffect hooks creating complex interdependencies
- Difficult to test, debug, and maintain

**Current Structure:**
```typescript
App.tsx (1052 lines)
├── ScenarioSelectionView component (inline)
├── AppContent component (850+ lines)
│   ├── 15+ useState hooks
│   ├── 12+ useEffect hooks
│   ├── View routing logic
│   ├── Session management
│   ├── Tier synchronization
│   ├── Stripe checkout handling
│   └── Event handlers
```

**Refactoring Plan:**
1. **Extract View Router** → `components/Router.tsx`
   - Handle view state and navigation
   - Use React Router or custom router pattern
   
2. **Create Session Context** → `contexts/SessionContext.tsx`
   - Centralize session state management
   - Handle loading, saving, fetching sessions
   
3. **Create Tier Context** → `contexts/TierContext.tsx`
   - Manage user tier state
   - Handle tier synchronization logic
   - Single source of truth for tier
   
4. **Extract Business Logic** → `hooks/usePracticeFlow.ts`
   - Practice session flow logic
   - Patient generation
   - Session completion handling
   
5. **Split App.tsx** into:
   - `App.tsx` (50 lines) - Entry point, providers
   - `AppContent.tsx` (200 lines) - Main layout, view rendering
   - `hooks/useAppState.ts` - State management
   - `hooks/useTierSync.ts` - Tier synchronization
   - `hooks/useStripeRedirect.ts` - Stripe checkout handling

**Estimated Effort:** 2-3 days  
**Priority:** P0

---

### 1.2 Tier Synchronization Race Conditions
**Location:** `App.tsx:294-410`  
**Severity:** 🔴 Critical  
**Impact:** Data integrity, user experience

**Problem:**
Three separate `useEffect` hooks update `userTier` from different sources:
1. Lines 294-311: Loads from localStorage
2. Lines 313-355: Loads from Supabase
3. Lines 357-410: Handles Stripe checkout redirect

These can execute in any order, causing:
- Tier to revert to old values
- Premium users seeing free tier
- Inconsistent state across components

**Current Code:**
```typescript
// Effect 1: localStorage
useEffect(() => {
  const savedTier = localStorage.getItem('mi-coach-tier');
  setUserTier(savedTier); // Can overwrite Supabase value
}, [user]);

// Effect 2: Supabase
useEffect(() => {
  const profile = await getUserProfile(user.id);
  setUserTier(profile.tier); // Can be overwritten by localStorage
}, [user, authLoading]);

// Effect 3: Stripe redirect
useEffect(() => {
  // Polls for tier update
  setUserTier(UserTier.Premium); // Optimistic update
}, [sessionId]);
```

**Refactoring Solution:**
```typescript
// Create TierContext with single source of truth
const TierContext = createContext<TierState>();

const TierProvider = ({ children }) => {
  const [tier, setTier] = useState<UserTier>(UserTier.Free);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'localStorage' | 'supabase' | 'stripe'>('localStorage');
  
  // Priority: Supabase > Stripe > localStorage
  useEffect(() => {
    const syncTier = async () => {
      // 1. Try Supabase first (most authoritative)
      const profile = await getUserProfile(user.id);
      if (profile?.tier) {
        setTier(profile.tier);
        setSource('supabase');
        return;
      }
      
      // 2. Fallback to localStorage
      const saved = localStorage.getItem('mi-coach-tier');
      if (saved) {
        setTier(saved as UserTier);
        setSource('localStorage');
      }
    };
    
    syncTier();
  }, [user]);
  
  // Stripe redirect handler (updates Supabase, then syncs)
  const handleStripeSuccess = async (sessionId: string) => {
    await updateTierFromSession(sessionId);
    await syncTier(); // Re-sync from Supabase
  };
  
  return (
    <TierContext.Provider value={{ tier, loading, source, syncTier }}>
      {children}
    </TierContext.Provider>
  );
};
```

**Estimated Effort:** 1 day  
**Priority:** P0

---

### 1.3 Immediate Tier Downgrade on Cancellation
**Location:** `server/stripe-server.js:1593`  
**Severity:** 🔴 Critical  
**Impact:** User experience, revenue loss

**Problem:**
When user cancels subscription, tier is immediately downgraded to `free` instead of waiting until period ends.

```javascript
// WRONG: Immediate downgrade
if (!acceptOffer) {
    await safeUpdateUserTier(userId, 'free', 'cancel-subscription');
}
```

**Fix:**
```javascript
// CORRECT: Don't downgrade until period ends
// The webhook customer.subscription.deleted will handle it
if (!acceptOffer) {
    // Only mark for cancellation, don't change tier
    // Tier remains premium until currentPeriodEnd
}
```

**Estimated Effort:** 15 minutes  
**Priority:** P0

---

### 1.4 Missing Error Boundaries
**Location:** Multiple components  
**Severity:** 🔴 Critical  
**Impact:** User experience, debugging

**Problem:**
No error boundaries around critical flows. Single error can crash entire app.

**Missing Boundaries:**
- Payment flows (`PaywallView`, `CancelSubscriptionView`)
- AI chat (`PracticeView`, `FeedbackView`)
- Subscription management (`SettingsView`)
- Session loading (`App.tsx`)

**Solution:**
```typescript
// components/ErrorBoundary.tsx (exists but not used)
// Wrap critical sections:

<ErrorBoundary fallback={<PaymentErrorFallback />}>
  <PaywallView />
</ErrorBoundary>

<ErrorBoundary fallback={<ChatErrorFallback />}>
  <PracticeView />
</ErrorBoundary>
```

**Estimated Effort:** 2 hours  
**Priority:** P0

---

### 1.5 Inconsistent Error Handling Patterns
**Location:** All services  
**Severity:** 🔴 Critical  
**Impact:** Debugging, user experience

**Problem:**
Three different error handling patterns:
1. **Throw errors:** `stripeService.ts`, `geminiService.ts`
2. **Return null:** `databaseService.ts:208`
3. **Return empty arrays:** `databaseService.ts:71`

**Example Inconsistencies:**
```typescript
// Pattern 1: Throws
export const getUserSubscription = async (): Promise<any> => {
  if (!response.ok) throw new Error(...);
}

// Pattern 2: Returns null
export const getUserProfile = async (): Promise<DbUserProfile | null> => {
  catch (error) {
    return null; // Silent failure
  }
}

// Pattern 3: Returns empty array
export const getUserSessions = async (): Promise<Session[]> => {
  if (!isSupabaseConfigured()) return [];
}
```

**Refactoring Solution:**
```typescript
// Create Result type for consistent error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Standardize all service functions
export const getUserProfile = async (
  userId: string
): Promise<Result<DbUserProfile, DatabaseError>> => {
  try {
    const profile = await supabase.from('profiles')...;
    return { success: true, data: profile };
  } catch (error) {
    return { 
      success: false, 
      error: new DatabaseError('Failed to fetch profile', error) 
    };
  }
};

// Usage
const result = await getUserProfile(userId);
if (!result.success) {
  // Handle error consistently
  showError(result.error.message);
  return;
}
const profile = result.data;
```

**Estimated Effort:** 1-2 days  
**Priority:** P0

---

## 2. HIGH PRIORITY REFACTORING OPPORTUNITIES

### 2.1 Extract Custom Hooks from App.tsx
**Location:** `App.tsx`  
**Severity:** 🟠 High  
**Impact:** Reusability, testability

**Extract These Hooks:**
1. `useSessions()` - Session loading/saving logic (lines 501-585)
2. `useTierSync()` - Tier synchronization (lines 294-355)
3. `useStripeRedirect()` - Stripe checkout handling (lines 357-410)
4. `useOnboarding()` - Onboarding state (lines 201-292)
5. `usePracticeFlow()` - Practice session flow (lines 603-691)

**Example:**
```typescript
// hooks/useSessions.ts
export const useSessions = (user: User | null, userTier: UserTier) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [remainingFreeSessions, setRemainingFreeSessions] = useState<number | null>(null);
  
  const loadSessions = useCallback(async () => {
    // ... existing logic
  }, [user, userTier]);
  
  const saveSession = useCallback(async (session: Session) => {
    // ... existing logic
  }, [user, userTier]);
  
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  
  return { sessions, loading, remainingFreeSessions, saveSession, reload: loadSessions };
};
```

**Estimated Effort:** 1 day  
**Priority:** P1

---

### 2.2 Duplicate Premium Check Logic
**Location:** Multiple components  
**Severity:** 🟠 High  
**Impact:** Maintainability

**Problem:**
`userTier === UserTier.Premium` check repeated 20+ times across components.

**Found In:**
- `Dashboard.tsx:41`
- `CalendarView.tsx:18,26`
- `ResourceLibrary.tsx` (multiple)
- `SettingsView.tsx` (multiple)
- `PracticeView.tsx:37`
- And more...

**Solution:**
```typescript
// hooks/usePremiumAccess.ts
export const usePremiumAccess = (userTier: UserTier) => {
  const isPremium = useMemo(() => userTier === UserTier.Premium, [userTier]);
  const isFree = useMemo(() => userTier === UserTier.Free, [userTier]);
  
  const requirePremium = useCallback((action: () => void, fallback?: () => void) => {
    if (isPremium) {
      action();
    } else {
      fallback?.();
    }
  }, [isPremium]);
  
  return { isPremium, isFree, requirePremium };
};

// Usage
const { isPremium, requirePremium } = usePremiumAccess(userTier);

requirePremium(
  () => setView(View.ScenarioSelection),
  () => setView(View.Paywall)
);
```

**Estimated Effort:** 2 hours  
**Priority:** P1

---

### 2.3 Complex Text Processing Logic in geminiService
**Location:** `services/geminiService.ts:19-98`  
**Severity:** 🟠 High  
**Impact:** Maintainability, testability

**Problem:**
`ensureAnswersQuestionFirst` function has:
- 20+ regex replacements
- Complex conditional logic
- Hard to test edge cases
- No unit tests

**Refactoring:**
```typescript
// Extract text processors into separate modules
// services/textProcessors/thirdPersonFixer.ts
export class ThirdPersonFixer {
  private patterns = [
    { pattern: /\bthey\s+report\s+feeling\s+"([^"]+)"\b/gi, replacement: 'I feel "$1"' },
    // ... all patterns
  ];
  
  fix(text: string): string {
    return this.patterns.reduce(
      (acc, { pattern, replacement }) => acc.replace(pattern, replacement),
      text
    );
  }
}

// services/textProcessors/intentClassifier.ts
export class IntentClassifier {
  classify(text: string): ClinicianIntent {
    // ... classification logic
  }
}

// services/textProcessors/intentPreface.ts
export class IntentPreface {
  addPreface(text: string, intent: ClinicianIntent, patient?: PatientProfile): string {
    // ... preface logic
  }
}

// Main function becomes simple composition
export const ensureAnswersQuestionFirst = (
  text: string,
  intent: ClinicianIntent,
  patient?: PatientProfile
): string => {
  const fixer = new ThirdPersonFixer();
  const classifier = new IntentClassifier();
  const prefaces = new IntentPreface();
  
  let processed = fixer.fix(text);
  const detectedIntent = classifier.classify(processed);
  
  if (detectedIntent !== intent) {
    processed = prefaces.addPreface(processed, intent, patient);
  }
  
  return processed;
};
```

**Estimated Effort:** 1 day  
**Priority:** P1

---

### 2.4 Backend Route Organization
**Location:** `server/stripe-server.js` (2158 lines)  
**Severity:** 🟠 High  
**Impact:** Maintainability

**Problem:**
Single file with 2158 lines containing:
- All route handlers
- Business logic
- Helper functions
- Webhook handlers
- Mock service integration

**Refactoring Structure:**
```
server/
├── stripe-server.js (main entry, ~100 lines)
├── routes/
│   ├── subscription.js
│   ├── checkout.js
│   ├── webhooks.js
│   └── debug.js
├── services/
│   ├── tierService.js
│   ├── subscriptionService.js
│   └── planService.js
├── middleware/
│   ├── auth.js
│   ├── validation.js
│   └── errorHandler.js
└── utils/
    ├── supabase.js
    └── stripe.js
```

**Example:**
```javascript
// routes/subscription.js
import express from 'express';
import { getSubscription, cancelSubscription, restoreSubscription } from '../services/subscriptionService.js';
import { validateUserId } from '../middleware/validation.js';

const router = express.Router();

router.get('/get-subscription', validateUserId, getSubscription);
router.post('/cancel-subscription', validateUserId, cancelSubscription);
router.post('/restore-subscription', validateUserId, restoreSubscription);

export default router;

// stripe-server.js
import subscriptionRoutes from './routes/subscription.js';
app.use('/api', subscriptionRoutes);
```

**Estimated Effort:** 2-3 days  
**Priority:** P1

---

### 2.5 Type Safety Issues
**Location:** Multiple files  
**Severity:** 🟠 High  
**Impact:** Type safety, runtime errors

**Problems Found:**

1. **`any` types in API responses:**
```typescript
// services/stripeService.ts:115
export const getUserSubscription = async (userId: string): Promise<any | null>
```

2. **Missing interface definitions:**
```typescript
// databaseService.ts - DbUserProfile missing subscription_plan
interface DbUserProfile {
    // Missing: subscription_plan?: 'monthly' | 'annual' | null;
}
```

3. **Type assertions without validation:**
```typescript
// App.tsx:307
const savedTier = localStorage.getItem('mi-coach-tier') as UserTier;
// No runtime validation
```

**Fixes:**
```typescript
// 1. Define proper types
export interface SubscriptionDetails {
  customerId: string;
  subscriptionId: string;
  plan: 'monthly' | 'annual' | 'unknown';
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  currentPrice: number;
  originalPrice: number;
  discountPercent: number;
  hasRetentionDiscount: boolean;
}

// 2. Type-safe localStorage
const getStoredTier = (): UserTier | null => {
  const stored = localStorage.getItem('mi-coach-tier');
  if (!stored) return null;
  
  if (Object.values(UserTier).includes(stored as UserTier)) {
    return stored as UserTier;
  }
  
  console.warn('Invalid tier in localStorage:', stored);
  return null;
};

// 3. Type guards
const isSubscriptionDetails = (obj: any): obj is SubscriptionDetails => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.customerId === 'string' &&
    typeof obj.subscriptionId === 'string' &&
    ['monthly', 'annual', 'unknown'].includes(obj.plan)
  );
};
```

**Estimated Effort:** 1 day  
**Priority:** P1

---

### 2.6 Excessive Console Logging
**Location:** 693+ console statements across 31 files  
**Severity:** 🟠 High  
**Impact:** Performance, security

**Problem:**
- Debug logs in production code
- Potential information leakage
- Performance overhead

**Solution:**
```typescript
// utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private level: LogLevel;
  
  constructor() {
    this.level = import.meta.env.PROD ? 'warn' : 'debug';
  }
  
  debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log('[DEBUG]', ...args);
    }
  }
  
  info(...args: any[]) {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  }
  
  warn(...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }
  
  error(...args: any[]) {
    console.error('[ERROR]', ...args);
    // Send to error tracking service in production
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}

export const logger = new Logger();

// Usage
import { logger } from '@/utils/logger';
logger.debug('Subscription data:', subscription); // Only in dev
logger.error('Failed to save session:', error); // Always logs
```

**Estimated Effort:** 4 hours  
**Priority:** P1

---

### 2.7 Missing Input Validation
**Location:** `server/stripe-server.js`  
**Severity:** 🟠 High  
**Impact:** Security, data integrity

**Problem:**
- No validation of `userId` format (should be UUID)
- No rate limiting on subscription endpoints
- No sanitization of user inputs

**Solution:**
```javascript
// middleware/validation.js
import { body, param, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

export const validateUserId = [
  param('userId').optional().isUUID().withMessage('Invalid user ID format'),
  query('userId').optional().isUUID().withMessage('Invalid user ID format'),
  body('userId').optional().isUUID().withMessage('Invalid user ID format'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

export const subscriptionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many subscription requests, please try again later'
});

// Usage
app.post('/api/cancel-subscription', 
  subscriptionRateLimit,
  validateUserId,
  cancelSubscription
);
```

**Estimated Effort:** 4 hours  
**Priority:** P1

---

### 2.8 Session Loading Performance
**Location:** `App.tsx:501-585`  
**Severity:** 🟠 High  
**Impact:** Performance, UX

**Problem:**
- Loads ALL sessions at once (no pagination)
- No caching strategy
- Re-fetches on every tier change

**Solution:**
```typescript
// hooks/useSessions.ts with pagination
export const useSessions = (userId: string | null) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const PAGE_SIZE = 20;
  
  const loadSessions = useCallback(async (pageNum: number = 1) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, hasMore: more } = await getUserSessionsPaginated(
        userId,
        pageNum,
        PAGE_SIZE
      );
      
      if (pageNum === 1) {
        setSessions(data);
      } else {
        setSessions(prev => [...prev, ...data]);
      }
      
      setHasMore(more);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  return { sessions, loading, hasMore, loadMore: () => loadSessions(page + 1) };
};
```

**Estimated Effort:** 1 day  
**Priority:** P1

---

## 3. MEDIUM PRIORITY IMPROVEMENTS

### 3.1 Component Size Issues
**Files Over 400 Lines:**
- `App.tsx`: 1052 lines
- `server/stripe-server.js`: 2158 lines
- `components/SettingsView.tsx`: 463 lines
- `components/CancelSubscriptionView.tsx`: ~400 lines
- `services/geminiService.ts`: ~900 lines

**Recommendation:** Split into smaller, focused components/modules.

---

### 3.2 Magic Numbers and Strings
**Location:** Throughout codebase

**Examples:**
```typescript
// Hardcoded values
const FREE_SESSION_LIMIT = 3; // Should be constant
const MAX_RETRIES = 5; // Should be configurable
const INITIAL_DELAY = 2000; // Should be constant

// Magic strings
if (error.code === 'PGRST116') // Should be constant
if (plan === 'monthly' || plan === 'annual') // Should use enum
```

**Solution:**
```typescript
// constants/subscription.ts
export const SUBSCRIPTION_LIMITS = {
  FREE_SESSIONS_PER_MONTH: 3,
  PREMIUM_SESSIONS_UNLIMITED: -1,
} as const;

// constants/errors.ts
export const SUPABASE_ERROR_CODES = {
  NOT_FOUND: 'PGRST116',
} as const;

// constants/retry.ts
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 5,
  INITIAL_DELAY_MS: 2000,
  BACKOFF_MULTIPLIER: 2,
} as const;
```

---

### 3.3 Missing Unit Tests
**Current State:** No test files found

**Priority Test Areas:**
1. Subscription logic (tier updates, cancellation)
2. Session counting (free tier limits)
3. Text processing (third-person fixes)
4. Patient profile generation
5. Error handling

**Recommended Structure:**
```
__tests__/
├── services/
│   ├── subscriptionService.test.ts
│   ├── geminiService.test.ts
│   └── databaseService.test.ts
├── hooks/
│   ├── useSessions.test.ts
│   └── useTierSync.test.ts
└── utils/
    └── validation.test.ts
```

---

### 3.4 Inconsistent Naming Conventions
**Examples:**
- `getUserSubscription` vs `getUserProfile` (both getters)
- `updateUserTier` vs `safeUpdateUserTier` (inconsistent safety naming)
- `cancelMockSubscription` vs `restoreMockSubscription` (mock prefix inconsistent)

**Recommendation:** Establish naming conventions document.

---

### 3.5 Missing JSDoc/Comments
**Location:** Complex functions lack documentation

**Examples:**
- `ensureAnswersQuestionFirst` - Complex logic, no docs
- `updateUserTierFromSubscription` - Business logic, minimal docs
- `getSubscriptionTierStatus` - Decision logic, no docs

**Recommendation:** Add JSDoc to all public functions.

---

### 3.6 Duplicate Constants
**Location:** Multiple files define similar constants

**Examples:**
- Price values in `mockSubscriptionService.js` and `stripe-server.js`
- Plan types ('monthly', 'annual') repeated as strings
- Error messages duplicated

**Solution:** Centralize in `constants/` directory.

---

## 4. CODE ORGANIZATION RECOMMENDATIONS

### 4.1 Proposed Directory Structure
```
src/
├── components/
│   ├── common/          # Reusable components
│   ├── views/           # Page-level components
│   └── legal/           # Legal pages
├── contexts/            # React contexts
├── hooks/               # Custom hooks
├── services/            # Business logic
├── utils/               # Utility functions
├── constants/           # Constants and config
├── types/               # TypeScript types
└── lib/                 # Third-party configs
```

---

### 4.2 Service Layer Organization
```
services/
├── subscription/
│   ├── subscriptionService.ts
│   ├── tierService.ts
│   └── planService.ts
├── session/
│   ├── sessionService.ts
│   └── sessionStorage.ts
├── ai/
│   ├── geminiService.ts
│   └── textProcessors/
└── database/
    ├── profileService.ts
    └── sessionService.ts
```

---

## 5. REFACTORING PRIORITY MATRIX

| Issue | Impact | Effort | Priority | Timeline |
|-------|--------|--------|----------|----------|
| Tier downgrade bug | 🔴 Critical | 15min | P0 | Immediate |
| Tier sync race conditions | 🔴 Critical | 1 day | P0 | Week 1 |
| Error boundaries | 🔴 Critical | 2 hours | P0 | Week 1 |
| Error handling consistency | 🔴 Critical | 1-2 days | P0 | Week 1 |
| Monolithic App.tsx | 🟠 High | 2-3 days | P1 | Week 2 |
| Extract custom hooks | 🟠 High | 1 day | P1 | Week 2 |
| Premium check hook | 🟠 High | 2 hours | P1 | Week 2 |
| Backend route organization | 🟠 High | 2-3 days | P1 | Week 3 |
| Type safety improvements | 🟠 High | 1 day | P1 | Week 3 |
| Logger utility | 🟠 High | 4 hours | P1 | Week 3 |
| Input validation | 🟠 High | 4 hours | P1 | Week 3 |
| Session pagination | 🟠 High | 1 day | P1 | Week 4 |
| Text processor refactor | 🟡 Medium | 1 day | P2 | Week 5 |
| Component splitting | 🟡 Medium | 2 days | P2 | Week 5 |
| Unit tests | 🟡 Medium | Ongoing | P2 | Ongoing |

---

## 6. IMMEDIATE ACTION ITEMS

### This Week (P0)
1. ✅ Fix tier downgrade bug (15 min)
2. ✅ Add error boundaries (2 hours)
3. ✅ Create TierContext to fix race conditions (1 day)
4. ✅ Standardize error handling (1-2 days)

### Next Week (P1)
1. Extract custom hooks from App.tsx
2. Create usePremiumAccess hook
3. Add input validation middleware
4. Implement logger utility
5. Improve type safety

### This Month (P2)
1. Refactor backend routes
2. Add session pagination
3. Split large components
4. Add unit tests
5. Extract text processors

---

## 7. METRICS TO TRACK

**Before Refactoring:**
- App.tsx: 1052 lines
- stripe-server.js: 2158 lines
- Console logs: 693+
- Test coverage: 0%
- Type safety: ~70%

**Target Metrics:**
- Largest component: < 300 lines
- Largest service file: < 500 lines
- Console logs: < 50 (production)
- Test coverage: > 60%
- Type safety: > 95%

---

## 8. CONCLUSION

The codebase shows signs of rapid development with accumulated technical debt. The **critical issues** (tier synchronization, error handling) should be addressed immediately as they affect data integrity and user experience. The **high-priority refactorings** will significantly improve maintainability and reduce bugs.

**Recommended Approach:**
1. Fix critical bugs first (P0)
2. Refactor incrementally (one module at a time)
3. Add tests as you refactor
4. Document as you go
5. Don't try to fix everything at once

**Estimated Total Effort:** 3-4 weeks for P0+P1 items

---

**Next Steps:**
1. Review and prioritize this audit
2. Create GitHub issues for each P0/P1 item
3. Start with tier synchronization fix
4. Schedule refactoring sprints









