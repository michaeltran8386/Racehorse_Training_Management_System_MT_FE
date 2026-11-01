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

export function GoogleSignIn({ onCredential }: { onCredential: (credential: string) => void }) {
  const button = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { lang } = useAppLanguage();
  callback.current = onCredential;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setUnavailable(false);
    loadGoogle().then(() => {
      if (cancelled || !button.current || !window.google?.accounts.id) return;
      button.current.replaceChildren();
      window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => callback.current(credential) });
      window.google.accounts.id.renderButton(button.current, {
        type: "standard", theme: "outline", size: "large", text: "signin_with", width: 320, locale: lang,
      });
    }).catch(() => { if (!cancelled) setUnavailable(true); });
    return () => { cancelled = true; };
  }, [lang, attempt]);

  if (!clientId) return null;
  return (
    <div className={styles.googleSignIn}>
      <span className={styles.googleDivider}>{lang === "vi" ? "hoặc" : "or"}</span>
      <div ref={button} />
      {unavailable && <>
        <p role="status">{lang === "vi" ? "Không tải được đăng nhập Google. Vui lòng thử lại." : "Google sign-in could not be loaded. Please try again."}</p>
        <Button tone="secondary" size="sm" onClick={() => setAttempt((value) => value + 1)}>{lang === "vi" ? "Thử lại" : "Try again"}</Button>
      </>}
    </div>
  );
}
