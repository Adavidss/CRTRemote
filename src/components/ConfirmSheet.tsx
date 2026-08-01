import { connection, useConnection } from "@/state/connection.ts";
import { haptic } from "@/hooks/useHaptics.ts";
import { Button, Sheet } from "./ui/controls.tsx";

/**
 * The host's yes/no questions.
 *
 * The host raises these, not the phone — switching the CRT to computer
 * passthrough is the main one, and it is the host that knows it is about to
 * take the screen away and disable every control on this device. Modelling it
 * as a request from the other end means the confirmation is correct no matter
 * which remote (or which button on the Pi) started it.
 */
export function ConfirmSheet() {
  const { confirm } = useConnection();

  return (
    <Sheet
      open={confirm !== null}
      onClose={() => confirm && connection.answerConfirm(confirm.id, false)}
      title={confirm?.title}
    >
      <p className="mb-5 text-[14px] leading-relaxed text-[var(--ink-2)]">{confirm?.body}</p>
      <div className="flex gap-3">
        <Button
          tone="plain"
          size="lg"
          fullWidth
          onClick={() => confirm && connection.answerConfirm(confirm.id, false)}
        >
          {confirm?.cancelLabel ?? "Cancel"}
        </Button>
        <Button
          tone="accent"
          size="lg"
          fullWidth
          haptics={false}
          onClick={() => {
            haptic("confirm");
            if (confirm) connection.answerConfirm(confirm.id, true);
          }}
        >
          {confirm?.confirmLabel ?? "Confirm"}
        </Button>
      </div>
    </Sheet>
  );
}
