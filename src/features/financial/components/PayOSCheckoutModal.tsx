import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { useToast } from "@/shared/components/ui/Toast";
import { useAppLanguage } from "@/shared/lib/language";
import { tr } from "@/shared/i18n/tr";
import { formatNumber } from "@/shared/lib/format";
import {
  createPayOSLink,
  checkPayOSStatus,
  simulatePayOSPaid,
  type PayOSLinkResponse,
} from "../api";
import type { FinancialInvoice } from "../types";
import styles from "./PayOSCheckoutModal.module.css";

interface PayOSCheckoutModalProps {
  invoice: FinancialInvoice;
  onClose: () => void;
  onSuccess: (updatedInvoice?: FinancialInvoice) => void;
}

export function PayOSCheckoutModal({
  invoice,
  onClose,
  onSuccess,
}: PayOSCheckoutModalProps) {
  useTranslation();
  const { isVietnamese } = useAppLanguage();
  const toast = useToast();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const rawOriginalAmount = Number(invoice.netAmount);
  const storedDemoAmount =
    typeof window !== "undefined"
      ? localStorage.getItem("equiflow_demo_pay_amount")
      : null;
  const initialUseDemo = storedDemoAmount && storedDemoAmount !== "0";

  const [useDemoAmount, setUseDemoAmount] = useState<boolean>(Boolean(initialUseDemo));
  const [demoAmountValue] = useState<number>(() => {
    if (storedDemoAmount && Number(storedDemoAmount) > 0) {
      return Number(storedDemoAmount);
    }
    return 2000;
  });

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [payLinkData, setPayLinkData] = useState<PayOSLinkResponse | null>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const activeAmount = useDemoAmount ? demoAmountValue : rawOriginalAmount;

  // Xử lý nguồn ảnh QR Code đảm bảo hiển thị đúng dù dữ liệu trả về là URL, SVG hay raw EMVCo
  const qrImageSrc = useMemo(() => {
    if (!payLinkData) return "";
    const qr = payLinkData.qrCode;
    if (qr && (qr.startsWith("http") || qr.startsWith("data:image"))) {
      return qr;
    }
    // Nếu qrCode là chuỗi EMVCo thô:
    if (payLinkData.bin && payLinkData.accountNumber) {
      return `https://img.vietqr.io/image/${payLinkData.bin}-${payLinkData.accountNumber}-qr_only.png?amount=${payLinkData.amount}&addInfo=${encodeURIComponent(
        payLinkData.description,
      )}&accountName=${encodeURIComponent(payLinkData.accountName)}`;
    }
    if (qr) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qr)}`;
    }
    return "";
  }, [payLinkData]);

  const [currentQrSrc, setCurrentQrSrc] = useState<string>("");

  useEffect(() => {
    setCurrentQrSrc(qrImageSrc);
  }, [qrImageSrc]);

  const handleQrError = () => {
    if (!payLinkData) return;
    const raw = payLinkData.rawQrCode || payLinkData.qrCode;
    const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(raw)}`;
    if (currentQrSrc !== fallback) {
      setCurrentQrSrc(fallback);
    }
  };

  // Tải dữ liệu QR PayOS khi mở modal hoặc khi đổi chế độ tiền
  const loadPaymentLink = async (amountToUse?: number) => {
    try {
      setLoading(true);
      const res = await createPayOSLink(invoice.id, amountToUse);
      setPayLinkData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tr("Failed to create PayOS payment link");
      toast.show(msg, "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const amountToPass = useDemoAmount ? demoAmountValue : undefined;
    void loadPaymentLink(amountToPass);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDemoAmount, demoAmountValue]);

  // Polling tự động tra cứu trạng thái thanh toán mỗi 3.5 giây khi orderCode có sẵn
  useEffect(() => {
    if (!payLinkData?.orderCode || isPaidSuccess) return;

    const interval = setInterval(async () => {
      try {
        const check = await checkPayOSStatus(invoice.id, payLinkData.orderCode);
        if (check.paid) {
          setIsPaidSuccess(true);
          toast.show(tr("Payment successful! Debt balance and restrictions have been cleared."), "ok");
          clearInterval(interval);
          onSuccess(check.invoice);
        }
      } catch {
        // im lặng bỏ qua lỗi kết nối polling
      }
    }, 3500);

    pollingRef.current = interval;
    return () => clearInterval(interval);
  }, [payLinkData?.orderCode, isPaidSuccess, invoice.id, onSuccess, toast]);

  const handleManualCheck = async () => {
    if (!payLinkData?.orderCode) return;
    try {
      setChecking(true);
      const check = await checkPayOSStatus(invoice.id, payLinkData.orderCode);
      if (check.paid) {
        setIsPaidSuccess(true);
        toast.show(tr("Payment successful!"), "ok");
        onSuccess(check.invoice);
      } else {
        toast.show(tr("Bank payment not received yet. Please try again in a few seconds."), "info");
      }
    } catch (err: unknown) {
      toast.show(err instanceof Error ? err.message : tr("Payment verification error"), "danger");
    } finally {
      setChecking(false);
    }
  };

  const handleSimulateInstantSuccess = async () => {
    try {
      setChecking(true);
      const updated = await simulatePayOSPaid(invoice.id);
      setIsPaidSuccess(true);
      toast.show(tr("⚡ Simulated payment succeeded! Invoice marked as PAID."), "ok");
      onSuccess(updated);
    } catch (err: unknown) {
      toast.show(err instanceof Error ? err.message : tr("Failed to simulate payment"), "danger");
    } finally {
      setChecking(false);
    }
  };

  const copyText = (txt: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt);
      toast.show(tr("Copied {{label}}: {{text}}", { label, text: txt }), "ok");
    }
  };

  return (
    <Modal
      title={isPaidSuccess ? tr("Payment Successful") : tr("VietQR / PayOS Payment")}
      subtitle={tr("Statement {{period}} · Horse {{horse}}", { period: invoice.billingPeriod, horse: invoice.horse?.name ?? "—" })}
      width={480}
      onClose={onClose}
    >
      {isPaidSuccess ? (
        <div className={styles.successContainer}>
          <div className={styles.successIconBadge}>✓</div>
          <h3 className={styles.successTitle}>{tr("Payment Confirmed")}</h3>
          <p className={styles.successDesc}>
            {tr("Statement for period")} <strong>{invoice.billingPeriod}</strong> {tr("has been reconciled. All debt holds have been automatically released.")}
          </p>
          <Button tone="primary" onClick={() => { onSuccess(); onClose(); }}>
            {tr("Done & Close")}
          </Button>
        </div>
      ) : (
        <div className={styles.modalOverlay}>
          {/* Amount Box with Demo Switcher */}
          <div className={styles.amountBanner}>
            <div className={styles.amountInfo}>
              <span className={styles.amountLabel}>{tr("Amount due")}</span>
              <span className={styles.amountValue}>
                {formatNumber(activeAmount)}
                <small>VND</small>
              </span>
            </div>

            <div className={styles.amountToggleGroup}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${useDemoAmount ? styles.toggleBtnActive : ""}`}
                onClick={() => setUseDemoAmount(true)}
                title={tr("Use a small amount for scanning with a real banking app")}
              >
                Demo ({demoAmountValue.toLocaleString(isVietnamese ? "vi-VN" : "en-US")}đ)
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${!useDemoAmount ? styles.toggleBtnActive : ""}`}
                onClick={() => setUseDemoAmount(false)}
                title={tr("Use the original invoice amount")}
              >
                {tr("Original")}
              </button>
            </div>
          </div>

          {/* Collapsible Fee Breakdown Toggle (Giống mẫu tham khảo) */}
          <div className={styles.breakdownSection}>
            <button
              type="button"
              className={styles.breakdownToggleBtn}
              onClick={() => setShowBreakdown((prev) => !prev)}
            >
              <span className={styles.toggleArrow}>{showBreakdown ? "▼" : "▶"}</span>
              <span>{tr("FEE BREAKDOWN & STATEMENT DETAILS")}</span>
              <span className={styles.toggleActionText}>
                ({showBreakdown ? tr("Collapse") : tr("View details")})
              </span>
            </button>

            {showBreakdown && (
              <div className={styles.breakdownCard}>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownName}>
                    {tr("Boarding & care fee ({{days}} days):", { days: invoice.boardingDays ?? 30 })}
                  </span>
                  <span className={styles.breakdownValue}>{formatNumber(invoice.boardingFee)}đ</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownName}>{tr("Veterinary care & medications:")}</span>
                  <span className={styles.breakdownValue}>{formatNumber(invoice.medicalFee)}đ</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownName}>{tr("Training services (Head Trainer):")}</span>
                  <span className={styles.breakdownValue}>{formatNumber(invoice.trainingFee)}đ</span>
                </div>
                {invoice.prizeCredit > 0 && (
                  <div className={`${styles.breakdownItem} ${styles.breakdownCredit}`}>
                    <span className={styles.breakdownName}>{tr("Race prize credit (pro-rated):")}</span>
                    <span className={styles.breakdownValue}>-{formatNumber(invoice.prizeCredit)}đ</span>
                  </div>
                )}
                <div className={styles.breakdownTotalDivider} />
                <div className={styles.breakdownItemTotal}>
                  <span>{tr("Original statement total:")}</span>
                  <strong className={styles.breakdownTotalValue}>{formatNumber(invoice.netAmount)}đ</strong>
                </div>
              </div>
            )}
          </div>

          {/* QR Code Presentation */}
          <div className={styles.qrWrapper}>
            <div className={styles.qrImageFrame}>
              {loading || !payLinkData ? (
                <div className={styles.qrLoading}>
                  <span>{tr("Generating VietQR code…")}</span>
                </div>
              ) : currentQrSrc ? (
                <img
                  src={currentQrSrc}
                  alt={tr("PayOS / VietQR Payment QR Code")}
                  className={styles.qrImage}
                  onError={handleQrError}
                />
              ) : (
                <div className={styles.qrLoading}>
                  <span>{tr("QR code not found")}</span>
                </div>
              )}
            </div>
            <p className={styles.qrTip}>
              {tr("Scan with any Mobile Banking app or e-wallet to transfer instantly.")}
            </p>
            {payLinkData?.checkoutUrl && (
              <a
                href={payLinkData.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600, textDecoration: "underline" }}
              >
                {tr("Open PayOS checkout page ↗")}
              </a>
            )}
          </div>

          {/* Bank Account Info */}
          {payLinkData && (
            <div className={styles.bankDetailsCard}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{tr("Bank")}</span>
                <span style={{ fontWeight: 600 }}>{payLinkData.bankName}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{tr("Account number")}</span>
                <div className={styles.detailValueGroup}>
                  <span>{payLinkData.accountNumber}</span>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => copyText(payLinkData.accountNumber, tr("Account number"))}
                  >
                    {tr("Copy")}
                  </button>
                </div>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{tr("Account holder")}</span>
                <span style={{ fontWeight: 600 }}>{payLinkData.accountName}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{tr("Transfer reference")}</span>
                <div className={styles.detailValueGroup}>
                  <span style={{ color: "#d97706" }}>{payLinkData.description}</span>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => copyText(payLinkData.description, tr("Transfer reference"))}
                  >
                    {tr("Copy")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className={styles.actionFooter}>
            <button
              type="button"
              className={styles.demoSimulateBtn}
              onClick={handleSimulateInstantSuccess}
              disabled={checking}
              title={tr("Simulate an instant successful payment for demo purposes")}
            >
              {tr("⚡ Simulate Paid (Demo)")}
            </button>

            <button
              type="button"
              className={styles.checkStatusBtn}
              onClick={handleManualCheck}
              disabled={checking || loading}
            >
              {checking ? tr("Checking…") : tr("Check payment status")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
