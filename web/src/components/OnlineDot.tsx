interface OnlineDotProps {
  online: boolean;
  size?: number;
}

export function OnlineDot({ online, size = 10 }: OnlineDotProps) {
  return (
    <span
      title={online ? "Online" : "Offline"}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: online ? "#22c55e" : "#9ca3af",
        boxShadow: online ? "0 0 0 2px rgba(34,197,94,0.25)" : undefined,
        flexShrink: 0,
      }}
      aria-label={online ? "Online" : "Offline"}
    />
  );
}
