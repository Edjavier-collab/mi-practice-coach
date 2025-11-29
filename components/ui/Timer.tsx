
import React, { useState, useEffect } from 'react';

interface TimerProps {
    initialSeconds: number;
    onTimeUp: () => void;
}

const Timer: React.FC<TimerProps> = ({ initialSeconds, onTimeUp }) => {
    const [seconds, setSeconds] = useState(initialSeconds);

    useEffect(() => {
        if (seconds <= 0) {
            onTimeUp();
            return;
        }

        const timerId = setInterval(() => {
            setSeconds(prevSeconds => prevSeconds - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [seconds, onTimeUp]);

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    const timeColor = seconds <= 30 ? 'text-red-500' : 'text-gray-700';

    return (
        <div className={`font-mono text-lg font-bold ${timeColor}`}>
            <i className="far fa-clock mr-2"></i>
            {String(minutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
        </div>
    );
};

export default Timer;
