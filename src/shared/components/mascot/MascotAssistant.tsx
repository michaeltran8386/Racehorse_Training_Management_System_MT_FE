import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
import { navFor } from "@/shared/lib/permissions";
import { getNotifications, subscribeNotifications } from "@/shared/lib/notifications";
import type { AuthUser } from "@/shared/types/auth";
import { Icon } from "@/shared/components/ui/Icon";
import { cx } from "@/shared/lib/cx";
import { MASCOT_IMAGES, lookDirection, type MascotLook } from "./lookDirection";
import { AssistantChat } from "./AssistantChat";
import { AssistantInbox } from "./AssistantInbox";
import styles from "./MascotAssistant.module.css";

// Linh vật ngựa góc phải dưới: nhìn theo con trỏ (8 ảnh), mở bảng trợ lý: hỏi đáp (BE /ai), việc cần xử lý, lối tắt.
// Nút nào khác cũng mở được bảng qua sự kiện "open-mascot-chat".
const GREETED_KEY = "equiflow-mascot-greeted";
const MAX_SHORTCUTS = 8;

type Tab = "chat" | "inbox" | "shortcuts";

export function MascotAssistant({ user }: { user: AuthUser }) {
  const { isVietnamese, t } = useAppLanguage();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [look, setLook] = useState<MascotLook>("front");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [greeting, setGreeting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const notifications = useSyncExternalStore(subscribeNotifications, getNotifications);
  const unread = notifications.filter((n) => !n.read);

  const shortcuts = useMemo(
    () =>
      navFor(user.role, user.permissions)
        .flatMap((g) => g.items)
        .filter((it) => it.id !== "dashboard")
        .slice(0, MAX_SHORTCUTS),
    [user.role, user.permissions],
  );

  // Lời chào hiện một lần mỗi phiên, sau 2,5 giây.
  useEffect(() => {
    let greeted = false;
    try {
      greeted = sessionStorage.getItem(GREETED_KEY) === "1";
    } catch {
      /* bộ nhớ phiên bị chặn: vẫn chào */
    }
    if (greeted) return;
    const id = window.setTimeout(() => setGreeting(true), 2500);
    return () => clearTimeout(id);
  }, []);

  const dismissGreeting = () => {
    setGreeting(false);
    try {
      sessionStorage.setItem(GREETED_KEY, "1");
    } catch {
      /* bỏ qua */
    }
  };

  // Mở từ bất kỳ đâu: window.dispatchEvent(new CustomEvent("open-mascot-chat"))
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-mascot-chat", onOpen);
    return () => window.removeEventListener("open-mascot-chat", onOpen);
  }, []);

  // Nhìn theo con trỏ khi bảng đang đóng.
  useEffect(() => {
    if (open) {
      setLook("front");
      setTilt({ x: 0, y: 0 });
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        setLook(lookDirection(dx, dy));
        if (!reduced) setTilt({ x: Math.max(-12, Math.min(12, -dy * 0.02)), y: Math.max(-12, Math.min(12, dx * 0.02)) });
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [open]);

  // Đóng bảng: Esc hoặc bấm ra ngoài.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    panelRef.current?.querySelector<HTMLElement>("[role=tab][aria-selected=true]")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const toggle = () => {
    dismissGreeting();
    setOpen((v) => !v);
  };

  // Tên gọi = từ cuối của họ tên, bỏ phần ghi chú trong ngoặc (VD "Michael Tran (Club Manager)").
  const firstName = user.fullName.replace(/\(.*?\)/g, "").trim().split(/\s+/).pop() || user.fullName;

  return (
    <div className={styles.root}>
      {open && (
        <div ref={panelRef} className={styles.panel} role="dialog" aria-label={tr("Quick assistant")}>
          <header className={styles.head}>
            <img className={styles.headAvatar} src={MASCOT_IMAGES.front} alt="" />
            <div className={styles.headText}>
              <strong>{tr("Hi {{name}}, I'm the TMEC assistant", { name: firstName })}</strong>
              <span>{tr("Numbers come from your own data; guides match your role.")}</span>
            </div>
            <Link to="/assistant" className={styles.iconBtn} aria-label={tr("Open TMEC Assistant page")} title={tr("Open TMEC Assistant page")} onClick={() => setOpen(false)}>
              <Icon name="columns" size={16} />
            </Link>
            <button type="button" className={styles.iconBtn} aria-label={tr("Close")} onClick={() => setOpen(false)}>
              <Icon name="x" size={16} />
            </button>
          </header>

          <div className={styles.tabs} role="tablist">
            <button type="button" role="tab" aria-selected={tab === "chat"} className={styles.tab} onClick={() => setTab("chat")}>
              {tr("Chat")}
            </button>
            <button type="button" role="tab" aria-selected={tab === "inbox"} className={styles.tab} onClick={() => setTab("inbox")}>
              {tr("Needs attention")}
              {unread.length > 0 && <span className={styles.count}>{unread.length}</span>}
            </button>
            <button type="button" role="tab" aria-selected={tab === "shortcuts"} className={styles.tab} onClick={() => setTab("shortcuts")}>
              {tr("Shortcuts")}
            </button>
          </div>

          {tab === "chat" ? (
            <div className={styles.chatPanel} role="tabpanel">
              <AssistantChat role={user.role} onNavigate={() => setOpen(false)} />
            </div>
          ) : (
          <div className={styles.body} role="tabpanel">
            {tab === "shortcuts" ? (
              <ul className={styles.shortcuts}>
                {shortcuts.map((it) => (
                  <li key={it.id}>
                    <Link to={it.href} className={styles.shortcut} onClick={() => setOpen(false)}>
                      <Icon name={it.icon} size={18} />
                      <span>{isVietnamese ? t(`nav.${it.i18nKey || it.id}`, it.label) : it.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <AssistantInbox onNavigate={() => setOpen(false)} />
            )}
          </div>
          )}
        </div>
      )}

      {greeting && !open && (
        <div className={styles.bubble} role="status">
          <span>{tr("Hi {{name}}! Ask me about TMEC or your horses.", { name: firstName })}</span>
          <button type="button" className={styles.iconBtn} aria-label={tr("Close")} onClick={dismissGreeting}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        className={cx(styles.mascot, open && styles.mascotOpen)}
        aria-label={tr("Open quick assistant")}
        aria-expanded={open}
        onClick={toggle}
        onMouseEnter={() => setLook("front")}
      >
        {/* Nạp sẵn cả 8 ảnh để đổi hướng không bị nháy. */}
        {(Object.keys(MASCOT_IMAGES) as MascotLook[]).map((k) => (
          <img
            key={k}
            src={MASCOT_IMAGES[k]}
            alt=""
            className={styles.face}
            hidden={k !== look}
            style={{ transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
          />
        ))}
        {unread.length > 0 && !open && <span className={styles.dot} aria-hidden="true" />}
      </button>
    </div>
  );
}
