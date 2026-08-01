import { useEffect, useRef, useState, type ReactNode } from "react";
import { haptic, type HapticKind } from "@/hooks/useHaptics.ts";
import { cn } from "@/utils/cn.ts";
import { Icon, type IconName } from "./Icon.tsx";

/**
 * The control vocabulary.
 *
 * Everything tappable in the application is one of these. They all press the
 * same way, tick the same way, and disable the same way — which is most of what
 * separates something that feels like a device from something that feels like a
 * page with buttons on it.
 */

// ── Button ────────────────────────────────────────────────────────────

type ButtonTone = "plain" | "accent" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  icon?: IconName;
  tone?: ButtonTone;
  size?: ButtonSize;
  disabled?: boolean;
  /** Dim and show a spinner: the command is out but unacknowledged. */
  busy?: boolean;
  fullWidth?: boolean;
  haptics?: HapticKind | false;
  className?: string;
  ariaLabel?: string;
}

const TONE: Record<ButtonTone, string> = {
  plain: "bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--hairline)]",
  accent: "bg-[var(--accent)] text-[var(--accent-ink)] border border-transparent font-semibold",
  danger: "bg-transparent text-[var(--danger)] border border-[var(--danger)]/40",
  ghost: "bg-transparent text-[var(--ink-2)] border border-transparent",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px] rounded-[var(--radius-sm)] gap-1.5",
  md: "h-12 px-4 text-[15px] rounded-[var(--radius)] gap-2",
  lg: "h-14 px-5 text-[16px] rounded-[var(--radius-lg)] gap-2.5",
};

export function Button({
  children,
  onClick,
  icon,
  tone = "plain",
  size = "md",
  disabled,
  busy,
  fullWidth,
  haptics = "tick",
  className,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={() => {
        if (haptics) haptic(haptics);
        onClick?.();
      }}
      className={cn(
        "pressable focus-ring inline-flex items-center justify-center whitespace-nowrap",
        TONE[tone],
        SIZE[size],
        fullWidth && "w-full",
        busy && "opacity-60",
        className,
      )}
    >
      {busy ? <Spinner /> : icon ? <Icon name={icon} size={size === "sm" ? 16 : 19} /> : null}
      {children}
    </button>
  );
}

/** A big square control — the D-pad, the transport row, the pet actions. */
export function PadButton({
  icon,
  iconClassName,
  label,
  hideLabel,
  onPress,
  onHold,
  onRelease,
  active,
  disabled,
  tone = "plain",
  className,
}: {
  icon?: IconName;
  /** Mostly used to rotate a chevron — one glyph serves all four directions. */
  iconClassName?: string;
  label?: string;
  /** Keep the label as the accessible name without drawing it. */
  hideLabel?: boolean;
  onPress?: () => void;
  onHold?: () => void;
  onRelease?: () => void;
  active?: boolean;
  disabled?: boolean;
  tone?: "plain" | "accent";
  className?: string;
}) {
  const holding = useRef(false);

  // A held control must release even if the finger leaves the element, or the
  // host is left with a direction stuck down.
  useEffect(() => {
    if (!onHold) return;
    const release = () => {
      if (!holding.current) return;
      holding.current = false;
      onRelease?.();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [onHold, onRelease]);

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={
        onHold
          ? (event) => {
              event.preventDefault();
              holding.current = true;
              haptic("tick");
              onHold();
            }
          : undefined
      }
      onClick={
        onHold
          ? undefined
          : () => {
              haptic("tick");
              onPress?.();
            }
      }
      className={cn(
        "pressable focus-ring flex flex-col items-center justify-center gap-1 rounded-[var(--radius)] border",
        tone === "accent" || active
          ? "border-transparent bg-[var(--accent)] text-[var(--accent-ink)]"
          : "border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--ink)]",
        disabled && "opacity-40",
        className,
      )}
    >
      {icon ? <Icon name={icon} size={22} className={iconClassName} /> : null}
      {label && !hideLabel ? <span className="text-[11px] font-medium tracking-wide">{label}</span> : null}
    </button>
  );
}

// ── Segmented ─────────────────────────────────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "relative flex rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--bg-2)] p-1",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={selected}
            disabled={option.disabled}
            onClick={() => {
              haptic("select");
              onChange(option.value);
            }}
            className={cn(
              "pressable focus-ring relative flex-1 rounded-[calc(var(--radius)-4px)] px-2 py-2 text-[13px] font-medium transition-colors",
              selected ? "bg-[var(--surface-3)] text-[var(--ink)]" : "text-[var(--ink-3)]",
              option.disabled && "opacity-40",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic("select");
        onChange(!checked);
      }}
      className={cn(
        "focus-ring relative h-[30px] w-[52px] shrink-0 rounded-full border transition-colors duration-200",
        checked
          ? "border-transparent bg-[var(--accent)]"
          : "border-[var(--hairline)] bg-[var(--surface-3)]",
        disabled && "opacity-40",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-all duration-200",
          checked ? "left-[27px]" : "left-[3px]",
        )}
        style={{ transitionTimingFunction: "var(--ease-spring)" }}
      />
    </button>
  );
}

