import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

export function useHighlightTarget(paramName = "highlight", durationMs = 3800) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname, key } = useLocation();
  const targetId = searchParams.get(paramName);
  const [active, setActive] = useState<{ id: string; key: string } | null>(null);

  useEffect(() => {
    if (!targetId) return;
    const id = targetId;
    let element: HTMLElement | null = null;
    let startedAt: number | null = null;
    let cleanupTimer: ReturnType<typeof setTimeout>;
    const removeHighlight = () => {
      element?.classList.remove("highlight-target-attention");
      element?.style.removeProperty("--attention-delay");
      element?.style.removeProperty("--attention-cycle");
    };
    const clearTarget = () => {
      observer.disconnect();
      removeHighlight();
      setActive(null);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (next.get(paramName) === targetId) next.delete(paramName);
        return next;
      }, { replace: true });
    };
    const observer = new MutationObserver(findTarget);
    // Missing/deleted/unauthorized targets must not leave an observer running indefinitely.
    const waitTimer = setTimeout(() => { observer.disconnect(); clearTarget(); }, 30000);

    function findTarget() {
      const candidate = document.getElementById(id) ||
        document.querySelector<HTMLElement>(`[data-highlight-id="${CSS.escape(id)}"]`);
      if (!candidate || candidate === element || candidate.getClientRects().length === 0) return;
      removeHighlight();
      element = candidate;
      clearTimeout(waitTimer);
      const firstMatch = startedAt === null;
      if (firstMatch) startedAt = Date.now();
      element.style.setProperty("--attention-delay", `${-(Date.now() - (startedAt ?? Date.now()))}ms`);
      element.style.setProperty("--attention-cycle", `${durationMs / 2}ms`);
      element.classList.add("highlight-target-attention");
      setActive({ id, key });
      if (firstMatch) {
        element.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
          block: "center",
        });
        cleanupTimer = setTimeout(clearTarget, durationMs);
      }
    }

    observer.observe(document.body, { childList: true, subtree: true });
    findTarget();
    return () => {
      observer.disconnect();
      clearTimeout(waitTimer);
      clearTimeout(cleanupTimer);
      removeHighlight();
    };
  }, [targetId, pathname, key, paramName, durationMs, setSearchParams]);

  return active?.id === targetId && active?.key === key ? active.id : null;
}
