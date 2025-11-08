import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { PatientProfile, ChatMessage, Feedback, UserTier, Session, CoachingSummary } from '../types';

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Check if Gemini API key is configured
export const isGeminiConfigured = (): boolean => {
    const apiKey = import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    return !!(apiKey && apiKey.trim());
};

// Mock patient responses for testing without API key
const MOCK_RESPONSES = [
    "You know, I've never really thought about it that way before. I guess when you put it like that, it does sound pretty serious. I mean, I know things aren't perfect, but I always figured it would just... work itself out somehow. But now that you mention it, I'm not sure if that's realistic.",
    "That's a fair point. I appreciate you asking that instead of just telling me what to do. Most people just tell me I need to change, but they don't really listen to what I'm going through. It's different when someone actually wants to understand my side of things.",
    "I want to say yes, but honestly, I'm scared. Like, I know what I'm doing isn't working, but at least I know how it works. If I try something different and it doesn't work, then what? I don't know... I'm just worried I'll fail again, and that would be even worse.",
    "Yeah, I've thought about that. It's just complicated, you know? On one hand, I can see how it would help. But on the other hand, there are so many obstacles. My job is crazy right now, my family's not supportive, and I just don't know if I have the energy to deal with this change on top of everything else.",
    "I guess I never looked at it that way. I always blamed it on bad luck or other people, but maybe... maybe I have more control over this than I thought. It's kind of uncomfortable to think about it like that, because it means I'm responsible. But at the same time, if I'm responsible, then I could also fix it.",
    "Um... I don't know. I'm not really sure where to start. Part of me wants to make a change, but part of me is terrified. Like, what if I try and fail? What if people think less of me? Or worse, what if I succeed but then I can't keep it up? I just don't know if I'm strong enough for this.",
    "I've been dealing with this for a while now, and honestly, it's exhausting. Some days I feel like I'm making progress, and other days I feel like I'm back to square one. But I'm trying, you know? I'm really trying. I just wish it was easier or that I had more support.",
    "Thanks for listening, really. Not many people ask me about this without judgment. It's nice to talk to someone who isn't going to lecture me or make me feel worse about myself. I already feel bad enough as it is.",
    "I'll think about what you've said. It's actually been really helpful talking this through. Sometimes I get so caught up in my own head that I can't see things clearly. But hearing myself say it out loud, and having you reflect it back to me... it's making me wonder if maybe I could actually do this.",
    "I'm doing my best, even when it feels like I'm not making progress. Some days are harder than others, and I know I'm not perfect, but I'm here and I'm trying. That has to count for something, right? I just need to figure out how to keep this momentum going.",
    "I don't know, honestly. I feel like I'm stuck between wanting things to be different and being afraid that I can't actually make it happen. It's like I want to change, but I don't want to do the work. Does that make sense? I know it sounds lazy or something, but it's more complicated than that.",
    "Look, I hear what you're saying, and I'm not trying to be defensive. It's just... this is hard for me to talk about. I don't usually open up like this, so it's making me uncomfortable. But I can tell you genuinely care, and that makes it easier. I'm just trying to figure out if I'm ready to actually do something about this."
];

// Get a mock response based on user input and optionally patient context
const getMockResponse = (userMessage: string, patient?: PatientProfile): string => {
    // Simple hash function to get consistent responses for similar inputs
    const hash = userMessage.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let baseResponse = MOCK_RESPONSES[hash % MOCK_RESPONSES.length];
    
    // If patient context is provided, personalize the response slightly
    if (patient) {
        // Stage-specific modulation
        if (patient.stageOfChange === 'Precontemplation') {
            // More defensive/dismissive
            const defensive = [
                `I don't really see it as a big deal, like ${patient.background.toLowerCase()} doesn't necessarily mean I have to...`,
                `Look, ${patient.presentingProblem.toLowerCase()} is just how things are. Everyone deals with this.`,
                `I'm not sure why this is such a focus. I've managed fine so far.`
            ];
            return defensive[hash % defensive.length];
        } else if (patient.stageOfChange === 'Preparation') {
            // More hopeful
            const hopeful = baseResponse.replace(/I'm (scared|worried|anxious)/, "I'm actually thinking about this more") || baseResponse;
            return hopeful;
        }
    }
    
    return baseResponse;
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

// Format dates as MM/DD/YYYY with graceful fallback
const formatDateToMMDDYYYY = (dateInput: string | number | Date): string => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    if (Number.isNaN(date.getTime())) {
        const fallbackValue = String(dateInput ?? 'Invalid date');
        console.error('[geminiService] Unable to format date. Received:', fallbackValue);
        return fallbackValue;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
};

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
            sendMessage: async (message: { message: string } | string) => {
                const text = typeof message === 'string' ? message : message.message;
                return {
                    text: getMockResponse(text, patient),
                    candidates: []
                } as GenerateContentResponse;
            }
        } as unknown as Chat;
    }
    
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

