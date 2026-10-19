import type { ButtonHTMLAttributes, ReactNode } from "react";

export type QButtonVariant = "primary" | "secondary" | "text" | "danger" | "icon";
export type QButtonSize = 44 | 48 | 56 | 64;
export type QButtonState = "default" | "success" | "error";

type QButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: QButtonVariant;
  size?: QButtonSize;
  visualState?: QButtonState;
  loading?: boolean;
  loadingLabel?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export function QButton({
  variant = "primary",
  size = 56,
  visualState = "default",
  loading = false,
  loadingLabel = "Загрузка…",
  leadingIcon,
  trailingIcon,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: QButtonProps) {
  const iconOnly = variant === "icon";

  return (
    <button
      {...props}
      type={type}
      className={`q-button q-button--${variant} q-button--${size} ${className}`.trim()}
      data-state={loading ? "loading" : visualState}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
    >
      {loading ? <span className="q-button__spinner" aria-hidden="true" /> : leadingIcon}
      {!iconOnly && <span className="q-button__label">{loading ? loadingLabel : children}</span>}
      {!loading && trailingIcon}
    </button>
  );
}
