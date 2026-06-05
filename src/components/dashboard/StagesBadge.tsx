import { DEAL_STAGE_LABELS } from "@/lib/constants";
import type { DealStageType } from "@/types";

type Props = {
  stage: DealStageType;
};

const STAGE_VAR_MAP: Record<string, string> = {
  DOCUMENT_COLLECTION: "--s-doc",
  SPREADING: "--s-spr",
  CREDIT_REVIEW: "--s-rev",
  CREDIT_COMMITTEE: "--s-com",
  CLOSED: "--s-clo",
  DECLINED: "--s-dec",
};

export function StagesBadge({ stage }: Props) {
  const label = DEAL_STAGE_LABELS[stage] ?? stage;
  const cssVar = STAGE_VAR_MAP[stage] ?? "--s-doc";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        color: `var(${cssVar})`,
        background: `color-mix(in srgb, var(${cssVar}) 14%, transparent)`,
        border: `1px solid color-mix(in srgb, var(${cssVar}) 26%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: `var(${cssVar})`,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
