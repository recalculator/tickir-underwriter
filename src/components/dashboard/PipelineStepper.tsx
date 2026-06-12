import { Check } from "lucide-react";

export type PipelineStepStatus = "complete" | "current" | "pending";

export type PipelineStep = {
  key: string;
  label: string;
  status: PipelineStepStatus;
};

type Props = {
  steps: PipelineStep[];
};

const STATUS_STYLES: Record<PipelineStepStatus, { bg: string; border: string; color: string }> = {
  complete: { bg: "var(--s-clo)", border: "var(--s-clo)", color: "var(--accent-ink)" },
  current: { bg: "color-mix(in srgb, var(--accent) 16%, transparent)", border: "var(--accent)", color: "var(--accent)" },
  pending: { bg: "transparent", border: "var(--line-2)", color: "var(--ink-4)" },
};

export function PipelineStepper({ steps }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {steps.map((step, i) => {
        const style = STATUS_STYLES[step.status];
        const isLast = i === steps.length - 1;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : "1 1 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: style.bg,
                border: `1.5px solid ${style.border}`,
                flexShrink: 0,
              }}>
                {step.status === "complete" ? (
                  <Check size={13} style={{ color: style.color }} />
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: style.color }}>{i + 1}</span>
                )}
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: step.status === "current" ? 700 : 600,
                color: step.status === "pending" ? "var(--ink-4)" : "var(--ink)",
                whiteSpace: "nowrap",
              }}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div style={{
                height: 1.5,
                flex: 1,
                margin: "0 12px",
                background: step.status === "complete" ? "var(--s-clo)" : "var(--line-2)",
                minWidth: 24,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
