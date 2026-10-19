"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { QButton } from "./QButton";

type QOverlayProps = {
  open: boolean;
  title: string;
  kind?: "sheet" | "dialog";
  children: ReactNode;
  onClose: () => void;
};

export function QOverlay({ open, title, kind = "sheet", children, onClose }: QOverlayProps) {
  const titleId = useId();
  const surface = useRef<HTMLDivElement>(null);
  const overlayRoot = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    trigger.current = document.activeElement as HTMLElement;
    const siblings = Array.from(document.body.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlayRoot.current);
    const priorInert = siblings.map((element) => element.inert);
    siblings.forEach((element) => { element.inert = true; });
    const frame = requestAnimationFrame(() => surface.current?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !surface.current) return;
      const focusable = Array.from(surface.current.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])")).filter((item) => !item.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      siblings.forEach((element, index) => { element.inert = priorInert[index]; });
      trigger.current?.focus();
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div ref={overlayRoot} className="q-overlay" data-kind={kind} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={surface} className="q-overlay__surface" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="q-overlay__head">
          <h2 id={titleId}>{title}</h2>
          <QButton variant="icon" size={44} aria-label="Закрыть" onClick={onClose} leadingIcon={<X size={20} />} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
