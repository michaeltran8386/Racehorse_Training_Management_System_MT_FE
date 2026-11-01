import { useTranslation as useScreenTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/Button";
import styles from "./ComingSoonPage.module.css";

import { tr } from "@/shared/i18n/tr";
export default function ComingSoonPage() {
  useScreenTranslation();
  const navigate = useNavigate();
  return (
    <section className={styles.panel}>
      <span className={styles.symbol} aria-hidden="true">404</span>
      <div className={styles.copy}>
        <h1>{tr("This page does not exist.")}</h1>
        <p>{tr("Check the address, or go back to your workspace.")}</p>
        <Button icon="home" onClick={() => navigate("/dashboard")}>{tr("Back to my workspace")}</Button>
      </div>
    </section>
  );
}
