import { useEffect, useRef } from "react";

/**
 * Custom hook to detect swipe gestures on touch devices.
 * Useful for mobile calendar navigation and modal dismissal.
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  timeout = 1000,
} = {}) {
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTouchStart = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e) => {
      const touch = e.changedTouches?.[0];
      if (!touch) return;

      const start = touchStartRef.current;

      if (Date.now() - start.time > timeout) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX > absDeltaY && absDeltaX > threshold) {
        if (deltaX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
        if (deltaY < 0) {
          onSwipeUp?.();
        } else {
          onSwipeDown?.();
        }
      }
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, timeout]);
}

export function useSwipeDismiss(onDismiss, threshold = 100) {
  const touchStartRef = useRef({ y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTouchStart = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;

      touchStartRef.current = {
        y: touch.clientY,
      };
    };

    const handleTouchEnd = (e) => {
      const touch = e.changedTouches?.[0];
      if (!touch) return;

      const deltaY = touch.clientY - touchStartRef.current.y;
      if (deltaY > threshold) {
        onDismiss?.();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onDismiss, threshold]);
}
