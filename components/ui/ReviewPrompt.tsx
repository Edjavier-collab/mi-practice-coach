
import React from 'react';

interface ReviewPromptProps {
    onClose: (choice: 'rate' | 'later' | 'no') => void;
}

const ReviewPrompt: React.FC<ReviewPromptProps> = ({ onClose }) => {
    // Prevent background scrolling when modal is open
    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center animate-slide-fade-in"
            >
                <div className="mx-auto mb-6 bg-yellow-100 h-20 w-20 rounded-full flex items-center justify-center ring-8 ring-yellow-100/50">
                    <i className="fa-solid fa-star text-4xl text-yellow-400"></i>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Enjoying MI Practice Coach?</h2>
                <p className="text-gray-600 mb-8">
                    Your feedback helps us improve. If you have a moment, please consider leaving a review.
                </p>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => onClose('rate')}
                        className="w-full bg-sky-500 text-white font-bold py-3 px-6 rounded-full text-lg shadow-lg hover:bg-sky-600 transition-transform transform hover:scale-105"
                    >
                        Leave a Review
                    </button>
                    <button 
                        onClick={() => onClose('later')}
                        className="w-full text-gray-600 font-semibold py-3 px-6 rounded-full hover:bg-gray-100 transition"
                    >
                        Remind Me Later
                    </button>
                    <button 
                        onClick={() => onClose('no')}
                        className="w-full text-sm text-gray-400 font-medium py-2 px-6 rounded-full hover:text-gray-600 transition"
                    >
                        No, Thanks
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewPrompt;
