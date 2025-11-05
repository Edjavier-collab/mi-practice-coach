
import React from 'react';
import { CoachingSummary } from '../types';

interface CoachingSummaryViewProps {
    isLoading: boolean;
    summary: CoachingSummary | null;
    error: string | null;
    onBack: () => void;
}

const sectionIcons: { [key: string]: string } = {
    'Strengths & Positive Trends': 'fa-solid fa-person-running',
    'Areas for Continued Focus': 'fa-solid fa-bullseye',
    'Summary & Next Steps': 'fa-solid fa-rocket',
};

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const renderLine = (line: string, index: number) => {
        if (line.startsWith('* ')) {
            return (
                <li key={index} className="text-gray-700 leading-relaxed">
                    {line.substring(2)}
                </li>
            );
        }
        return <p key={index} className="text-gray-700 leading-relaxed">{line}</p>;
    };

    const lines = text.split('\n').filter(line => line.trim() !== '');
    // Fix: Use React.JSX.Element to explicitly reference the type from the React namespace, resolving "Cannot find namespace 'JSX'".
    const elements: React.JSX.Element[] = [];
    let listChildren: React.JSX.Element[] = [];

    const endList = () => {
        if (listChildren.length > 0) {
            elements.push(<ul key={`ul-${elements.length}`} className="list-disc space-y-2 mt-2 pl-5">{listChildren}</ul>);
            listChildren = [];
        }
    };

    lines.forEach((line, index) => {
        if (line.startsWith('* ')) {
            listChildren.push(renderLine(line, index));
        } else {
            endList();
            elements.push(renderLine(line, index));
        }
    });

    endList(); // Append any remaining list items

    return <>{elements}</>;
};

const SummarySectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-sky-700 mb-4 flex items-center">
            <i className={`${sectionIcons[title] || 'fa-solid fa-clipboard-list'} mr-4 w-6 text-center text-2xl`}></i>
            {title}
        </h2>
        <div className="pl-10 space-y-3 prose prose-slate max-w-none">
            {children}
        </div>
    </div>
);

const CoachingSummaryView: React.FC<CoachingSummaryViewProps> = ({ isLoading, summary, error, onBack }) => {

    const handleDownloadPdf = () => {
        window.print();
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-center py-20">
                    <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-lg font-semibold text-gray-700">Our AI coach is analyzing your sessions...</p>
                    <p className="text-gray-500 mt-1">This may take a moment.</p>
                </div>
            );
        }

        if (error) {
            return (
                 <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-red-200">
                    <i className="fa-solid fa-circle-exclamation text-5xl text-red-400 mb-4"></i>
                    <h2 className="text-xl font-bold text-slate-700">Could Not Generate Summary</h2>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">{error}</p>
                </div>
            );
        }

        if (summary) {
            return (
                 <div className="animate-slide-fade-in">
                     <div className="printable-area bg-slate-100 p-0 sm:p-2">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                                <div className="flex items-center">
                                    <div className="bg-sky-100 text-sky-600 rounded-xl p-4 mr-4">
                                        <i className="fa-solid fa-chart-pie text-4xl"></i>
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-500 uppercase">Performance Overview</h2>
                                        <p className="text-gray-500 mt-1">{summary.dateRange}</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-5xl font-extrabold text-gray-800">{summary.totalSessions}</p>
                                    <p className="text-sm font-semibold text-gray-500">Sessions Analyzed</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <SummarySectionCard title="Strengths & Positive Trends">
                                <MarkdownRenderer text={summary.strengthsAndTrends} />
                            </SummarySectionCard>
                            <SummarySectionCard title="Areas for Continued Focus">
                                <MarkdownRenderer text={summary.areasForFocus} />
                            </SummarySectionCard>
                            <SummarySectionCard title="Summary & Next Steps">
                                <MarkdownRenderer text={summary.summaryAndNextSteps} />
                            </SummarySectionCard>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center py-20">
                <p className="text-gray-500">No summary available. Please go back and try generating one.</p>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <header className="flex items-center justify-between mb-6 pt-2 max-w-4xl mx-auto no-print">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-200 transition-colors">
                        <i className="fa fa-arrow-left text-xl text-gray-600"></i>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Coaching Summary</h1>
                </div>
                {!isLoading && (
                     <button
                        onClick={handleDownloadPdf}
                        disabled={!summary}
                        className="bg-sky-500 text-white font-bold py-2 px-4 rounded-full shadow-md hover:bg-sky-600 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        <i className="fa-solid fa-file-arrow-down mr-2"></i>
                        Download
                    </button>
                )}
            </header>

            <main className="max-w-3xl mx-auto">
                {renderContent()}
            </main>
        </div>
    );
};

export default CoachingSummaryView;