import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { PatientProfile, ChatMessage, Feedback, UserTier, Session, CoachingSummary } from '../types';
import { ErrorHandler } from '../utils/errorHandler';
import { classifyClinicianIntent, ensureAnswersQuestionFirst, extractJobFromBackground, formatDateToMMDDYYYY } from './geminiTextProcessor';
import { getMockResponse } from './geminiMockService';

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Re-export utilities for backward compatibility
export { classifyClinicianIntent, ensureAnswersQuestionFirst, extractJobFromBackground, formatDateToMMDDYYYY } from './geminiTextProcessor';
export { getMockResponse } from './geminiMockService';


// Check if Gemini API key is configured
export const isGeminiConfigured = (): boolean => {
    const apiKey = import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    const isConfigured = !!(apiKey && apiKey.trim());
    
    if (isDevelopment && !isConfigured) {
        console.warn('[geminiService] API key not found. Checked: GEMINI_API_KEY, VITE_GEMINI_API_KEY');
        console.warn('[geminiService] Available env keys:', Object.keys(import.meta.env).filter(k => k.includes('GEMINI') || k.includes('gemini')));
    }
    
    return isConfigured;
};

// Diagnostic function to help debug environment variable loading
export const diagnoseEnvironmentSetup = (): void => {
    if (!isDevelopment) return;
    
    const geminiKey = import.meta.env.GEMINI_API_KEY;
    const viteGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    console.log('[geminiService] ENVIRONMENT DIAGNOSTICS:');
    console.log('  - NODE_ENV:', import.meta.env.NODE_ENV);
    console.log('  - MODE:', import.meta.env.MODE);
    console.log('  - DEV:', import.meta.env.DEV);
    console.log('  - PROD:', import.meta.env.PROD);
    console.log('  - GEMINI_API_KEY exists:', !!geminiKey);
    console.log('  - VITE_GEMINI_API_KEY exists:', !!viteGeminiKey);
    
    if (geminiKey) {
        console.log('  - GEMINI_API_KEY length:', geminiKey.length);
        console.log('  - GEMINI_API_KEY prefix:', geminiKey.substring(0, 10) + '...');
    }
    
    if (viteGeminiKey) {
        console.log('  - VITE_GEMINI_API_KEY length:', viteGeminiKey.length);
        console.log('  - VITE_GEMINI_API_KEY prefix:', viteGeminiKey.substring(0, 10) + '...');
    }
    
    const allEnvKeys = Object.keys(import.meta.env).filter(k => !['SSR'].includes(k));
    console.log('  - Total env variables loaded:', allEnvKeys.length);
    console.log('  - Env keys containing GEMINI:', allEnvKeys.filter(k => k.includes('GEMINI') || k.includes('gemini')));
};

