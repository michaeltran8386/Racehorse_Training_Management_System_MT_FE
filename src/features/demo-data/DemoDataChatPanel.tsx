import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/Button";
import { clubParts, getDemoDate, setDemoDate } from "@/features/training/api";
import { AgentUiCanvas } from "./AgentUiCanvas";
import { demoDataApi } from "./demo-data.api";
import type {
  AgentUiBlock,
  DemoContext,
  DemoReceipt,
  DemoScenario,
  DemoTimeArgs,
  NativeContext,
} from "./demo-data.types";
import {
  executeDemoTool,
  resolveWebMcpRuntime,
  validateDemoArgs,
  type WebMcpRuntimeMode,
} from "./demo-webmcp.client";
import { registerDemoTools } from "./demo-webmcp.tools";
import styles from "@/shared/components/DemoMagicToolkit.module.css";

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const recordLabels: Record<string, string> = {
  Horse: "Ngựa",
  HorseAdmissionRecord: "Hồ sơ tiếp nhận",
  AdmissionHistoryLog: "Lịch sử tiếp nhận",
  AdmissionHealthReview: "Kết quả khám tiếp nhận",
  StallAllocation: "Phân bổ chuồng",
  TrainingPlan: "Giáo án mẫu",
  TrainingPhase: "Giai đoạn mẫu",
  WorkoutSession: "Buổi tập mẫu",
  MedicalRecord: "Bệnh án mẫu",
  InjuryLog: "Lịch sử chấn thương",
  MedicalLock: "Khóa y tế đã gỡ",
  Tournament: "Giải đấu mẫu",
};

type Runtime = {
  native: NativeContext;
  tools: Awaited<ReturnType<typeof registerDemoTools>>;
  signal: AbortSignal;
};

