import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ForgotPasswordViewProps {
    onBack: () => void;
}

const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onBack }) => {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [isSent, setIsSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Handle countdown timer for resend email
    useEffect(() => {
        if (resendCooldown > 0) {
            intervalRef.current = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [resendCooldown]);

    const handleSendResetLink = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        setError(null);
        
        if (!email) {
            setError('Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(email);
            setIsSent(true);
            setResendCooldown(60); // Start 60-second countdown
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send password reset email. Please try again.';
            setError(errorMessage);
            setIsSent(false);
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        if (resendCooldown > 0) {
            return; // Prevent resending during cooldown
        }
        await handleSendResetLink();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col p-4">
            <header className="flex items-center w-full max-w-sm mx-auto pt-4">
                <button onClick={onBack} className="p-2 -ml-2">
                    <i className="fa fa-arrow-left text-2xl text-gray-600"></i>
                </button>
                <h1 className="text-2xl font-bold text-gray-800 mx-auto -translate-x-4">
                    Forgot Password
                </h1>
            </header>

            <div className="flex-grow flex flex-col justify-center items-center w-full max-w-sm mx-auto">
                {isSent ? (
                    <div className="text-center animate-slide-fade-in">
                        <div className="mx-auto mb-6 bg-green-100 h-20 w-20 rounded-full flex items-center justify-center">
                            <i className="fa-solid fa-check text-4xl text-green-500"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Check Your Email</h2>
                        <p className="text-gray-600 mt-2 mb-4">
                            We've sent a password reset link to <span className="font-semibold text-gray-800">{email}</span>. Please follow the instructions in the email to reset your password.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                            <p className="text-sm text-gray-700">
                                <i className="fa-solid fa-info-circle text-blue-500 mr-2"></i>
                                <strong>Didn't receive the email?</strong>
                            </p>
                            <ul className="text-sm text-gray-600 mt-2 ml-6 list-disc space-y-1">
                                <li>Check your spam or junk folder</li>
                                <li>Make sure you entered the correct email address</li>
                                <li>Wait a few minutes and try again</li>
                            </ul>
                        </div>
                        {resendCooldown > 0 ? (
                            <p className="text-sm text-gray-500 mb-4">
                                You can request another email in {resendCooldown} second{resendCooldown !== 1 ? 's' : ''}.
                            </p>
                        ) : (
                            <button
                                onClick={handleResendEmail}
                                disabled={loading}
                                className="mb-4 w-full text-sm text-sky-600 hover:text-sky-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending...' : 'Resend Email'}
                            </button>
                        )}
                        <button
                            onClick={onBack}
                            className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors"
                        >
                            Back to Log In
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSendResetLink} className="w-full text-center">
                        <p className="text-gray-600 mb-8">
                            Enter your email address below, and we'll send you a link to reset your password.
                        </p>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                                {error}
                            </div>
                        )}
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 mb-8 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            className="w-full bg-sky-500 text-white font-bold py-3 px-6 rounded-full text-lg shadow-md hover:bg-sky-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            disabled={!email || loading}
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordView;
