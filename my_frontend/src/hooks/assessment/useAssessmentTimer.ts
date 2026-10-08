import { useEffect, useRef, useState } from "react";

interface UseAssessmentTimerProps {
  /** Time (ms since epoch) the countdown ends; null = not running. */
  deadline: number | null;
  onExpire: () => void;
}

/**
 * Seconds left until `deadline`, ticking every 250 ms. Calls onExpire once
 * per deadline. Deadlines come from the server (expires_at), so the client
 * timer can never give more time than the server allows.
 */
export function useAssessmentTimer({ deadline, onExpire }: UseAssessmentTimerProps) {
  const [now, setNow] = useState(() => Date.now());
  const expiredFor = useRef<number | null>(null);

  useEffect(() => {
    if (deadline === null) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [deadline]);

  const timeRemaining = deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));

  useEffect(() => {
    if (deadline !== null && timeRemaining === 0 && expiredFor.current !== deadline) {
      expiredFor.current = deadline;
      onExpire();
    }
  }, [deadline, timeRemaining, onExpire]);

  return { timeRemaining };
}
