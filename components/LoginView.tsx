import React, { useState } from 'react';
import { View } from '../types';

interface LoginViewProps {
    onLogin: () => void;
    onNavigate: (view: View) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onNavigate }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you would validate credentials here.
        // For this demo, we'll just proceed.
        if (email && password) {
            onLogin();
        } else {
            alert('Please enter a mock email and password.');
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
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                        />
                    </div>
                    <div className="text-right">
                        <button
                            type="button"
                            onClick={() => onNavigate(View.ForgotPassword)}
                            className="text-sm font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
                        >
                            Forgot Password?
                        </button>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors"
                    >
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginView;