import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { tr } from "@/shared/i18n/tr";
import { api, ApiError } from "@/shared/lib/api";
import { Icon } from "@/shared/components/ui/Icon";
import { cx } from "@/shared/lib/cx";
import { setMessages, useAssistantMessages, type AssistantAnswer } from "./assistantStore";
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
    "What is the total cost of keeping my horses?",
    "List my horses",
    "What is the health status of my horses?",
    "How do I export an invoice to PDF?",
  ],
};

const ALERT_ICON = { danger: "alert", warn: "alert", info: "info" } as const;

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
        <button type="button" className={styles.linkBtn} disabled={messages.length === 0 || sending} onClick={() => setMessages(() => [])}>
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

function AnswerCard({ answer, onNavigate }: { answer: AssistantAnswer; onNavigate?: () => void }) {
  return (
    <div className={styles.msgBot}>
      {answer.status === "ANSWERED" && (
        <span className={styles.msgTag}>
          <Icon name={answer.aiGenerated ? "sparkles" : "file"} size={12} />
          {answer.aiGenerated ? tr("AI-explained") : tr("From system data")}
          {answer.cached && ` · ${tr("Cached")}`}
        </span>
      )}
      <p className={styles.msgText}>{answer.summary}</p>

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
