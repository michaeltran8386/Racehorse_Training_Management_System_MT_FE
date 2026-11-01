import type { ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";
import { ThemeToggle } from "@/shared/components/ui/ThemeToggle";
import { LanguageToggle } from "@/shared/components/ui/LanguageToggle";
import { useAppLanguage } from "@/shared/lib/language";
import { BRAND } from "@/shared/lib/brand";
import { cx } from "@/shared/lib/cx";
import { tr } from "@/shared/i18n/tr";
import styles from "./AuthLayout.module.css";

// Khẩu hiệu bên ảnh: đúng 1 câu, chia 2 dòng.
export interface Hero {
  lines: [string, string];
}

export const HERO_DEFAULT: Hero = {
  lines: ["Every horse.", "One journey forward."],
};

export const HERO_TEAM: Hero = {
  lines: ["One team.", "One shared goal."],
};

interface AuthLayoutProps {
  title: string; // ngắn gọn
  description?: string;
  hero?: Hero;
  compact?: boolean; // form dài (Sign Up): giảm padding dọc
  children: ReactNode;
}

// Khung 2 cột chuẩn của mọi màn public (design Phase 0 · 1a): cột form 660px + ảnh editorial.
// Dưới 980px xếp dọc: dải ảnh 186px ở trên, form ở dưới.
export function AuthLayout({ title, description, hero = HERO_DEFAULT, compact, children }: AuthLayoutProps) {
  const { t } = useAppLanguage();

  return (
    // reducedMotion="user": người bật prefers-reduced-motion chỉ còn mờ dần, không trượt/nảy.
    <MotionConfig reducedMotion="user">
    <div className={styles.page}>
      <section className={cx(styles.formPane, compact && styles.compact)}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <img src={BRAND.logo} alt={BRAND.name} width={32} height={32} />
            <div>
              <strong>{BRAND.shortName}</strong>
              <span>{BRAND.fullName}</span>
            </div>
          </div>
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <motion.main
          className={styles.column}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
          <div className={styles.body}>
            {children}
          </div>
        </motion.main>

        <p className={styles.support}>
          {t("auth.support", "Support")}: {BRAND.supportEmail} · {BRAND.supportPhone}
        </p>
      </section>

      <aside className={styles.hero} aria-hidden="true">
        <img
          src="/images/equine-editorial.webp"
          alt=""
          className={styles.photo}
        />
        <div className={styles.scrim} />
        <div className={styles.heroDesktop}>
          <strong>
            {tr(hero.lines[0])}
            <br />
            {tr(hero.lines[1])}
          </strong>
        </div>
        <div className={styles.heroMobile}>
          <div className={styles.mobileBrand}>
            <img src={BRAND.logo} alt="" width={26} height={26} />
            <strong>{BRAND.name}</strong>
          </div>
          <p>{BRAND.fullName}</p>
          <strong>{tr(BRAND.tagline)}</strong>
        </div>
      </aside>
    </div>
    </MotionConfig>
  );
}