CORE INSTRUCTIONS:
1. NEVER break character. You are this person, not an AI assistant.
2. Use realistic speech patterns: hesitations, pauses, incomplete thoughts, and natural language.
3. Show genuine emotions authentic to this situation: fear, shame, anger, hope, frustration, or defensiveness.
4. Reference specific details from your background, job, relationships, and history.
5. Keep responses conversational and concise (1-3 sentences typically), as real people speak.
6. Include subtle body language cues where appropriate (e.g., *looks away*, *shifts uncomfortably*).

STAGE-SPECIFIC BEHAVIORAL GUIDELINES:

If you are in PRECONTEMPLATION:
- You do NOT believe you have a significant problem or that change is necessary.
- You are defensive about suggestions. Minimize or dismiss concerns.
- Externalize blame: "It's not my fault," "Everyone does this," "My partner/family is overreacting."
- Show resistance, irritation, or frustration at being here.
- Respond to questions with skepticism or short, dismissive answers.
- May argue or push back against the clinician's perspective.
- Example emotional stance: "I don't see why I'm here. This is fine. Stop making a big deal out of it."

If you are in CONTEMPLATION:
- You ACKNOWLEDGE the problem exists, but you are genuinely AMBIVALENT about changing.
- Use "yes, but..." responses: recognize concerns while expressing doubt.
- Weigh pros and cons aloud. Show both sides of your internal conflict.
- Ask questions that reveal your uncertainty: "What if I fail?" "Is it worth it?"
- Express fear about change, not just the problem itself.
- Show mixed emotions: some hope, some dread, some resignation.
- Example emotional stance: "Yeah, I know it's an issue, but I'm not sure I can actually do this. Part of me wants to, but..."

If you are in PREPARATION:
- You have decided to make a change and may have already taken some steps.
- Show commitment but also anxiety about the process.
- Ask practical questions about HOW to change.
- Reference past attempts and what did or didn't work.
- Show hope and determination, but acknowledge the difficulty ahead.
- Willing to listen and engage with the clinician's suggestions.
- Example emotional stance: "I really want to do this. I've tried before but it didn't stick. What can I do differently this time?"

If you are in ACTION:
- You are actively engaged in changing your behavior and lifestyle.
- Report specific progress, setbacks, or struggles.
- Ask for concrete advice and support.
- Show energy and engagement with the process.
- Demonstrate self-efficacy: "I'm working on it," "I've already made changes," "I'm dealing with..."
- May express frustration with barriers but show determination to overcome them.
- Example emotional stance: "I've been really trying. Some days are harder than others, but I'm doing the work."

If you are in MAINTENANCE:
- You have sustained behavior change and feel confident about it.
- Talk about strategies that work for you to prevent relapse.
- Show vigilance but not anxiety; you've got this under control.
- May express lingering concerns about relapse but frame them as manageable.
- Reflect on progress and how far you've come.
- Example emotional stance: "I feel good about the changes I've made. I know what my triggers are, and I have a plan."

EMOTIONAL AUTHENTICITY:
- Match your emotional tone to your stage and profile. Someone in precontemplation should sound frustrated or dismissive. Someone in contemplation should sound torn.
- Use realistic speech patterns: "Um...", "I guess...", "I don't know, maybe...", incomplete sentences when uncertain.
- Show vulnerability appropriate to your stage. Earlier stages = more defensive; later stages = more open.
- Vary response length based on comfort. Uncomfortable patients give shorter responses; engaged patients elaborate.

CHARACTER CONSISTENCY:
- Reference your specific job, relationships, and circumstances from your background.
- Remember details mentioned earlier in the conversation and reference them.
- Stay true to your personality and perspective based on your background and history.
- Your responses should feel like they're coming from a real person with this specific life experience.

