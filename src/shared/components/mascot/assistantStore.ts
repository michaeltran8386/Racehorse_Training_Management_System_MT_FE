import { useSyncExternalStore } from "react";

// Hội thoại Trợ lý TMEC dùng chung giữa bảng linh vật và trang /assistant; tải lại trang thì bắt đầu cuộc mới.

export type ChatStatus = "ANSWERED" | "INSUFFICIENT_EVIDENCE" | "REFUSED_UNAUTHORIZED" | "BLOCKED_PROMPT_INJECTION";

/** Định dạng output cố định 6 phần do BE trả về (POST /ai/assistant/chat). */
export interface AssistantAnswer {
  traceId: string;
  status: ChatStatus;
  summary: string;
  data: {
    tool: string;
    title: string;
    columns: { key: string; label: string }[];
    rows: Record<string, string | number | null>[];
    asOf: string;
  }[];
  alerts: { level: "danger" | "warn" | "info"; text: string }[];
  actions: { label: string; route: string }[];
  sources: { type: "tool" | "doc"; id: string; label: string }[];
  disclaimer: string | null;
  aiGenerated: boolean;
  cached: boolean;
  quota: { used: number; limit: number };
}

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; result: AssistantAnswer }
  | { id: string; role: "error"; text: string };

let messages: ChatMessage[] = [];
const listeners = new Set<() => void>();

export function setMessages(next: (prev: ChatMessage[]) => ChatMessage[]) {
  messages = next(messages);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAssistantMessages() {
  return useSyncExternalStore(subscribe, () => messages);
}
