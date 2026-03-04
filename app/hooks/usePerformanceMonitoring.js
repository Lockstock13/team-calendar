import { useEffect } from "react";

/**
 * Hook untuk monitor Core Web Vitals dan performance metrics.
 */
export function usePerformanceMonitoring() {
  useEffect(() => {
    if (typeof window === "undefined" || !("performance" in window)) return;

    if ("PerformanceObserver" in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          const lcpValue = lastEntry.renderTime || lastEntry.loadTime;
          console.log("[Performance] LCP:", lcpValue, "ms");

          if (lcpValue > 4000) {
            console.warn("[Performance] LCP is slow:", lcpValue);
          }
        });
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            console.log(
              "[Performance] FID/INP:",
              entry.processingDuration,
              "ms",
            );

            if (entry.processingDuration > 100) {
              console.warn(
                "[Performance] Slow interaction:",
                entry.processingDuration,
              );
            }
          });
        });
        fidObserver.observe({ entryTypes: ["first-input", "interaction"] });

        let cls = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          entryList.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          });
          console.log("[Performance] CLS:", cls.toFixed(3));

          if (cls > 0.1) {
            console.warn("[Performance] CLS is poor:", cls.toFixed(3));
          }
        });
        clsObserver.observe({ entryTypes: ["layout-shift"] });

        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
        };
      } catch (err) {
        console.warn("[Performance] Observer setup failed:", err);
      }
    }

    if ("memory" in performance) {
      const checkMemory = () => {
        const mem = performance.memory;
        if (mem.jsHeapSizeLimit > 0) {
          const usage = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;

          if (usage > 80) {
            console.warn(
              "[Performance] High memory usage:",
              usage.toFixed(1) + "%",
            );
          }
        }
      };

      checkMemory();
      const interval = setInterval(checkMemory, 30000);

      return () => clearInterval(interval);
    }
  }, []);
}

export function usePageLoadTiming(pageName) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const measurePageLoad = () => {
      const navigationTiming = performance.getEntriesByType("navigation")[0];
      if (navigationTiming) {
        const metrics = {
          pageLoad: (
            navigationTiming.loadEventEnd - navigationTiming.loadEventStart
          ).toFixed(0),
          connect: (
            navigationTiming.responseEnd - navigationTiming.requestStart
          ).toFixed(0),
          domReady: (
            navigationTiming.domContentLoadedEventEnd -
            navigationTiming.domContentLoadedEventStart
          ).toFixed(0),
          ttfb: (
            navigationTiming.responseStart - navigationTiming.requestStart
          ).toFixed(0),
        };

        console.log(`[Page Load] ${pageName}:`, metrics);

        if (parseInt(metrics.pageLoad) > 3000) {
          console.warn(
            "[Performance] Slow page load:",
            metrics.pageLoad + "ms",
          );
        }
      }
    };

    if (document.readyState === "complete") {
      measurePageLoad();
    } else {
      window.addEventListener("load", measurePageLoad);
      return () => window.removeEventListener("load", measurePageLoad);
    }
  }, [pageName]);
}
