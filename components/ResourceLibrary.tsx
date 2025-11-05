import React, { useState, useMemo } from 'react';
import { UserTier } from '../types';

interface ResourceLibraryProps {
    onUpgrade: () => void;
    userTier: UserTier;
    onBack: () => void;
}

const resourcesData = [
    {
        category: 'Introductory Principles',
        items: [
            { id: 1, title: 'What is Motivational Interviewing?', premiumOnly: false },
            { id: 2, title: 'The Spirit of Motivational Interviewing', premiumOnly: false },
            { id: 3, title: 'The 5 Stages of Change Explained', premiumOnly: false },
            { id: 4, title: 'The Four Processes of MI', premiumOnly: true },
        ]
    },
    {
        category: 'Core Skills (OARS)',
        items: [
            { id: 10, title: 'Open Questions', premiumOnly: false },
            { id: 11, title: 'Affirmations', premiumOnly: false },
            { id: 12, title: 'Reflections', premiumOnly: false },
            { id: 13, title: 'Summaries', premiumOnly: false },
            { id: 14, title: 'Advanced Reflections', premiumOnly: true },
            { id: 15, title: 'Developing Discrepancy', premiumOnly: true },
        ]
    },
    {
        category: 'Advanced Techniques',
        items: [
            { id: 20, title: 'Eliciting Change Talk', premiumOnly: true },
            { id: 21, title: 'Responding to Sustain Talk', premiumOnly: true },
            { id: 22, title: 'Integrating MI with Other Methods', premiumOnly: true },
            { id: 23, title: 'MI for Complex Cases', premiumOnly: true },
            { id: 24, title: 'Using MI with Mandated Clients', premiumOnly: true },
            { id: 25, title: 'Measuring Your MI Fidelity', premiumOnly: true },
            { id: 26, title: 'Strengthening Commitment Language', premiumOnly: true },
            { id: 27, title: 'MI for Health Behavior Change', premiumOnly: true },
            { id: 28, title: 'MI in Brief Interventions (SBIRT)', premiumOnly: true },
            { id: 29, title: 'Working with Anger and Defensiveness', premiumOnly: true },
            { id: 30, title: 'Cultural Adaptations of MI', premiumOnly: true },
        ]
    }
];

