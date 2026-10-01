import { useEffect } from "react";

interface UseAssessmentSecurityProps {
  enabled: boolean;
  detectTabSwitch: boolean;
  onViolation: (reason: string) => void;
}

export function useAssessmentSecurity({
  enabled,
  detectTabSwitch,
  onViolation,
}: UseAssessmentSecurityProps) {
  useEffect(() => {
    if (!enabled || !detectTabSwitch) {
      return;
    }

    let lastViolationTime = 0;

    const registerViolation = (reason: string) => {
      const now = Date.now();

      // Prevent multiple browser events caused by
      // the same action from counting as multiple violations.
      if (now - lastViolationTime < 1000) {
        return;
      }

      lastViolationTime = now;

      onViolation(reason);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        registerViolation("Assessment tab was hidden.");
      }
    };

    const handleWindowBlur = () => {
      registerViolation("Assessment window lost focus.");
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "blur",
        handleWindowBlur
      );
    };
  }, [enabled, detectTabSwitch, onViolation]);
}