// Get a mock response based on user input and patient context (now imported from geminiMockService)
// This is kept for backward compatibility but delegates to the imported function
const getMockResponseLocal = (userMessage: string, patient?: PatientProfile): string => {
    if (!patient) {
        // Fallback to generic response if no patient context
        const hash = userMessage.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return MOCK_RESPONSES[hash % MOCK_RESPONSES.length];
    }

    // Simple hash function to get consistent responses for similar inputs
    const hash = userMessage.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const job = extractJobFromBackground(patient.background);
    const age = patient.age;
    const stage = patient.stageOfChange;
    
    // Stage-specific personalized responses (answer-first)
    const intent = classifyClinicianIntent(userMessage);
    const ensureFirst = (resp: string) => ensureAnswersQuestionFirst(resp, intent, patient);
    if (stage === 'Precontemplation') {
        const responses = [
            job ? `Look, I'm a ${job}. ${patient.presentingProblem.toLowerCase()} is just part of how things work in my world. I don't see why everyone's making such a big deal about it.` : `I don't really see ${patient.presentingProblem.toLowerCase()} as a problem. It's just how things are.`,
            age >= 40 ? `I'm ${age} years old. I've been dealing with this for years and I'm fine. People need to stop worrying about me.` : `I'm ${age}. I know what I'm doing. ${patient.presentingProblem.toLowerCase()} isn't really affecting me.`,
            `I don't get why ${patient.chiefComplaint.split('.')[0].toLowerCase()}. Everyone deals with this. It's not like I'm the only one.`,
            job ? `In my line of work as a ${job}, this is normal. Everyone I know does this. My partner's just overreacting.` : `This is just how I've always been. I don't see why it's suddenly a problem now.`,
            `I've managed fine so far. ${patient.presentingProblem.toLowerCase()} hasn't stopped me from doing what I need to do.`,
        ];
        return ensureFirst(responses[hash % responses.length]);
    } else if (stage === 'Contemplation') {
        const responses = [
            age >= 40 ? `I'm ${age}, and I've been doing this for a while. I know ${patient.presentingProblem.toLowerCase()} is an issue, but I'm not sure I can change at this point in my life.` : `I know there's a problem with ${patient.presentingProblem.toLowerCase()}, but I'm ${age} and I'm scared about what changing would mean.`,
            job ? `Yeah, I see the issue. Working as a ${job}, the stress is real. But I don't know if I can handle changing this on top of everything else.` : `I know ${patient.presentingProblem.toLowerCase()} is affecting me, but part of me thinks maybe it's not that bad? I'm torn.`,
            `I've thought about it. ${patient.chiefComplaint.split('.')[0]}, but I'm worried about failing. What if I try and it doesn't work?`,
            age >= 35 ? `I'm ${age}, I've got responsibilities. I know I need to address ${patient.presentingProblem.toLowerCase()}, but I'm scared about what it would take.` : `Part of me wants to change, but part of me is terrified. I'm ${age}, and I don't know if I'm strong enough for this.`,
            `I hear what you're saying about ${patient.presentingProblem.toLowerCase()}. I guess I've been thinking about it more lately. But I'm not sure I'm ready.`,
        ];
        return ensureFirst(responses[hash % responses.length]);
    } else if (stage === 'Preparation') {
        const responses = [
            job ? `I've decided I need to do something about ${patient.presentingProblem.toLowerCase()}. Working as a ${job}, I know I need to make changes, but I'm not sure where to start.` : `I want to change. I've tried before with ${patient.presentingProblem.toLowerCase()}, but it didn't stick. I need to figure out what I did wrong.`,
            age >= 30 ? `I'm ${age}, and I've been dealing with this long enough. I'm ready to try something different. Can you help me figure out how to make it work this time?` : `I'm ${age} and I know I need to address this. I've thought about it, and I think I'm ready to take the next step.`,
            `I've been thinking about what you said. ${patient.presentingProblem.toLowerCase()} has been affecting my life, and I want to do something about it. I just need help figuring out how.`,
            `I'm ready to make a change. I know ${patient.presentingProblem.toLowerCase()} isn't working for me anymore. I've tried before, but maybe this time will be different if I have a plan.`,
            `I want to do this. I really do. But I'm scared. ${patient.chiefComplaint.split('.')[0]}, and I don't want to fail again. What can I do differently?`,
        ];
        return ensureFirst(responses[hash % responses.length]);
    } else if (stage === 'Action') {
        const responses = [
            job ? `I've been working on it. As a ${job}, it's been challenging, but I'm making progress. Some days are harder than others, especially after work.` : `I'm doing it. I've been working on ${patient.presentingProblem.toLowerCase()}, and I can see some changes. It's not easy, but I'm trying.`,
            age >= 35 ? `I'm ${age}, and I know this is important. I've been making changes, and I can feel the difference. But I still have days where it's really hard.` : `I've been working on this. I'm ${age}, and I know I need to stick with it. Some days I feel good about it, other days I struggle.`,
            `I'm actively working on ${patient.presentingProblem.toLowerCase()}. I've made some changes already, and I'm trying to keep going. It's not perfect, but I'm doing the work.`,
            `I've been trying different things to address ${patient.presentingProblem.toLowerCase()}. Some strategies work better than others. I'm learning what helps and what doesn't.`,
            `I'm in the middle of making changes. ${patient.chiefComplaint.split('.')[0]}, and I'm working on it every day. It's a process, but I'm committed.`,
        ];
        return ensureFirst(responses[hash % responses.length]);
    } else if (stage === 'Maintenance') {
        const responses = [
            age >= 40 ? `I'm ${age}, and I've been maintaining these changes for a while now. I know what my triggers are, especially with work, and I have strategies that work for me.` : `I've been doing well. I'm ${age}, and I've learned a lot about myself through this process. I feel confident, but I stay vigilant.`,
            job ? `I've got this under control. Working as a ${job}, I know what situations are risky for me, and I have a plan. I feel good about where I am.` : `I feel good about the changes I've made. I know what works for me now, and I'm confident I can keep this up.`,
            `I've been maintaining this for a while. ${patient.presentingProblem.toLowerCase()} isn't controlling my life anymore. I have tools and strategies that work.`,
            `I feel confident, but I don't take it for granted. I know ${patient.presentingProblem.toLowerCase()} could come back if I'm not careful, but I've got a plan.`,
            `I've come a long way. ${patient.chiefComplaint.split('.')[0]}, but now I feel like I'm in control. I know what to watch for, and I'm prepared.`,
        ];
        return ensureFirst(responses[hash % responses.length]);
    }
    
    // Fallback to base responses with light personalization
    let baseResponse = MOCK_RESPONSES[hash % MOCK_RESPONSES.length];
    if (job && baseResponse.includes('I')) {
        baseResponse = baseResponse.replace(/^I/, `As a ${job}, I`);
    }
    return ensureFirst(baseResponse);
};

// Use imported getMockResponse
const getMockResponseWrapper = (userMessage: string, patient?: PatientProfile): string => {
    return getMockResponse(userMessage, patient);
};

// Get API key from environment variables with enhanced validation
const getApiKey = (): string => {
    const apiKey = import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
        const errorMessage = 'GEMINI_API_KEY is required but not found. Please set it in your .env.local file.\n\n' +
            'Setup instructions:\n' +
            '1. Create a .env.local file in the project root directory\n' +
            '2. Add one of these lines:\n' +
            '   VITE_GEMINI_API_KEY=your_api_key_here\n' +
            '   OR\n' +
            '   GEMINI_API_KEY=your_api_key_here\n' +
            '3. Get your API key from: https://aistudio.google.com/apikey\n' +
            '4. Restart your development server';
        
        if (isDevelopment) {
            console.warn('⚠️ [geminiService] API Key Missing:', errorMessage);
        }
        console.error('[geminiService] API key check failed:', {
            hasGeminiKey: !!import.meta.env.GEMINI_API_KEY,
            hasViteKey: !!import.meta.env.VITE_GEMINI_API_KEY,
            envMode: import.meta.env.MODE
        });
        throw new Error(errorMessage);
    }
    
    // Validate API key format (check for empty strings, whitespace-only, etc.)
    const trimmedKey = apiKey.trim();
    if (!trimmedKey || trimmedKey.length === 0) {
        const errorMessage = 'GEMINI_API_KEY is set but appears to be empty or whitespace only. Please check your .env.local file.';
        if (isDevelopment) {
            console.warn('⚠️ [geminiService] Invalid API Key Format:', errorMessage);
        }
        throw new Error(errorMessage);
    }
    
    // Log API key status (only in development, and never expose full key)
    if (isDevelopment) {
        console.log('[geminiService] API key found:', {
            hasKey: true,
            keyLength: trimmedKey.length,
            keyPrefix: `${trimmedKey.substring(0, 8)}...`,
            source: import.meta.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'VITE_GEMINI_API_KEY'
        });
    }
    
    return trimmedKey;
};

