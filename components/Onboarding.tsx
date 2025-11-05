import React, { useState } from 'react';

interface OnboardingProps {
    onFinish: () => void;
}

const onboardingSteps = [
    {
        // Step 1: Welcome
        content: (
            <>
                <div className={'bg-sky-100 rounded-full h-40 w-40 flex items-center justify-center mb-8'}>
                    <svg className="w-20 h-20 text-sky-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15C21 16.6569 21 17.4853 20.7397 18.1408C20.5097 18.7212 20.1212 19.2314 19.6166 19.6166C18.9663 20.1212 18.1783 20.3542 16.6023 20.8199L16.2 20.94C15.4 21.18 15 21.3 14.64 21.516C14.3215 21.7046 14.032 21.9366 13.78 22.206C13.21 22.82 12.82 23.58 12 23.58C11.18 23.58 10.79 22.82 10.22 22.206C9.96803 21.9366 9.67848 21.7046 9.36 21.516C9 21.3 8.6 21.18 7.8 20.94L7.39772 20.8199C5.82169 20.3542 5.03367 20.1212 4.38343 19.6166C3.87884 19.2314 3.49033 18.7212 3.26034 18.1408C3 17.4853 3 16.6569 3 15V9C3 7.34315 3 6.51472 3.26034 5.85922C3.49033 5.27879 3.87884 4.76863 4.38343 4.38343C5.03367 3.87884 5.8217 3.64583 7.39772 3.18015L7.8 3.06C8.6 2.82 9 2.7 9.36 2.484C9.67848 2.29544 9.96803 2.06338 10.22 1.794C10.79 1.18 11.18 0.42 12 0.42C12.82 0.42 13.21 1.18 13.78 1.794C14.032 2.06338 14.3215 2.29544 14.64 2.484C15 2.7 15.4 2.82 16.2 3.06L16.6023 3.18015C18.1783 3.64583 18.9663 3.87884 19.6166 4.38343C20.1212 4.76863 20.5097 5.27879 20.7397 5.85922C21 6.51472 21 7.34315 21 9V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to MI Practice Coach!</h1>
                <p className="text-gray-600 max-w-sm">The safe way to build confidence and master Motivational Interviewing with realistic AI-powered patients.</p>
            </>
        ),
    },
    {
        // Step 2: How It Works (New descriptive list)
        content: (
            <>
                <h1 className="text-3xl font-bold text-gray-800 mb-4">How It Works</h1>
                <p className="text-gray-600 max-w-sm mb-8">Each session is a simple, powerful loop designed to accelerate your learning.</p>
                <div className="text-left max-w-sm w-full space-y-3">
                    <div className="flex items-start p-3 bg-white rounded-lg border border-gray-200">
                        <i className="fa-solid fa-file-lines text-sky-500 w-6 text-xl text-center mt-1"></i>
                        <div className="ml-4">
                            <h3 className="font-semibold text-gray-800">Review the Patient Case</h3>
                            <p className="text-sm text-gray-600">Start with a detailed profile of a simulated patient, including their background and chief complaint.</p>
                        </div>
                    </div>
                    <div className="flex items-start p-3 bg-white rounded-lg border border-gray-200">
                        <i className="fa-solid fa-microphone text-sky-500 w-6 text-xl text-center mt-1"></i>
                        <div className="ml-4">
                            <h3 className="font-semibold text-gray-800">Practice the Conversation</h3>
                            <p className="text-sm text-gray-600">Use your voice to engage with the patient in a timed, realistic scenario.</p>
                        </div>
                    </div>
                    <div className="flex items-start p-3 bg-white rounded-lg border border-gray-200">
                        <i className="fa-solid fa-comment-dots text-sky-500 w-6 text-xl text-center mt-1"></i>
                        <div className="ml-4">
                            <h3 className="font-semibold text-gray-800">Get Instant Feedback</h3>
                            <p className="text-sm text-gray-600">Receive an AI-powered analysis of your MI skills right after the session ends.</p>
                        </div>
                    </div>
                    <div className="flex items-start p-3 bg-white rounded-lg border border-gray-200">
                        <i className="fa-solid fa-chart-line text-sky-500 w-6 text-xl text-center mt-1"></i>
                        <div className="ml-4">
                            <h3 className="font-semibold text-gray-800">Track Your Growth</h3>
                            <p className="text-sm text-gray-600">Review past sessions in your calendar and watch your skills improve over time.</p>
                        </div>
                    </div>
                </div>
            </>
        ),
    },
    {
        // NEW Step 3: Learn the fundamentals
        content: (
            <>
                <div className={'bg-sky-100 rounded-full h-40 w-40 flex items-center justify-center mb-8'}>
                    <i className="fa-solid fa-book-open-reader text-5xl text-sky-500"></i>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Learn the Fundamentals</h1>
                <p className="text-gray-600 max-w-sm mb-6">Before you dive in, we recommend reading the introductory articles in our Resource Library. It's the perfect way to refresh your knowledge on:</p>
                <ul className="text-gray-700 space-y-2 max-w-sm text-left mx-auto w-fit font-medium">
                    <li className="flex items-center"><i className="fa-solid fa-star text-yellow-400 mr-3"></i>The Spirit of MI</li>
                    <li className="flex items-center"><i className="fa-solid fa-star text-yellow-400 mr-3"></i>The Core Skills (OARS)</li>
                    <li className="flex items-center"><i className="fa-solid fa-star text-yellow-400 mr-3"></i>The Stages of Change</li>
                </ul>
            </>
        )
    },
    {
        // Step 4: Feedback (Formerly Step 3)
        content: (
            <>
                <div className={'bg-sky-100 rounded-full h-40 w-40 flex items-center justify-center mb-8'}>
                    <i className="fa-solid fa-chart-line text-5xl text-sky-500"></i>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Go Beyond the Transcript</h1>
                <p className="text-gray-600 max-w-sm">Receive instant, actionable feedback. Our AI analyzes your conversation to provide key insights on:</p>
                <ul className="text-gray-600 mt-4 space-y-2 max-w-sm text-left mx-auto w-fit">
                    <li className="flex items-center"><i className="fa-solid fa-check-circle text-green-500 mr-3"></i>What Went Right</li>
                    <li className="flex items-center"><i className="fa-solid fa-check-circle text-green-500 mr-3"></i>Key Areas for Growth</li>
                    <li className="flex items-center"><i className="fa-solid fa-check-circle text-green-500 mr-3"></i>Empathy Score & Talk/Listen Ratio</li>
                    <li className="flex items-center"><i className="fa-solid fa-check-circle text-green-500 mr-3"></i>Specific MI Principles Used</li>
                </ul>
            </>
        )
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onFinish }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const isLastStep = currentStep === onboardingSteps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            onFinish();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-between p-8 text-center">
            <header className="w-full flex justify-end absolute top-4 right-4">
                 <button
                    onClick={onFinish}
                    className="text-sky-600 font-semibold py-2 px-4 rounded-full hover:bg-sky-100 transition-colors duration-300"
                >
                    Skip
                </button>
            </header>

            <main className="flex flex-col items-center justify-center flex-grow w-full mt-12 sm:mt-0 overflow-hidden">
                <div key={currentStep} className="animate-slide-fade-in flex flex-col items-center text-center w-full">
                    {onboardingSteps[currentStep].content}
                </div>
            </main>

            <footer className="w-full max-w-sm">
                <div className="flex justify-center space-x-2 mb-8">
                    {onboardingSteps.map((_, index) => (
                        <div
                            key={index}
                            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${index === currentStep ? 'bg-sky-500' : 'bg-gray-300'}`}
                        ></div>
                    ))}
                </div>
                <div className="space-y-3">
                    <button
                        onClick={handleNext}
                        className="w-full bg-sky-500 text-white font-bold py-4 rounded-full text-lg shadow-md hover:bg-sky-600 transition-colors duration-300"
                    >
                        {isLastStep ? 'Get Started' : 'Next'}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default Onboarding;
