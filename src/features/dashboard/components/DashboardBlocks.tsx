import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { messageFor } from "@/shared/lib/messages";

import { tr, trNode } from "@/shared/i18n/tr";
export interface Loaded<T> {
  data: T | null;
  error: string;
  loading: boolean;
  reload: () => void;
}

/** Mỗi khối trên dashboard tự tải dữ liệu: một khối lỗi không làm hỏng cả trang. */
export function useLoaded<T>(load: () => Promise<T>, enabled = true): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    load()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError("");
      })
      .catch((err) => alive && setError(messageFor(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // load là hàm gọi API cố định của từng khối; chỉ tải lại khi bấm Try again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick]);

  return { data, error, loading, reload };
}

/** Khung một khối: tiêu đề + 3 trạng thái đang tải / lỗi / có dữ liệu. */
export function Block<T>({
  title,
  subtitle,
  action,
  state,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  state: Loaded<T>;
  empty?: (data: T) => string | null;
  children: (data: T) => ReactNode;
}) {
  let body: ReactNode;
  if (state.loading)
    body = (
      <div aria-busy="true" style={{ display: "grid", gap: 10 }}>
        <span className="sr-only">{tr("Loading…")}</span>
        {[70, 55, 62].map((w) => (
          <span key={w} style={{ display: "block", height: 12, width: `${w}%`, borderRadius: "var(--r-xs)", background: "var(--surface-3)" }} />
        ))}
      </div>
    );
  else if (state.error || !state.data)
    body = (
      <div role="alert" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "10px 12px", borderRadius: "var(--r)", background: "var(--danger-bg)" }}>
        <span style={{ color: "var(--danger)", flex: 1, minWidth: 200 }}>{state.error || tr("Couldn’t load this block.")}</span>
        <Button size="sm" tone="secondary" onClick={state.reload}>{tr("Try again")}</Button>
      </div>
    );
  else {
    const emptyText = empty?.(state.data);
    body = emptyText ? <p style={{ margin: 0, color: "var(--text-muted)" }}>{trNode(emptyText)}</p> : children(state.data);
  }
  return (
    <Card title={title} subtitle={subtitle} action={action}>
      {body}
    </Card>
  );
}

/** Ô số liệu: phẳng, viền 1px. Màu (tone) chỉ tô lên con số khi đó là cảnh báo. */
export function Stat({ label, value, caption, tone }: { label: string; value: ReactNode; caption?: ReactNode; tone?: string }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: "var(--r-lg)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        display: "grid",
        gap: 4,
      }}
    >
      <span style={{ fontSize: "var(--fs-body)", color: "var(--text-2)" }}>{label}</span>
      <strong className="num" style={{ fontSize: "var(--fs-h1)", lineHeight: "36px", color: tone ?? "var(--text)" }}>{value}</strong>
      {caption && <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>{caption}</span>}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 16 }}>{children}</div>
  );
}

export function TwoCols({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 20, alignItems: "start" }}>
      {children}
    </div>
  );
}

/** Một dòng danh sách gọn: chữ chính, chữ phụ, phần bên phải. */
export function Line({ main, sub, right }: { main: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{main}</div>
        {sub && <div style={{ fontSize: "var(--fs-body)", color: "var(--text-muted)" }}>{sub}</div>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}
