import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { tr } from "@/shared/i18n/tr";
import { api, ApiError } from "@/shared/lib/api";
import { Icon } from "@/shared/components/ui/Icon";
import { cx } from "@/shared/lib/cx";
import { setMessages, useAssistantMessages, type AssistantAnswer, type ChatCardPayload, type ChatMessage } from "./assistantStore";
import { vndUnit } from "@/shared/lib/format";
import { Badge } from "@/shared/components/ui/Badge";
import styles from "./MascotAssistant.module.css";

// Hỏi đáp với Trợ lý TMEC (POST /ai/assistant/chat): số liệu do BE tính qua công cụ chỉ đọc, AI chỉ diễn giải.
// Câu trả lời luôn có 6 phần: tóm tắt, dữ liệu (+ thời điểm lấy), cảnh báo, nút dẫn màn hình, nguồn, lưu ý.
// Bố cục theo mẫu WeDo: gợi ý 2×2 khi trống, ô nhập 1000 ký tự, Enter gửi, Shift+Enter xuống dòng.

const MAX_CHARS = 1000;
const SUGGESTIONS: Record<string, string[]> = {
  CLUB_MANAGER: [
    "Which supplies are below the minimum threshold?",
    "Does any groom have overlapping shifts this week?",
    "Which horses are under a medical lock right now?",
    "How do I restock the warehouse directly?",
  ],
  HEAD_TRAINER: [
    "How many training sessions are scheduled this week?",
    "Which horses are under a medical lock right now?",
    "How do I create a new training plan?",
    "What is the herd health status today?",
  ],
  VETERINARIAN: [
    "What is the herd health status today?",
    "Which incident reports are still open?",
    "Which horses are under a medical lock right now?",
    "How do I place a training lock?",
  ],
  GROOM: [
    "What are my shifts this week?",
    "Which supplies are below the minimum threshold?",
    "Which horses are under a medical lock right now?",
    "How do I report an incident?",
  ],
  HORSE_OWNER: [
    "Báo cáo chi phí nuôi ngựa tháng này?",
    "Chiến mã của tôi có đủ điều kiện thi đấu giải sắp tới không?",
    "Tổng kết tiền thưởng các giải đua đã tham gia?",
    "Tình trạng sức khỏe và lịch tập của đàn ngựa?",
  ],
};

const ALERT_ICON = { danger: "alert", warn: "alert", info: "info" } as const;
const formatVND = (n: number | string) => `${Number(n || 0).toLocaleString("vi-VN")} ${vndUnit()}`;

