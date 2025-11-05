import { StageOfChange } from './types';

export const PATIENT_DATA = {
    names: ['Alex Johnson', 'Jordan Smith', 'Taylor Brown', 'Casey Williams', 'Morgan Miller', 'Riley Jones', 'Cameron Davis', 'Parker Garcia', 'Quinn Lee', 'Rowan Perez', 'Dakota Hall', 'Avery Nelson', 'Samira Ahmed', 'Leo Chen', 'Sofia Rossi', 'Javier Rodriguez', 'Chloe Kim', 'Mateo Garcia'],
    sexes: ['Male', 'Female', 'Non-binary'] as ('Male' | 'Female' | 'Non-binary')[],
    stagesOfChange: [
        StageOfChange.Precontemplation,
        StageOfChange.Contemplation,
        StageOfChange.Preparation,
        StageOfChange.Action,
        StageOfChange.Maintenance,
    ],
};

// Structured templates to ensure patient profiles are coherent.
export const PATIENT_PROFILE_TEMPLATES = [
    // Alcohol
    {
        topic: 'Binge Drinking (Beer)',
        presentingProblem: 'Patient is here at the urging of their partner after a recent embarrassing incident at a social event due to excessive beer consumption.',
        history: 'History of heavy weekend drinking since college. Recently, consumption has increased to 4-5 nights a week, primarily craft beer. No previous attempts to quit.',
        chiefComplaint: "My partner is overreacting. So I had a few too many IPAs, it's not a big deal. Everyone was drinking. I'm just here to get them off my back.",
        background: "A {age}-year-old software engineer in a competitive startup environment. Social life revolves around brewery visits and after-work drinks with colleagues.",
        ageRange: [26, 32],
    },
    {
        topic: 'Daily Wine Consumption',
        presentingProblem: 'Patient is self-referred due to growing concerns about their nightly habit of drinking a bottle of wine to "unwind" and its impact on their energy levels and sleep.',
        history: 'Started with a glass of wine with dinner, which has gradually escalated to a full bottle or more per night over the past two years. Has tried to cut back but experiences irritability and anxiety.',
        chiefComplaint: "I feel like I need wine to relax after a stressful day, but I wake up feeling groggy and anxious. I'm worried it's becoming a crutch I can't function without.",
        conflictingChiefComplaint: "I'm really struggling with my sleep and stress levels. I was hoping to talk about some strategies for that. The wine is just a symptom, not the real problem.",
        background: "A {age}-year-old high school teacher, married with two teenage children. Experiences significant stress from their job and family responsibilities.",
        ageRange: [42, 50],
    },
     {
        topic: 'Heavy Liquor Use (Tequila)',
        presentingProblem: 'Patient was brought in by a friend after a dangerous episode of intoxication involving tequila shots, resulting in a fall. Patient has memory gaps from the event.',
        history: 'Uses tequila as a "party starter" on weekends. This has led to several blackouts, arguments, and risky behaviors in the past year.',
        chiefComplaint: "My friend is freaking out, but I was just having fun. I don't remember falling. Maybe I should slow down, but I don't think I have a 'problem' like they say.",
        background: "A {age}-year-old recent college graduate working in sales. Lives with roommates and frequently goes to bars and clubs.",
        ageRange: [22, 26],
    },
    // Nicotine
    {
        topic: 'Vaping (Nicotine)',
        presentingProblem: 'Patient wants to quit vaping due to the high cost and a recent health scare (persistent cough), but finds the cravings overwhelming.',
        history: 'Started vaping to quit smoking cigarettes 3 years ago but is now vaping more heavily than they ever smoked. Uses high-potency nicotine salt e-liquids throughout the day.',
        chiefComplaint: "This thing is attached to my hand from morning till night. It costs a fortune, and this cough is worrying me. I want to quit, I just don't know if I have the willpower.",
        background: "A {age}-year-old graphic designer who works from home. Vaping is heavily integrated into their work routine and moments of stress or creative blocks.",
        ageRange: [28, 35],
    },
    // THC
    {
        topic: 'THC Edibles',
        presentingProblem: 'Patient\'s work performance is suffering due to daily use of high-potency THC gummies. They report feeling "in a fog" and unmotivated.',
        history: 'Began using edibles for sleep a year ago. Now uses them throughout the day to manage anxiety, consuming up to 100mg of THC daily. Their recent performance review at work was poor.',
        chiefComplaint: "My boss told me I seem distracted and my work is slipping. The edibles used to help my anxiety, but now I just feel... slow. I don't feel high, just not sharp.",
        background: "A {age}-year-old paralegal under high pressure at a corporate law firm. Is worried about losing their job.",
        ageRange: [32, 40],
    },
    // Opioids
    {
        topic: 'Fentanyl Use (Illicit)',
        presentingProblem: 'Patient is here due to a court mandate following an overdose on what they thought was heroin, but was actually fentanyl. They are terrified of overdosing again but also of withdrawal.',
        history: 'Long history of opioid use, starting with prescription pain pills and progressing to heroin. Recently started using pressed pills sold as "oxys" which are likely illicit fentanyl.',
        chiefComplaint: "I honestly thought I was going to die. I never want to feel that way again. But the thought of getting sick from withdrawal... I can't handle it. I don't see a way out.",
        background: "A {age}-year-old who has been unemployed for a year and is experiencing housing instability, often couch-surfing. Has lost contact with most of their family.",
        ageRange: [25, 34],
    },
    {
        topic: 'Prescription Pain Meds (Oxycodone)',
        presentingProblem: 'Patient is running out of their oxycodone prescription early each month and is requesting an increased dose, showing signs of tolerance and dependence.',
        history: 'Prescribed oxycodone for chronic back pain after a car accident 2 years ago. Initially took as prescribed, but now takes extra doses for stress and emotional relief.',
        chiefComplaint: "Doctor, the pills just aren't working like they used to. The pain is breaking through more and more. I think I need a higher dose to manage it properly.",
        background: "A {age}-year-old former construction worker on disability. Lives alone and reports high levels of boredom and depression.",
        ageRange: [48, 58],
    },
    // Stimulants
    {
        topic: 'Methamphetamine Use',
        presentingProblem: 'Patient presents with severe dental decay, significant weight loss, and paranoia. They were brought in by a family member concerned about their erratic behavior.',
        history: 'Initiated meth use 18 months ago to work longer hours at a manual labor job. Use has escalated to daily, with multi-day binges. Has become socially withdrawn and paranoid.',
        chiefComplaint: "My family is trying to control me. They don't understand the pressure I'm under. I'm fine, I just need everyone to leave me alone. Why are they looking at me like that?",
        background: "A {age}-year-old truck driver who is at risk of losing their job due to missed shifts and strange behavior. Is divorced and has strained relationships with their children.",
        ageRange: [38, 48],
    },
    {
        topic: 'Cocaine Use',
        presentingProblem: 'Patient is in financial crisis due to a weekly cocaine habit that has escalated. They are seeking help after taking out a high-interest loan to cover their drug-related debts.',
        history: 'Casual weekend user for years, but use escalated to 3-4 times a week after a promotion. Spends hundreds of dollars a week on cocaine, hiding the expense from their spouse.',
        chiefComplaint: "I've gotten myself into a real financial mess. I keep telling myself I'll stop, just for the weekends, but then Friday comes... I never thought I'd be in debt over this.",
        background: "A {age}-year-old in finance who associates cocaine use with success and networking. Is married and just bought a new house, adding to financial pressure.",
        ageRange: [35, 45],
    },
    // Other Substances
    {
        topic: 'Kratom Dependence',
        presentingProblem: 'Patient is trying to stop using kratom, which they initially took for chronic pain and energy, but is now experiencing significant withdrawal symptoms (anxiety, restless legs, irritability).',
        history: 'Started using kratom powder from an online vendor 3 years ago as a "natural" alternative to pain medication. Consumption has grown to 30-40 grams per day.',
        chiefComplaint: "I thought this stuff was like coffee, but now if I try to stop, I feel awful. My whole body aches, I can't sleep, and I'm so irritable. It feels like the flu, but worse.",
        background: "A {age}-year-old librarian who initially used kratom for fibromyalgia. Now feels trapped by the need to dose every few hours to avoid withdrawal.",
        ageRange: [45, 55],
    },
    {
        topic: 'Ketamine Misuse',
        presentingProblem: 'Patient reports urinary tract issues and cognitive difficulties ("brain fog") after regular, heavy use of illicit ketamine.',
        history: 'Uses ketamine insufflated (snorted) every weekend with friends for its dissociative effects. Recently has been experiencing bladder pain and urgency.',
        chiefComplaint: "I've been having some weird bladder problems, and my memory feels shot lately. I read online it might be from the K. I'm worried I might have done some permanent damage.",
        background: "A {age}-year-old artist and nightlife enthusiast. Their social scene is heavily centered around clubbing and psychedelic/dissociative drug use.",
        ageRange: [23, 29],
    },
    // Behavioral
    {
        topic: 'Compulsive Shopping',
        presentingProblem: 'Compulsive online shopping leading to significant credit card debt. Patient is minimizing the issue, which is causing conflict with their partner.',
        history: 'Patient has accumulated significant credit card debt over the past two years from frequent online purchases. They often hide packages from their partner and feel a rush when buying things, followed by guilt.',
        chiefComplaint: "My partner is freaking out about our credit card bills. I don't think it's that bad, I just like to buy nice things. It's my money, why is it such a big deal?",
        background: "Married with one child. Works from home as an accountant and feels isolated. Manages household finances.",
        ageRange: [30, 45],
    },
    // NEW SCENARIOS START HERE
    {
        topic: 'Compulsive Sports Betting',
        presentingProblem: 'Patient is in significant debt from online sports betting. Their partner has discovered the extent of the debt and has given them an ultimatum to seek help.',
        history: 'Started with small, casual bets on games with friends. Escalated over the last year with the accessibility of mobile betting apps. Has chased losses, taken out loans, and maxed out credit cards.',
        chiefComplaint: "I messed up. I thought I had a system, that I could win it all back. Now my partner's threatening to leave. I have to do something, but I don't even know where to start. It feels like a hole I can't climb out of.",
        conflictingChiefComplaint: "My partner and I are having some disagreements about our budget. I think we just need a better financial plan, it's more of a communication issue than anything else.",
        background: "A {age}-year-old car salesman who is highly competitive. Used to play college sports and now channels that energy into betting. Feels immense pressure to provide for his family.",
        ageRange: [35, 45],
    },
    {
        topic: 'Excessive Online Gaming',
        presentingProblem: "Patient's parents are concerned about their social withdrawal, declining grades, and neglect of personal hygiene, all linked to near-constant online gaming.",
        history: 'Always enjoyed video games, but has become completely absorbed in a competitive online multiplayer game over the past year. Stays up all night playing, skips meals, and has lost touch with non-gaming friends.',
        chiefComplaint: "My parents are being dramatic. It's just a game. My online friends are my real friends anyway. School is boring. Why can't they just let me do what I enjoy?",
        background: "A {age}-year-old high school student who feels socially anxious and has found a sense of community and achievement online that they feel is lacking in their 'real' life.",
        ageRange: [16, 19],
    },
    {
        topic: 'Prescription Benzodiazepine Misuse (Alprazolam)',
        presentingProblem: "Patient is seeking a new doctor to get a refill for their alprazolam (Xanax) prescription, after their previous doctor refused. They report severe anxiety and an inability to function without it.",
        history: 'Prescribed Xanax for panic attacks five years ago. Now takes it daily to manage general anxiety and stress, often taking more than prescribed. Experiences inter-dose withdrawal symptoms.',
        chiefComplaint: "My last doctor cut me off. He doesn't understand how bad my anxiety is. I can't sleep, my heart races... I need my medication to just feel normal. Why won't anyone help me?",
        background: "A {age}-year-old stay-at-home parent who feels overwhelmed with childcare and household responsibilities. Feels isolated and believes the medication is the only thing holding them together.",
        ageRange: [38, 48],
    },
    {
        topic: 'Daily Cannabis Smoking',
        presentingProblem: "Patient is experiencing a persistent, phlegmy cough and is worried about their lung health. They also report feeling unmotivated and 'in a rut'.",
        history: 'Has been smoking cannabis daily since college. Now smokes several times a day, from morning to night. Finds it difficult to imagine their life without it.',
        chiefComplaint: "This cough won't go away, and I feel like my lungs are heavy. I also just feel... stuck. I have goals, things I want to do, but I never seem to get around to them. I wonder if the weed has something to do with it.",
        background: "A {age}-year-old musician and gig-worker. Associates cannabis with creativity and relaxation, but is starting to see how it might be hindering their professional progress.",
        ageRange: [27, 34],
    },
    {
        topic: 'Anabolic Steroid Use',
        presentingProblem: 'Patient presents with acne, mood swings (irritability and aggression, or "roid rage"), and concerning lab results (elevated liver enzymes) from a recent physical.',
        history: 'Started using testosterone and other anabolic steroids sourced from a "gym buddy" about a year ago to accelerate muscle gain. Is now on a regular cycle of injectables.',
        chiefComplaint: "My girlfriend says I'm always angry, and my doctor is freaking out about my liver. I've never felt stronger, though. Everyone at the gym is on something. Isn't this just what you do to get serious results?",
        background: "A {age}-year-old personal trainer whose career and self-esteem are tied to their physical appearance. Feels intense pressure to maintain a hyper-masculine physique.",
        ageRange: [24, 30],
    },
    {
        topic: 'Cigarette Smoking',
        presentingProblem: 'Patient recently had a child and their partner is insisting they quit smoking. They are ambivalent because smoking is their primary coping mechanism for stress.',
        history: 'Smoker since age 16, about a pack a day. Has made several half-hearted quit attempts in the past but always relapsed during stressful periods.',
        chiefComplaint: "I know it's bad for me, and I don't want the baby breathing it in. But with a newborn, I'm more stressed than ever. A cigarette is the only five minutes of peace I get all day. I want to quit for them, but I'm afraid I'll fall apart.",
        background: "A {age}-year-old new parent working as a mechanic. Many coworkers smoke, and smoke breaks are a key part of their social routine at work.",
        ageRange: [30, 40],
    },
    {
        topic: 'Poor Diet & Fast Food',
        presentingProblem: 'Patient has pre-diabetes and their primary care doctor has strongly recommended dietary changes to avoid developing full-blown Type 2 Diabetes.',
        history: 'Relies heavily on fast food and processed meals due to a busy work schedule and lack of cooking skills. Drinks several sugary sodas per day.',
        chiefComplaint: "My doctor says I have to change how I eat, but with my job, I barely have time to breathe, let alone cook. A burger and fries is just easy. I know it's not good for me, but changing everything feels impossible.",
        background: "A {age}-year-old long-haul truck driver who eats most meals on the road. Struggles with healthy options and time constraints.",
        ageRange: [45, 55],
    },
    {
        topic: 'Sedentary Lifestyle',
        presentingProblem: 'Patient reports chronic fatigue, weight gain, and general low mood. Their doctor suggested that increasing physical activity could help significantly.',
        history: 'Used to be active in school but has fallen into a sedentary routine with a desk job and long commute. Evenings are spent on the couch watching TV.',
        chiefComplaint: "I just feel tired all the time. I know I should exercise, but by the time I get home from work, I have zero energy. The idea of going to a gym is intimidating. I wouldn't even know what to do.",
        conflictingChiefComplaint: "I've been having this persistent lower back pain and was hoping to get it checked out. I think if I could just get rid of this pain, I'd have a lot more energy.",
        background: "A {age}-year-old IT support specialist who works long hours at a desk. Lives alone and lacks social support for engaging in physical activities.",
        ageRange: [35, 45],
    },
    {
        topic: 'Medication Non-Adherence (Type 2 Diabetes)',
        presentingProblem: 'Patient with Type 2 Diabetes presents with consistently high A1c levels. They admit to frequently forgetting or skipping their oral diabetes medication and not monitoring their blood sugar.',
        history: 'Diagnosed two years ago. Was initially diligent but has become complacent. Finds the daily routine of medication and monitoring to be a frustrating reminder of their condition.',
        chiefComplaint: "I feel fine, so I don't see the big deal if I miss a pill here and there. Checking my blood sugar is a pain. I hate that I have to do all this stuff. I just want to forget I have diabetes.",
        conflictingChiefComplaint: "These diabetes pills have been giving me some unpleasant side effects, and I'm not even sure they're helping. I wanted to discuss if there are other medications we could try.",
        background: "A {age}-year-old retired office manager who feels their health is declining. Is frustrated by the chronic nature of their illness and sometimes feels hopeless about it.",
        ageRange: [62, 72],
    },
    {
        topic: 'Psilocybin (Mushroom) Misuse',
        presentingProblem: 'Patient is concerned about recent experiences of heightened anxiety and "feeling disconnected" for days after using psilocybin mushrooms. They are questioning their "spiritual" use of the substance.',
        history: 'Began using mushrooms with friends for recreational and perceived spiritual reasons. Use has become more frequent and solitary. A recent "bad trip" has left them shaken.',
        chiefComplaint: "I thought mushrooms were supposed to be enlightening, but my last trip was terrifying. Ever since, my anxiety is through the roof and I feel weird, like I'm not really here. I'm scared to do them again, but I'm also scared of what's happening to my head now.",
        background: "A {age}-year-old graduate student in philosophy. Was drawn to psychedelics for intellectual and spiritual exploration but is now facing unexpected psychological consequences.",
        ageRange: [22, 28],
    },
];


export const STAGE_DESCRIPTIONS: Record<StageOfChange, string> = {
    [StageOfChange.Precontemplation]: "Not currently considering change. Unaware or under-aware of their problems.",
    [StageOfChange.Contemplation]: "Ambivalent about change. Aware a problem exists but not committed to action.",
    [StageOfChange.Preparation]: "Getting ready to change. Intends to take action soon and may have a plan.",
    [StageOfChange.Action]: "Actively modifying behavior. Has made specific overt modifications in their lifestyle.",
    [StageOfChange.Maintenance]: "Sustaining new behavior. Working to prevent relapse into old habits.",
};

export const FREE_SESSION_DURATION = 90; // seconds
export const PREMIUM_SESSION_DURATION = 300; // seconds