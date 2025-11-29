import { PatientProfile } from '../types';

/**
 * Infer clinician intent from their last utterance to keep replies on-topic
 */
export type ClinicianIntent = 'emotion' | 'info' | 'plan' | 'barrier' | 'reflect';

/**
 * Classify the intent of a clinician's message
 */
export const classifyClinicianIntent = (text: string): ClinicianIntent => {
    const t = (text || '').toLowerCase();
    if (/(feel|feeling|emotion|how.*you.*doing|how.*you.*feel)/.test(t)) return 'emotion';
    if (/(plan|next step|goal|what.*will.*you.*do|how.*start)/.test(t)) return 'plan';
    if (/(worried|concern|block|barrier|what.*gets.*in.*the.*way)/.test(t)) return 'barrier';
    if (/^(what|how|when|where|why)\b/.test(t)) return 'info';
    return 'reflect';
};

/**
 * Extract job/profession from background text
 */
export const extractJobFromBackground = (background: string): string => {
    const jobPatterns = [
        /(\w+ engineer)/i,
        /(\w+ teacher)/i,
        /(construction worker)/i,
        /(nurse)/i,
        /(doctor)/i,
        /(lawyer)/i,
        /(manager)/i,
        /(student)/i,
        /(retired)/i,
    ];
    for (const pattern of jobPatterns) {
        const match = background.match(pattern);
        if (match) return match[1];
    }
    return '';
};

/**
 * Ensure first sentence answers the clinician's question directly
 * Also fixes third-person references to first-person
 */
export const ensureAnswersQuestionFirst = (modelText: string, intent: ClinicianIntent, patient?: PatientProfile): string => {
    const text = (modelText || '').trim();
    if (!text) return text;
    
    // Check for third-person references (common error - Gemini sometimes copies profile text verbatim)
    const thirdPersonPatterns = [
        /\b(they|them|their)\s+(report|feel|feelings|can see|are|is|has|have)\b/gi,
        /\bpatient\s+(is|are|has|have|reports?|feels?)\b/gi,
        /\bthe\s+patient\b/gi,
        /\bthis\s+patient\b/gi,
        /\bpatient's\b/gi,
    ];
    
    let fixed = text;
    let hasThirdPerson = false;
    
    // Fix "they report feeling" → "I feel"
    fixed = fixed.replace(/\bthey\s+report\s+feeling\s+"([^"]+)"\b/gi, 'I feel "$1"');
    fixed = fixed.replace(/\bthey\s+report\s+feeling\s+([^.]+)\b/gi, 'I feel $1');
    fixed = fixed.replace(/\bthey\s+can\s+see\b/gi, 'I can see');
    fixed = fixed.replace(/\bthey\s+are\b/gi, 'I am');
    fixed = fixed.replace(/\bthey\s+is\b/gi, 'I am');
    fixed = fixed.replace(/\bthey\s+has\b/gi, 'I have');
    fixed = fixed.replace(/\bthey\s+have\b/gi, 'I have');
    fixed = fixed.replace(/\btheir\s+/gi, 'my ');
    
    // Fix patient references
    fixed = fixed.replace(/\bpatient\s+is\s+here\b/gi, "I'm here");
    fixed = fixed.replace(/\bthe\s+patient\b/gi, "I");
    fixed = fixed.replace(/\bthis\s+patient\b/gi, "I");
    fixed = fixed.replace(/\bpatient's\b/gi, "my");
    // Fix "patient reports" → "I report" (handle verb conjugation)
    fixed = fixed.replace(/\bpatient\s+reports\b/gi, "I report");
    fixed = fixed.replace(/\bpatient\s+report\b/gi, "I report");
    fixed = fixed.replace(/\bpatient\s+feels\b/gi, "I feel");
    fixed = fixed.replace(/\bpatient\s+feel\b/gi, "I feel");
    fixed = fixed.replace(/\bpatient\s+is\b/gi, "I am");
    fixed = fixed.replace(/\bpatient\s+are\b/gi, "I am");
    fixed = fixed.replace(/\bpatient\s+has\b/gi, "I have");
    fixed = fixed.replace(/\bpatient\s+have\b/gi, "I have");
    
    // Check if we made any changes
    hasThirdPerson = thirdPersonPatterns.some(pattern => pattern.test(text));
    
    // Use fixed text if we made changes, otherwise use original
    let processedText = fixed !== text || hasThirdPerson ? fixed : text;
    
    if (fixed !== text || hasThirdPerson) {
        console.warn('[ensureAnswersQuestionFirst] Fixed third-person reference:', { original: text.substring(0, 100), fixed: processedText.substring(0, 100) });
    }
    
    const firstSentence = processedText.split(/(?<=[.!?])\s+/)[0] || '';
    const lowerFirst = firstSentence.toLowerCase();
    
    // More lenient detection - only trigger if response is clearly off-topic
    const needEmotion = intent === 'emotion' && !/(i feel|i'm feeling|i am feeling|honestly|to be honest|it feels|i've been feeling|i feel|i'm|i am)/.test(lowerFirst);
    const needPlan = intent === 'plan' && !/(i could|i can|i will|my next step|i'm going to|i'll|i might)/.test(lowerFirst);
    const needInfo = intent === 'info' && !/(it is|it's|i think|i guess|well|yeah|so|i|my|the|a|an)/.test(lowerFirst);
    const needBarrier = intent === 'barrier' && !/(the hard part|what makes it hard|my barrier|what gets in the way|it's tough|difficult|challenging|struggle)/.test(lowerFirst);
    
    const needsFix = needEmotion || needPlan || needInfo || needBarrier;
    if (!needsFix) return processedText;
    
    const job = patient ? (extractJobFromBackground(patient.background) || 'person') : 'person';
    const age = patient?.age;
    const prefaceByIntent: Record<ClinicianIntent, string> = {
        emotion: `Honestly, I feel ${age && age >= 40 ? "worn down" : "caught in the middle"}—as a ${job}, it hits me most after work.`,
        plan: `I think a realistic next step is to start small—something I can actually do this week.`,
        info: `Well, `,
        barrier: `What makes it hard is the routine—especially with my ${job} schedule.`,
        reflect: `What you're saying makes sense, and it lands for me.`,
    };
    const fix = prefaceByIntent[intent];
    if (!fix) return processedText;
    
    // Don't add preface if response already starts with it
    if (lowerFirst.startsWith(fix.toLowerCase().trim().slice(0, 10))) return processedText;
    
    return `${fix}${processedText}`;
};

/**
 * Format dates as MM/DD/YYYY with graceful fallback
 */
export const formatDateToMMDDYYYY = (dateInput: string | number | Date): string => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    if (Number.isNaN(date.getTime())) {
        const fallbackValue = String(dateInput ?? 'Invalid date');
        console.error('[geminiTextProcessor] Unable to format date. Received:', fallbackValue);
        return fallbackValue;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
};