export function AssistantChat({ role, onNavigate, variant = "panel" }: { role: string; onNavigate?: () => void; variant?: "panel" | "page" }) {
  const messages = useAssistantMessages();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api<{ used: number; limit: number }>("GET", "/ai/assistant/quota", undefined, { silent: true })
      .then(setQuota)
      .catch(() => setQuota(null));
  }, []);

  // Load conversation history for HORSE_OWNER
  useEffect(() => {
    if (role === "HORSE_OWNER") {
      api<any[]>("GET", "/ai/concierge/history", undefined, { silent: true })
        .then((history) => {
          if (Array.isArray(history) && history.length > 0) {
            const parsed: ChatMessage[] = history.map((h) =>
              h.sender === "USER"
                ? { id: h.id, role: "user", text: h.content }
                : {
                    id: h.id,
                    role: "assistant",
                    result: {
                      traceId: h.id,
                      status: h.cardType ? "ANSWERED" : "INSUFFICIENT_EVIDENCE",
                      summary: h.content,
                      data: [],
                      alerts: [],
                      actions: historyActionsFor(h.cardType),
                      sources: [],
                      disclaimer: null,
                      aiGenerated: Boolean(h.cardType),
                      cached: false,
                      quota: { used: 0, limit: 50 },
                      cardPayload: h.cardType ? { type: h.cardType, data: h.cardData } : null,
                    },
                  },
            );
            setMessages((prev) => (prev.length === 0 ? parsed : prev));
          }
        })
        .catch(() => {});
    }
  }, [role]);

  const handleClear = () => {
    if (role === "HORSE_OWNER") {
      api("POST", "/ai/concierge/clear", undefined, { silent: true }).catch(() => {});
    }
    setMessages(() => []);
  };

  // Giữ tin mới nhất trong khung (khung có chiều cao cố định, không kéo dài trang).
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setDraft("");
    setSending(true);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: message }]);
    try {
      const result = await api<AssistantAnswer>("POST", "/ai/assistant/chat", { message }, { timeoutMs: 30_000 });
      setQuota(result.quota);
      setMessages((prev) => [...prev, { id: result.traceId, role: "assistant", result }]);
    } catch (err) {
      const e = err instanceof ApiError ? err : null;
      const text =
        e?.code === "AI_DAILY_LIMIT_REACHED"
          ? tr("You have used all assistant questions for today.")
          : e?.code === "TIMEOUT"
            ? tr("The assistant took too long to answer. Please try again.")
            : tr("Could not reach the assistant. Please try again.");
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "error", text }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(draft);
    }
  };

  const suggestions = SUGGESTIONS[role] ?? SUGGESTIONS.GROOM;

  return (
    <div className={cx(styles.chat, variant === "page" && styles.chatPage)}>
      <div className={styles.chatBar}>
        <span>
          {quota
            ? tr("{{left}}/{{limit}} questions left today", { left: Math.max(0, quota.limit - quota.used), limit: quota.limit })
            : tr("Read-only assistant")}
        </span>
        <button type="button" className={styles.linkBtn} disabled={messages.length === 0 || sending} onClick={handleClear}>
          <Icon name="refresh" size={14} />
          {tr("New conversation")}
        </button>
      </div>

      <div ref={listRef} className={styles.chatList} aria-live="polite">
        {messages.length === 0 ? (
          <div className={styles.chatEmpty}>
            <strong>{tr("How can I help you today?")}</strong>
            <span>{tr("Ask about your horses, shifts, supplies or costs. Numbers come straight from the system.")}</span>
            <div className={styles.suggestions}>
              {suggestions.map((s) => (
                <button key={s} type="button" className={styles.suggestion} onClick={() => void send(tr(s))}>
                  <span>{tr(s)}</span>
                  <Icon name="arrowRight" size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <p key={m.id} className={styles.msgUser}>
                {m.text}
              </p>
            ) : m.role === "error" ? (
              <p key={m.id} className={styles.msgError} role="alert">
                <Icon name="alert" size={14} />
                {m.text}
              </p>
            ) : (
              <AnswerCard key={m.id} answer={m.result} onNavigate={onNavigate} />
            ),
          )
        )}
        {sending && (
          <p className={styles.msgTyping} role="status">
            {tr("Looking it up…")}
          </p>
        )}
      </div>

      <div className={styles.composer}>
        <textarea
          ref={inputRef}
          className={styles.composerInput}
          value={draft}
          maxLength={MAX_CHARS}
          rows={2}
          placeholder={tr("Ask the TMEC assistant…")}
          aria-label={tr("Ask the TMEC assistant…")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" className={styles.sendBtn} aria-label={tr("Send")} disabled={!draft.trim() || sending} onClick={() => void send(draft)}>
          <Icon name="arrowRight" size={16} />
        </button>
      </div>
      <div className={styles.composerMeta}>
        <span>{tr("Enter to send · Shift + Enter for a new line")}</span>
        <span>
          {draft.length}/{MAX_CHARS}
        </span>
      </div>
      <p className={styles.chatSafety}>
        <Icon name="shield" size={12} />
        {tr("The assistant only reads and suggests. Any data change is made by you, with confirmation.")}
      </p>
    </div>
  );
}

function historyActionsFor(cardType?: string | null): { label: string; route: string }[] {
  if (cardType === "BILLING_CARD" || cardType === "SETTLEMENT_CARD") {
    return [{ label: "Mở Báo cáo tài chính", route: "/financial-reports" }];
  }
  if (cardType === "RACE_CARD") {
    return [{ label: "Xem Giải đua", route: "/races" }];
  }
  if (cardType === "HORSE_CARD") {
    return [{ label: "Xem Hồ sơ ngựa", route: "/horses" }];
  }
  return [];
}

function renderInlineBold(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4
      ? <strong key={idx}>{part.slice(2, -2)}</strong>
      : <span key={idx}>{part}</span>,
  );
}

