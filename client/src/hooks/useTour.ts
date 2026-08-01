import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useCallback, useEffect, useRef } from "react";

interface UseTourOptions {
  steps: DriveStep[];
  storageKey: string;
  autoStart?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export const useTour = ({
  steps,
  storageKey,
  autoStart = true,
  onComplete,
  onSkip,
}: UseTourOptions) => {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const hasCompletedTour = useCallback(() => {
    return localStorage.getItem(storageKey) === 'true';
  }, [storageKey]);

  const markTourComplete = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const startTour = useCallback(() => {
    // Small delay to ensure DOM elements are rendered
    setTimeout(() => {
      driverRef.current = driver({
        // Core tour behavior
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        
        // Animation & transitions - key for element-anchored movement
        animate: true,
        smoothScroll: true,
        
        // Overlay & spotlight settings
        allowClose: true,
        overlayColor: 'rgba(0, 0, 0, 0.7)',
        stagePadding: 10,
        stageRadius: 8,
        
        // Popover behavior
        popoverClass: 'driver-popover-theme',
        
        // Button labels
        progressText: '{{current}} of {{total}}',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Finish',
        
        // Callbacks
        onDestroyStarted: () => {
          if (driverRef.current?.hasNextStep()) {
            onSkip?.();
          }
          markTourComplete();
          driverRef.current?.destroy();
        },
        onDestroyed: () => {
          onComplete?.();
        },
        
        // Steps with element targeting
        steps,
      });

      driverRef.current.drive();
    }, 500);
  }, [steps, markTourComplete, onComplete, onSkip]);

  const stopTour = useCallback(() => {
    driverRef.current?.destroy();
  }, []);

  // Auto-start tour for first-time users
  useEffect(() => {
    if (autoStart && !hasCompletedTour()) {
      startTour();
    }

    return () => {
      driverRef.current?.destroy();
    };
  }, [autoStart, hasCompletedTour, startTour]);

  return {
    startTour,
    stopTour,
    resetTour,
    hasCompletedTour,
    markTourComplete,
  };
};