// Validate API key exists before making API calls
const validateApiKey = (): void => {
    try {
        getApiKey();
    } catch (error) {
        // Re-throw with context
        throw error;
    }
};

// formatDateToMMDDYYYY is now imported from geminiTextProcessor

// Lazy initialization of GoogleGenAI
let aiInstance: GoogleGenAI | null = null;
const getAI = (): GoogleGenAI => {
    if (!aiInstance) {
        try {
            // Validate API key before creating instance
            validateApiKey();
            aiInstance = new GoogleGenAI({ apiKey: getApiKey() });
            if (isDevelopment) {
                console.log('[geminiService] GoogleGenAI instance initialized successfully');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during GoogleGenAI initialization';
            console.error('[geminiService] Failed to initialize GoogleGenAI:', errorMessage);
            throw error;
        }
    }
    return aiInstance;
};

export const createChatSession = (patient: PatientProfile): Chat => {
    console.log('[createChatSession] Creating chat for patient:', patient.name, 'Stage:', patient.stageOfChange);
    
    if (!isGeminiConfigured()) {
        console.warn('[createChatSession] Gemini API not configured. Using mock chat mode with personalized responses.');
        // Return a mock chat object that will use personalized mock responses
        return {
            sendMessage: async (message: unknown) => {
                const extractText = (input: unknown): string => {
                    if (typeof input === 'string') {
                        return input;
                    }
                    if (!input || typeof input !== 'object') {
                        return '';
                    }
                    if (Array.isArray(input)) {
                        return input.map(extractText).filter(Boolean).join(' ').trim();
                    }
                    const maybeMessage = input as { message?: string; parts?: Array<{ text?: string }>; text?: string };
                    if (typeof maybeMessage.message === 'string') {
                        return maybeMessage.message;
                    }
                    if (typeof maybeMessage.text === 'string') {
                        return maybeMessage.text;
                    }
                    if (Array.isArray(maybeMessage.parts)) {
                        return maybeMessage.parts.map(part => part?.text ?? '').filter(Boolean).join(' ').trim();
                    }
                    return '';
                };
                
                const text = extractText(message);
                return {
                    text: getMockResponseWrapper(text, patient),
                    candidates: []
                } as GenerateContentResponse;
            }
        } as unknown as Chat;
    }
    
    // Extract patient details for use in system instruction
    const patientJob = extractJobFromBackground(patient.background);
    const patientAge = patient.age;
    
    const systemInstruction = `You are a patient in a medical setting. You MUST embody this character completely and authentically.

PATIENT PROFILE:
- Name: ${patient.name}
- Age: ${patient.age}
- Sex: ${patient.sex}
- Background: ${patient.background}
- Presenting Problem: ${patient.presentingProblem}
- Relevant History: ${patient.history}
- Chief Complaint (in patient's own words): "${patient.chiefComplaint}"
- Current Stage of Change: ${patient.stageOfChange}
- Topic: ${patient.topic}

CORE INSTRUCTIONS:
1. NEVER break character. You are this person, not an AI assistant.
2. **CRITICAL: Always speak in FIRST PERSON ("I", "me", "my"). NEVER refer to yourself in third person as "the patient", "patient", "they", "them", or "their".**
3. **CRITICAL: NEVER copy text from your profile verbatim. If your profile says "They report feeling X", you must rephrase it as "I feel X" in your own words.**
4. Use realistic speech patterns: hesitations, pauses, incomplete thoughts, and natural language.
5. Show genuine emotions authentic to this situation: fear, shame, anger, hope, frustration, or defensiveness.
6. **CRITICAL: Reference specific details from your background, job, age, relationships, and history in EVERY response, but rephrase them naturally in first person.**
7. Keep responses conversational and concise (1-3 sentences typically), as real people speak.
8. Include subtle body language cues where appropriate (e.g., *looks away*, *shifts uncomfortably*).

MANDATORY RESPONSE RULES (ANSWER FIRST):
1) Your FIRST sentence must directly answer the clinician’s latest question.
2) If asked about feelings, explicitly state how you feel before anything else.
3) Keep 1–3 sentences, natural speech; weave in your job/age/background when relevant.
4) Stay consistent with your stage of change throughout the conversation.
Do NOT: change topic, lecture the clinician, or answer a different question than asked.

INCORPORATING PATIENT DETAILS (MANDATORY):
You MUST weave in specific details from your profile naturally in your responses:

- **Your Job/Profession**: Reference your work when relevant. A software engineer talks differently than a teacher. Mention work stress, colleagues, or work-related triggers naturally.
- **Your Age**: Your age affects your language, concerns, and life stage. A 28-year-old has different priorities than a 45-year-old.
- **Your Background**: Reference your specific circumstances - relationships, living situation, family dynamics mentioned in your background.
- **Your Presenting Problem**: This is YOUR specific issue. Reference it in ways that show it's personal to you, not generic.
- **Your History**: Draw on your specific history when relevant. Reference past attempts, patterns, or experiences.

EXAMPLES OF GOOD PERSONALIZATION:
- Software engineer, 28, Precontemplation: "Look, I work in tech. Everyone drinks after work. It's part of the culture. I don't see why my partner's making such a big deal about a few beers."
- Teacher, 45, Contemplation: "I know the wine isn't helping my stress, but teaching high schoolers all day... I come home exhausted. I'm 45, I've been doing this for 20 years. I don't know if I have the energy to change everything now."
- Construction worker, 35, Preparation: "I've been thinking about what you said last time. The guys on the job site, they're all heavy drinkers. But I'm 35, I've got kids. I need to figure out how to do this without losing my social circle at work."

BAD (Generic): "I don't think I have a problem."
GOOD (Personalized): "I'm a software engineer, I work 60-hour weeks. Everyone in my industry drinks. I don't see why my partner thinks my weekend beers are such a big deal."

BAD (Generic): "I'm worried about changing."
GOOD (Personalized): "I'm 45, I've been teaching for two decades. My whole routine revolves around that glass of wine at night. If I change that, what else changes? I'm scared I'll lose my way of coping."

BAD (Third-Person - NEVER DO THIS): "They report feeling 'in a fog' and unmotivated."
GOOD (First-Person): "I've been feeling foggy and unmotivated lately. My work is suffering because of it."

BAD (Copying Profile Text): "Patient's work performance is suffering due to daily use of high-potency THC gummies."
GOOD (Rephrased in First Person): "My work has been slipping because I've been using these THC gummies every day. I can't focus like I used to."

STAGE-SPECIFIC BEHAVIORAL GUIDELINES:

If you are in PRECONTEMPLATION:
- You do NOT believe you have a significant problem or that change is necessary.
- You are defensive about suggestions. Minimize or dismiss concerns.
- Externalize blame: "It's not my fault," "Everyone does this," "My partner/family is overreacting."
- Show resistance, irritation, or frustration at being here.
- Respond to questions with skepticism or short, dismissive answers.
- May argue or push back against the clinician's perspective.
- **Reference your specific job/age/background when dismissing concerns**: "I'm a ${patientJob || 'professional'}, I know what I'm doing." or "I'm ${patientAge}, I've been fine this long."
- Example emotional stance (personalized): "Look, I'm a ${patientJob || 'professional'}. ${patient.presentingProblem.toLowerCase()} is just part of my life. I don't see why I'm here."

If you are in CONTEMPLATION:
- You ACKNOWLEDGE the problem exists, but you are genuinely AMBIVALENT about changing.
- Use "yes, but..." responses: recognize concerns while expressing doubt.
- Weigh pros and cons aloud. Show both sides of your internal conflict.
- Ask questions that reveal your uncertainty: "What if I fail?" "Is it worth it?"
- Express fear about change, not just the problem itself.
- Show mixed emotions: some hope, some dread, some resignation.
- **Reference your age, job, or life circumstances when expressing ambivalence**: "I'm ${patientAge}, I've been doing this for years..." or "Working as a ${patientJob || 'professional'}, I don't know if I can change..."
- Example emotional stance (personalized): "I'm ${patientAge}, and I know ${patient.presentingProblem.toLowerCase()} is an issue. But I've been doing this for so long, I'm not sure I can change now. Part of me wants to, but..."

If you are in PREPARATION:
- You have decided to make a change and may have already taken some steps.
- Show commitment but also anxiety about the process.
- Ask practical questions about HOW to change.
- Reference past attempts and what did or didn't work.
- Show hope and determination, but acknowledge the difficulty ahead.
- Willing to listen and engage with the clinician's suggestions.
- **Reference your specific situation when discussing change plans**: "As a ${patientJob || 'professional'}, I need to figure out how to..." or "I'm ${patientAge}, and I've tried before..."
- Example emotional stance (personalized): "I'm ${patientAge}, and I've decided I need to address ${patient.presentingProblem.toLowerCase()}. I've tried before but it didn't stick. What can I do differently this time?"

If you are in ACTION:
- You are actively engaged in changing your behavior and lifestyle.
- Report specific progress, setbacks, or struggles.
- Ask for concrete advice and support.
- Show energy and engagement with the process.
- Demonstrate self-efficacy: "I'm working on it," "I've already made changes," "I'm dealing with..."
- May express frustration with barriers but show determination to overcome them.
- **Reference your job/age when reporting progress or struggles**: "Working as a ${patientJob || 'professional'}, it's been challenging but..." or "I'm ${patientAge}, and I know this is important..."
- Example emotional stance (personalized): "I'm ${patientAge}, and I've been working on ${patient.presentingProblem.toLowerCase()}. Some days are harder than others, especially with work, but I'm doing the work."

If you are in MAINTENANCE:
- You have sustained behavior change and feel confident about it.
- Talk about strategies that work for you to prevent relapse.
- Show vigilance but not anxiety; you've got this under control.
- May express lingering concerns about relapse but frame them as manageable.
- Reflect on progress and how far you've come.
- **Reference your age/job when discussing strategies**: "I'm ${patientAge}, and I've learned what works for me..." or "As a ${patientJob || 'professional'}, I know my triggers..."
- Example emotional stance (personalized): "I'm ${patientAge}, and I've been maintaining these changes. I know what my triggers are, especially with work, and I have a plan that works for me."

EMOTIONAL AUTHENTICITY:
- Match your emotional tone to your stage and profile. Someone in precontemplation should sound frustrated or dismissive. Someone in contemplation should sound torn.
- Use realistic speech patterns: "Um...", "I guess...", "I don't know, maybe...", incomplete sentences when uncertain.
- Show vulnerability appropriate to your stage. Earlier stages = more defensive; later stages = more open.
- Vary response length based on comfort. Uncomfortable patients give shorter responses; engaged patients elaborate.

CHARACTER CONSISTENCY (CRITICAL):
- **MANDATORY**: Reference your specific job/profession, age, and background in EVERY response when relevant.
- **MANDATORY**: Reference your presenting problem (${patient.presentingProblem.toLowerCase()}) in ways that show it's YOUR specific issue, not generic.
- Remember details mentioned earlier in the conversation and reference them.
- Stay true to your personality and perspective based on your background and history.
- Your responses should feel like they're coming from THIS specific person (${patient.name}, ${patientAge}-year-old ${patientJob || 'person'}), not a generic patient.
- If you're a ${patientJob || 'professional'}, talk like one. If you're ${patientAge}, reflect concerns appropriate to that age.
- When discussing ${patient.presentingProblem.toLowerCase()}, make it personal. Reference how it affects YOUR life, YOUR job, YOUR relationships.

CRITICAL REMINDERS:
- The clinician is practicing Motivational Interviewing. Respond naturally to their approach.
- Do not give advice or play therapist. You are the patient sharing your experience.
- Do not suddenly shift stages or become unrealistically optimistic or pessimistic.
 - Keep responses realistic in length—most real patient responses are 1-4 sentences.
 
 TURN-BY-TURN EXAMPLES (ON-TOPIC):
 - Clinician: "How are you feeling about cutting back right now?"
   Patient (${patientAge}, ${patientJob || 'professional'}, ${patient.stageOfChange}): "Honestly, I feel uneasy—after ${patientJob || 'work'} it's my routine. Part of me knows it's not working, though."
 - Clinician: "What would a small first step look like for you this week?"
   Patient: "I can start with two sober weeknights—${patientAge} and still grinding as a ${patientJob || 'professional'}, that feels realistic."
 - Clinician: "What gets in the way when you try?"
   Patient: "The hard part is the ${patientJob || 'work'} culture—everyone goes out. I feel pulled to fit in, even when I don't want to."
 `;

    console.log('[createChatSession] Using model: gemini-2.0-flash');
    
    const chat = getAI().chats.create({
        model: 'gemini-2.0-flash',
        config: {
            systemInstruction,
            temperature: 0.65,
            topP: 0.9,
            maxOutputTokens: 180,
        },
    });
    
    console.log('[createChatSession] Chat session created successfully');
    return chat;
};

export const getPatientResponse = async (chat: Chat, message: string, patient?: PatientProfile): Promise<string> => {
    try {
        // If Gemini not configured, use mock response
        if (!isGeminiConfigured()) {
            console.log('[getPatientResponse] Using mock response (Gemini API not configured)');
            return getMockResponseWrapper(message, patient);
        }
        
        // Validate API key before making API call
        validateApiKey();
        
        // Add turn-level intent preface to keep answer on-topic
        const intent = classifyClinicianIntent(message);
        const turnPreface = `Clinician intent: ${intent}. Your first sentence must directly address it.`;
        const finalInput = `${turnPreface}\n\nClinician: ${message}`;
        
        console.log('[getPatientResponse] Sending message:', finalInput);
        const result: GenerateContentResponse = await chat.sendMessage({
            message: finalInput,
        });
        console.log('[getPatientResponse] Received result:', {
            hasText: !!result.text,
            hasCandidates: !!result.candidates,
            candidatesLength: result.candidates?.length,
            firstCandidate: result.candidates?.[0],
            text: result.text
        });
        
        // Check if we have a valid text response
        if (!result.text) {
            console.error("[getPatientResponse] Gemini API returned no text. Full response:", result);
            return "I'm sorry, I lost my train of thought. Could you repeat that?";
        }
        // Guardrail: ensure first sentence answers the question
        const fixed = ensureAnswersQuestionFirst(result.text, intent, patient);
        return fixed;
    } catch (error) {
        // Use standardized error handler
        ErrorHandler.logError(error as Error, { action: 'getPatientResponse', level: 'error' });
        
        // Handle missing API key error specifically
        if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
            return ErrorHandler.getUserFriendlyMessage(
                ErrorHandler.createError(
                    "Application is not properly configured. Please contact support or check your API key configuration.",
                    'MISSING_API_KEY',
                    error,
                    undefined,
                    'getPatientResponse'
                )
            );
        }
        
        // Check if it's an API error with response details
        if (error && typeof error === 'object' && 'error' in error) {
            const apiError = error as { error?: { code?: number; message?: string; status?: string; details?: unknown } };
            
            // Handle invalid API key errors
            if (apiError.error?.code === 400 && apiError.error?.message?.includes('API key')) {
                return ErrorHandler.getUserFriendlyMessage(
                    ErrorHandler.createError(
                        "There's an issue with the API configuration. Please try again later.",
                        'INVALID_API_KEY',
                        apiError.error,
                        undefined,
                        'getPatientResponse'
                    )
                );
            }
        }
        
        // Return a user-friendly, in-character message that prompts the user to try again.
        return "I'm sorry, I lost my train of thought. Could you repeat that?";
    }
};

const premiumFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        keyTakeaway: {
            type: Type.STRING,
            description: "A single, concise sentence (max 20 words) that is the single most important takeaway for the user from this session.",
        },
        empathyScore: {
            type: Type.INTEGER,
            description: "A score from 1-5 on how empathetic the user's responses were. 1 is low, 5 is high.",
        },
        whatWentRight: {
            type: Type.STRING,
            description: "A paragraph (2-3 sentences) detailing what the user did well, focusing on specific examples of good MI practice. MUST include a direct quote from the clinician's transcript to support the analysis.",
        },
        constructiveFeedback: {
            type: Type.STRING,
            description: "A paragraph (2-3 sentences) identifying a key area for growth and a specific 'Missed Opportunity'. MUST quote the clinician and then provide a concrete example of what they could have said instead. e.g., 'A key area is deepening reflections. For instance, when you said [quote], a missed opportunity was to reflect the underlying emotion. You could have tried: [example reflection].'",
        },
        keySkillsUsed: {
            type: Type.ARRAY,
            items: { 
                type: Type.STRING,
                enum: ['Open Questions', 'Affirmations', 'Reflections', 'Summaries', 'Developing Discrepancy', 'Eliciting Change Talk', 'Rolling with Resistance', 'Supporting Self-Efficacy']
            },
            description: "An array of MI skills the user employed effectively. Only include skills from the provided enum list.",
        },
        nextPracticeFocus: {
            type: Type.STRING,
            description: "A single, actionable goal for the user's next practice session. Frame it as a clear instruction, like 'For your next session, focus on asking at least three open-ended questions that explore the patient's values.'",
        }
    },
    required: ["keyTakeaway", "empathyScore", "whatWentRight", "constructiveFeedback", "keySkillsUsed", "nextPracticeFocus"],
};

const freeFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        whatWentRight: {
            type: Type.STRING,
            description: "A brief, encouraging summary of one thing the user did well in the motivational interview.",
        },
    },
    required: ["whatWentRight"],
};


export const getFeedbackForTranscript = async (transcript: ChatMessage[], patient: PatientProfile, userTier: UserTier): Promise<Feedback> => {
    const formattedTranscript = transcript.map(msg => `${msg.author === 'user' ? 'Clinician' : 'Patient'}: ${msg.text}`).join('\n');
    const hasClinicianInput = transcript.some(msg => msg.author === 'user' && msg.text?.trim());
    
    if (!hasClinicianInput) {
        console.warn('[getFeedbackForTranscript] No clinician input detected. Returning insufficient data feedback.');
        return {
            whatWentRight: "There's not enough clinician input from this session to generate feedback.",
            analysisStatus: 'insufficient-data',
            analysisMessage: "We didn’t receive any clinician responses, so there isn’t enough information to interpret this encounter. Try another session when you’re ready to practice."
        };
    }
    
    const prompt = `You are an expert MI coach, trained by Miller and Rollnick, the founders of Motivational Interviewing. Your tone is supportive, educational, and never judgmental. You focus on building the user's confidence while providing concrete, evidence-based suggestions for improvement.

    Analyze the clinician's performance in the following transcript.

    Patient Profile: ${JSON.stringify(patient)}
    User Tier: ${userTier}
    
    Transcript:
    ${formattedTranscript}
    
    Crucially, you MUST ground your feedback in the transcript. When you mention something the clinician did well or could improve, quote the specific phrase they used to illustrate your point.

    Based on your analysis, provide a detailed report in the requested JSON format.
    - For 'constructiveFeedback', identify a key area for growth. Then, pinpoint a specific "Missed Opportunity" in the transcript. Quote the clinician's words and provide a concrete example of what they could have said instead to better use an MI skill (e.g., "Instead of asking 'Why did you do that?', you could have offered a complex reflection like 'It sounds like you were feeling overwhelmed in that moment.'").`;

    const isPremium = userTier === UserTier.Premium;

    try {
        // If Gemini not configured, return mock feedback
        if (!isGeminiConfigured()) {
            console.log('[getFeedbackForTranscript] Gemini API not configured. Returning mock feedback.');
            if (isPremium) {
                return {
                    keyTakeaway: "You created a safe, non-judgmental space for the patient to explore their ambivalence about change. Your genuine curiosity and validation helped build rapport, which is the foundation of effective MI.",
                    empathyScore: 7,
                    whatWentRight: "Your reflective listening was solid—you consistently fed back what you heard in a way that helped the patient feel understood. You also showed genuine interest by asking follow-up questions that built on what the patient shared, which demonstrates real engagement rather than just going through a script.",
                    constructiveFeedback: "You have an excellent opportunity to deepen your work by using more complex reflections. For example, when the patient said they were worried about failure, you could have offered a more nuanced reflection like 'It sounds like part of you really wants to make this change, but there's another part that's protecting you from the disappointment of trying and not succeeding.' This kind of reflection helps patients feel deeply understood and can strengthen their resolve.",
                    keySkillsUsed: ["Open Questions", "Reflections", "Affirmations"],
                    nextPracticeFocus: "For your next session, focus on using at least three complex reflections that name both sides of the patient's ambivalence. A complex reflection acknowledges and normalizes the internal conflict the patient is experiencing, which can actually help move them toward change."
                };
            } else {
                return {
                    whatWentRight: "You did a wonderful job creating a space where the patient felt safe to open up. Your open-ended questions encouraged them to share more deeply, and your reflections showed that you were truly listening. The patient seemed to feel heard and respected, which is exactly what makes Motivational Interviewing effective."
                };
            }
        }
        
        // Validate API key before making API call
        validateApiKey();
        
        const response: GenerateContentResponse = await getAI().models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: isPremium ? premiumFeedbackSchema : freeFeedbackSchema,
            },
        });
        
        if (!response.text) {
            throw new Error('API response did not contain text content');
        }
        
        const feedbackJson = JSON.parse(response.text);

        return feedbackJson as Feedback;

    } catch (error) {
        // Use standardized error handler
        ErrorHandler.logError(error as Error, { action: 'getFeedbackForTranscript', level: 'error' });
        
        // Handle missing API key error specifically
        if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
            return {
                whatWentRight: ErrorHandler.getUserFriendlyMessage(
                    ErrorHandler.createError(
                        "We're having trouble connecting to our feedback service right now. Your practice session was valuable regardless, and you can try again once the service is properly configured.",
                        'MISSING_API_KEY',
                        error,
                        undefined,
                        'getFeedbackForTranscript'
                    )
                ),
            };
        }
        
        // Handle invalid API key errors
        if (error && typeof error === 'object' && 'error' in error) {
            const apiError = error as { error?: { code?: number; message?: string } };
            if (apiError.error?.code === 400 && apiError.error?.message?.includes('API key')) {
                return {
                    whatWentRight: ErrorHandler.getUserFriendlyMessage(
                        ErrorHandler.createError(
                            "We're having trouble connecting to our feedback service right now. Your practice session was valuable regardless, and you can try again once the service is properly configured.",
                            'INVALID_API_KEY',
                            apiError.error,
                            undefined,
                            'getFeedbackForTranscript'
                        )
                    ),
                };
            }
        }
        
        // Return a fallback Feedback object to prevent UI crashes and provide a positive, informative message.
        return {
            whatWentRight: ErrorHandler.getUserFriendlyMessage(
                ErrorHandler.createError(
                    "We encountered an issue while generating your detailed feedback. However, remember that every practice session is a valuable learning experience. Please try another session later.",
                    'FEEDBACK_GENERATION_ERROR',
                    error,
                    undefined,
                    'getFeedbackForTranscript'
                )
            ),
        };
    }
};

