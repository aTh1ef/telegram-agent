const VARIANTS = {
  hr_policy: "bg-accent-subtle text-accent-emphasis",
  general: "bg-success-subtle text-success",
  blocked: "bg-danger-subtle text-danger",
  neutral: "bg-canvas-subtle text-fg-muted",
} as const;

export function Badge({
  variant = "neutral",
  children,
}: {
  variant?: keyof typeof VARIANTS;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
