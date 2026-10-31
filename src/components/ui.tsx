"use client";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { X, ArrowUpRight, ArrowDownRight, LoaderCircle, Award } from "lucide-react";
import { initials, riskLevel } from "@/lib/types";

const dialogStack: HTMLElement[] = [];
let originalOverflow = "";
export function useDialogFocus(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialogStack.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    dialogStack.push(element);
    const first = element.querySelector<HTMLElement>("input, select, textarea, button");
    first?.focus({ preventScroll: true });
    const handler = (e: KeyboardEvent) => {
      if (dialogStack.at(-1) !== element) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const items = element.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea, a[href], [tabindex="0"]',
        );
        if (!items.length) return;
        const start = items[0],
          end = items[items.length - 1];
        if (e.shiftKey && document.activeElement === start) {
          e.preventDefault();
          end.focus();
        } else if (!e.shiftKey && document.activeElement === end) {
          e.preventDefault();
          start.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      const index = dialogStack.indexOf(element);
      if (index >= 0) dialogStack.splice(index, 1);
      if (!dialogStack.length) document.body.style.overflow = originalOverflow;
      previous?.focus({ preventScroll: true });
    };
  }, [ref]);
}

/**
 * Official Air University (AU) Eagle + Torches + Wreath + AU Monogram SVG.
 */
export function AirLogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Air University Logo"
    >
      {/* Eagle head & spread wing at apex */}
      <path
        d="M44 16c-5-3-11-3-16 0l-5 4 5 1c-2 2-3 4-1 5 3 1 8 0 11 2l-26 58 10-7c16-11 35-12 52-2 11 6 22 6 30-2 5-5 7-13 7-23V26h-9v26c0 8-2 13-5 16-5 5-13 5-22-1L55 24c7-1 16 1 24 5l15-9 10-7-14 2 18-10c-18 0-36 1-49 3l-5 8c-3-2-6-1-10 0Z"
        fill="#1482c8"
      />
      {/* Inner triangle cutout of A */}
      <path d="M46 31 32 61c10-4 20-4 29 0L46 31Z" fill="#0d2238" />
      {/* Crossed torches & laurel wreath */}
      <path
        d="M27 38c-2-4 1-8 4-9 1 3 3 5 2 8l3 4-6 3-3-6Zm38 0c2-4-1-8-4-9-1 3-3 5-2 8l-3 4 6 3 3-6ZM36 47l22 14m0-14L36 61"
        stroke="#29a3ec"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="47" cy="48" r="5.5" fill="#29a3ec" />
      {/* AIR UNIVERSITY text bar */}
      <text
        x="60"
        y="94"
        textAnchor="middle"
        fill="#1da1f2"
        fontSize="12.5"
        fontWeight="800"
        letterSpacing="1.2"
      >
        AIR UNIVERSITY
      </text>
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      <span className="brand-mark air-logo-box">
        <AirLogoMark size={compact ? 30 : 38} />
      </span>
      <span>
        AIR<span className="brand-period">.</span>
      </span>
    </div>
  );
}

export function CrBadge({ label }: { label?: string | null }) {
  if (!label) return null;
  return (
    <span className="cr-badge" title="Class Representative">
      <Award size={11} />
      {label}
    </span>
  );
}

export function Avatar({ name, color = "sage", small = false }: { name: string; color?: string; small?: boolean }) {
  return <span className={`avatar ${color} ${small ? "small" : ""}`}>{initials(name)}</span>;
}

export function RiskBadge({ score }: { score: number }) {
  return (
    <span className={`risk-badge ${score >= 65 ? "high" : score >= 40 ? "moderate" : "low"}`}>
      <i />
      {score}% <span>{riskLevel(score)}</span>
    </span>
  );
}

export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Trend({ positive = true, children }: { positive?: boolean; children: ReactNode }) {
  return (
    <span className={`trend ${positive ? "positive" : "negative"}`}>
      {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {children}
    </span>
  );
}

export function Busy({ label = "Saving…" }: { label?: string }) {
  return (
    <>
      <LoaderCircle size={15} className="spin" />
      {label}
    </>
  );
}

export function EmptyState({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-symbol">✧</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}

import type { Workspace } from "@/lib/types";

const tokenGlobal = globalThis as typeof globalThis & {
  __airSessionToken?: string | null;
  __airWorkspaceCache?: Workspace | null;
  __airAuthEpoch?: number;
};

export function getAuthEpoch(): number {
  return tokenGlobal.__airAuthEpoch ?? 0;
}

export function bumpAuthEpoch(): number {
  tokenGlobal.__airAuthEpoch = (tokenGlobal.__airAuthEpoch ?? 0) + 1;
  return tokenGlobal.__airAuthEpoch;
}

export function getCachedWorkspace(): Workspace | null {
  return tokenGlobal.__airWorkspaceCache ?? null;
}

export function setCachedWorkspace(ws: Workspace | null) {
  tokenGlobal.__airWorkspaceCache = ws;
}

export function getSessionToken(): string | null {
  if (typeof tokenGlobal.__airSessionToken === "string" && tokenGlobal.__airSessionToken.length > 0) {
    return tokenGlobal.__airSessionToken;
  }
  if (typeof window !== "undefined") {
    try {
      const saved =
        window.sessionStorage.getItem("air_session_token") ||
        window.localStorage.getItem("air_session_token");
      if (saved) {
        tokenGlobal.__airSessionToken = saved;
        return saved;
      }
    } catch {
      /* storage restricted in sandboxed iframe */
    }
  }
  return null;
}

export function setSessionToken(token: string | null) {
  tokenGlobal.__airSessionToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        window.sessionStorage.setItem("air_session_token", token);
        window.localStorage.setItem("air_session_token", token);
      } else {
        window.sessionStorage.removeItem("air_session_token");
        window.localStorage.removeItem("air_session_token");
      }
    } catch {
      /* storage restricted in sandboxed iframe */
    }
  }
}

export function authHeaders(): Record<string, string> {
  const token = getSessionToken();
  return token ? { "x-air-session": token } : {};
}

export async function api<T = { ok: boolean }>(path: string, method: string, body?: unknown): Promise<T> {
  if (path === "/api/session") {
    bumpAuthEpoch();
  }
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  if (path === "/api/session" && data && typeof data === "object") {
    if ("token" in data) {
      setSessionToken((data as { token: string | null }).token ?? null);
    }
    if ("workspace" in data && (data as { workspace?: Workspace }).workspace) {
      setCachedWorkspace((data as { workspace: Workspace }).workspace);
    }
  }
  return data as T;
}
