import type { ReactNode } from "react";
import { BottomDock, type DockTarget } from "./BottomDock";

export function AppShell({
  children,
  dock,
  onNavigate,
}: {
  children: ReactNode;
  dock?: DockTarget;
  onNavigate?: (target: DockTarget) => void;
}) {
  return (
    <main className={`shell q-app-shell${dock ? " q-app-shell--with-dock" : ""}`}>
      <div className="ambient ambient-a" aria-hidden="true" />
      <div className="ambient ambient-b" aria-hidden="true" />
      {children}
      {dock && onNavigate && <BottomDock active={dock} onNavigate={onNavigate} />}
    </main>
  );
}
