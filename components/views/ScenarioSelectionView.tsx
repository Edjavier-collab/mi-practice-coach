import React, { useState, useMemo } from 'react';
import { PatientProfileFilters, StageOfChange, DifficultyLevel } from '../../types';
import { PATIENT_PROFILE_TEMPLATES, STAGE_DESCRIPTIONS } from '../../constants';

interface ScenarioSelectionViewProps {
    onBack: () => void;
    onStartPractice: (filters: PatientProfileFilters) => void;
}

const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, string> = {
    [DifficultyLevel.Beginner]: "Patient is generally collaborative and open to the idea of change (e.g., Preparation, Action stages).",
    [DifficultyLevel.Intermediate]: "Patient is ambivalent, weighing the pros and cons of changing their behavior (Contemplation stage).",
    [DifficultyLevel.Advanced]: "Patient does not yet see their behavior as a problem and may be resistant to discussing change (Precontemplation stage).",
};

export const ScenarioSelectionView: React.FC<ScenarioSelectionViewProps> = ({ onBack, onStartPractice }) => {
    const [selectedTopic, setSelectedTopic] = useState('any');
    const [selectedStage, setSelectedStage] = useState('any');
    const [selectedDifficulty, setSelectedDifficulty] = useState('any');

    // Memoize the list of unique topics from the constants file
    const uniqueTopics = useMemo(() => {
        const topics = new Set(PATIENT_PROFILE_TEMPLATES.map(t => t.topic));
        return Array.from(topics).sort();
    }, []);
    
    const allStages = Object.values(StageOfChange);
    const allDifficulties = Object.values(DifficultyLevel);

    const handleStart = () => {
        const filters: PatientProfileFilters = {};
        if (selectedTopic !== 'any') {
            filters.topic = selectedTopic;
        }
        if (selectedStage !== 'any') {
            filters.stageOfChange = selectedStage as StageOfChange;
        } else if (selectedDifficulty !== 'any') {
            // Only apply difficulty if a specific stage isn't chosen
            filters.difficulty = selectedDifficulty as DifficultyLevel;
        }
        onStartPractice(filters);
    };
    
    const handleRandomStart = () => {
        onStartPractice({});
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <header className="flex items-center mb-6 pt-2 max-w-2xl mx-auto">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-200 transition-colors"
                    aria-label="Go back"
                >
                    <i className="fa fa-arrow-left text-xl text-gray-600" aria-hidden="true"></i>
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Choose a Scenario</h1>
            </header>

            <main className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
                    <div>
                        <label htmlFor="topic-select" className="block text-lg font-semibold text-gray-800 mb-2">
                            <i className="fa-solid fa-list-check mr-2 text-sky-600"></i>
                            Topic of Conversation
                        </label>
                        <select
                            id="topic-select"
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            className="w-full p-4 text-base md:text-lg border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                            style={{ fontSize: '16px' }}
                        >
                            <option value="any" style={{ fontSize: '16px' }}>Any Topic</option>
                            {uniqueTopics.map(topic => (
                                <option key={topic} value={topic} style={{ fontSize: '16px' }}>{topic}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="difficulty-select" className="block text-lg font-semibold text-gray-800 mb-2">
                             <i className="fa-solid fa-gauge-high mr-2 text-sky-600"></i>
                            Difficulty Level
                        </label>
                        <select
                            id="difficulty-select"
                            value={selectedDifficulty}
                            onChange={(e) => setSelectedDifficulty(e.target.value)}
                            className="w-full p-4 text-base md:text-lg border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                            style={{ fontSize: '16px' }}
                        >
                            <option value="any" style={{ fontSize: '16px' }}>Any Difficulty</option>
                            {allDifficulties.map(level => (
                                <option key={level} value={level} style={{ fontSize: '16px' }}>{level}</option>
                            ))}
                        </select>
                         {selectedDifficulty !== 'any' && (
                             <p className="text-sm text-gray-600 mt-2 pl-1">{DIFFICULTY_DESCRIPTIONS[selectedDifficulty as DifficultyLevel]}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="stage-select" className="block text-lg font-semibold text-gray-800 mb-2">
                             <i className="fa-solid fa-stairs mr-2 text-sky-600"></i>
                            Stage of Change (Optional)
                        </label>
                        <select
                            id="stage-select"
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value)}
                            className="w-full p-4 text-base md:text-lg border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                            style={{ fontSize: '16px' }}
                        >
                            <option value="any" style={{ fontSize: '16px' }}>Any Stage</option>
                            {allStages.map(stage => (
                                <option key={stage} value={stage} style={{ fontSize: '16px' }}>{stage}</option>
                            ))}
                        </select>
                        {selectedStage !== 'any' && (
                             <p className="text-sm text-gray-600 mt-2 pl-1">{STAGE_DESCRIPTIONS[selectedStage as StageOfChange]}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2 pl-1">Selecting a specific stage will override the difficulty setting.</p>
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                     <button
                        onClick={handleStart}
                        className="w-full bg-sky-500 text-white font-bold py-4 px-6 rounded-full text-lg shadow-lg hover:bg-sky-600 transition-transform transform hover:scale-105"
                    >
                        Start Selected Scenario
                    </button>
                     <button
                        onClick={handleRandomStart}
                        className="w-full bg-slate-600 text-white font-bold py-3 px-6 rounded-full text-md hover:bg-slate-700 transition"
                    >
                        <i className="fa-solid fa-shuffle mr-2"></i>
                        Start a Random Scenario
                    </button>
                </div>
            </main>
        </div>
    );
};

