import React, { useMemo } from 'react';
import { checkPasswordStrength, PasswordStrength } from '../../utils/validation';

interface PasswordStrengthIndicatorProps {
    password: string;
    showFeedback?: boolean;
    className?: string;
}

/**
 * Password Strength Indicator Component
 * 
 * Shows a visual indicator of password strength with optional feedback.
 * 
 * @example
 * <PasswordStrengthIndicator password={password} showFeedback />
 */
const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
    password,
    showFeedback = true,
    className = ''
}) => {
    const strength = useMemo((): PasswordStrength => {
        return checkPasswordStrength(password);
    }, [password]);

    // Don't show anything for empty passwords
    if (!password) {
        return null;
    }

    return (
        <div className={`mt-2 ${className}`} role="status" aria-live="polite">
            {/* Strength Bar */}
            <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 flex gap-1" aria-hidden="true">
                    {[0, 1, 2, 3].map((index) => (
                        <div
                            key={index}
                            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                                index < strength.score
                                    ? strength.color
                                    : 'bg-gray-200'
                            }`}
                        />
                    ))}
                </div>
                <span 
                    className={`text-xs font-medium ${
                        strength.score >= 3 
                            ? 'text-green-600' 
                            : strength.score >= 2 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                    }`}
                >
                    {strength.label}
                </span>
            </div>

            {/* Screen reader text */}
            <span className="sr-only">
                Password strength: {strength.label}. 
                {strength.feedback.length > 0 && `Suggestions: ${strength.feedback.join(', ')}`}
            </span>

            {/* Feedback suggestions */}
            {showFeedback && strength.feedback.length > 0 && (
                <ul className="text-xs text-gray-500 space-y-0.5 mt-1">
                    {strength.feedback.map((suggestion, index) => (
                        <li key={index} className="flex items-center gap-1">
                            <svg 
                                className="w-3 h-3 text-gray-400" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                                />
                            </svg>
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}

            {/* Success message when password is strong enough */}
            {strength.isValid && strength.score >= 3 && (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <svg 
                        className="w-3 h-3" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M5 13l4 4L19 7" 
                        />
                    </svg>
                    Great password choice!
                </p>
            )}
        </div>
    );
};

export default PasswordStrengthIndicator;