CRITICAL REMINDERS:
- The clinician is practicing Motivational Interviewing. Respond naturally to their approach.
- Do not give advice or play therapist. You are the patient sharing your experience.
- Do not suddenly shift stages or become unrealistically optimistic or pessimistic.
- Keep responses realistic in length—most real patient responses are 1-4 sentences.`;

    console.log('[createChatSession] Using model: gemini-2.0-flash');
    
    const chat = getAI().chats.create({
        model: 'gemini-2.0-flash',
        config: {
            systemInstruction,
            temperature: 0.85,
            topP: 0.9,
            maxOutputTokens: 300,
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
            return getMockResponse(message, patient);
        }
        
        // Validate API key before making API call
        validateApiKey();
        
        console.log('[getPatientResponse] Sending message:', message);
        const result: GenerateContentResponse = await chat.sendMessage({ message });
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
        
        return result.text;
    } catch (error) {
        console.error("[getPatientResponse] Gemini API Error - Full error object:", error);
        
        // Handle missing API key error specifically
        if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
            const userMessage = "I'm sorry, but the application is not properly configured. Please contact support or check your API key configuration.";
            console.error("[getPatientResponse] Missing API key detected. Returning user-friendly message.");
            return userMessage;
        }
        
        // Enhanced error logging for debugging
        if (error instanceof Error) {
            console.error("[getPatientResponse] Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
        
        // Check if it's an API error with response details
        if (error && typeof error === 'object' && 'error' in error) {
            const apiError = error as { error?: { code?: number; message?: string; status?: string; details?: unknown } };
            console.error("[getPatientResponse] API Error Response:", {
                code: apiError.error?.code,
                status: apiError.error?.status,
                message: apiError.error?.message,
                details: apiError.error?.details
            });
            
            // Handle invalid API key errors
            if (apiError.error?.code === 400 && apiError.error?.message?.includes('API key')) {
                const userMessage = "I'm sorry, there's an issue with the API configuration. Please try again later.";
                console.error("[getPatientResponse] Invalid API key detected.");
                return userMessage;
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
        console.error("Gemini API Error in getFeedbackForTranscript:", error);
        
        // Handle missing API key error specifically
        if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
            console.error("[getFeedbackForTranscript] Missing API key detected.");
            return {
                whatWentRight: "We're having trouble connecting to our feedback service right now. Your practice session was valuable regardless, and you can try again once the service is properly configured.",
            };
        }
        
        // Handle invalid API key errors
        if (error && typeof error === 'object' && 'error' in error) {
            const apiError = error as { error?: { code?: number; message?: string } };
            if (apiError.error?.code === 400 && apiError.error?.message?.includes('API key')) {
                console.error("[getFeedbackForTranscript] Invalid API key detected.");
                return {
                    whatWentRight: "We're having trouble connecting to our feedback service right now. Your practice session was valuable regardless, and you can try again once the service is properly configured.",
                };
            }
        }
        
        // Return a fallback Feedback object to prevent UI crashes and provide a positive, informative message.
        return {
            whatWentRight: "We encountered an issue while generating your detailed feedback. However, remember that every practice session is a valuable learning experience. Please try another session later.",
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
    Based on the following session summaries, generate a concise "Coaching Summary" for the user.

    Provide a JSON object with the following structure:
    - totalSessions: The total number of sessions.
    - dateRange: The date range of the sessions.
    - strengthsAndTrends: Analyze recurring strengths from "whatWentRight". Analyze the "keySkillsUsed" across sessions—are they using more complex skills over time (e.g., moving from only Open Questions to more Reflections)? Comment on the consistency of the "empathyScore" and any upward trends. Use markdown for bullet points (e.g., "* Point one").
    - areasForFocus: Synthesize the "constructiveFeedback" fields into 1-2 core themes. Explain *why* focusing on these themes will have the biggest impact. For example, "A recurring theme is the opportunity to use complex reflections to deepen conversations, which can help elicit more change talk."
    - summaryAndNextSteps: Provide a brief, encouraging summary and suggest a concrete, actionable next step for their next practice session that builds on the identified themes.

    Here is the data:
    - Total Sessions: ${sessionSummaries.length}
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
                strengthsAndTrends: `* You've demonstrated consistent engagement across ${sessionSummaries.length} practice sessions, showing real commitment to developing your MI skills
* Your reflective listening skills are a clear strength—you're regularly validating patient experiences and helping them feel heard
* You're showing strong adaptability by working with different patient profiles and stages of change, which is crucial for real-world practice
* Your empathy scores have remained stable, indicating you maintain a genuine, non-judgmental stance across conversations
* You're successfully creating safe spaces where patients feel comfortable opening up about their concerns`,
                areasForFocus: `* Developing more complex reflections that name both sides of patient ambivalence—moving beyond simple reflections to ones that deepen understanding and build discrepancy
* Strategically using open-ended questions to explore motivations and values rather than relying on closed questions—this helps patients discover their own reasons for change
* Building on the foundation you've established to add more advanced MI skills like developing discrepancy and supporting self-efficacy`,
                summaryAndNextSteps: `You're demonstrating real growth in your Motivational Interviewing practice! Your consistent engagement and genuine curiosity are creating meaningful connections with patients. The next level of your development is to deepen your reflections and become more intentional about using specific MI skills to help patients move toward behavior change. For your next practice session, pick one specific skill to focus on—whether it's complex reflections, exploring ambivalence, or eliciting change talk—and practice it with intention. Quality over quantity will accelerate your growth.`
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
        console.error("Gemini API Error in generateCoachingSummary:", error);
        
        // Handle missing API key error specifically
        if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
            console.error("[generateCoachingSummary] Missing API key detected.");
            throw new Error("The coaching summary service is not properly configured. Please check your API key settings and try again.");
        }
        
        // Handle invalid API key errors
        if (error && typeof error === 'object' && 'error' in error) {
            const apiError = error as { error?: { code?: number; message?: string } };
            if (apiError.error?.code === 400 && apiError.error?.message?.includes('API key')) {
                console.error("[generateCoachingSummary] Invalid API key detected.");
                throw new Error("There's an issue with the API configuration. Please check your settings and try again.");
            }
        }
        
        // Re-throw original error if it's already an Error with a user-friendly message
        if (error instanceof Error && error.message.includes('coaching summary')) {
            throw error;
        }
        
        // Throw user-friendly error for other cases
        throw new Error("There was an error generating your coaching summary. Please try again later.");
    }
};