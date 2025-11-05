
import React from 'react';

interface FeedbackCardProps {
    title: string;
    icon: string;
    color: 'green' | 'yellow' | 'blue';
    children: React.ReactNode;
}

const colorClasses = {
    green: {
        bg: 'bg-green-50',
        iconBg: 'bg-green-100',
        iconText: 'text-green-600',
    },
    yellow: {
        bg: 'bg-yellow-50',
        iconBg: 'bg-yellow-100',
        iconText: 'text-yellow-600',
    },
    blue: {
        bg: 'bg-blue-50',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
    },
};

const FeedbackCard: React.FC<FeedbackCardProps> = ({ title, icon, color, children }) => {
    const classes = colorClasses[color];

    return (
        <div className={`p-6 rounded-2xl ${classes.bg}`}>
            <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${classes.iconBg}`}>
                    <i className={`fa ${icon} text-xl ${classes.iconText}`}></i>
                </div>
                <div>
                    <h4 className="text-lg font-bold text-gray-800 mb-2">{title}</h4>
                    <div className="text-gray-700 leading-relaxed">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedbackCard;
