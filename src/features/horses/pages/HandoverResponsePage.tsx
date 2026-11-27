import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Textarea } from "@/shared/components/form/Textarea";
import { Field } from "@/shared/components/form/Field";
import { ApiError } from "@/shared/lib/api";
import { messageFor } from "@/shared/lib/messages";
import { respondHandover } from "../api";

export default function HandoverResponsePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineField, setShowDeclineField] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    action: "ACCEPT" | "REJECT";
    planDeadlineAt?: string;
    days?: number;
  } | null>(null);

  if (!token) {
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 16px" }}>
        <Alert tone="danger">Mã xác thực tiếp nhận (token) không hợp lệ hoặc thiếu.</Alert>
      </div>
    );
  }

  async function handleResponse(action: "ACCEPT" | "REJECT") {
    if (busy || !token) return;
    if (action === "REJECT" && !showDeclineField) {
      setShowDeclineField(true);
      return;
    }
    if (action === "REJECT" && !declineReason.trim()) {
      setError("Vui lòng nhập lý do từ chối để thông báo lại cho Quản lý.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await respondHandover({
        token,
        action,
        declineReason: action === "REJECT" ? declineReason.trim() : undefined,
      });
      setResult({
        success: true,
        message: res.message,
        action,
        planDeadlineAt: res.planDeadlineAt,
        days: res.days,
      });
    } catch (err) {
      if (err instanceof ApiError) setError(messageFor(err));
      else setError("Không thể xử lý yêu cầu tiếp nhận. Yêu cầu có thể đã hết hạn 48h.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div style={{ maxWidth: 520, margin: "60px auto", padding: "0 16px" }}>
        <Card pad={24}>
          <div style={{ textAlign: "center", display: "grid", gap: 14 }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem", color: result.action === "ACCEPT" ? "var(--success)" : "var(--text)" }}>
              {result.action === "ACCEPT" ? "Tiếp nhận chiến mã thành công" : "Đã từ chối tiếp nhận chiến mã"}
            </h2>
            <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.5 }}>
              {result.message}
            </p>

            {result.action === "ACCEPT" && result.planDeadlineAt && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--surface-sunken)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border-soft)",
                  textAlign: "left",
                  fontSize: "var(--fs-body)",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--primary)", marginBottom: 4 }}>
                  Quy định SLA hoàn thành giáo án:
                </div>
                <div>Thời hạn: <strong>{result.days || 3} ngày (72 giờ)</strong></div>
                <div>Hạn hoàn thành trước: <strong>{new Date(result.planDeadlineAt).toLocaleString("vi-VN")}</strong></div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
              <Button tone="primary" onClick={() => navigate("/training/plans")}>
                Đến trang Giáo án huấn luyện
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", padding: "0 16px" }}>
      <Card pad={24}>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.25rem" }}>
              Xác nhận tiếp nhận chiến mã
            </h2>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: "var(--fs-caption)", lineHeight: 1.5 }}>
              Quản lý CLB đã phân công bạn phụ trách chiến mã này. Vui lòng xác nhận tiếp nhận hoặc từ chối trong vòng 48 giờ kể từ khi nhận được thông báo.
            </p>
          </div>

          {error && <Alert tone="danger">{error}</Alert>}

          <div
            style={{
              padding: "12px 14px",
              background: "var(--surface-sunken)",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border-soft)",
              fontSize: "var(--fs-caption)",
              color: "var(--text-2)",
              lineHeight: 1.5,
            }}
          >
            <strong>Lưu ý về tiến độ SLA:</strong> Khi bạn bấm Tiếp nhận, hệ thống sẽ áp dụng hạn chót cố định <strong>3 ngày (72 giờ)</strong> để bạn khảo sát thể lực và kích hoạt giáo án huấn luyện chính thức cho chiến mã.
          </div>

          {showDeclineField && (
            <Field label="Lý do từ chối tiếp nhận" required>
              <Textarea
                rows={3}
                placeholder="Nhập lý do (ví dụ: đang quá tải ca huấn luyện, cần điều chuyển...)"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </Field>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Button
              tone={showDeclineField ? "danger" : "secondary"}
              disabled={busy}
              onClick={() => handleResponse("REJECT")}
            >
              {busy ? "Đang xử lý…" : showDeclineField ? "Xác nhận từ chối" : "Từ chối tiếp nhận"}
            </Button>
            <Button
              tone="primary"
              disabled={busy}
              onClick={() => handleResponse("ACCEPT")}
            >
              {busy ? "Đang xử lý…" : "Tiếp nhận chiến mã"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