// ── Meter ─────────────────────────────────────────────────────────────

export function Meter({
  value,
  label,
  detail,
  tone = "accent",
  segments = 12,
}: {
  /** 0–1. */
  value: number;
  label?: string;
  detail?: string;
  tone?: "accent" | "warn" | "danger" | "muted";
  segments?: number;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const lit = Math.round(clamped * segments);
  const colour =
    tone === "warn"
      ? "var(--warn)"
      : tone === "danger"
        ? "var(--danger)"
        : tone === "muted"
          ? "var(--ink-3)"
          : "var(--accent)";

  return (
    <div>
      {label || detail ? (
        <div className="mb-1.5 flex items-baseline justify-between">
          {label ? <span className="t-label">{label}</span> : <span />}
          {detail ? <span className="t-tabular text-[12px] text-[var(--ink-2)]">{detail}</span> : null}
        </div>
      ) : null}
      {/* Segments rather than a bar: the same reasoning as on the CRT, and it
          keeps the two screens visually related. */}
      <div className="flex gap-[3px]" role="meter" aria-valuenow={Math.round(clamped * 100)} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className="h-[6px] flex-1 rounded-full transition-colors duration-300"
            style={{ background: i < lit ? colour : "var(--surface-3)" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Sheet ─────────────────────────────────────────────────────────────

export function Sheet({
  open,
  onClose,
  title,
  children,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
}) {
  // Keep the sheet mounted for its exit, and lock the page behind it.
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
    else {
      const timer = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, dismissible]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={dismissible ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "glass relative w-full max-w-md rounded-t-[var(--radius-xl)] border-b-0 px-5 pt-3 pb-safe",
          open ? "animate-sheet-in" : "translate-y-full transition-transform duration-200",
        )}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[var(--hairline-strong)]" />
        {title ? <h2 className="t-title mb-3">{title}</h2> : null}
        <div className="pb-5">{children}</div>
      </div>
    </div>
  );
}

// ── Small parts ───────────────────────────────────────────────────────

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "warn" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent)]",
        tone === "warn" && "bg-[var(--warn)]/12 text-[var(--warn)]",
        tone === "danger" && "bg-[var(--danger)]/12 text-[var(--danger)]",
        tone === "muted" && "bg-[var(--surface-3)] text-[var(--ink-2)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A settings-style row: label, optional detail, and a control on the right. */
export function Row({
  label,
  detail,
  icon,
  children,
  onClick,
}: {
  label: string;
  detail?: ReactNode;
  icon?: IconName;
  children?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface-3)] text-[var(--ink-2)]">
          <Icon name={icon} size={18} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] text-[var(--ink)]">{label}</span>
        {detail ? <span className="block truncate text-[13px] text-[var(--ink-3)]">{detail}</span> : null}
      </span>
      {children}
      {onClick && !children ? <Icon name="chevron-right" size={18} className="text-[var(--ink-4)]" /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          haptic("tick");
          onClick();
        }}
        className="pressable focus-ring flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {content}
      </button>
    );
  }

  return <div className="flex w-full items-center gap-3 px-4 py-3">{content}</div>;
}

/** Groups rows into one card with dividers between them. */
export function RowGroup({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section>
      {label ? <p className="t-label mb-2 px-1">{label}</p> : null}
      <div className="card overflow-hidden [&>*+*]:border-t [&>*+*]:border-[var(--hairline)]">{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--ink-3)]">
        <Icon name={icon} size={26} />
      </span>
      <p className="text-[16px] font-medium text-[var(--ink)]">{title}</p>
      {detail ? <p className="max-w-xs text-[13px] text-[var(--ink-3)]">{detail}</p> : null}
      {action}
    </div>
  );
}