function AnswerCard({ answer, onNavigate }: { answer: AssistantAnswer; onNavigate?: () => void }) {
  const hasStructuredContent =
    Boolean(answer.cardPayload) ||
    answer.data.length > 0 ||
    answer.sources.length > 0 ||
    answer.actions.length > 0;
  const paragraphs = answer.summary
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={styles.msgBot}>
      {answer.status === "ANSWERED" && hasStructuredContent && (
        <span className={styles.msgTag}>
          <Icon name={answer.aiGenerated ? "sparkles" : "file"} size={12} />
          {answer.aiGenerated ? tr("AI-explained") : tr("From system data")}
          {answer.cached && ` · ${tr("Cached")}`}
        </span>
      )}
      <div className={styles.msgText} style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p key={i} style={{ margin: 0 }}>
              {renderInlineBold(p)}
            </p>
          ))
        ) : (
          <p style={{ margin: 0 }}>{answer.summary}</p>
        )}
      </div>
      {answer.cardPayload && <InteractiveConciergeCard payload={answer.cardPayload} onNavigate={onNavigate} />}

      {answer.data.map((block) => (
        <section key={block.tool} className={styles.dataBlock} aria-label={block.title}>
          <header className={styles.dataHead}>
            <strong>{block.title}</strong>
            <span>{tr("As of {{time}}", { time: new Date(block.asOf).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) })}</span>
          </header>
          {block.rows.length === 0 ? (
            <p className={styles.dataEmpty}>{tr("No rows")}</p>
          ) : (
            <div className={styles.dataScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {block.columns.map((c) => (
                      <th key={c.key} scope="col">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, i) => (
                    <tr key={i}>
                      {block.columns.map((c) => (
                        <td key={c.key}>{row[c.key] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {answer.alerts.length > 0 && (
        <ul className={styles.alerts} aria-label={tr("Alerts")}>
          {answer.alerts.map((a, i) => (
            <li key={i} className={styles[`alert_${a.level}`]}>
              <Icon name={ALERT_ICON[a.level]} size={14} />
              <span>{a.text}</span>
            </li>
          ))}
        </ul>
      )}

      {answer.actions.length > 0 && (
        <div className={styles.actions}>
          {answer.actions.map((a) => (
            <Link key={a.route} to={a.route} className={styles.actionBtn} onClick={onNavigate}>
              {a.label}
              <Icon name="arrowRight" size={12} />
            </Link>
          ))}
        </div>
      )}

      {answer.sources.length > 0 && (
        <ul className={styles.citations} aria-label={tr("Sources")}>
          {answer.sources.map((s) => (
            <li key={s.id} title={s.label}>
              <Icon name={s.type === "tool" ? "layers" : "file"} size={12} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {answer.disclaimer && <small className={styles.msgNote}>{answer.disclaimer}</small>}
    </div>
  );
}


function InteractiveConciergeCard({ payload, onNavigate }: { payload: ChatCardPayload; onNavigate?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const data = payload.data;
  if (!data) return null;

  const billingSummary = data.summary ?? data.level1Summary;
  const billingDrilldown = data.drilldown ?? data.level2Drilldown;
  if (payload.type === "BILLING_CARD" && billingSummary) {
    const s = billingSummary;
    const settlements = billingDrilldown?.raceSettlements || [];
    const trainingAmount = Number(s.totalTraining ?? s.totalFeed ?? 0);
    const raceNetAmount = Number(s.totalRaceNet ?? s.totalRacePayouts ?? 0);
    return (
      <div style={{ margin: "0.5rem 0", padding: "0.75rem", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Icon name="file" size={14} />
            Sao kê tài chính 4 trụ cột
          </strong>
          <Badge tone={s.isSurplus ? "ok" : "warn"}>
            {s.isSurplus ? "Thặng dư (+)" : "Phải thanh toán"}
          </Badge>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.375rem", fontSize: "var(--fs-xs, 0.75rem)" }}>
          <div style={{ padding: "0.375rem 0.5rem", borderRadius: "4px", background: "var(--surface-muted)" }}>
            <span style={{ color: "var(--muted)", display: "block" }}>Nuôi dưỡng:</span>
            <strong>{formatVND(s.totalBoarding)}</strong>
          </div>
          <div style={{ padding: "0.375rem 0.5rem", borderRadius: "4px", background: "var(--surface-muted)" }}>
            <span style={{ color: "var(--muted)", display: "block" }}>Huấn luyện:</span>
            <strong>{formatVND(trainingAmount)}</strong>
          </div>
          <div style={{ padding: "0.375rem 0.5rem", borderRadius: "4px", background: "var(--surface-muted)" }}>
            <span style={{ color: "var(--muted)", display: "block" }}>Thú y:</span>
            <strong>{formatVND(s.totalMedical)}</strong>
          </div>
          <div style={{ padding: "0.375rem 0.5rem", borderRadius: "4px", background: "rgba(16, 185, 129, 0.08)" }}>
            <span style={{ color: "var(--ok)", display: "block" }}>Thưởng giải đua:</span>
            <strong style={{ color: "var(--ok)" }}>-{formatVND(raceNetAmount)}</strong>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.625rem", borderRadius: "6px", background: s.isSurplus ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)" }}>
          <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600 }}>Tổng quyết toán cuối:</span>
          <strong style={{ fontSize: "var(--fs-sm)", color: s.isSurplus ? "var(--ok)" : "var(--brand)" }}>
            {formatVND(s.finalBalanceDue)}
          </strong>
        </div>

        {settlements.length > 0 && (
          <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "0.375rem" }}>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              style={{ background: "none", border: "none", padding: 0, color: "var(--brand)", fontSize: "var(--fs-xs)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <Icon name={expanded ? "chevronUp" : "chevronDown"} size={12} />
              {expanded ? "Thu gọn đối soát giải đua" : `Xem ${settlements.length} đối soát giải đua`}
            </button>
            {expanded && (
              <div style={{ marginTop: "0.375rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {settlements.map((st: any, idx: number) => (
                  <div key={st.tournamentId || st.resultId || idx} style={{ padding: "0.375rem 0.5rem", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "var(--fs-xs)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                      <span>{st.tournamentName}{st.horseName ? ` · ${st.horseName}` : ""}</span>
                      <span>Hạng #{st.finalRank ?? st.rank ?? "—"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: "0.7rem" }}>
                      <span>Tổng giải: {formatVND(st.grossPrize)} · HLV: -{formatVND(st.trainerCut)} · Kỵ sĩ: -{formatVND(st.jockeyCut)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ok)", fontWeight: 600, fontSize: "0.75rem" }}>
                      <span>Thực nhận:</span>
                      <span>+{formatVND(st.netOwnerPayout)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (payload.type === "RACE_CARD" && Array.isArray(data.rows)) {
    return (
      <div style={{ margin: "0.5rem 0", padding: "0.75rem", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Icon name="trophy" size={14} />
            {data.title || "Giải đua sắp diễn ra"}
          </strong>
          <Link to="/races" onClick={onNavigate} style={{ fontSize: "var(--fs-xs)", color: "var(--brand)", fontWeight: 600 }}>
            Xem lịch đua
          </Link>
        </div>
        {data.rows.length === 0 ? (
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>Hiện chưa có giải đua sắp diễn ra.</div>
        ) : (
          data.rows.map((r: any, idx: number) => (
            <div key={idx} style={{ padding: "0.375rem 0.5rem", borderRadius: "4px", background: "var(--surface-muted)", fontSize: "var(--fs-xs)", display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.tournament}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                  {r.date} · {r.distance}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600 }}>{r.fee}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{r.status}</div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  if (payload.type === "SETTLEMENT_CARD" && Array.isArray(data.rows)) {
    return (
      <div style={{ margin: "0.5rem 0", padding: "0.75rem", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <strong style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <Icon name="medal" size={14} />
          {data.title || "Đối soát tiền thưởng thi đấu"}
        </strong>
        {data.rows.map((r: any, idx: number) => (
          <div key={idx} style={{ padding: "0.375rem 0.5rem", borderRadius: "4px", background: "var(--surface-muted)", fontSize: "var(--fs-xs)", display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.tournament}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{r.horse} · {r.rank}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--ok)", fontWeight: 700 }}>{r.netPayout}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>Tổng: {r.grossPrize}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (payload.type === "HORSE_CARD" && Array.isArray(data.horses)) {
    return (
      <div style={{ margin: "0.5rem 0", padding: "0.75rem", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <strong style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <Icon name="horse" size={14} />
          {data.title || "Tình trạng chiến mã"}
        </strong>
        {data.horses.map((h: any, idx: number) => (
          <div key={idx} style={{ padding: "0.375rem 0.5rem", borderRadius: "4px", background: "var(--surface-muted)", fontSize: "var(--fs-xs)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{h.name}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                {h.reason ? `Lý do: ${h.reason}` : `Ô chuồng: ${h.stall || "—"}`}
              </div>
            </div>
            <Badge tone={h.lock === "Có" || Boolean(h.reason) ? "danger" : "ok"}>
              {h.lock === "Có" || Boolean(h.reason) ? "Khóa y tế" : (h.status || "Sẵn sàng")}
            </Badge>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
