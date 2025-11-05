import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { PatientProfile, ChatMessage, Feedback, UserTier, Session, CoachingSummary } from '../types';

// Get API key from environment variables
const getApiKey = (): string => {
    const apiKey = import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set. Please set it in your .env.local file.');
        throw new Error('GEMINI_API_KEY is required. Please set it in your .env.local file.');
    }
    return apiKey;
};

// Lazy initialization of GoogleGenAI
let aiInstance: GoogleGenAI | null = null;
const getAI = (): GoogleGenAI => {
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey: getApiKey() });
    }
    return aiInstance;
};

export const createChatSession = (patient: PatientProfile): Chat => {
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

    const chat = getAI().chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
        },
    });
    return chat;
};

export const getPatientResponse = async (chat: Chat, message: string): Promise<string> => {
    try {
        const result: GenerateContentResponse = await chat.sendMessage({ message });
        return result.text;
    } catch (error) {
        console.error("Gemini API Error in getPatientResponse:", error);
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
        const response: GenerateContentResponse = await getAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: isPremium ? premiumFeedbackSchema : freeFeedbackSchema,
            },
        });
        
        const feedbackJson = JSON.parse(response.text);

        return feedbackJson as Feedback;

    } catch (error) {
        console.error("Gemini API Error in getFeedbackForTranscript:", error);
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
        date: new Date(session.date).toLocaleDateString(),
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

    const firstSessionDate = sessionSummaries[0].date;
    const lastSessionDate = sessionSummaries[sessionSummaries.length - 1].date;

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
        const response: GenerateContentResponse = await getAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: coachingSummarySchema,
            },
        });

        const summaryJson = JSON.parse(response.text);
        return summaryJson as CoachingSummary;

    } catch (error) {
        console.error("Gemini API Error in generateCoachingSummary:", error);
        throw new Error("There was an error generating your coaching summary. Please try again later.");
    }
};