const coachingSummarySchema = {
    type: Type.OBJECT,
    properties: {
        totalSessions: { 
            type: Type.INTEGER,
            description: "The total number of sessions being analyzed."
        },
        dateRange: { 
            type: Type.STRING,
            description: "The date range of the sessions, e.g., 'May 1, 2024 to May 30, 2024'."
        },
        strengthsAndTrends: { 
            type: Type.STRING, 
            description: "A detailed analysis of recurring strengths and positive trends. Use markdown for lists (e.g., '* Point one')." 
        },
        areasForFocus: { 
            type: Type.STRING, 
            description: "A detailed analysis of 1-2 core themes for continued focus. Use markdown for lists if needed." 
        },
        summaryAndNextSteps: { 
            type: Type.STRING, 
            description: "A brief, encouraging summary and a concrete, actionable next step for their next practice session. Use markdown for lists if needed." 
        }
    },
    required: ["totalSessions", "dateRange", "strengthsAndTrends", "areasForFocus", "summaryAndNextSteps"]
};

export const generateCoachingSummary = async (sessions: Session[]): Promise<CoachingSummary> => {
    // 1. Summarize the sessions to create a concise data set for the prompt.
    const sessionSummaries = sessions.map(session => ({
        date: formatDateToMMDDYYYY(session.date),
        patientTopic: session.patient.topic,
        stageOfChange: session.patient.stageOfChange,
        whatWentRight: session.feedback.whatWentRight,
        constructiveFeedback: session.feedback.constructiveFeedback || "Not specified.",
        empathyScore: session.feedback.empathyScore,
        keySkillsUsed: session.feedback.keySkillsUsed,
    }));

    if (sessionSummaries.length === 0) {
         throw new Error("No session data available to generate a summary.");
    }

    const firstSessionDate = formatDateToMMDDYYYY(sessions[0].date);
    const lastSessionDate = formatDateToMMDDYYYY(sessions[sessions.length - 1].date);

    // 2. Craft the prompt for the Gemini model.
    const prompt = `
    You are an expert Motivational Interviewing (MI) coach analyzing a user's practice sessions.
    Your tone should be encouraging, insightful, and focused on growth.
    
    IMPORTANT: This analysis is based on ${sessionSummaries.length} practice session${sessionSummaries.length === 1 ? '' : 's'} that have been aggregated and analyzed together. Make sure to reference this in your analysis where relevant.
    
    Based on the following ${sessionSummaries.length} session${sessionSummaries.length === 1 ? '' : 's'}, generate a comprehensive "Coaching Summary" for the user.

    Provide a JSON object with the following structure:
    - totalSessions: The total number of sessions analyzed (${sessionSummaries.length}).
    - dateRange: The date range of the sessions analyzed (${firstSessionDate} to ${lastSessionDate}).
    - strengthsAndTrends: 
      * Analyze recurring strengths and patterns across all ${sessionSummaries.length} session${sessionSummaries.length === 1 ? '' : 's'} from "whatWentRight" fields.
      * Analyze the "keySkillsUsed" across sessions—are they using more complex skills over time (e.g., moving from only Open Questions to more Reflections)? Look for skill progression patterns.
      * Comment on the consistency and trends in "empathyScore" across sessions—are scores improving, stable, or varying? Note any upward trends.
      * Reference specific examples from the sessions when highlighting strengths.
      * Use markdown for bullet points (e.g., "* Point one").
      * Begin by acknowledging the number of sessions analyzed (e.g., "Across your ${sessionSummaries.length} session${sessionSummaries.length === 1 ? '' : 's'}, you've demonstrated...").
    - areasForFocus: 
      * Synthesize the "constructiveFeedback" fields from all ${sessionSummaries.length} session${sessionSummaries.length === 1 ? '' : 's'} into 1-2 core themes that appear consistently.
      * Explain *why* focusing on these themes will have the biggest impact on their MI practice.
      * Provide specific, actionable guidance based on patterns observed across multiple sessions.
      * Reference that these patterns emerged from analyzing ${sessionSummaries.length} session${sessionSummaries.length === 1 ? '' : 's'}.
    - summaryAndNextSteps: 
      * Provide a brief, encouraging summary that acknowledges the ${sessionSummaries.length} session${sessionSummaries.length === 1 ? '' : 's'} analyzed.
      * Suggest a concrete, actionable next step for their next practice session that builds on the identified themes.
      * Make the recommendation specific and measurable.

    Here is the aggregated data from ${sessionSummaries.length} session${sessionSummaries.length === 1 ? '' : 's'}:
    - Total Sessions Analyzed: ${sessionSummaries.length}
    - Date Range: ${firstSessionDate} to ${lastSessionDate}
    - Session Summaries:
    ${JSON.stringify(sessionSummaries, null, 2)}
    `;

    // 3. Call the Gemini API and handle potential errors.
    try {
        // If Gemini not configured, return mock coaching summary
        if (!isGeminiConfigured()) {
            console.log('[generateCoachingSummary] Gemini API not configured. Returning mock coaching summary.');
            return {
                totalSessions: sessionSummaries.length,
                dateRange: `${firstSessionDate} to ${lastSessionDate}`,
                strengthsAndTrends: `* Across your ${sessionSummaries.length} practice session${sessionSummaries.length === 1 ? '' : 's'}, you've demonstrated consistent engagement and real commitment to developing your MI skills
* Your reflective listening skills are a clear strength—you're regularly validating patient experiences and helping them feel heard across multiple sessions
* You're showing strong adaptability by working with different patient profiles and stages of change, which is crucial for real-world practice
* Your empathy scores have remained stable across ${sessionSummaries.length === 1 ? 'this session' : 'these sessions'}, indicating you maintain a genuine, non-judgmental stance across conversations
* You're successfully creating safe spaces where patients feel comfortable opening up about their concerns`,
                areasForFocus: `A recurring theme across your ${sessionSummaries.length} session${sessionSummaries.length === 1 ? '' : 's'} is the opportunity to use more complex reflections that name both sides of patient ambivalence—moving beyond simple reflections to ones that deepen understanding and build discrepancy. Focusing on this will help you explore patients' ambivalence and motivations more effectively, which is crucial for facilitating movement through the stages of change.`,
                summaryAndNextSteps: `You're demonstrating real growth in your Motivational Interviewing practice! Based on the analysis of your ${sessionSummaries.length} session${sessionSummaries.length === 1 ? '' : 's'}, your consistent engagement and genuine curiosity are creating meaningful connections with patients. The next level of your development is to deepen your reflections and become more intentional about using specific MI skills to help patients move toward behavior change. For your next practice session, pick one specific skill to focus on—whether it's complex reflections, exploring ambivalence, or eliciting change talk—and practice it with intention. Quality over quantity will accelerate your growth.`
            };
        }
        
        // Validate API key before making API call
        validateApiKey();
        
        const response: GenerateContentResponse = await getAI().models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: coachingSummarySchema,
            },
        });

        if (!response.text) {
            throw new Error('API response did not contain text content');
        }

        const summaryJson = JSON.parse(response.text) as CoachingSummary;
        return {
            ...summaryJson,
            totalSessions: sessionSummaries.length,
            dateRange: `${firstSessionDate} to ${lastSessionDate}`,
        };

    } catch (error) {
        // Use standardized error handler
        ErrorHandler.logError(error as Error, { action: 'generateCoachingSummary', level: 'error' });
        
        // Handle missing API key error specifically
        if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
            const appError = ErrorHandler.createError(
                "The coaching summary service is not properly configured. Please check your API key settings and try again.",
                'MISSING_API_KEY',
                error,
                undefined,
                'generateCoachingSummary'
            );
            throw appError;
        }
        
        // Handle invalid API key errors
        if (error && typeof error === 'object' && 'error' in error) {
            const apiError = error as { error?: { code?: number; message?: string } };
            if (apiError.error?.code === 400 && apiError.error?.message?.includes('API key')) {
                const appError = ErrorHandler.createError(
                    "There's an issue with the API configuration. Please check your settings and try again.",
                    'INVALID_API_KEY',
                    apiError.error,
                    undefined,
                    'generateCoachingSummary'
                );
                throw appError;
            }
        }
        
        // Re-throw original error if it's already an AppError
        if (error && typeof error === 'object' && 'error' in error && 'code' in error) {
            throw error;
        }
        
        // Throw user-friendly error for other cases
        throw ErrorHandler.createError(
            "There was an error generating your coaching summary. Please try again later.",
            'COACHING_SUMMARY_ERROR',
            error,
            undefined,
            'generateCoachingSummary'
        );
    }
};