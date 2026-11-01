import { useEffect, useState } from "react";
import { useAppLanguage } from "@/shared/lib/language";
import type { AuthUser } from "@/shared/types/auth";
import styles from "./DashboardHeroBanner.module.css";

export function DashboardHeroBanner({ user }: { user: AuthUser }) {
  const { isVietnamese } = useAppLanguage();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const locale = isVietnamese ? "vi-VN" : "en-US";
  const timeZone = "Asia/Ho_Chi_Minh";
  const date = new Intl.DateTimeFormat(locale, { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  const time = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(now));
  const greeting = hour >= 5 && hour < 12 ? (isVietnamese ? "Chào buổi sáng" : "Good morning") : hour >= 12 && hour < 18 ? (isVietnamese ? "Chào buổi chiều" : "Good afternoon") : (isVietnamese ? "Chào buổi tối" : "Good evening");
  const name = user.fullName.replace(/\s*\([^)]*\)/g, "").trim() || user.fullName;

  return (
    <header className={styles.banner}>
      <div className={styles.content}>
        <span className={styles.label}>TMEC / {isVietnamese ? "TỔNG QUAN" : "OVERVIEW"}</span>
        <h1>{greeting},<br /><span>{name}</span></h1>
        <div className={styles.date}><span>{date}</span><time dateTime={now.toISOString()}>{time}</time></div>
      </div>
      <div className={styles.image} aria-hidden="true" />
    </header>
  );
}
