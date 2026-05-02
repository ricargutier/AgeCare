import type { AlertSeverity } from "../../../shared/contracts/types";

interface SeverityChipProps {
  severity: AlertSeverity;
}

const styles: Record<AlertSeverity, { bg: string; color: string; label: string }> = {
  critical: { bg: "#fee2e2", color: "#b91c1c", label: "Critical" },
  warn: { bg: "#fef3c7", color: "#92400e", label: "Warning" },
  info: { bg: "#dbeafe", color: "#1e40af", label: "Info" },
};

export function SeverityChip({ severity }: SeverityChipProps) {
  const { bg, color, label } = styles[severity];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );
}
