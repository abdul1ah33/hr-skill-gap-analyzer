import { useEffect, useState } from "react";

interface UseAssessmentTimerProps {
  duration: number;
  questionKey: number;
  onExpire: () => void;
}

export function useAssessmentTimer({
  duration,
  questionKey,
  onExpire,
}: UseAssessmentTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);

  useEffect(() => {
    // Reset timer whenever the question changes.
    setTimeRemaining(duration);

    const interval = window.setInterval(() => {
      setTimeRemaining((previousTime) => {
        if (previousTime <= 1) {
          window.clearInterval(interval);

          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [duration, questionKey]);

  useEffect(() => {
    if (timeRemaining === 0) {
      onExpire();
    }
  }, [timeRemaining, onExpire]);

  return {
    timeRemaining,
  };
}