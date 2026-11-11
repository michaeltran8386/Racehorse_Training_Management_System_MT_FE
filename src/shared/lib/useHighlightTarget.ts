import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useHighlightTarget(paramName = "highlight", durationMs = 4500) {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetId = searchParams.get(paramName);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId) {
      setActiveId(null);
      return;
    }

    const id = targetId;
    let targetElement: HTMLElement | null = null;
    let animationTimer: ReturnType<typeof setTimeout> | null = null;
    let isCleanedUp = false;

    function applyHighlight(element: HTMLElement) {
      if (isCleanedUp) return;
      targetElement = element;
      element.classList.add("highlight-target-attention");
      setActiveId(id);

      element.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "center",
        inline: "nearest",
      });

      animationTimer = setTimeout(() => {
        if (isCleanedUp) return;
        element.classList.remove("highlight-target-attention");
        setActiveId(null);

        setSearchParams(
          (curr) => {
            const next = new URLSearchParams(curr);
            if (next.get(paramName) === id) {
              next.delete(paramName);
            }
            return next;
          },
          { replace: true }
        );
      }, durationMs);
    }

    function checkDOM(): boolean {
      let el = document.getElementById(id);
      if (!el) {
        try {
          el = document.querySelector<HTMLElement>(`[data-highlight-id="${CSS.escape(id)}"]`);
        } catch {}
      }
      if (!el) {
        try {
          el = document.querySelector<HTMLElement>(`[data-highlight-code="${CSS.escape(id)}"]`);
        } catch {}
      }
      if (!el) {
        try {
          el = document.querySelector<HTMLElement>(`[data-highlight-code*="${CSS.escape(id)}"]`);
        } catch {}
      }
      if (!el) {
        try {
          el = document.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(id)}"]`);
        } catch {}
      }

      if (el && el.getClientRects().length > 0) {
        observer.disconnect();
        clearTimeout(timeoutTimer);
        applyHighlight(el);
        return true;
      }
      return false;
    }

    const observer = new MutationObserver(() => {
      checkDOM();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    checkDOM();

    // Limit observation window to 15 seconds
    const timeoutTimer = setTimeout(() => {
      observer.disconnect();
    }, 15000);

    return () => {
      isCleanedUp = true;
      observer.disconnect();
      clearTimeout(timeoutTimer);
      if (animationTimer) clearTimeout(animationTimer);
      if (targetElement) {
        targetElement.classList.remove("highlight-target-attention");
      }
    };
  }, [targetId, paramName, durationMs, setSearchParams]);

  return activeId;
}
