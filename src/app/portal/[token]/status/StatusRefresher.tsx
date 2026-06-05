"use client";

import { useState, useEffect, useCallback } from "react";
import type { DealStage } from "@prisma/client";
import {
  STEPS,
  getStepState,
  getCompletionLabel,
  translateActivityType,
  formatRelativeTime,
} from "./stage-utils";

type ActivityEntry = {
  id: string;
  actionType: string;
  createdAt: string;
};

type StatusData = {
  stage: DealStage;
  docsSubmitted: number;
  docsRequired: number;
  docsValidated: number;
  recentActivity: ActivityEntry[];
};

type Props = {
  token: string;
  bankColor: string;
  initialData: StatusData;
};

export function StatusRefresher({ token, bankColor, initialData }: Props) {
  const [data, setData] = useState<StatusData>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${token}/status`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data as StatusData);
        setLastUpdated(new Date());
        setSecondsAgo(0);
      }
    } catch {
      // Silently ignore network errors — stale data is fine
    }
  }, [token]);

  useEffect(() => {
    const refreshInterval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(refreshInterval);
  }, [fetchStatus]);

  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1_000);
    return () => clearInterval(ticker);
  }, [lastUpdated]);

  const allDocsValidated = data.docsRequired > 0 && data.docsValidated === data.docsRequired;
  const completionLabel = getCompletionLabel(data.stage);
  const progressPct =
    data.docsRequired > 0 ? Math.round((data.docsSubmitted / data.docsRequired) * 100) : 0;

  const visibleActivity = data.recentActivity
    .map((entry) => ({
      ...entry,
      label: translateActivityType(entry.actionType),
    }))
    .filter((entry) => entry.label !== null)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Vertical stepper */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Application Progress
        </h2>
        <ol className="space-y-0">
          {STEPS.map((step, idx) => {
            const state = getStepState(step.number, data.stage, allDocsValidated);
            const isLast = idx === STEPS.length - 1;

            return (
              <li key={step.number} className="flex gap-4">
                {/* Circle + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      state === "completed"
                        ? "bg-green-500 text-white"
                        : state === "current"
                        ? "text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                    style={state === "current" ? { backgroundColor: bankColor } : undefined}
                  >
                    {state === "completed" ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span
                        className={
                          state === "current" ? "animate-pulse" : ""
                        }
                      >
                        {step.number}
                      </span>
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`mt-1 mb-1 w-0.5 flex-1 min-h-[24px] ${
                        state === "completed" ? "bg-green-300" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        state === "completed"
                          ? "text-green-700"
                          : state === "current"
                          ? "font-bold"
                          : "text-gray-400"
                      }`}
                      style={state === "current" ? { color: bankColor } : undefined}
                    >
                      {step.label}
                    </span>
                    {state === "current" && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: bankColor }}
                      >
                        In progress
                      </span>
                    )}
                    {step.number === 5 && completionLabel && (
                      <span className={`text-xs font-semibold ${completionLabel.color}`}>
                        {completionLabel.text}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Document summary card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Your Documents
        </h2>
        <p className="mb-2 text-sm text-gray-700">
          {data.docsSubmitted} of {data.docsRequired} submitted
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Recent activity */}
      {visibleActivity.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Recent Activity
          </h2>
          <ul className="space-y-3">
            {visibleActivity.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-4">
                <span className="text-sm text-gray-700">{entry.label}</span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatRelativeTime(new Date(entry.createdAt))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Last updated */}
      <p className="text-center text-xs text-gray-400">
        Last updated:{" "}
        {secondsAgo === 0
          ? "just now"
          : secondsAgo === 1
          ? "1 second ago"
          : `${secondsAgo} seconds ago`}
      </p>
    </div>
  );
}
