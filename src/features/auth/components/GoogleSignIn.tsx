import { useEffect, useRef, useState } from "react";
import { useAppLanguage } from "@/shared/lib/language";
import { Button } from "@/shared/components/ui/Button";
import styles from "../pages/AuthPages.module.css";

interface GoogleIdentity {
  initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let scriptPromise: Promise<void> | undefined;

function loadGoogle(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => fail(), 10_000);
      const fail = () => {
        window.clearTimeout(timeout);
        script.remove();
        reject(new Error("Google unavailable"));
      };
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => {
        window.clearTimeout(timeout);
        if (window.google?.accounts.id) resolve();
        else fail();
      };
      script.onerror = fail;
      document.head.appendChild(script);
    }).catch((error: unknown) => { scriptPromise = undefined; throw error; });
  }
  return scriptPromise;
}

export function GoogleSignIn({ onCredential, mode = "signin" }: { onCredential: (credential: string) => void; mode?: "signin" | "signup" }) {
  const button = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { lang } = useAppLanguage();
  callback.current = onCredential;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setUnavailable(false);
    let observer: ResizeObserver | undefined;
    loadGoogle().then(() => {
      const hit = button.current;
      const box = frame.current;
      if (cancelled || !hit || !box || !window.google?.accounts.id) return;
      hit.replaceChildren();
      window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => callback.current(credential) });
      // Nút Google rộng tối đa 400px, cao 40px: phóng nó phủ kín nút của mình để chỗ nào bấm cũng trúng.
      const width = Math.min(400, Math.max(200, box.clientWidth));
      window.google.accounts.id.renderButton(hit, {
        type: "standard", theme: "outline", size: "large", shape: "pill",
        text: mode === "signup" ? "signup_with" : "signin_with", width, locale: lang,
      });
      const fit = () => {
        hit.style.width = `${width}px`;
        hit.style.height = "40px";
        hit.style.transform = `translate(-50%, -50%) scale(${box.clientWidth / width}, ${box.clientHeight / 40})`;
      };
      fit();
      observer = new ResizeObserver(fit);
      observer.observe(box);
    }).catch(() => { if (!cancelled) setUnavailable(true); });
    return () => { cancelled = true; observer?.disconnect(); };
  }, [lang, attempt, mode]);

  if (!clientId) return null;
  return (
    <div className={styles.googleSignIn}>
      <span className={styles.googleDivider}>{lang === "vi" ? "hoặc" : "or"}</span>
      <div ref={frame} className={styles.googleButton}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        <span aria-hidden="true">
          {mode === "signup"
            ? lang === "vi" ? "Đăng ký bằng Google" : "Sign up with Google"
            : lang === "vi" ? "Đăng nhập bằng Google" : "Sign in with Google"}
        </span>
        <div ref={button} className={styles.googleHit} />
      </div>
      {unavailable && <>
        <p role="status">{lang === "vi" ? "Không tải được đăng nhập Google. Vui lòng thử lại." : "Google sign-in could not be loaded. Please try again."}</p>
        <Button tone="secondary" size="sm" onClick={() => setAttempt((value) => value + 1)}>{lang === "vi" ? "Thử lại" : "Try again"}</Button>
      </>}
    </div>
  );
}
