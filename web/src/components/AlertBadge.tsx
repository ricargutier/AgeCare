import type { AlertStatus } from "../../../shared/contracts/types";

interface AlertBadgeProps {
  count: number;
  status?: AlertStatus;
}

export function AlertBadge({ count, status = "open" }: AlertBadgeProps) {
  if (count === 0) return null;

  const colors: Record<AlertStatus, string> = {
    open: "#DC3545",
    acknowledged: "#f59e0b",
    resolved: "#40916C",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 20,
        height: 20,
        padding: "0 6px",
        borderRadius: 999,
        background: colors[status],
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
      }}
      aria-label={`${count} ${status} alert${count !== 1 ? "s" : ""}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