const RESOURCE_CONTENT: { [key: number]: any } = {
    1: {
        title: 'What is Motivational Interviewing?',
        content: [
            { type: 'heading', text: 'A Patient-Centered Approach' },
            { type: 'paragraph', text: 'Motivational Interviewing (MI) is a collaborative conversation style for strengthening a person’s own motivation and commitment to change. It is a guiding, not directing, style of communication that helps patients explore and resolve their own ambivalence about behavior change.' },
        ]
    },
    2: {
        title: 'The Spirit of Motivational Interviewing',
        content: [
             { type: 'heading', text: 'The Four Pillars of MI' },
            { type: 'list', items: [
                'Partnership: Work collaboratively and avoid the "expert" role. MI is done "with" and "for" a person, not "on" or "to" them.',
                'Acceptance: Respect the patient\'s autonomy, potential, and perspective. This includes absolute worth, accurate empathy, autonomy support, and affirmation.',
                'Compassion: Actively promote the other’s welfare, to give priority to the other’s needs.',
                'Evocation: The motivation for change resides within the patient and is not imposed from outside. Your job is to "draw it out".',
            ]},
        ]
    },
    3: {
        title: 'The 5 Stages of Change Explained',
        content: [
            { type: 'heading', text: 'Understanding the Journey' },
            { type: 'paragraph', text: 'The Transtheoretical Model, or Stages of Change, describes the process people go through when making a behavior change. Recognizing a patient\'s stage helps tailor your approach.' },
            { type: 'subheading', text: '1. Precontemplation' },
            { type: 'paragraph', text: 'The patient is not considering change. They may be unaware or under-aware of their problem. Goal: Raise doubt & increase awareness.' },
            { type: 'subheading', text: '2. Contemplation' },
            { type: 'paragraph', text: 'The patient is ambivalent, weighing the pros and cons of change. They are aware a problem exists but not committed to action. Goal: Tip the balance towards change.' },
            { type: 'subheading', text: '3. Preparation' },
            { type: 'paragraph', text: 'The patient is ready to change and intends to take action soon. They may have a plan. Goal: Help the patient create a realistic plan.' },
            { type: 'subheading', text: '4. Action' },
            { type: 'paragraph', text: 'The patient is actively modifying their behavior and has made specific changes. Goal: Support the patient in taking steps.' },
            { type: 'subheading', text: '5. Maintenance' },
            { type: 'paragraph', text: 'The patient is working to sustain the new behavior and prevent relapse. Goal: Help the patient identify and use strategies to prevent relapse.' },
        ]
    },
    4: {
        title: "The Four Processes of MI",
        content: [
            { type: "heading", text: "A Sequential Roadmap" },
            { type: "paragraph", text: "The four processes of MI provide a structure for the conversation. They are sequential but also recursive—you may revisit earlier processes as needed." },
            { type: "subheading", text: "1. Engaging" },
            { type: "paragraph", text: "The foundation of the relationship. The goal is to establish a trusting and mutually respectful working relationship. This is where OARS skills are critical." },
            { type: "subheading", text: "2. Focusing" },
            { type: "paragraph", text: "The process of developing and maintaining a specific direction in the conversation about change. It involves clarifying a target behavior from a broader conversation." },
            { type: "subheading", text: "3. Evoking" },
            { type: "paragraph", text: "Eliciting the patient's own motivations for change. This is the heart of MI, where you listen for and strategically respond to change talk." },
            { type: "subheading", text: "4. Planning" },
            { type: "paragraph", text: "Developing a specific change plan that the patient agrees to and is willing to implement. This process bridges the gap between talking about change and taking action." }
        ]
    },
    10: {
        title: 'Open Questions',
        content: [
            { type: 'heading', text: 'Inviting the Story' },
            { type: 'paragraph', text: 'Open-ended questions invite the patient to tell their story and explore their thoughts and feelings. They avoid simple "yes" or "no" answers and encourage deeper conversation.' },
            { type: 'subheading', text: 'Example: Closed vs. Open' },
            { type: 'dialogue', lines: [
                { speaker: 'Clinician (Closed)', text: "So, you're not exercising?" },
                { speaker: 'Patient', text: "No." },
            ]},
            { type: 'dialogue', lines: [
                { speaker: 'Clinician (Open)', text: "What's gotten in the way of you being more active lately?" },
                { speaker: 'Patient', text: "Well, with my new work schedule, by the time I get home I'm just exhausted. And the kids need my attention right away..." },
            ]},
        ],
    },
    11: {
        title: 'Affirmations',
        content: [
            { type: 'heading', text: 'Building Confidence' },
            { type: 'paragraph', text: "Affirmations recognize and acknowledge the patient's strengths, efforts, and past successes. This builds self-efficacy and reinforces their ability to change. It's not cheerleading, but a genuine acknowledgment." },
            { type: 'subheading', text: 'Example in Context' },
            { type: 'dialogue', lines: [
                { speaker: 'Patient', text: "I tried to cut back last month, but it only lasted a few days. It was just so hard." },
                { speaker: 'Clinician', text: "That's a significant step to even try. It shows how much you're thinking about this and that you have the determination to make a change, even if it didn't stick the first time." },
            ]},
        ],
    },
    12: {
        title: 'Reflections',
        content: [
            { type: 'heading', text: 'Active Listening in Action' },
            { type: 'paragraph', text: "Reflective listening is the cornerstone of MI. It involves carefully listening to the patient and reflecting back what they are saying in the form of a statement. This shows you are listening, helps the patient hear themselves, and can guide the conversation." },
            { type: 'subheading', text: 'Example: Simple Reflection' },
            { type: 'paragraph', text: 'A simple reflection repeats or slightly rephrases what the patient said.' },
            { type: 'dialogue', lines: [
                { speaker: 'Patient', text: "I'm just not happy with how much I've been drinking." },
                { speaker: 'Clinician', text: "You're feeling unhappy about your drinking." },
            ]},
            { type: 'subheading', text: 'Example: Complex Reflection' },
            { type: 'paragraph', text: 'A complex reflection makes a guess at the underlying feeling or meaning.' },
            { type: 'dialogue', lines: [
                { speaker: 'Patient', text: "I know I should quit smoking for my kids, but it's the only thing that calms me down when I'm stressed." },
                { speaker: 'Clinician', text: "You're feeling torn between your role as a parent and your need for a coping tool that works for you right now." },
            ]},
        ],
    },
    13: {
        title: 'Summaries',
        content: [
            { type: 'heading', text: 'Connecting the Dots' },
            { type: 'paragraph', text: "Summaries pull together several of the patient's own statements about change. A well-timed summary can reinforce their motivation, highlight their ambivalence, and prepare them to take the next step. It's often followed by an open question." },
            { type: 'subheading', text: 'Example: Highlighting Ambivalence' },
            { type: 'dialogue', lines: [
                { speaker: 'Clinician', text: "So, let me see if I've got this right. On the one hand, you've said that fast food is quick and easy, and it's what you're used to. On the other hand, you're starting to worry about your pre-diabetes diagnosis and you're feeling tired all the time. Did I get that right?" },
                { speaker: 'Patient', text: "Yeah, that's pretty much it. When you put it like that, it sounds... not great." },
            ]},
        ],
    },
    14: {
        title: "Advanced Reflections",
        content: [
            { type: "heading", text: "Beyond Simple Restatements" },
            { type: "paragraph", text: "While simple reflections are foundational, complex reflections can deepen the conversation and accelerate change by adding meaning or emphasis." },
            { type: "subheading", text: "Types of Complex Reflections" },
            { type: "list", items: [
                "Reflection of Feeling: 'You're feeling hopeless about this situation.'",
                "Amplified Reflection: Gently exaggerating what the patient said to encourage them to argue less for sustain talk. 'So there are no downsides to your current behavior at all.'",
                "Double-Sided Reflection: Captures both sides of ambivalence. 'On the one hand, [sustain talk], and on the other hand, [change talk].'",
                "Metaphor: Using an image or analogy. 'It's like you're stuck in a tug-of-war with this habit.'"
            ]}
        ]
    },
    15: {
        title: "Developing Discrepancy",
        content: [
            { type: "heading", text: "The Engine of Change" },
            { type: "paragraph", text: "Motivation for change is created when a person perceives a discrepancy between their present behavior and their important personal goals or values. Your role is not to create this discrepancy, but to help the patient become aware of it themselves." },
            { type: "subheading", text: "Techniques for Highlighting Discrepancy" },
            { type: "list", items: [
                "Exploring Values: 'What are the most important things to you in your life? ... How does your [behavior] fit in with that?'",
                "A Typical Day: Ask the patient to walk you through a typical day, which can naturally highlight the impact of their behavior on their routine and goals.",
                "Information Exchange: Use the 'Elicit-Provide-Elicit' model. Ask permission, provide neutral information, and then ask for the patient's interpretation. 'Would it be okay if I shared some information about...? ... What do you make of that?'"
            ]}
        ]
    },
    20: {
        title: "Eliciting Change Talk",
        content: [
            { type: "heading", text: "The Heart of MI" },
            { type: "paragraph", text: "Change talk is any speech by the patient that favors movement toward change. Your primary goal in MI is to elicit and reinforce it. People are more likely to be persuaded by what they hear themselves say." },
            { type: "subheading", text: "Recognizing DARN CATs (The Types of Change Talk)" },
            { type: "list", items: [
                "Preparatory Change Talk (DARN): Desire, Ability, Reasons, Need.",
                "Mobilizing Change Talk (CAT): Commitment, Activation, Taking Steps."
            ]},
            { type: "subheading", text: "Evocative Questions to Ask" },
            { type: "list", items: [
                "Ask for Elaboration: 'Tell me more about that.'",
                "Looking Forward: 'If you did decide to make a change, what would the benefits be?'",
                "Querying Extremes: 'What's the worst thing that could happen if you don't change?'",
                "Using Rulers: 'On a scale of 0 to 10, how important is it for you to change?' Then, 'Why did you pick a 4 and not a 2?'"
            ]}
        ]
    },
    21: {
        title: "Responding to Sustain Talk",
        content: [
            { type: "heading", text: "Rolling with 'Resistance'" },
            { type: "paragraph", text: "Sustain talk is the patient's argument for not changing. It's natural and not 'bad'. Instead of challenging it, roll with it." },
            { type: "list", items: [
                "Simple Reflection: 'You feel that now isn't the right time to quit.'",
                "Amplified Reflection: 'So you see absolutely no reason to change at all.' (Use with care)",
                "Double-Sided Reflection: 'On the one hand, you enjoy smoking, and on the other, you're worried about your cough.'",
                "Shifting Focus: Move the conversation away from the roadblock. 'I hear that you're not ready to talk about quitting. Can we talk about what makes this habit important to you?'"
            ]}
        ]
    },
    22: {
        title: "Integrating MI with Other Methods",
        content: [
            { type: "heading", text: "A Versatile Approach" },
            { type: "paragraph", text: "MI is not a standalone therapy but a communication style that can be integrated with other therapeutic models. It is particularly effective when used before another treatment to enhance engagement and motivation." },
            { type: "subheading", text: "MI + CBT (Cognitive Behavioral Therapy)" },
            { type: "paragraph", text: "Use MI in the initial sessions to explore ambivalence and build motivation for change. Once the patient is in the Action stage, structured CBT techniques can be introduced as a concrete plan they have chosen to follow." },
            { type: "subheading", text: "MI + Harm Reduction" },
            { type: "paragraph", text: "For patients not ready for abstinence, MI is an ideal approach to explore harm reduction goals. It honors autonomy and supports any positive step the patient is willing to take to reduce harm associated with their behavior." },
        ]
    },
    23: {
        title: "MI for Complex Cases",
        content: [
            { type: "heading", text: "Co-Occurring Disorders" },
            { type: "paragraph", text: "When a patient has both a substance use disorder and a mental health condition, ambivalence can be layered and complex. MI provides a framework to explore change across both domains without being confrontational." },
        ]
    },
    24: {
        title: "Using MI with Mandated Clients",
        content: [
            { type: "heading", text: "Honoring Autonomy Under Pressure" },
            { type: "paragraph", text: "Clients mandated to treatment often begin in Precontemplation. A confrontational approach is rarely effective. MI's focus on empathy and autonomy is key." },
        ]
    },
    25: {
        title: "Measuring Your MI Fidelity",
        content: [
            { type: "heading", text: "From Competence to Proficiency" },
            { type: "paragraph", text: "Moving beyond simply 'doing MI' to doing it well requires feedback. The Motivational Interviewing Treatment Integrity (MITI) code is a behavioral coding system that assesses MI practice. A good self-assessment is to record a session and have at least twice as many reflections as questions." },
        ]
    },
    26: {
        title: "Strengthening Commitment Language",
        content: [
            { type: "heading", text: "From 'Maybe' to 'I Will'" },
            { type: "paragraph", text: "The goal of evoking is to not just hear change talk, but to guide the patient from preparatory language (Desire, Ability, Reasons, Need) to mobilizing language (Commitment, Activation, Taking Steps). This section covers techniques to bridge that gap." },
            { type: "subheading", text: "Key Questions" },
            { type: "list", items: [
                "After hearing preparatory talk, ask: 'So what do you think you'll do?'",
                "Use a summary: 'So you've said you want to change for your health, you believe you can do it, and you need to for your family. The next step seems to be deciding on a plan. What does that look like to you?'",
                "Directly ask for commitment: 'What are you prepared to do this week?'"
            ]}
        ]
    },
    27: {
        title: "MI for Health Behavior Change",
        content: [
            { type: "heading", text: "Beyond Substance Use" },
            { type: "paragraph", text: "MI is a powerful tool for any behavior change, not just addiction. It is highly effective for promoting medication adherence, dietary changes, increasing physical activity, and managing chronic diseases like diabetes." },
            { type: "subheading", text: "Example: Medication Adherence" },
            { type: "paragraph", text: "Instead of telling a patient they must take their medication, explore their ambivalence. Ask: 'What are some of the things that get in the way of taking your medication as prescribed?' and 'On the other side, what are the benefits you notice when you do take it regularly?'" }
        ]
    },
    28: {
        title: "MI in Brief Interventions (SBIRT)",
        content: [
            { type: "heading", text: "Making Every Moment Count" },
            { type: "paragraph", text: "Screening, Brief Intervention, and Referral to Treatment (SBIRT) is a public health approach to deliver early intervention for individuals with or at risk of developing substance use disorders. MI is the core of the 'Brief Intervention' part." },
            { type: "subheading", text: "The 5-Minute Intervention" },
            { type: "paragraph", text: "In a busy ER or primary care setting, you may only have minutes. The key is to: Raise the subject, provide feedback from screening results, enhance motivation using a ruler or exploring pros and cons, and negotiate a plan. Even a small goal, like agreeing to think about it, is progress." }
        ]
    },
    29: {
        title: "Working with Anger and Defensiveness",
        content: [
            { type: "heading", text: "De-escalation and Engagement" },
            { type: "paragraph", text: "Anger and defensiveness are often signs of a patient feeling unheard or judged. Instead of confronting it, MI principles offer a way to 'roll with' this energy and maintain the therapeutic alliance." },
            { type: "subheading", text: "Techniques" },
            { type: "list", items: [
                "Reflect the feeling: 'You're feeling very angry about being here.'",
                "Apologize if appropriate: 'I can see I've overstepped. I apologize. Let's back up.'",
                "Shift focus: Move away from the sensitive topic temporarily. 'Let's put that aside for a moment. Can we talk about what's been going well for you this week?'",
                "Affirm autonomy: 'Ultimately, you're in control here, and I can't make you do anything you don't want to do.'"
            ]}
        ]
    },
    30: {
        title: "Cultural Adaptations of MI",
        content: [
            { type: "heading", text: "Respectful and Relevant Conversations" },
            { type: "paragraph", text: "While MI principles are broadly applicable, their expression must be culturally sensitive. What works as an affirmation in one culture might be inappropriate in another. It's crucial to adapt your approach to be respectful of the patient's cultural background, values, and communication style." },
            { type: "subheading", text: "Key Considerations" },
            { type: "list", items: [
                "Family and Community: In collectivist cultures, decisions are often made with family or community input. Explore these influences: 'How does your family feel about this?'",
                "Communication Styles: Be mindful of directness vs. indirectness, eye contact, and personal space.",
                "Values: Frame the discrepancy between behavior and values that are culturally relevant to the patient."
            ]}
        ]
    },
};

