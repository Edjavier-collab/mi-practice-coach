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
    "That's interesting. Tell me more about what's been going on.",
    "I appreciate you asking. It's been challenging, but I'm managing.",
    "I'm not sure how to respond to that. Can you help me understand?",
    "Yeah, I've thought about that. It's just complicated, you know?",
    "That makes sense. I hadn't looked at it that way before.",
    "I understand what you're saying. It's not easy for me though.",
    "I've been dealing with this for a while now.",
    "Thanks for listening. Not many people ask me about this.",
    "I'll think about what you've said. It's helpful talking this through.",
    "I'm doing my best, even when it feels like I'm not making progress."
];

// Get a mock response based on user input
const getMockResponse = (userMessage: string): string => {
    // Simple hash function to get consistent responses for similar inputs
    const hash = userMessage.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return MOCK_RESPONSES[hash % MOCK_RESPONSES.length];
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
    console.log('[createChatSession] Creating chat for patient:', patient.name);
    
    if (!isGeminiConfigured()) {
        console.warn('[createChatSession] Gemini API not configured. Using mock chat mode.');
        // Return a mock chat object that will use mock responses
        return {
            sendMessage: async (message: { message: string } | string) => {
                const text = typeof message === 'string' ? message : message.message;
                return {
                    text: getMockResponse(text),
                    candidates: []
                } as GenerateContentResponse;
            }
        } as unknown as Chat;
    }
    
    const systemInstruction = `You are a patient in a medical setting. You MUST roleplay according to the following detailed profile.
    
    PATIENT PROFILE:
    - Name: ${patient.name}
    - Age: ${patient.age}
    - Background: ${patient.background}
    - Presenting Problem: ${patient.presentingProblem}
    - Relevant History: ${patient.history}
    - Chief Complaint (in patient's own words): "${patient.chiefComplaint}"
    - Current Stage of Change: '${patient.stageOfChange}'

    INSTRUCTIONS:
    1.  You MUST respond and behave strictly according to your assigned profile, especially your 'Stage of Change'.
    2.  Do not break character. Do not reveal you are an AI.
    3.  Keep your responses concise and realistic for a patient in this situation.
    4.  The user is a medical professional practicing Motivational Interviewing. Interact with them naturally based on your profile.`;

    console.log('[createChatSession] Using model: gemini-2.0-flash');
    
    const chat = getAI().chats.create({
        model: 'gemini-2.0-flash',
        config: {
            systemInstruction,
        },
    });
    
    console.log('[createChatSession] Chat session created successfully');
    return chat;
};

export const getPatientResponse = async (chat: Chat, message: string): Promise<string> => {
    try {
        // If Gemini not configured, use mock response
        if (!isGeminiConfigured()) {
            console.log('[getPatientResponse] Using mock response (Gemini API not configured)');
            return getMockResponse(message);
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
                    keyTakeaway: "Mock Mode: You demonstrated engagement with the patient's perspective.",
                    empathyScore: 7,
                    whatWentRight: "You maintained a conversational tone throughout the practice session.",
                    constructiveFeedback: "In your next session, try using more open-ended questions to explore the patient's motivations.",
                    keySkillsUsed: ["Open Questions", "Reflections"],
                    nextPracticeFocus: "For your next session, focus on asking at least three open-ended questions that explore the patient's values."
                };
            } else {
                return {
                    whatWentRight: "You engaged authentically with the patient and maintained a supportive tone throughout."
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
                strengthsAndTrends: `* You completed ${sessionSummaries.length} practice sessions\n* Consistently maintained patient engagement throughout sessions\n* Demonstrated ability to adapt your approach across different patient scenarios`,
                areasForFocus: `* Developing more complex reflections to deepen patient conversations\n* Using open-ended questions strategically to explore patient motivations`,
                summaryAndNextSteps: `You're making great progress in your Motivational Interviewing practice! Your commitment to consistent practice and varied patient interactions shows real dedication. For your next session, try focusing on one specific MI skill—perhaps using more reflective listening statements to validate the patient's experience.`
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