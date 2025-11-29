import { PatientProfile } from '../types';
import { classifyClinicianIntent, ensureAnswersQuestionFirst, extractJobFromBackground } from './geminiTextProcessor';

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

/**
 * Get a mock response based on user input and patient context
 */
export const getMockResponse = (userMessage: string, patient?: PatientProfile): string => {
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