const ResourceDetailView: React.FC<{ resourceId: number; onBack: () => void; }> = ({ resourceId, onBack }) => {
    const resource = RESOURCE_CONTENT[resourceId];

    if (!resource) {
        return <div className="p-4">Resource not found.</div>;
    }

    const renderContent = () => {
        return resource.content.map((item: any, index: number) => {
            switch (item.type) {
                case 'heading':
                    return <h3 key={index} className="text-xl font-bold text-slate-700 mt-6 mb-2">{item.text}</h3>;
                case 'subheading':
                    return <h4 key={index} className="text-lg font-semibold text-slate-600 mt-4 mb-1">{item.text}</h4>;
                case 'paragraph':
                    return <p key={index} className="text-slate-600 leading-relaxed mb-4">{item.text}</p>;
                case 'list':
                    return (
                        <ul key={index} className="list-disc list-inside space-y-2 pl-4 text-slate-600">
                            {item.items.map((li: string, i: number) => <li key={i}>{li}</li>)}
                        </ul>
                    );
                case 'dialogue':
                    return (
                        <div key={index} className="border-l-4 border-slate-300 pl-4 py-2 my-4 bg-slate-50 rounded-r-lg">
                            {item.lines.map((line: {speaker: string, text: string}, i: number) => (
                                <p key={i} className="mb-1">
                                    <span className={`font-bold ${line.speaker.includes('Patient') ? 'text-rose-600' : 'text-sky-600'}`}>{line.speaker}: </span>
                                    <span className="text-slate-700 italic">"{line.text}"</span>
                                </p>
                            ))}
                        </div>
                    );
                default:
                    return null;
            }
        });
    };

    return (
        <div className="p-4">
            <header className="flex items-center mb-6">
                <button onClick={onBack} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-200 transition-colors">
                    <i className="fa fa-arrow-left text-xl text-gray-600"></i>
                </button>
                <h1 className="text-2xl font-bold text-gray-800">{resource.title}</h1>
            </header>
            <main className="pb-8">
                {renderContent()}
            </main>
        </div>
    );
};

