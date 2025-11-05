
import React from 'react';
import { ChatMessage } from '../types';

interface ChatBubbleProps {
    message: ChatMessage;
    isTyping?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isTyping = false }) => {
    const isUser = message.author === 'user';

    const bubbleClasses = isUser
        ? 'bg-blue-600 text-white self-end rounded-l-xl rounded-t-xl'
        : 'bg-gray-200 text-gray-800 self-start rounded-r-xl rounded-t-xl';

    const typingIndicator = (
        <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        </div>
    );

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 shadow-sm ${bubbleClasses}`}>
                {isTyping ? typingIndicator : <p className="whitespace-pre-wrap">{message.text}</p>}
            </div>
        </div>
    );
};

export default ChatBubble;