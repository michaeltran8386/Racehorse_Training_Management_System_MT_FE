import { useAppLanguage } from "@/shared/lib/language";
import { Icon } from "./Icon";
import { cx } from "@/shared/lib/cx";
import styles from "./LanguageToggle.module.css";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { lang, toggleLanguage } = useAppLanguage();
  const nextLangLabel = lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt";

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={cx(styles.langBtn, className)}
      aria-label={nextLangLabel}
      title={nextLangLabel}
    >
      <Icon name="globe" size={15} className={styles.icon} />
      <span className={styles.code}>{lang.toUpperCase()}</span>
    </button>
  );
}

