import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import "@/shared/styles/tokens.css";
import "@/shared/styles/fonts.css";
import "@/shared/styles/equiflow-fonts.css";
import "@/shared/styles/global.css";
import "@/shared/i18n";

// Fix React removeChild / insertBefore crash caused by browser auto-translate (issue #11538)
if (typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("Prevented removeChild crash from external DOM mutation:", child);
      }
      return child;
    }
    return originalRemoveChild.apply(this, [child]) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("Prevented insertBefore crash from external DOM mutation:", referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
  };
}

// Bấm vào bất kỳ đâu trên ô input date/time đều lập tức mở hộp thoại chọn lịch/đồng hồ chuẩn (showPicker)
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (target && target.tagName === "INPUT") {
      const input = target as HTMLInputElement;
      if (
        (input.type === "date" || input.type === "time" || input.type === "datetime-local" || input.type === "month") &&
        !input.disabled &&
        !input.readOnly
      ) {
        try {
          input.showPicker?.();
        } catch {
          // Bỏ qua nếu đã mở hoặc trình duyệt không cho phép gọi lặp lại
        }
      }
    }
  });
}

// Điểm khởi động của ứng dụng: dựng React vào <div id="root"> trong index.html.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
