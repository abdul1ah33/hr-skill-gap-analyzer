import { useEffect } from "react";

import type { ViolationReason } from "../../types/assessment";

interface UseAssessmentSecurityProps {
  enabled: boolean;
  onViolation: (reason: ViolationReason) => void;
}

/**
 * Watches for leaving the assessment (tab hidden, window blur, leaving
 * fullscreen) and blocks copy / cut / paste / context menu. Each violation is
 * reported once, even when one action fires several browser events.
 *
 * This is a deterrent, not a guarantee: a modified client can skip it.
 */
export function useAssessmentSecurity({ enabled, onViolation }: UseAssessmentSecurityProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let lastViolationTime = 0;

    const registerViolation = (reason: ViolationReason) => {
      const now = Date.now();

      // One action (e.g. alt-tab) fires blur + visibilitychange; count it once
      if (now - lastViolationTime < 1000) {
        return;
      }

      lastViolationTime = now;
      onViolation(reason);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        registerViolation("tab_hidden");
      }
    };

    const handleWindowBlur = () => registerViolation("window_blur");

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        registerViolation("fullscreen_exit");
      }
    };

    const handleCopy = (event: Event) => {
      event.preventDefault();
      registerViolation("copy_attempt");
    };

    const blockEvent = (event: Event) => event.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCopy);
    document.addEventListener("paste", blockEvent);
    document.addEventListener("contextmenu", blockEvent);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCopy);
      document.removeEventListener("paste", blockEvent);
      document.removeEventListener("contextmenu", blockEvent);
    };
  }, [enabled, onViolation]);
}
