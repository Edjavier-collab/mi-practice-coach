import React, { useState } from 'react';
import { View } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface LoginViewProps {
    onLogin: () => void;
    onNavigate: (view: View) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onNavigate }) => {
    const { signIn, signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Email format validation
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Google sign-in placeholder (to be implemented later)
    const handleGoogleSignIn = async () => {
        // TODO: Implement Google OAuth sign-in
        console.log('Google sign-in clicked - to be implemented');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        // Validate required fields
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        // Validate email format
        if (!validateEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        // Validate password length for sign up
        if (isSignUp && password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUp(email, password);
            } else {
                await signIn(email, password);
            }
            // onLogin() will be called automatically when user state changes
            // via the useEffect in App.tsx
            onLogin();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <svg className="mx-auto h-12 w-auto text-sky-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w.org/2000/svg"><path d="M21 15C21 16.6569 21 17.4853 20.7397 18.1408C20.5097 18.7212 20.1212 19.2314 19.6166 19.6166C18.9663 20.1212 18.1783 20.3542 16.6023 20.8199L16.2 20.94C15.4 21.18 15 21.3 14.64 21.516C14.3215 21.7046 14.032 21.9366 13.78 22.206C13.21 22.82 12.82 23.58 12 23.58C11.18 23.58 10.79 22.82 10.22 22.206C9.96803 21.9366 9.67848 21.7046 9.36 21.516C9 21.3 8.6 21.18 7.8 20.94L7.39772 20.8199C5.82169 20.3542 5.03367 20.1212 4.38343 19.6166C3.87884 19.2314 3.49033 18.7212 3.26034 18.1408C3 17.4853 3 16.6569 3 15V9C3 7.34315 3 6.51472 3.26034 5.85922C3.49033 5.27879 3.87884 4.76863 4.38343 4.38343C5.03367 3.87884 5.8217 3.64583 7.39772 3.18015L7.8 3.06C8.6 2.82 9 2.7 9.36 2.484C9.67848 2.29544 9.96803 2.06338 10.22 1.794C10.79 1.18 11.18 0.42 12 0.42C12.82 0.42 13.21 1.18 13.78 1.794C14.032 2.06338 14.3215 2.29544 14.64 2.484C15 2.7 15.4 2.82 16.2 3.06L16.6023 3.18015C18.1783 3.64583 18.9663 3.87884 19.6166 4.38343C20.1212 4.76863 20.5097 5.27879 20.7397 5.85922C21 6.51472 21 7.34315 21 9V15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-4">Welcome to MI Practice Coach</h1>
                    <p className="text-gray-500 dark:text-gray-400">Sign in to continue your training.</p>
                </div>
                
                {/* Google Sign-In Button */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full mb-4 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                </button>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or continue with email</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white disabled:opacity-50"
                        />
                    </div>
                    {!isSignUp && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => onNavigate(View.ForgotPassword)}
                                disabled={loading}
                                className="text-sm font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 disabled:opacity-50"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Log In'}
                    </button>
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                            }}
                            disabled={loading}
                            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                        >
                            {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginView;