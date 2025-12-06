import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PatientProfileFilters, StageOfChange, DifficultyLevel } from '../../types';
import { PATIENT_PROFILE_TEMPLATES, STAGE_DESCRIPTIONS } from '../../constants';

interface ScenarioSelectionViewProps {
    onBack: () => void;
    onStartPractice: (filters: PatientProfileFilters) => void;
}

interface CustomSelectProps {
    id: string;
    label: string;
    icon: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ id, label, icon, value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const selectedOption = options.find(opt => opt.value === value);
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside as EventListener);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside as EventListener);
        };
    }, [isOpen]);
    
    // Close on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);
    
    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };
    
    return (
        <div ref={containerRef} className="relative">
            <label id={`${id}-label`} className="block text-2xl font-bold text-gray-800 mb-4">
                <i className={`${icon} mr-3 text-sky-600`}></i>
                {label}
            </label>
            
            {/* Trigger Button */}
            <button
                type="button"
                id={id}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby={`${id}-label`}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-5 pr-14 text-left text-2xl border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium cursor-pointer transition-all"
                style={{ fontSize: '24px', lineHeight: '1.5', minHeight: '72px' }}
            >
                {selectedOption?.label || 'Select...'}
                <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none" style={{ top: '50%', transform: 'translateY(-50%)', height: 'auto', bottom: 'auto', marginTop: '14px' }}>
                    <i className={`fa-solid fa-chevron-down text-gray-500 text-2xl transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                </div>
            </button>
            
            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <div 
                        className="fixed inset-0 z-40 bg-black/20 sm:hidden" 
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />
                    
                    {/* Options List */}
                    <ul
                        role="listbox"
                        aria-labelledby={`${id}-label`}
                        className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"
                    >
                        {options.map((option, index) => (
                            <li
                                key={option.value}
                                role="option"
                                aria-selected={option.value === value}
                                onClick={() => handleSelect(option.value)}
                                className={`
                                    px-6 py-5 cursor-pointer transition-colors
                                    ${option.value === value 
                                        ? 'bg-sky-50 text-sky-700 font-bold' 
                                        : 'text-gray-800 hover:bg-gray-50'
                                    }
                                    ${index === 0 ? 'rounded-t-xl' : ''}
                                    ${index === options.length - 1 ? 'rounded-b-xl' : ''}
                                    ${index !== options.length - 1 ? 'border-b border-gray-100' : ''}
                                `}
                                style={{ fontSize: '22px', lineHeight: '1.5' }}
                            >
                                {option.value === value && (
                                    <i className="fa-solid fa-check mr-3 text-sky-600"></i>
                                )}
                                {option.label}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

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
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 space-y-8">
                    <CustomSelect
                            id="topic-select"
                        label="Topic of Conversation"
                        icon="fa-solid fa-list-check"
                            value={selectedTopic}
                        onChange={setSelectedTopic}
                        options={[
                            { value: 'any', label: 'Any Topic' },
                            ...uniqueTopics.map(topic => ({ value: topic, label: topic }))
                        ]}
                    />

                    <div>
                        <CustomSelect
                            id="difficulty-select"
                            label="Difficulty Level"
                            icon="fa-solid fa-gauge-high"
                            value={selectedDifficulty}
                            onChange={setSelectedDifficulty}
                            options={[
                                { value: 'any', label: 'Any Difficulty' },
                                ...allDifficulties.map(level => ({ value: level, label: level }))
                            ]}
                        />
                         {selectedDifficulty !== 'any' && (
                            <p className="text-base text-gray-600 mt-3 pl-1 leading-relaxed">{DIFFICULTY_DESCRIPTIONS[selectedDifficulty as DifficultyLevel]}</p>
                        )}
                    </div>

                    <div>
                        <CustomSelect
                            id="stage-select"
                            label="Stage of Change (Optional)"
                            icon="fa-solid fa-stairs"
                            value={selectedStage}
                            onChange={setSelectedStage}
                            options={[
                                { value: 'any', label: 'Any Stage' },
                                ...allStages.map(stage => ({ value: stage, label: stage }))
                            ]}
                        />
                        {selectedStage !== 'any' && (
                            <p className="text-base text-gray-600 mt-3 pl-1 leading-relaxed">{STAGE_DESCRIPTIONS[selectedStage as StageOfChange]}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-3 pl-1 leading-relaxed">Selecting a specific stage will override the difficulty setting.</p>
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
