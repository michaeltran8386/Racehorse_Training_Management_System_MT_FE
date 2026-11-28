import { useState, useEffect } from "react";
import { Icon } from "@/shared/components/ui/Icon";
import { tr } from "@/shared/i18n/tr";
import styles from "./CustomerCareWidget.module.css";

const HOTLINE_DISPLAY = "0983.989.059";
const HOTLINE_TEL = "tel:0983989059";
const ZALO_URL = "https://zalo.me/0983989059";
const EMAIL_SUPPORT = "support@tmec.site";
const EMAIL_MAILTO = "mailto:support@tmec.site";

interface DepartmentContact {
  id: string;
  name: string;
  avatarText: string;
  zaloUrl: string;
}

const DEPARTMENTS: DepartmentContact[] = [
  {
    id: "sales",
    name: "Sales",
    avatarText: "KD",
    zaloUrl: ZALO_URL,
  },
  {
    id: "technical",
    name: "Technical Support",
    avatarText: "KT",
    zaloUrl: ZALO_URL,
  },
  {
    id: "warranty",
    name: "Warranty Support",
    avatarText: "BH",
    zaloUrl: ZALO_URL,
  },
];

export function CustomerCareWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      {/* Floating Action Buttons */}
      <div className={styles.fabCluster} aria-label="Customer Care & Support">
        {/* Nút cuộn về đầu trang */}
        {showScrollTop && (
          <button
            type="button"
            className={styles.scrollTopBtn}
            onClick={handleScrollToTop}
            aria-label={tr("Scroll to top")}
            title={tr("Scroll to top")}
          >
            <Icon name="chevronUp" size={20} />
          </button>
        )}

        {/* Nút kích hoạt hỗ trợ */}
        <div className={styles.careToggleWrapper}>
          {!isOpen && <div className={styles.pingWave} aria-hidden="true" />}
          <button
            type="button"
            className={`${styles.careToggleBtn} ${isOpen ? styles.careToggleBtnOpen : ""}`}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label={isOpen ? tr("Close support") : tr("Open support channels")}
            title={isOpen ? tr("Close support") : tr("Contact TMEC Club Support")}
          >
            {isOpen ? <Icon name="x" size={22} /> : <Icon name="phone" size={22} />}
          </button>
        </div>
      </div>

      {/* Floating Contact Card — Phỏng theo mẫu Thegioiic sạch đẹp & chuẩn màu TMEC */}
      {isOpen && (
        <div
          className={styles.contactCard}
          role="dialog"
          aria-modal="false"
          aria-labelledby="customer-care-title"
        >
          {/* Header với màu thương hiệu trang web */}
          <div className={styles.cardHeader}>
            <h2 id="customer-care-title" className={styles.cardTitle}>
              {tr("Contact TMEC")}
            </h2>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setIsOpen(false)}
              aria-label={tr("Close")}
              title={tr("Close")}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          {/* Body: Danh sách các bộ phận (tối giản, không văn bản rườm rà) */}
          <div className={styles.cardBody}>
            <div className={styles.departmentsList}>
              {DEPARTMENTS.map((dept) => (
                <div key={dept.id} className={styles.deptCard}>
                  <div className={styles.deptLeft}>
                    <div className={styles.deptAvatar}>
                      <span>{dept.avatarText}</span>
                    </div>
                    <span className={styles.deptName}>{tr(dept.name)}</span>
                  </div>
                  <a
                    href={dept.zaloUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.zaloChatBtn}
                    title={tr("Message via Zalo")}
                  >
                    <span className={styles.zaloBadgeIcon}>Zalo</span>
                    <span>{tr("Message")}</span>
                  </a>
                </div>
              ))}
            </div>

            {/* Phần liên hệ nhanh bên dưới */}
            <div className={styles.footerSection}>
              <div className={styles.footerLabel}>
                {tr("CONNECT WITH US:")}
              </div>
              <div className={styles.channelsRow}>
                {/* Zalo Icon */}
                <a
                  href={ZALO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.channelCircle} ${styles.zaloCircle}`}
                  title={tr("Zalo Chat: 0983989059")}
                  aria-label="Zalo TMEC"
                >
                  <span className={styles.zaloCircleText}>Zalo</span>
                </a>

                {/* Hotline Icon */}
                <a
                  href={HOTLINE_TEL}
                  className={`${styles.channelCircle} ${styles.phoneCircle}`}
                  title={tr("Call Hotline: {{phone}}", { phone: HOTLINE_DISPLAY })}
                  aria-label={`Hotline ${HOTLINE_DISPLAY}`}
                >
                  <Icon name="phone" size={22} />
                </a>

                {/* Email Icon */}
                <a
                  href={EMAIL_MAILTO}
                  className={`${styles.channelCircle} ${styles.mailCircle}`}
                  title={`Gửi Email: ${EMAIL_SUPPORT}`}
                  aria-label={`Email ${EMAIL_SUPPORT}`}
                >
                  <Icon name="mail" size={22} />
                </a>
              </div>
              <div className={styles.footerSupportInfo}>
                <span>Hotline: <strong>{HOTLINE_DISPLAY}</strong></span>
                <span>Email: <strong>{EMAIL_SUPPORT}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
