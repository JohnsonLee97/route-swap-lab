import { useEffect, useId, useState } from "react";
import { getTrial } from "../api";
import type { Traveller, Trial } from "../types";
import "../styles/rematch-comparison.css";

type Props = {
  originalId: number;
  rematch: Trial;
};

type RouteTimes = {
  id: number;
  name: string;
  originalTraveller: Traveller;
  rematchTraveller: Traveller;
  originalSeconds: number;
  rematchSeconds: number;
};

const travellers = ["A", "B"] as const;

function formatTime(seconds: number) {
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function getRoutes(original: Trial, rematch: Trial): RouteTimes[] {
  const originalTravellers = new Map<number, Traveller>([
    [original.routeAId, "A"],
    [original.routeBId, "B"],
  ]);

  const rows: RouteTimes[] = [];

  for (const rematchTraveller of travellers) {
    const id = rematchTraveller === "A" ? rematch.routeAId : rematch.routeBId;
    const originalTraveller = originalTravellers.get(id);
    if (!originalTraveller) return [];

    const first = original.travellers[originalTraveller];
    const second = rematch.travellers[rematchTraveller];
    if (first.durationSeconds == null || second.durationSeconds == null)
      return [];

    rows.push({
      id,
      name: second.route,
      originalTraveller,
      rematchTraveller,
      originalSeconds: first.durationSeconds,
      rematchSeconds: second.durationSeconds,
    });
  }

  return rows.sort(
    (a, b) => a.originalSeconds - b.originalSeconds || a.id - b.id,
  );
}

export function RematchComparison({ originalId, rematch }: Props) {
  const [original, setOriginal] = useState<Trial | null>(null);
  const [failedId, setFailedId] = useState<number | null>(null);
  const [view, setView] = useState<"times" | "change">("times");
  const titleId = useId();

  useEffect(() => {
    const controller = new AbortController();

    void getTrial(originalId, controller.signal)
      .then((trial) => {
        if (!controller.signal.aborted) setOriginal(trial);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailedId(originalId);
      });

    return () => controller.abort();
  }, [originalId]);

  if (failedId === originalId) {
    return (
      <p className="route-error" role="alert">
        Could not load the original trial.
      </p>
    );
  }
  if (original?.id !== originalId) {
    return (
      <p className="route-notice" role="status">
        Loading comparison…
      </p>
    );
  }

  const rows = getRoutes(original, rematch);
  const [first, second] = rows;
  if (!first || !second) {
    return (
      <p className="route-notice">
        Two completed trips on the same routes are needed in each trial.
      </p>
    );
  }

  const originalGap = second.originalSeconds - first.originalSeconds;
  const rematchGap = second.rematchSeconds - first.rematchSeconds;
  let summary = "A different route was faster in each trial.";

  if (originalGap === 0 && rematchGap === 0) {
    summary = "Both trials ended in a tie.";
  } else if (originalGap === 0) {
    const winner = rematchGap > 0 ? first : second;
    summary = `Trial #${originalId} was tied. ${winner.name} was faster in the rematch.`;
  } else if (rematchGap === 0) {
    summary = `${first.name} was faster in Trial #${originalId}. The rematch was tied.`;
  } else if (rematchGap > 0) {
    summary = `${first.name} was faster in both trials.`;
  }

  const maxTime = Math.max(
    first.originalSeconds,
    first.rematchSeconds,
    second.originalSeconds,
    second.rematchSeconds,
    1,
  );
  const maxChange = Math.max(
    Math.abs(first.rematchSeconds - first.originalSeconds),
    Math.abs(second.rematchSeconds - second.originalSeconds),
    1,
  );

  return (
    <section className="rematch" aria-labelledby={titleId}>
      <header className="rematch-header">
        <div>
          <h3 id={titleId}>Original vs Rematch</h3>
          <p className="rematch-summary">{summary}</p>
        </div>
        <div
          className="rematch-toggle"
          role="group"
          aria-label="Comparison view"
        >
          <button
            type="button"
            aria-pressed={view === "times"}
            onClick={() => setView("times")}
          >
            Trip times
          </button>
          <button
            type="button"
            aria-pressed={view === "change"}
            onClick={() => setView("change")}
          >
            Time change
          </button>
        </div>
      </header>

      <div className="rematch-legend" data-view={view}>
        <span className="rematch-key rematch-key-original">
          Original #{originalId}
        </span>
        <span className="rematch-key rematch-key-current">
          Rematch #{rematch.id}
        </span>
      </div>

      {view === "change" && (
        <div className="rematch-axis" aria-hidden="true">
          <span>Faster</span>
          <span>0s</span>
          <span>Slower</span>
        </div>
      )}

      <div className="rematch-routes">
        {rows.map((row) => {
          const change = row.rematchSeconds - row.originalSeconds;
          const direction =
            change < 0 ? "faster" : change > 0 ? "slower" : "same";
          const changeLabel =
            change === 0
              ? "No change"
              : `${formatTime(Math.abs(change))} ${direction}`;
          const runs = [
            {
              label: "Original",
              traveller: row.originalTraveller,
              seconds: row.originalSeconds,
              kind: "original",
            },
            {
              label: "Rematch",
              traveller: row.rematchTraveller,
              seconds: row.rematchSeconds,
              kind: "current",
            },
          ];

          return (
            <article className="rematch-card" key={row.id}>
              <div className="rematch-card-header">
                <h4>{row.name}</h4>
                <strong className="rematch-delta" data-direction={direction}>
                  {changeLabel}
                </strong>
              </div>

              {view === "times" ? (
                <div className="rematch-bars">
                  {runs.map((run) => (
                    <div
                      className="rematch-run"
                      data-run={run.kind}
                      key={run.kind}
                    >
                      <span>
                        <strong>{run.label}</strong> · Traveller {run.traveller}
                      </span>
                      <strong>{formatTime(run.seconds)}</strong>
                      <div className="rematch-track" aria-hidden="true">
                        <span
                          style={{ width: `${(run.seconds / maxTime) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="rematch-change-track" aria-hidden="true">
                    <span
                      data-direction={direction}
                      style={{
                        width: `${(Math.abs(change) / maxChange) * 50}%`,
                      }}
                    />
                  </div>
                  <p className="rematch-change-caption">
                    {formatTime(row.originalSeconds)}{" "}
                    <span aria-hidden="true">→</span>{" "}
                    {formatTime(row.rematchSeconds)} · Traveller{" "}
                    {row.originalTraveller} to Traveller {row.rematchTraveller}
                  </p>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
