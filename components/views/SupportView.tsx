import React from 'react';

interface SupportViewProps {
    onBack: () => void;
}

const SupportView: React.FC<SupportViewProps> = ({ onBack }) => {
    return (
        <div className="flex-grow p-4 sm:p-6 bg-slate-50 min-h-full">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6 sm:p-8">
                <button
                    onClick={onBack}
                    className="mb-6 text-sky-600 hover:text-sky-700 flex items-center gap-2"
                    aria-label="Go back to settings"
                >
                    <i className="fa fa-arrow-left" aria-hidden="true"></i>
                    Back
                </button>

                <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact & Support</h1>

                <div className="space-y-8 text-gray-700">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
                        <p className="mb-4">
                            Have questions, feedback, or encountered an issue? We'd love to hear from you. Please reach out using the methods below.
                        </p>
                    </section>

                    <section className="bg-sky-50 border-l-4 border-sky-500 p-6 rounded">
                        <h3 className="text-lg font-semibold text-sky-900 mb-3 flex items-center gap-2">
                            <i className="fa fa-envelope text-sky-500"></i>
                            Email Support
                        </h3>
                        <p className="text-sky-900">
                            <strong>support@mipracticecoach.com</strong>
                        </p>
                        <p className="text-sm text-sky-800 mt-2">
                            Expected response time: 24-48 hours during business days.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <i className="fa fa-comment-dots"></i>
                            FAQ & Help Center
                        </h3>
                        <p className="mb-3">
                            Visit our Help Center for answers to common questions about:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Getting started with MI Practice Coach</li>
                            <li>Account and subscription management</li>
                            <li>Technical troubleshooting</li>
                            <li>Billing and payments</li>
                            <li>Privacy and data access</li>
                        </ul>
                        <p className="mt-4 text-sm">
                            <em>Help Center coming soon</em>
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <i className="fa fa-lightbulb"></i>
                            Feedback & Feature Requests
                        </h3>
                        <p>
                            We value your feedback and use it to improve MI Practice Coach. Share your ideas, suggestions, or report bugs by emailing us at <strong>support@mipracticecoach.com</strong>.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <i className="fa fa-exclamation-triangle"></i>
                            Report a Security Issue
                        </h3>
                        <p>
                            If you discover a security vulnerability, please do NOT report it publicly. Instead, email <strong>security@mipracticecoach.com</strong> with details. We will investigate and address it promptly.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <i className="fa fa-gavel"></i>
                            Legal & Compliance
                        </h3>
                        <p>
                            For legal questions, privacy concerns, or formal requests (GDPR, CCPA, etc.), contact us at <strong>legal@mipracticecoach.com</strong>.
                        </p>
                    </section>

                    <section className="bg-gray-100 p-6 rounded mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Our Office</h3>
                        <p className="text-gray-700">
                            <strong>MI Practice Coach</strong><br />
                            Email: support@mipracticecoach.com<br />
                            <br />
                            We're here to support you! Your experience matters to us.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SupportView;