export function DemoDataChatPanel({
  actorId,
  timeShifted,
}: {
  actorId: string;
  timeShifted: boolean;
}) {
  const navigate = useNavigate();
  const fieldId = useId();
  const [sessionNonce] = useState(() => crypto.randomUUID());
  const [context, setContext] = useState<DemoContext | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [phase, setPhase] = useState(
    "Đang kiểm tra WebMCP và môi trường local…",
  );
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [webmcpMode, setWebmcpMode] = useState<WebMcpRuntimeMode | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DemoReceipt | null>(null);
  const [uiBlocks, setUiBlocks] = useState<AgentUiBlock[]>([]);
  const [activeDemoDate, setActiveDemoDate] = useState<string | null>(() => getDemoDate());
  const realToday = clubParts(new Date().toISOString()).date;
  const runtime = useRef<Runtime | null>(null);
  const active = useRef(false);
  const pending = useRef<string | null>(null);
  const question = useRef("");
  const turn = useRef<AbortController | null>(null);
  const pointerKey = `equiflow_demo_generation:${actorId}`;

  useEffect(() => {
    const lifetime = new AbortController();
    const initialize = async () => {
      const { context: native, mode } = resolveWebMcpRuntime(
        (document as Document & { modelContext?: unknown }).modelContext,
        { origin: location.origin, source: window },
      );
      const tools = await registerDemoTools(
        native,
        {
          ...demoDataApi,
          setTime: async (timeArgs: DemoTimeArgs) => {
            const baseToday = clubParts(new Date().toISOString()).date;
            const next =
              timeArgs.mode === "REAL"
                ? null
                : timeArgs.mode === "OFFSET_DAYS"
                  ? addDaysYmd(baseToday, timeArgs.days ?? 0)
                  : (timeArgs.date ?? null);
            await setDemoDate(next);
            setActiveDemoDate(next);
            return { activeDate: next };
          },
        },
        lifetime.signal,
      );
      const snapshot = await demoDataApi.context();
      lifetime.signal.throwIfAborted();
      runtime.current = { native, tools, signal: lifetime.signal };
      setWebmcpMode(mode);
      setContext(snapshot);
      setOwnerId(snapshot.defaultOwnerId ?? "");
      setReady(true);
      setPhase("Sẵn sàng. Chọn chủ ngựa và mô tả bộ mẫu cần tạo.");
      const saved = sessionStorage.getItem(pointerKey);
      if (saved && /^[0-9a-f-]{36}$/i.test(saved)) {
        pending.current = saved;
        setPendingId(saved);
        setUncertain(true);
        try {
          const previous = await demoDataApi.receipt(saved);
          lifetime.signal.throwIfAborted();
          if (previous) {
            pending.current = null;
            setPendingId(null);
            setReceipt(previous);
            setUncertain(false);
            setPhase("Đã khôi phục biên nhận gần nhất trên tab này.");
          } else
            setPhase(
              "Chưa thấy biên nhận của yêu cầu trước. Gửi lại yêu cầu cũ sẽ dùng cùng mã.",
            );
        } catch (reason) {
          if (!lifetime.signal.aborted) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Chưa khôi phục được biên nhận.",
            );
            setPhase(
              "Chưa xác minh yêu cầu cũ. Kiểm tra biên nhận trước khi thử lại cùng mã.",
            );
          }
        }
      }
    };
    void initialize().catch((reason) => {
      if (!lifetime.signal.aborted) {
        lifetime.abort();
        runtime.current = null;
        setReady(false);
        setError(
          reason instanceof Error
            ? reason.message
            : "Không thể mở trợ lý tạo mẫu.",
        );
        setPhase("Chưa sẵn sàng tạo dữ liệu.");
      }
    });
    return () => {
      lifetime.abort();
      turn.current?.abort();
      runtime.current?.tools.clear();
      runtime.current = null;
    };
  }, [pointerKey]);

  const addMessage = (role: "user" | "assistant", text: string) =>
    setMessages((previous) => [...previous, { role, text }]);
  const acceptReceipt = (
    value: DemoReceipt,
    generationId: string,
    openHorse: boolean,
    blocks?: AgentUiBlock[],
  ) => {
    if (
      value.status !== "CREATED" ||
      value.generationId !== generationId ||
      value.horseId !== generationId
    )
      throw new Error("Biên nhận không khớp yêu cầu. Không tạo bộ mới.");
    pending.current = null;
    setPendingId(null);
    question.current = "";
    setReceipt(value);
    setUiBlocks(
      blocks && blocks.length > 0
        ? blocks
        : [
            {
              type: "RECEIPT",
              title: "Biên nhận dữ liệu mẫu vừa tạo",
              generationId: value.generationId,
            },
          ],
    );
    setUncertain(false);
    setError("");
    setPhase("Đã tạo dữ liệu mẫu và xác minh biên nhận.");
    addMessage(
      "assistant",
      `Đã tạo bộ DEMO ${value.generationId}. Bạn tiếp tục nghiệp vụ bằng tay trên giao diện.`,
    );
    if (openHorse) navigate(`/horses/${encodeURIComponent(value.horseId)}`);
  };

  const runPrompt = async (rawText: string) => {
    const current = runtime.current;
    if (
      active.current ||
      !current ||
      !ready ||
      !context?.aiConfigured
    )
      return;
    const input = rawText.trim();
    const message = question.current
      ? `${question.current}\nThông tin bổ sung: ${input}`
      : input;
    if (!input || message.length > 2000) {
      setError("Yêu cầu tối đa 2.000 ký tự. Hãy viết lại đầy đủ và ngắn hơn.");
      return;
    }
    active.current = true;
    setBusy(true);
    setError("");
    setReceipt(null);
    setDraft("");
    addMessage("user", input);
    setPhase("Đang hiểu yêu cầu…");
    const generationId = pending.current ?? crypto.randomUUID();
    const controller = new AbortController();
    turn.current = controller;
    const signal = AbortSignal.any([
      current.signal,
      controller.signal,
      AbortSignal.timeout(60_000),
    ]);
    const deadline = Date.now() + 60_000;
    const remaining = () => {
      signal.throwIfAborted();
      return Math.max(1, deadline - Date.now());
    };
    let contextRead = false;
    let writes = 0;
    try {
      if (pending.current) {
        const stored = await demoDataApi.receipt(generationId);
        signal.throwIfAborted();
        if (stored) {
          acceptReceipt(stored, generationId, true);
          return;
        }
      }
      for (let count = 0; count < 3; count += 1) {
        const request = {
          message,
          generationId,
          sessionNonce,
          ownerId: ownerId || undefined,
          contextRead,
        };
        const reply = await demoDataApi.chat(request, remaining());
        signal.throwIfAborted();
        if (reply.status === "NEEDS_INPUT") {
          question.current = message;
          if (reply.uiBlocks) setUiBlocks(reply.uiBlocks);
          addMessage(
            "assistant",
            reply.message ?? "Hãy bổ sung tên ngựa và bộ mẫu cần tạo.",
          );
          setPhase("Cần bổ sung thông tin; chưa gọi tool tạo dữ liệu.");
          return;
        }
        if (reply.status !== "TOOL_CALL" || !reply.tool)
          throw new Error(reply.message ?? "Phản hồi điều phối không hợp lệ.");
        if (reply.tool.name === "demo_create_scenario") {
          writes += 1;
          if (writes > 1 || !reply.permit)
            throw new Error("Mỗi lượt chỉ được tạo một bộ mẫu đã cấp quyền.");
          const args = validateDemoArgs(reply.tool.args);
          if (args.ownerId !== ownerId)
            throw new Error("Chủ ngựa không khớp lựa chọn.");
          // Persist only the receipt pointer; never persist chat content, keys or execution permits.
          sessionStorage.setItem(pointerKey, generationId);
          pending.current = generationId;
          setPendingId(generationId);
          current.tools.authorize({
            ...args,
            generationId,
            sessionNonce,
            permit: reply.permit,
          });
          setPhase("Đang kiểm tra tài nguyên và tạo dữ liệu qua WebMCP…");
        } else if (reply.tool.name === "demo_set_time") {
          setPhase("Đang điều chỉnh đồng hồ mô phỏng qua WebMCP…");
        } else setPhase("Đang đọc điều kiện tạo mẫu qua WebMCP…");
        const toolResult = (await executeDemoTool(
          current.native,
          reply.tool.name,
          reply.tool.args,
          signal,
          { origin: location.origin, source: window },
        )) as { activeDate?: string | null } | undefined;
        if (reply.tool.name === "demo_set_time") {
          const applied = toolResult?.activeDate ?? null;
          setUiBlocks(
            reply.uiBlocks && reply.uiBlocks.length > 0
              ? reply.uiBlocks
              : [
                  {
                    type: "TIME_TRAVEL",
                    title: "Đã cập nhật đồng hồ mô phỏng",
                    mode: "EXACT_DATE",
                    date: applied ?? undefined,
                  },
                ],
          );
          addMessage(
            "assistant",
            applied
              ? `Đã tua thời gian sang ${applied} (đồng bộ cả FE và BE).`
              : "Đã khôi phục về thời gian thực tế của hệ thống.",
          );
          setPhase("Đã cập nhật thời gian mô phỏng.");
          return;
        }
        if (reply.tool.name === "demo_create_scenario") {
          setPhase("Đang xác minh biên nhận trên server…");
          const confirmed = await demoDataApi.chat(
            { ...request, completed: true },
            remaining(),
          );
          signal.throwIfAborted();
          if (confirmed.status !== "ANSWER" || !confirmed.receipt)
            throw new Error("Chưa xác minh được kết quả tạo mẫu.");
          acceptReceipt(confirmed.receipt, generationId, true, confirmed.uiBlocks);
          return;
        }
        contextRead = true;
      }
      throw new Error(
        "Đã đạt giới hạn ba lần gọi tool. Chưa xác nhận tạo dữ liệu.",
      );
    } catch (reason) {
      if (current.signal.aborted) return;
      if (pending.current) {
        setPhase("Đang kiểm tra biên nhận trước khi thử lại…");
        try {
          const stored = await demoDataApi.receipt(generationId);
          if (current.signal.aborted) return;
          if (stored) {
            acceptReceipt(stored, generationId, true);
            return;
          }
        } catch {
          /* Keep the generation ID: a lost response does not prove rollback. */
        }
        setUncertain(true);
      }
      if (current.signal.aborted) return;
      setDraft(input);
      setError(
        reason instanceof Error ? reason.message : "Không xử lý được yêu cầu.",
      );
      setPhase(
        pending.current
          ? "Chưa xác nhận kết quả. Kiểm tra biên nhận hoặc gửi lại yêu cầu cũ cùng mã."
          : "Chưa tạo dữ liệu. Bạn có thể sửa yêu cầu và gửi lại.",
      );
    } finally {
      current.tools.clear();
      active.current = false;
      if (!current.signal.aborted) setBusy(false);
    }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    await runPrompt(draft);
  };

  const recover = async () => {
    const current = runtime.current;
    const id = pending.current;
    if (!current || !id || active.current) return;
    active.current = true;
    setBusy(true);
    try {
      const stored = await demoDataApi.receipt(id);
      if (current.signal.aborted) return;
      if (stored) acceptReceipt(stored, id, true);
      else
        setPhase(
          "Chưa có biên nhận. Gửi lại yêu cầu cũ sẽ giữ nguyên mã để tránh tạo trùng.",
        );
    } catch (reason) {
      if (!current.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Chưa kiểm tra được biên nhận.",
        );
    } finally {
      active.current = false;
      if (!current.signal.aborted) setBusy(false);
    }
  };

  const handleQuickTimeJump = async (days: number | null) => {
    const next = days === null ? null : addDaysYmd(realToday, days);
    try {
      await setDemoDate(next);
      setActiveDemoDate(next);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thay đổi được đồng hồ máy chủ");
    }
  };

  const handleCanvasHorseSubmit = (scenario: DemoScenario, horseName: string) => {
    const label =
      scenario === "ADMISSION_PENDING"
        ? "ngựa chờ tiếp nhận"
        : "ngựa sẵn sàng thi đấu";
    void runPrompt(`Tạo ${label} tên ${horseName}`);
  };

  return (
    <section className={styles.agentSplitGrid} aria-labelledby={`${fieldId}-heading`}>
      <div className={styles.chat}>
        <h4 id={`${fieldId}-heading`} className={styles.chatHeading}>
          Chuẩn bị dữ liệu mẫu
        </h4>
        <p className={styles.chatHint}>
          Mỗi yêu cầu tối đa một ngựa hoặc điều chỉnh thời gian mô phỏng.
        </p>
        <p className={styles.chatClock}>
          Đồng hồ hệ thống · UTC+7
          {context
            ? ` · Máy chủ lúc mở: ${new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(context.serverTime))}`
            : ""}
          {webmcpMode
            ? ` · ${webmcpMode === "native" ? "WebMCP native" : "WebMCP tương thích trình duyệt"}`
            : ""}
        </p>
        {(timeShifted || activeDemoDate) && (
          <p className={styles.chatNotice}>
            Đang giả lập ngày: {activeDemoDate || "hôm nay"}. Trợ lý tạo mẫu dùng cùng đồng hồ hệ thống.
          </p>
        )}
        <label className={styles.chatLabel} htmlFor={`${fieldId}-owner`}>
          Chủ ngựa
        </label>
        <select
          id={`${fieldId}-owner`}
          value={ownerId}
          disabled={!ready || busy}
          onChange={(event) => setOwnerId(event.target.value)}
          className={styles.chatInput}
        >
          <option value="">Chọn chủ ngựa đang hoạt động</option>
          {context?.owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.fullName}
            </option>
          ))}
        </select>
        <div className={styles.chatSuggestions} aria-label="Gợi ý yêu cầu">
          <Button
            size="sm"
            tone="secondary"
            disabled={!ready || busy}
            onClick={() => setDraft("Tạo ngựa chờ tiếp nhận tên Sao Mai")}
          >
            Ngựa chờ tiếp nhận
          </Button>
          <Button
            size="sm"
            tone="secondary"
            disabled={!ready || busy}
            onClick={() =>
              setDraft(
                "Tạo ngựa đã hồi phục tên Bạch Phong, có lịch sử tập và đủ điều kiện đăng ký thi đấu",
              )
            }
          >
            Ngựa sẵn sàng thi đấu
          </Button>
          <Button
            size="sm"
            tone="secondary"
            disabled={!ready || busy}
            onClick={() => setDraft("Tua +30 ngày để chốt hóa đơn")}
          >
            Tua +30 ngày
          </Button>
        </div>
      {context?.recipes
        .filter((recipe) => recipe.reason)
        .map((recipe) => (
          <p key={recipe.id} className={styles.chatNotice}>
            {recipe.title}: {recipe.reason}
          </p>
        ))}
      {context && !context.aiConfigured && (
        <p className={styles.chatNotice}>
          Chưa cấu hình Gemini ở backend. Chưa thể tạo dữ liệu từ chat.
        </p>
      )}
      <div
        role="log"
        aria-label="Hội thoại tạo dữ liệu mẫu"
        className={styles.chatLog}
      >
        {!messages.length && (
          <p className={styles.chatHint}>
            Ví dụ: “Tạo ngựa chờ tiếp nhận tên Sao Mai”.
          </p>
        )}
        {messages.map((item, index) => (
          <p
            key={index}
            className={
              item.role === "user" ? styles.chatUser : styles.chatAssistant
            }
          >
            <strong>{item.role === "user" ? "Bạn" : "Trợ lý"}: </strong>
            {item.text}
          </p>
        ))}
      </div>
      <p role="status" aria-live="polite" className={styles.chatHint}>
        {phase}
      </p>
      {error && (
        <p role="alert" className={styles.chatError}>
          {error}
        </p>
      )}
      {uncertain && (
        <div className={styles.chatNotice}>
          Giữ nguyên mã yêu cầu cũ để tránh tạo trùng. Không dùng yêu cầu này để
          tạo ngựa khác.
          {pendingId && (
            <small className={styles.chatCode}>Mã yêu cầu: {pendingId}</small>
          )}
          <Button
            size="sm"
            tone="secondary"
            disabled={busy}
            onClick={() => void recover()}
          >
            Kiểm tra biên nhận
          </Button>
        </div>
      )}
      {receipt && (
        <article className={styles.chatReceipt} aria-label="Biên nhận tạo mẫu">
          <strong>Đã tạo bộ mẫu DEMO</strong>
          <small className={styles.chatCode}>Mã: {receipt.generationId}</small>
          <small>
            {new Intl.DateTimeFormat("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              dateStyle: "short",
              timeStyle: "medium",
            }).format(new Date(receipt.createdAt))}{" "}
            · UTC+7
          </small>
          <ul>
            {receipt.records.map((record) => (
              <li key={record.entity}>
                {recordLabels[record.entity] ?? "Bản ghi liên quan"}:{" "}
                {record.ids.length} bản ghi
              </li>
            ))}
          </ul>
          {receipt.warnings.map((warning, index) => (
            <p key={index}>{warning}</p>
          ))}
          {receipt.links
            .filter((link) =>
              /^\/(horses(\/[a-z0-9-]+)?|races)$/i.test(link.path),
            )
            .map((link) => (
              <Link key={link.path} to={link.path}>
                {link.label}
              </Link>
            ))}
        </article>
      )}
      <form onSubmit={(event) => void send(event)} className={styles.chatForm}>
        <label className={styles.chatLabel} htmlFor={`${fieldId}-prompt`}>
          Yêu cầu tạo bộ mẫu
        </label>
        <textarea
          id={`${fieldId}-prompt`}
          value={draft}
          maxLength={2000}
          rows={3}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          className={styles.chatInput}
          placeholder="Mô tả bộ mẫu và tên ngựa…"
        />
        <div className={styles.chatActions}>
          <Button
            type="submit"
            size="sm"
            disabled={
              !ready ||
              busy ||
              !draft.trim() ||
              !context?.aiConfigured
            }
          >
            {uncertain ? "Thử lại cùng mã" : "Gửi yêu cầu"}
          </Button>
          {busy && (
            <Button
              size="sm"
              tone="secondary"
              onClick={() => {
                turn.current?.abort();
                runtime.current?.tools.clear();
                setPhase(
                  "Đang dừng sau chặng hiện tại; dữ liệu đã ghi vẫn được giữ lại.",
                );
              }}
            >
              Dừng
            </Button>
          )}
        </div>
      </form>
      </div>
      <div className={styles.agentCanvasCol}>
        <AgentUiCanvas
          blocks={uiBlocks}
          context={context}
          receipt={receipt}
          ownerId={ownerId}
          onSelectOwner={setOwnerId}
          activeDate={activeDemoDate}
          realToday={realToday}
          busy={busy}
          onQuickTimeJump={handleQuickTimeJump}
          onSubmitHorseForm={handleCanvasHorseSubmit}
          onReloadPage={() => window.location.reload()}
        />
      </div>
    </section>
  );
}
