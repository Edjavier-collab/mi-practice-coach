
import React from 'react';
import { PatientProfile, StageOfChange, UserTier } from '../types';

interface PatientProfileCardProps {
    patient: PatientProfile;
    userTier?: UserTier;
}

interface InfoSectionProps {
    icon: string;
    title: string;
    children: React.ReactNode;
    colorClassName: string;
}

const InfoSection: React.FC<InfoSectionProps> = ({ icon, title, children, colorClassName }) => (
    <div>
        <h3 className={`text-sm font-semibold ${colorClassName} uppercase flex items-center mb-2`}>
            <i className={`fa-solid ${icon} w-6 text-center mr-2`}></i>
            {title}
        </h3>
        <div className="text-gray-700 space-y-2 pl-8">
            {children}
        </div>
    </div>
);

const stageColors: Record<StageOfChange, string> = {
    [StageOfChange.Precontemplation]: 'bg-red-100 text-red-800',
    [StageOfChange.Contemplation]: 'bg-yellow-100 text-yellow-800',
    [StageOfChange.Preparation]: 'bg-blue-100 text-blue-800',
    [StageOfChange.Action]: 'bg-green-100 text-green-800',
    [StageOfChange.Maintenance]: 'bg-purple-100 text-purple-800',
};


const PatientProfileCard: React.FC<PatientProfileCardProps> = ({ patient, userTier }) => {
    const isFreeTier = userTier === UserTier.Free;

    const abbreviate = (text: string): string => {
        const sentences = text.split('.');
        if (sentences.length > 1 && sentences[0]) {
            return sentences[0] + '.';
        }
        return text;
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl mx-auto shadow-sm overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
                    <p className="text-gray-500">{patient.age}, {patient.sex}</p>
                </div>
                <div className={`px-3 py-1 text-sm font-bold rounded-full ${stageColors[patient.stageOfChange]}`}>
                    {patient.stageOfChange}
                </div>
            </header>

            <main className="py-6 px-6 space-y-6">
                <InfoSection icon="fa-file-waveform" title="Relevant History" colorClassName="text-sky-600">
                    <p>{isFreeTier ? abbreviate(patient.history) : patient.history}</p>
                </InfoSection>

                {!isFreeTier && (
                    <>
                        <InfoSection icon="fa-user" title="Background" colorClassName="text-teal-600">
                            <p>{patient.background}</p>
                        </InfoSection>

                        <InfoSection icon="fa-clipboard-question" title="Presenting Problem" colorClassName="text-amber-600">
                             <p>{patient.presentingProblem}</p>
                        </InfoSection>
                    </>
                )}

                 <div>
                    <h3 className="text-sm font-semibold text-indigo-600 uppercase flex items-center mb-2">
                        <i className="fa-solid fa-quote-left w-6 text-center mr-2"></i>
                        Chief Complaint
                    </h3>
                    <blockquote className="border-l-4 border-indigo-500 bg-indigo-50 p-4 rounded-r-lg ml-8">
                        <p className="text-gray-800 italic leading-relaxed">"{patient.chiefComplaint}"</p>
                    </blockquote>
                </div>
            </main>

            {isFreeTier && (
                <footer className="bg-slate-50 border-t border-gray-200 px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                        <i className="fa-solid fa-lock text-slate-400 mr-3"></i>
                        <p className="text-sm font-medium text-slate-600">
                            Upgrade to Premium to view the patient's complete profile.
                        </p>
                    </div>
                </footer>
            )}
        </div>
    );
};

export default PatientProfileCard;
