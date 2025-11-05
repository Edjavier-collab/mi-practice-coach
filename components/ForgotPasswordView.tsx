import React, { useState } from 'react';

interface ForgotPasswordViewProps {
    onBack: () => void;
}

const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [isSent, setIsSent] = useState(false);

    const handleSendResetLink = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, this would trigger a backend service to send an email.
        // For this demo, we'll just show a success message.
        if (email) {
            console.log(`Password reset link sent to: ${email}`);
            setIsSent(true);
        }
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
                        <p className="text-gray-600 mt-2">
                            We've sent a password reset link to <span className="font-semibold text-gray-800">{email}</span>. Please follow the instructions in the email to reset your password.
                        </p>
                        <button
                            onClick={onBack}
                            className="mt-8 w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors"
                        >
                            Back to Log In
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSendResetLink} className="w-full text-center">
                        <p className="text-gray-600 mb-8">
                            Enter your email address below, and we’ll send you a link to reset your password.
                        </p>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 mb-8"
                        />
                        <button
                            type="submit"
                            className="w-full bg-sky-500 text-white font-bold py-3 px-6 rounded-full text-lg shadow-md hover:bg-sky-600 transition-colors disabled:bg-gray-400"
                            disabled={!email}
                        >
                            Send Reset Link
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordView;
