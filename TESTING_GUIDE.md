# AI Patient Response Testing Guide

## Overview
This guide helps you validate that the improved AI patient responses are working correctly across different stages of change and patient profiles.

## Setup
1. Ensure your `.env.local` file has a valid `GEMINI_API_KEY`
2. Run `npm run dev` to start the application
3. Navigate to the practice section

## Testing by Stage of Change

### 1. PRECONTEMPLATION Testing
**Objective**: Patient should be dismissive, defensive, and minimize the problem.

**Suggested Test Scenarios**:
- Choose a "Precontemplation" difficulty level or select a precontemplation patient
- Examples to find: Binge Drinking patient, Methamphetamine Use patient, Excessive Online Gaming patient
- Try clinician responses like:
  - "Tell me about your drinking patterns"
  - "How do you think this is affecting your relationships?"
  - "What brings you in today?"

**Expected Behaviors**:
- ✓ Patient minimizes the issue ("It's not that bad")
- ✓ Patient externalizes blame ("My family is overreacting")
- ✓ Patient shows defensiveness or irritation
- ✓ Patient uses short, skeptical responses
- ✓ Patient may argue or push back
- ✗ Patient should NOT suddenly acknowledge the problem is serious
- ✗ Patient should NOT be overly optimistic about change

**Example Good Response**: *looks away* "Look, I don't think it's as big a deal as everyone's making it. Yeah, I drink, but so does everyone else in my office. It's fine."

---

### 2. CONTEMPLATION Testing
**Objective**: Patient should show genuine ambivalence with "yes, but" responses.

**Suggested Test Scenarios**:
- Choose "Intermediate" difficulty or select a contemplation patient
- Examples to find: Daily Wine Consumption patient, Daily Cannabis Smoking patient, Sedentary Lifestyle patient
- Try clinician responses like:
  - "What concerns you most about your situation?"
  - "What would need to happen for you to consider making a change?"
  - "How do you feel about your current habits?"

**Expected Behaviors**:
- ✓ Patient acknowledges the problem exists
- ✓ Patient shows doubt about ability to change ("I'm not sure I can do this")
- ✓ Patient uses "yes, but" language
- ✓ Patient weighs pros and cons aloud
- ✓ Patient asks questions showing uncertainty
- ✓ Patient shows mixed emotions (hope + dread)
- ✗ Patient should NOT be purely negative
- ✗ Patient should NOT commit fully to change
- ✗ Patient should NOT dismiss the problem

**Example Good Response**: "Yeah, I know the wine thing is getting out of hand, and I wake up exhausted... but I don't know if I can function without it at the end of the day. What if I try and fail? That would feel worse than where I am now."

---

### 3. PREPARATION Testing
**Objective**: Patient should show commitment, ask practical questions, reference past attempts.

**Suggested Test Scenarios**:
- Choose "Beginner" difficulty or select a preparation patient
- Examples to find: Cigarette Smoking patient (new parent), Daily Wine Consumption patient (if in prep stage)
- Try clinician responses like:
  - "What have you tried before?"
  - "What would help you be successful?"
  - "What's your first step going to be?"

**Expected Behaviors**:
- ✓ Patient shows commitment to change
- ✓ Patient asks practical "how to" questions
- ✓ Patient references past attempts
- ✓ Patient shows hope and determination
- ✓ Patient engages with clinician's suggestions
- ✗ Patient should NOT be uncertain anymore
- ✗ Patient should NOT minimize the problem
- ✗ Patient should NOT ask whether change is necessary

**Example Good Response**: "I really want to do this for my baby. I've tried quitting before and made it two weeks before I caved during a stressful shift. What's different this time? How can I actually stick with it?"

---

### 4. ACTION Testing
**Objective**: Patient should report specific progress, struggles, and actively problem-solve.

**Suggested Test Scenarios**:
- Find patients already in action stage (fewer in the template set, but can occur)
- Or simulate by discussing current active efforts
- Try clinician responses like:
  - "How are you doing with the changes you've started?"
  - "What's been hardest so far?"
  - "Tell me about your progress"

**Expected Behaviors**:
- ✓ Patient reports specific efforts ("I've already...")
- ✓ Patient discusses real setbacks or progress
- ✓ Patient seeks concrete advice
- ✓ Patient shows energy and engagement
- ✓ Patient demonstrates self-efficacy
- ✗ Patient should NOT doubt the need for change
- ✗ Patient should NOT give up easily
- ✗ Patient should NOT be fully pessimistic

**Example Good Response**: "Yeah, I've been doing it. Had a rough day yesterday where I almost gave in, but I called my support buddy instead. Still on track, but I'm struggling with the evenings when I'm bored."

---

### 5. MAINTENANCE Testing
**Objective**: Patient should show confidence, discuss prevention strategies, reflect on progress.

**Suggested Test Scenarios**:
- Rare in initial templates, but can be selected or inferred
- Try clinician responses like:
  - "How are you staying committed to your changes?"
  - "What helps you maintain your progress?"
  - "How far do you feel you've come?"

**Expected Behaviors**:
- ✓ Patient shows confidence about maintaining change
- ✓ Patient discusses specific strategies that work
- ✓ Patient reflects on progress made
- ✓ Patient shows vigilance about relapse risk
- ✗ Patient should NOT seem anxious about maintaining change
- ✗ Patient should NOT question whether change was necessary
- ✗ Patient should NOT express hopelessness

**Example Good Response**: "I feel really good about where I am now. I know my triggers, and I have a plan for when I'm stressed. The cravings don't hit me like they used to."

---

## Cross-Test Observations

### Character Consistency Check
For each patient, verify:
- ✓ They reference their job/background details naturally
- ✓ They use language consistent with their age and background
- ✓ They remember details from earlier in the conversation
- ✓ They don't suddenly become someone else

**Example Test**:
1. Start with a clinician question about work stress
2. Later, reference something they mentioned about their job
3. Patient should acknowledge it naturally: "Yeah, like I was saying about my coworkers..."

### Emotional Authenticity Check
For each interaction, verify:
- ✓ Responses include realistic speech patterns (hesitations, uncertainty markers)
- ✓ Emotional tone matches their stage
- ✓ Subtle body language cues are present occasionally (e.g., *shifts uncomfortably*)
- ✓ Response length varies based on comfort level

### Avoiding Problematic Patterns
Watch for these issues that would indicate the improvement didn't work:
- ✗ Generic, repetitive responses
- ✗ Sudden mood/stage shifts without reason
- ✗ Overly long responses (patient should be brief)
- ✗ Breaking character (mentioning being an AI, giving clinical advice)
- ✗ Not matching stage of change behaviors

---

## Testing Workflow

### Quick 5-Minute Test
1. Choose a random patient
2. Send 3-5 clinician messages
3. Evaluate if responses feel realistic and stage-appropriate
4. Repeat with a different stage patient

### Comprehensive 15-Minute Test
1. Start with a Precontemplation patient
2. Have a full conversation (10+ exchanges)
3. Move to a Contemplation patient, then Preparation
4. Note consistency and progression across stages

### Debug Mode
If you encounter issues:
1. Check browser console for error messages
2. Verify API key is set correctly
3. Check response logs in the browser dev tools
4. Note which patient profile/stage shows the problem

---

## Validation Checklist

- [ ] Precontemplation patients are noticeably defensive
- [ ] Contemplation patients show genuine "yes, but" ambivalence
- [ ] Preparation patients ask practical questions about change
- [ ] Action patients report concrete progress/struggles
- [ ] Maintenance patients show confidence and strategy-based responses
- [ ] All patients reference specific details from their profile
- [ ] Responses include realistic speech patterns and hesitations
- [ ] Body language cues appear occasionally and naturally
- [ ] No patient breaks character
- [ ] Responses vary in length based on comfort/stage
- [ ] Emotional tone matches stage and situation

---

## Known Limitations

- Patients may occasionally miss subtle nuances in very long clinician responses
- Complex multi-part clinician questions work best when kept to 1-2 parts
- Some stages have fewer template examples, so you may see more variation with prep/action/maintenance

## Feedback

If you notice patterns that don't match expectations, document:
- Patient profile / stage of change
- Clinician message
- Actual patient response
- Expected behavior per the guidelines

This helps identify if further refinement is needed.

