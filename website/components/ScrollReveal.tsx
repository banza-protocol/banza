"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reveal-on-scroll (handoff §2.5): fade + rise as [data-reveal] elements enter
 * the viewport. Content is visible by default (CSS); this only adds the animated
 * entrance when JS + motion are allowed. Honors prefers-reduced-motion.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
