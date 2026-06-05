import { DEAL_STAGE_COLORS, DEAL_STAGE_LABELS } from "@/lib/constants";
import type { DealStageType } from "@/types";

type Props = {
  stage: DealStageType;
};

export function StagesBadge({ stage }: Props) {
  const label = DEAL_STAGE_LABELS[stage] ?? stage;
  const colorClass = DEAL_STAGE_COLORS[stage] ?? "bg-gray-100 text-gray-800";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
