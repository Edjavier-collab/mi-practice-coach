import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { View } from '../../types';

interface EmailConfirmationViewProps {
    email: string;
    onBack: () => void;
    onNavigate: (view: View) => void;
}

const EmailConfirmationView: React.FC<EmailConfirmationViewProps> = ({ email, onBack, onNavigate }) => {
    const { resendSignUpConfirmation } = useAuth();
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendLoading, setResendLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // If email is not provided, redirect back to login
    useEffect(() => {
        if (!email || email.trim() === '') {
            console.warn('[EmailConfirmationView] No email provided, redirecting to login');
            onBack();
        }
    }, [email, onBack]);

    // Handle resend cooldown timer
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

    // Handle resend confirmation email
    const handleResendConfirmation = async () => {
        if (resendCooldown > 0 || !email || email.trim() === '') {
            if (!email || email.trim() === '') {
                setError('Email address is required to resend confirmation');
            }
            return;
        }

        setResendLoading(true);
        setError(null);
        try {
            await resendSignUpConfirmation(email);
            setResendCooldown(60); // 60 second cooldown
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to resend confirmation email. Please try again.';
            setError(errorMessage);
        } finally {
            setResendLoading(false);
        }
    };

    // Handle checking if user has verified their email
    const handleCheckStatus = async () => {
        setCheckingStatus(true);
        setError(null);
        try {
            // Reload the page to check auth state
            // The auth state change listener will detect if user is now logged in
            window.location.reload();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unable to check status. Please try again.';
            setError(errorMessage);
        } finally {
            setCheckingStatus(false);
        }
    };

    // Don't render if email is missing
    if (!email || email.trim() === '') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <svg className="mx-auto h-12 w-auto text-sky-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15C21 16.6569 21 17.4853 20.7397 18.1408C20.5097 18.7212 20.1212 19.2314 19.6166 19.6166C18.9663 20.1212 18.1783 20.3542 16.6023 20.8199L16.2 20.94C15.4 21.18 15 21.3 14.64 21.516C14.3215 21.7046 14.032 21.9366 13.78 22.206C13.21 22.82 12.82 23.58 12 23.58C11.18 23.58 10.79 22.82 10.22 22.206C9.96803 21.9366 9.67848 21.7046 9.36 21.516C9 21.3 8.6 21.18 7.8 20.94L7.39772 20.8199C5.82169 20.3542 5.03367 20.1212 4.38343 19.6166C3.87884 19.2314 3.49033 18.7212 3.26034 18.1408C3 17.4853 3 16.6569 3 15V9C3 7.34315 3 6.51472 3.26034 5.85922C3.49033 5.27879 3.87884 4.76863 4.38343 4.38343C5.03367 3.87884 5.8217 3.64583 7.39772 3.18015L7.8 3.06C8.6 2.82 9 2.7 9.36 2.484C9.67848 2.29544 9.96803 2.06338 10.22 1.794C10.79 1.18 11.18 0.42 12 0.42C12.82 0.42 13.21 1.18 13.78 1.794C14.032 2.06338 14.3215 2.29544 14.64 2.484C15 2.7 15.4 2.82 16.2 3.06L16.6023 3.18015C18.1783 3.64583 18.9663 3.87884 19.6166 4.38343C20.1212 4.76863 20.5097 5.27879 20.7397 5.85922C21 6.51472 21 7.34315 21 9V15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-4">Check Your Email</h1>
                </div>
                
                <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-6 rounded-lg mb-6">
                    <div className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                            <p className="font-semibold mb-2">Account created successfully!</p>
                            <p className="text-sm mb-3">
                                We've sent a confirmation email to <span className="font-medium">{email}</span>
                            </p>
                            <p className="text-sm mb-2">
                                Please check your email and click the confirmation link to activate your account.
                            </p>
                            <p className="text-xs text-green-700 mt-2">
                                <strong>Tip:</strong> Don't see the email? Check your spam folder or try resending below.
                            </p>
                            <p className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded">
                                <strong>Note:</strong> If emails aren't being sent, your Supabase project may need SMTP configuration. 
                                See <code className="text-xs">EMAIL_SETUP.md</code> for setup instructions.
                            </p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendCooldown > 0 || resendLoading}
                        className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Resend Email (${resendCooldown}s)` : 'Resend Email'}
                    </button>

                    <button
                        type="button"
                        onClick={handleCheckStatus}
                        disabled={checkingStatus}
                        className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {checkingStatus ? 'Checking...' : "I've Verified My Email"}
                    </button>

                    <button
                        type="button"
                        onClick={onBack}
                        disabled={resendLoading || checkingStatus}
                        className="w-full text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-sm py-2 disabled:opacity-50"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailConfirmationView;

