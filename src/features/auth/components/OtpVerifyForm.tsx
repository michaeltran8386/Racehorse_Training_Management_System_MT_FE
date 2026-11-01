import { useEffect, useId, useState } from "react";
import { motion } from "motion/react";
import { Mail } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { CodeSlots } from "@/shared/components/motion/CodeSlots";
import { Alert } from "@/shared/components/ui/Alert";
import { PillButton } from "./PillButton";
import { useToast } from "@/shared/components/ui/Toast";
import { ApiError } from "@/shared/lib/api";
import { formatCountdown, formatDateTime } from "@/shared/lib/format";
import { useCountdown } from "@/shared/lib/hooks";
import { otpMessage } from "@/shared/lib/messages";
import { otpStatus, resendOtp } from "../api";
import type { OtpPurpose, OtpTimes } from "../types";
import styles from "./OtpVerifyForm.module.css";

import { tr, trNode } from "@/shared/i18n/tr";
const CODE_LENGTH = 6;

interface OtpVerifyFormProps {
  email: string;
  purpose: OtpPurpose;
  initialCode?: string;
  // Nội dung Alert "đã gửi mã". Với quên mật khẩu phải TRUNG TÍNH (không khẳng định email có tồn tại).
  sentTitle: string;
  sentBody: (times: OtpTimes) => string;
  submitLabel: string;
  // Gọi API kiểm tra mã. Ném lỗi (ApiError) nếu sai — form tự hiện thông báo.
  onVerify: (code: string) => Promise<void>;
  footer: ReactNode;
}

// Form nhập mã OTP dùng cho cả xác minh email khi đăng ký và quên mật khẩu.
// Lo: đếm ngược hết hạn, nút gửi lại có thời gian chờ, lỗi sai mã còn mấy lần thử.
export function OtpVerifyForm({ email, purpose, initialCode, sentTitle, sentBody, submitLabel, onVerify, footer }: OtpVerifyFormProps) {
  const toast = useToast();
  const [times, setTimes] = useState<OtpTimes | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState(initialCode || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  // Tăng mỗi lần sai mã để chạy lại hiệu ứng rung.
  const [shakeKey, setShakeKey] = useState(0);
  const messageId = useId();

  useEffect(() => {
    let cancelled = false;
    otpStatus(email, purpose)
      .then((t) => {
        if (!cancelled) setTimes(t);
      })
      .catch(() => {
        // OTP_NOT_FOUND: chưa có mã nào đang chờ => hiện thông báo và cho gửi mã mới.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [email, purpose]);

  const expiresLeft = useCountdown(times?.expiresAt ?? null);
  const resendLeft = useCountdown(times?.resendAt ?? null);
  const expired = times !== null && expiresLeft === 0;

  async function submit(value: string) {
    if (value.length < CODE_LENGTH) {
      setError(`Enter all ${CODE_LENGTH} digits.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onVerify(value);
    } catch (err) {
      setError(otpMessage(err));
      setCode("");
      setShakeKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(code);
  }

  async function onResend() {
    setResending(true);
    setError("");
    try {
      setTimes(await resendOtp(email, purpose));
      setCode("");
      toast.show("A new code was sent.", "ok");
    } catch (err) {
      if (err instanceof ApiError && err.code === "OTP_COOLDOWN") {
        setTimes((t) => (t ? { ...t, resendAt: Number(err.data.resendAt) } : t));
      } else {
        setError(otpMessage(err));
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form}>
      {times && !expired && (
        <Alert tone="ok" icon="checkCircle" title={sentTitle}>
          {sentBody(times)}
        </Alert>
      )}
      {loaded && !times && (
        <Alert tone="warn" icon="clock" title={tr("No code is waiting")}>
          {tr("Request a new code to continue.")}
        </Alert>
      )}
      {expired && (
        <Alert tone="warn" icon="clock" title={tr("The code has expired")}>
          {tr("It was valid until {{time}}. Request a new one below.", { time: formatDateTime(times.expiresAt) })}
        </Alert>
      )}

      <motion.div
        key={shakeKey}
        className={styles.slots}
        initial={false}
        animate={shakeKey > 0 ? { x: [-12, 12, -9, 9, -5, 5, -2, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.52, ease: "easeInOut" }}
      >
        <CodeSlots
          length={CODE_LENGTH}
          value={code}
          disabled={busy}
          autoFocus
          status={error ? "error" : "idle"}
          describedBy={messageId}
          onChange={(value) => {
            setCode(value);
            if (error) setError("");
          }}
          onComplete={(value) => void submit(value)}
        />
      </motion.div>
      <p id={messageId} className={error ? styles.error : styles.hint} role={error ? "alert" : undefined}>
        {error ? trNode(error) : times && !expired ? tr(`The code expires in ${formatCountdown(expiresLeft)}.`) : null}
      </p>

      <PillButton type="submit" loading={busy} loadingLabel={tr("Checking…")} disabled={expired || !times}>
        {submitLabel}
      </PillButton>

      <PillButton
        tone="secondary"
        icon={<Mail size={18} aria-hidden="true" />}
        loading={resending}
        blockedReason={resendLeft > 0 ? tr(`A new code can be requested in ${formatCountdown(resendLeft)}.`) : undefined}
        onClick={() => void onResend()}
      >
        {tr("Send the code again")}
      </PillButton>

      <p className={styles.footer}>{footer}</p>
    </form>
  );
}
