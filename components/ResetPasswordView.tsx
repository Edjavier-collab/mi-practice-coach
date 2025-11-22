import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

interface ResetPasswordViewProps {
    onBack: () => void;
    onSuccess: () => void;
}

const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onBack, onSuccess }) => {
    const { updatePassword, signOut } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

    // Check if we have a valid reset token from URL
    useEffect(() => {
        const checkToken = async () => {
            if (!isSupabaseConfigured()) {
                setIsValidToken(false);
                setError('Password reset is not available in offline mode.');
                return;
            }

            try {
                const supabase = getSupabaseClient();
                
                // Check URL hash for recovery token first
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const type = hashParams.get('type');
                
                // If we have a recovery token in the URL, Supabase will process it
                // and create a session automatically via auth state change
                if (accessToken && type === 'recovery') {
                    // Wait a moment for Supabase to process the token
                    setTimeout(async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                            setIsValidToken(true);
                        } else {
                            setIsValidToken(false);
                            setError('Invalid or expired reset link. Please request a new password reset.');
                        }
                    }, 500);
                } else {
                    // Check if we already have a session (token was already processed)
                    const { data: { session } } = await supabase.auth.getSession();
                    
                    if (session) {
                        setIsValidToken(true);
                    } else {
                        setIsValidToken(false);
                        setError('Invalid or expired reset link. Please request a new password reset.');
                    }
                }
            } catch (err) {
                setIsValidToken(false);
                setError('Failed to validate reset link. Please try again.');
            }
        };

        checkToken();
    }, []);

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) {
            return 'Password must be at least 8 characters long.';
        }
        if (!/(?=.*[a-z])/.test(pwd)) {
            return 'Password must contain at least one lowercase letter.';
        }
        if (!/(?=.*[A-Z])/.test(pwd)) {
            return 'Password must contain at least one uppercase letter.';
        }
        if (!/(?=.*\d)/.test(pwd)) {
            return 'Password must contain at least one number.';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!password || !confirmPassword) {
            setError('Please enter both password fields.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setLoading(true);
        try {
            await updatePassword(password);
            // Sign out the user after password reset so they can log in with new password
            try {
                await signOut();
            } catch (signOutError) {
                console.warn('[ResetPasswordView] Error signing out after password reset:', signOutError);
                // Continue anyway - we'll still navigate to login
            }
            // Clear URL hash to remove token
            window.history.replaceState({}, '', window.location.pathname);
            onSuccess();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (isValidToken === null) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col p-4">
                <div className="flex-grow flex flex-col justify-center items-center w-full max-w-sm mx-auto">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Validating reset link...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isValidToken === false) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col p-4">
                <header className="flex items-center w-full max-w-sm mx-auto pt-4">
                    <button onClick={onBack} className="p-2 -ml-2">
                        <i className="fa fa-arrow-left text-2xl text-gray-600"></i>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 mx-auto -translate-x-4">
                        Reset Password
                    </h1>
                </header>

                <div className="flex-grow flex flex-col justify-center items-center w-full max-w-sm mx-auto">
                    <div className="text-center">
                        <div className="mx-auto mb-6 bg-red-100 h-20 w-20 rounded-full flex items-center justify-center">
                            <i className="fa-solid fa-exclamation-triangle text-4xl text-red-500"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Invalid Reset Link</h2>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                                {error}
                            </div>
                        )}
                        <p className="text-gray-600 mb-6">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <button
                            onClick={onBack}
                            className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col p-4">
            <header className="flex items-center w-full max-w-sm mx-auto pt-4">
                <button onClick={onBack} className="p-2 -ml-2">
                    <i className="fa fa-arrow-left text-2xl text-gray-600"></i>
                </button>
                <h1 className="text-2xl font-bold text-gray-800 mx-auto -translate-x-4">
                    Reset Password
                </h1>
            </header>

            <div className="flex-grow flex flex-col justify-center items-center w-full max-w-sm mx-auto">
                <form onSubmit={handleSubmit} className="w-full">
                    <p className="text-gray-600 mb-6 text-center">
                        Enter your new password below.
                    </p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                            {error}
                        </div>
                    )}
                    <div className="mb-4">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter new password"
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Must be at least 8 characters with uppercase, lowercase, and a number.
                        </p>
                    </div>
                    <div className="mb-6">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-sky-500 text-white font-bold py-3 px-6 rounded-full text-lg shadow-md hover:bg-sky-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={!password || !confirmPassword || loading}
                    >
                        {loading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordView;