const ResourceLibrary: React.FC<ResourceLibraryProps> = ({ onUpgrade, userTier, onBack }) => {
    const [viewingResourceId, setViewingResourceId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [openCategory, setOpenCategory] = useState<string | null>(resourcesData[0].category);

    const isPremium = userTier === UserTier.Premium;

    const filteredData = useMemo(() => {
        if (!searchTerm) return resourcesData;
        const lowercasedFilter = searchTerm.toLowerCase();
        return resourcesData
            .map(category => ({
                ...category,
                items: category.items.filter(item => item.title.toLowerCase().includes(lowercasedFilter)),
            }))
            .filter(category => category.items.length > 0);
    }, [searchTerm]);

    const handleItemClick = (item: { id: number; premiumOnly: boolean; }) => {
        if (item.premiumOnly && !isPremium) {
            onUpgrade();
        } else {
            setViewingResourceId(item.id);
        }
    };

    if (viewingResourceId) {
        return <ResourceDetailView resourceId={viewingResourceId} onBack={() => setViewingResourceId(null)} />;
    }

    return (
        <div className="bg-slate-50 min-h-full flex flex-col p-4">
            <header className="flex items-center mb-4 pt-2">
                <button onClick={onBack} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-200 transition-colors">
                    <i className="fa fa-arrow-left text-xl text-gray-600"></i>
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Resource Library</h1>
            </header>

            <div className="relative mb-6">
                <i className="fa fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                    type="text"
                    placeholder="Search resources"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
            </div>

            <main className="space-y-4">
                {filteredData.map(category => {
                    const isCategoryOpen = openCategory === category.category;
                    const premiumItems = category.items.filter(i => i.premiumOnly);
                    const freeItems = category.items.filter(i => !i.premiumOnly);
                    
                    return (
                        <div key={category.category}>
                            <button
                                onClick={() => isPremium ? setOpenCategory(isCategoryOpen ? null : category.category) : undefined}
                                className={`w-full text-left font-bold p-3 rounded-lg flex justify-between items-center ${isPremium ? 'cursor-pointer' : 'cursor-default'} bg-sky-100 text-sky-700 border-l-4 border-sky-500`}
                            >
                                <span>{category.category}</span>
                                {isPremium && <i className={`fa fa-chevron-down transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}></i>}
                            </button>
                            
                            {(isPremium ? isCategoryOpen : true) && (
                                <div className="mt-1 space-y-1">
                                    {freeItems.map(item => (
                                        <div key={item.id} onClick={() => handleItemClick(item)} className="p-4 text-gray-800 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
                                            {item.title}
                                        </div>
                                    ))}
                                    {isPremium ? (
                                        premiumItems.map(item => (
                                            <div key={item.id} onClick={() => handleItemClick(item)} className="p-4 text-gray-800 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
                                                {item.title}
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            {premiumItems.slice(0, 3).map(item => (
                                                <div key={item.id} onClick={onUpgrade} className="p-4 flex justify-between items-center text-gray-500 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
                                                    <span>{item.title}</span>
                                                    <i className="fa fa-lock text-slate-400"></i>
                                                </div>
                                            ))}
                                            {premiumItems.length > 3 && (
                                                <div onClick={onUpgrade} className="mt-2 bg-sky-50 border-2 border-sky-300 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-sky-100 transition-colors">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-200 mb-2">
                                                        <i className="fa fa-unlock text-xl text-sky-600"></i>
                                                    </div>
                                                    <p className="font-bold text-sky-700">Unlock All Advanced Techniques</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </main>
        </div>
    );
};

export default ResourceLibrary;
