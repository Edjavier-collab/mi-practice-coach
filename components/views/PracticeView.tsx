import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PatientProfile, UserTier, ChatMessage, Feedback } from '../../types';
import { FREE_SESSION_DURATION, PREMIUM_SESSION_DURATION } from '../../constants';
import { createChatSession, getPatientResponse, getFeedbackForTranscript } from '../../services/geminiService';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { Chat } from '@google/genai';
import PatientProfileCard from '../ui/PatientProfileCard';
import ChatBubble from '../ui/ChatBubble';
import Timer from '../ui/Timer';

interface PracticeViewProps {
    patient: PatientProfile;
    userTier: UserTier;
    onFinish: (transcript: ChatMessage[], feedback: Feedback) => void;
}

const SpeechVisualizer: React.FC = () => (
    <div className="flex items-end justify-center space-x-1 pl-3 pr-2 h-6" aria-hidden="true">
        <span className="w-1 h-2 bg-sky-400 rounded-full animate-wavey"></span>
        <span className="w-1 h-4 bg-sky-400 rounded-full animate-wavey" style={{ animationDelay: '0.2s' }}></span>
        <span className="w-1 h-5 bg-sky-400 rounded-full animate-wavey" style={{ animationDelay: '0.4s' }}></span>
        <span className="w-1 h-3 bg-sky-400 rounded-full animate-wavey" style={{ animationDelay: '0.1s' }}></span>
    </div>
);

const PracticeView: React.FC<PracticeViewProps> = ({ patient, userTier, onFinish }) => {
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const [transcript, setTranscript] = useState<ChatMessage[]>([]);
    const [isPatientTyping, setIsPatientTyping] = useState(false);
    const [isEndingSession, setIsEndingSession] = useState(false);
    
    const { isListening, transcript: speechTranscript, startListening, stopListening, hasSupport, error: micError, setTranscript: setSpeechTranscript } = useSpeechRecognition();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const sessionDuration = userTier === UserTier.Premium ? PREMIUM_SESSION_DURATION : FREE_SESSION_DURATION;

    useEffect(() => {
        setChat(createChatSession(patient));
    }, [patient]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [transcript, isPatientTyping]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height to shrink if text is deleted
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${scrollHeight}px`; // Set height to content height
        }
    }, [speechTranscript]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !chat || isPatientTyping) return;

        const newUserMessage: ChatMessage = { author: 'user', text };
        setTranscript(prev => [...prev, newUserMessage]);
        setIsPatientTyping(true);

        try {
            // Pass patient profile to ensure responses are personalized for this specific patient
            const patientResponse = await getPatientResponse(chat, text, patient);
            const newPatientMessage: ChatMessage = { author: 'patient', text: patientResponse };
            setTranscript(prev => [...prev, newPatientMessage]);
        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = { author: 'patient', text: "I'm sorry, I'm having trouble focusing right now." };
            setTranscript(prev => [...prev, errorMessage]);
        } finally {
            setIsPatientTyping(false);
        }
    }, [chat, patient, isPatientTyping]);
    
    const handleVoiceSend = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };
    
    const handleTextSend = () => {
        if (!speechTranscript.trim()) return;
        if (isListening) {
            stopListening();
        }
        handleSendMessage(speechTranscript);
        setSpeechTranscript('');
    };

    const handleEndSession = useCallback(async () => {
        setIsEndingSession(true);
        const feedback = await getFeedbackForTranscript(transcript, patient, userTier);
        onFinish(transcript, feedback);
    }, [transcript, patient, userTier, onFinish]);

    if (!isSessionStarted) {
        return (
            <div className="flex flex-col items-center p-4">
                <PatientProfileCard patient={patient} userTier={userTier} />
                <button 
                    onClick={() => setIsSessionStarted(true)}
                    className="mt-8 bg-green-600 text-white font-bold text-lg py-3 px-10 rounded-lg shadow-md hover:bg-green-700 transition duration-300"
                >
                    Begin Session
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
                <h3 className="font-bold text-lg text-gray-800">Session with {patient.name}</h3>
                <div className="flex items-center space-x-4">
                    <Timer initialSeconds={sessionDuration} onTimeUp={handleEndSession} />
                    <button onClick={handleEndSession} disabled={isEndingSession} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 disabled:bg-red-300 transition">
                        {isEndingSession ? 'Analyzing...' : 'End Session'}
                    </button>
                </div>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-white">
                <div className="space-y-4">
                    {transcript.map((msg, index) => (
                        <ChatBubble key={index} message={msg} />
                    ))}
                    {isPatientTyping && (
                        <div className="animate-slide-fade-in pt-4">
                            <ChatBubble message={{ author: 'patient', text: '...' }} isTyping={true} />
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
                {micError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <i className="fa fa-exclamation-circle"></i>
                        <span>{micError}</span>
                    </div>
                )}
                 <div className="flex items-end space-x-2">
                    <div className="flex-1 flex items-end bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 transition-shadow duration-200">
                        {isListening && <SpeechVisualizer />}
                        <textarea
                            ref={textareaRef}
                            value={speechTranscript}
                            onChange={(e) => setSpeechTranscript(e.target.value)}
                            placeholder={isListening ? "Listening..." : "Type your response or use the microphone..."}
                            className="flex-1 p-3 bg-transparent rounded-lg focus:outline-none resize-none w-full max-h-56 overflow-y-auto"
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleTextSend();
                                }
                            }}
                            disabled={isPatientTyping}
                            readOnly={isListening}
                            style={{ caretColor: isListening ? 'transparent' : 'auto' }}
                        />
                    </div>
                    {hasSupport && (
                        <div className="relative group flex items-center">
                            <button 
                                onClick={handleVoiceSend} 
                                disabled={isPatientTyping} 
                                className={`p-3 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${isListening ? 'bg-red-500 text-white animate-pulse focus:ring-red-500' : 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500'}`}
                                aria-label={isListening ? 'Stop recording' : 'Start recording'}
                            >
                                <i className="fa fa-microphone w-6 h-6"></i>
                            </button>
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 whitespace-nowrap">
                                {isListening ? 'Stop Recording' : 'Start Recording'}
                                <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                            </div>
                        </div>
                    )}
                     <button onClick={handleTextSend} disabled={isPatientTyping || !speechTranscript.trim()} className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:bg-gray-400">
                        <i className="fa fa-paper-plane w-6 h-6"></i>
                    </button>
                </div>
            </div>
            {isEndingSession && (
                 <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center rounded-2xl z-10">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-lg font-semibold text-gray-700">Generating your feedback...</p>
                </div>
            )}
        </div>
    );
};

export default PracticeView;