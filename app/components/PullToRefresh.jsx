"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function PullToRefresh({ children }) {
    const [pulling, setPulling] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const containerRef = useRef(null);
    const PULL_THRESHOLD = 80;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        let startY = 0;
        let isPulling = false;
        let currentPull = 0;

        const onTouchStart = (e) => {
            const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
            if (scrollY <= 0) {
                startY = e.touches[0].clientY;
            } else {
                startY = 0;
            }
        };

        const onTouchMove = (e) => {
            if (refreshing) return;

            const currentY = e.touches[0].clientY;
            const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

            if (scrollY <= 0 && startY === 0) {
                startY = currentY;
                return;
            }

            if (startY > 0 && scrollY <= 0) {
                const pullDistance = currentY - startY;

                if (pullDistance > 0) {
                    isPulling = true;
                    if (e.cancelable) e.preventDefault();
                    currentPull = Math.min(pullDistance, PULL_THRESHOLD + 40);
                    setPulling(currentPull);
                } else {
                    isPulling = false;
                    currentPull = 0;
                    setPulling(0);
                }
            }
        };

        const onTouchEnd = () => {
            if (isPulling && !refreshing) {
                if (currentPull >= PULL_THRESHOLD) {
                    setRefreshing(true);
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                } else {
                    setPulling(0);
                }
            } else {
                setPulling(0);
            }
            startY = 0;
            currentPull = 0;
            isPulling = false;
        };

        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", onTouchEnd, { passive: true });
        el.addEventListener("touchcancel", onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", onTouchEnd);
            el.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [refreshing]);

    return (
        <div ref={containerRef} className="min-h-screen w-full relative">
            <div
                className="absolute top-0 left-0 w-full flex justify-center items-center z-50 overflow-hidden transition-all duration-200 ease-out pointer-events-none"
                style={{
                    height: refreshing ? '60px' : `${pulling}px`,
                    opacity: pulling > 10 || refreshing ? 1 : 0
                }}
            >
                <div
                    className={`w-8 h-8 rounded-full bg-background border shadow-md flex items-center justify-center transition-transform ${refreshing ? 'animate-spin' : ''}`}
                    style={{ transform: `rotate(${pulling * 2}deg) scale(${Math.min(pulling / PULL_THRESHOLD, 1)})` }}
                >
                    <Loader2 className="w-4 h-4 text-muted-foreground" />
                </div>
            </div>
            <div
                style={{
                    transform: refreshing ? `translateY(60px)` : `translateY(${pulling / 2}px)`,
                    transition: pulling === 0 ? 'transform 0.2s ease-out' : 'none'
                }}
            >
                {children}
            </div>
        </div>
    );
}
