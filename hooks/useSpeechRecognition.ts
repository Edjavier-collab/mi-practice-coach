import { useState, useEffect, useRef, useCallback } from 'react';

// Fix: Cast window to any to access non-standard SpeechRecognition APIs and rename the variable to avoid type name collision.
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// Define event types for better type safety, as they are not standard on the SpeechRecognition object type.
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

// Fix: Add an interface for the non-standard SpeechRecognition object to resolve the type error.
interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    start: () => void;
    stop: () => void;
}

export const useSpeechRecognition = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    // Fix: The type SpeechRecognition is now correctly resolved via the interface definition above.
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const finalTranscriptRef = useRef(''); // Ref to hold only the FINAL transcript text
    const stopTriggeredRef = useRef(false); // Flag to ignore late-coming results after stop is called


    useEffect(() => {
        if (!SpeechRecognitionAPI) {
            console.error("SpeechRecognition API not supported in this browser.");
            return;
        }

        const recognition: SpeechRecognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            // If stop was triggered, ignore any lingering results to prevent race conditions
            if (stopTriggeredRef.current) {
                return;
            }

            let interim_transcript = '';
            // Iterate from the last known result index to process only new results.
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                if (result.isFinal) {
                    // Append final results to our ref, ensuring proper spacing.
                    const final_text = result[0].transcript.trim();
                    if (final_text) {
                        finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + final_text;
                    }
                } else {
                    // Accumulate interim results.
                    interim_transcript += result[0].transcript;
                }
            }
            
            // Update the display with the final text plus the current interim text.
            // Ensure proper spacing between final and interim parts.
            const currentFinal = finalTranscriptRef.current;
            const currentInterim = interim_transcript.trim();
            setTranscript(currentFinal + (currentInterim ? (currentFinal ? ' ' : '') + currentInterim : ''));
        };
        
        recognition.onend = () => {
            setIsListening(false);
            stopTriggeredRef.current = false;
            // On end, ensure the displayed transcript is only the final, confirmed text.
            // This cleans up any lingering interim results if recognition ends abruptly.
            setTranscript(finalTranscriptRef.current);
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
            stopTriggeredRef.current = false; // Reset on error too
        };
        
        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            stopTriggeredRef.current = false; // Ensure we are ready for new results
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            stopTriggeredRef.current = true; // Signal to ignore subsequent results
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };
    
    // This function allows components to reset the transcript and ensures the ref is also cleared.
    const customSetTranscript = useCallback((text: string) => {
        finalTranscriptRef.current = text;
        setTranscript(text);
    }, []);
    
    const hasSupport = !!SpeechRecognitionAPI;

    return { isListening, transcript, startListening, stopListening, hasSupport, setTranscript: customSetTranscript };
};