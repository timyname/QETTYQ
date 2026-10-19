import { House, Map, Search, UserRound } from "lucide-react";

export type DockTarget = "discover" | "search" | "map" | "profile";

const items = [
  { id: "discover", label: "Для тебя", Icon: House },
  { id: "search", label: "Поиск", Icon: Search },
  { id: "map", label: "Карта", Icon: Map },
  { id: "profile", label: "Профиль", Icon: UserRound },
] as const;

export function BottomDock({
  active,
  hasRealUpdate = false,
  onNavigate,
}: {
  active: DockTarget;
  hasRealUpdate?: boolean;
  onNavigate: (target: DockTarget) => void;
}) {
  return (
    <nav className="q-dock" aria-label="Основная навигация">
      {items.map(({ id, label, Icon }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            className="q-dock__item"
            aria-current={selected ? "page" : undefined}
            aria-label={label}
            onClick={() => onNavigate(id)}
          >
            <span className="q-dock__icon">
              <Icon size={20} strokeWidth={selected ? 2.4 : 1.8} aria-hidden="true" />
              {id === "search" && hasRealUpdate && <i className="q-dock__update" aria-label="Есть новое сообщение" />}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
