"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DetailTabsProps = {
  labels: string[];
  panels: React.ReactNode[];
};

const MOBILE = "(max-width: 767px)";

/**
 * Tab strip + swipeable panels.
 *
 * On phones the panels become a scroll-snap carousel and the strip switches
 * between them; the container tracks the active panel's height so a short
 * panel never leaves a dead band under the dots. From `md` up every panel is
 * visible at once and the strip and dots are hidden — a wide screen has no
 * reason to hide content behind a gesture.
 */
export function DetailTabs({ labels, panels }: DetailTabsProps) {
  const carRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  const isMobile = () =>
    typeof window !== "undefined" && window.matchMedia(MOBILE).matches;

  const syncHeight = useCallback((index: number) => {
    const car = carRef.current;
    const panel = panelRefs.current[index];
    if (!car) return;
    if (!isMobile() || !panel) {
      car.style.height = "";
      return;
    }
    car.style.height = `${Math.round(panel.getBoundingClientRect().height)}px`;
  }, []);

  useEffect(() => {
    syncHeight(active);
    const onResize = () => syncHeight(active);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, syncHeight]);

  function handleScroll() {
    const car = carRef.current;
    if (!car || !isMobile()) return;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    panelRefs.current.forEach((panel, index) => {
      if (!panel) return;
      const distance = Math.abs(panel.offsetLeft - car.scrollLeft);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    setActive(best);
  }

  function goTo(index: number) {
    const car = carRef.current;
    const panel = panelRefs.current[index];
    if (!car || !panel) return;
    setActive(index);
    car.scrollTo({ left: panel.offsetLeft, behavior: "smooth" });
  }

  return (
    <>
      <div
        aria-label="Detail dashboard"
        className="flex gap-1 rounded-xl border border-[var(--border)] bg-white p-1 md:hidden"
        role="tablist"
      >
        {labels.map((label, index) => (
          <button
            aria-selected={active === index}
            className={`h-9 flex-1 cursor-pointer rounded-lg text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
              active === index
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted-foreground)]"
            }`}
            key={label}
            onClick={() => goTo(index)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="relative -mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
        onScroll={handleScroll}
        ref={carRef}
        style={{ transition: "height 240ms ease" }}
      >
        {panels.map((panel, index) => (
          <div
            className={`w-full shrink-0 snap-start md:w-auto md:shrink [&>section]:h-full ${
              index === 0 ? "md:col-span-2" : ""
            }`}
            key={labels[index] ?? index}
            ref={(node) => {
              panelRefs.current[index] = node;
            }}
          >
            {panel}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5 md:hidden" aria-hidden="true">
        {labels.map((label, index) => (
          <span
            className={`h-1.5 rounded-full transition-all ${
              active === index
                ? "w-5 bg-[var(--primary)]"
                : "w-1.5 bg-[#7c8ba1] opacity-55"
            }`}
            key={label}
          />
        ))}
      </div>
    </>
  );
}
