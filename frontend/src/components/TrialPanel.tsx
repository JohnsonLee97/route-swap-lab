import { useState } from "react";
import type { Traveller, Trial } from "../types";

type TrialPanelProps = {
  trial: Trial;
  selectedTraveller: Traveller | null;
  pendingTrip: { traveller: Traveller; action: "start" | "arrive" } | null;
  isBusy: boolean;
  tripError: string;
  travellerLink: (id: number, traveller: Traveller) => string;
  onUpdateTrip: (
    traveller: Traveller,
    action: "start" | "arrive",
  ) => Promise<void>;
  onSwap: () => void;
};

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
}

export function TrialPanel({
  trial,
  selectedTraveller,
  pendingTrip,
  isBusy,
  tripError,
  travellerLink,
  onUpdateTrip,
  onSwap,
}: TrialPanelProps) {
  const travellers: Traveller[] = selectedTraveller
    ? [selectedTraveller]
    : ["A", "B"];
  const { A, B } = trial.travellers;
  const durationA = A.durationSeconds;
  const durationB = B.durationSeconds;
  const bothArrived = durationA !== null && durationB !== null;
  const [copyStatus, setCopyStatus] = useState("");
  const [manualLink, setManualLink] = useState<string | null>(null);

  async function copyLink(traveller: Traveller, path: string) {
    const url = new URL(path, window.location.href).href;
    setManualLink(null);

    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus(`Traveller ${traveller}’s link copied.`);
    } catch {
      setManualLink(url);
      setCopyStatus(`Select and copy Traveller ${traveller}’s link below.`);
    }
  }

  return (
    <section className="route-panel" aria-labelledby="active-trial-heading">
      <div className="route-panel-heading">
        <h2 id="active-trial-heading">Trial #{trial.id}</h2>
        {selectedTraveller === null && (
          <span className="route-status">
            {bothArrived ? "Complete" : "Auto-updating"}
          </span>
        )}
      </div>

      <div className="route-grid">
        {travellers.map((traveller) => {
          const trip = trial.travellers[traveller];
          const duration = trip.durationSeconds;
          const isPending = pendingTrip?.traveller === traveller;
          const action = trip.started ? "arrive" : "start";
          const actionLabel = trip.started ? "Mark Arrived" : "Start Trip";
          const pendingLabel =
            pendingTrip?.action === "start" ? "Starting…" : "Saving…";
          const step = duration !== null ? 2 : trip.started ? 1 : 0;
          const link =
            selectedTraveller === null
              ? travellerLink(trial.id, traveller)
              : null;
          const hasKey =
            link !== null &&
            Boolean(
              new URLSearchParams(
                new URL(link, window.location.href).hash.slice(1),
              ).get("key"),
            );

          return (
            <article
              className="route-trip"
              data-traveller={traveller}
              key={traveller}
            >
              <header className="route-trip-heading">
                <span className="route-letter" aria-hidden="true">
                  {traveller}
                </span>
                <div>
                  <p>Traveller {traveller}</p>
                  <h3>{trip.route}</h3>
                </div>
              </header>

              <ol
                className="route-progress"
                aria-label={`Traveller ${traveller} progress`}
              >
                {["Ready", "On the way", "Arrived"].map((label, index) => (
                  <li
                    key={label}
                    data-reached={index <= step}
                    aria-current={index === step ? "step" : undefined}
                  >
                    {label}
                  </li>
                ))}
              </ol>

              {duration !== null ? (
                <p className="route-duration">{formatDuration(duration)}</p>
              ) : (
                <button
                  className="route-button route-trip-button"
                  type="button"
                  disabled={isBusy}
                  onClick={() => void onUpdateTrip(traveller, action)}
                >
                  {isPending ? pendingLabel : actionLabel}
                </button>
              )}

              {link && hasKey && (
                <div className="route-invite">
                  <a href={link}>Open Traveller {traveller}’s page</a>
                  <button
                    className="route-button route-quiet"
                    type="button"
                    onClick={() => void copyLink(traveller, link)}
                  >
                    Copy {traveller}’s link
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {copyStatus && (
        <p className="route-notice" role="status">
          {copyStatus}
        </p>
      )}
      {manualLink && (
        <input
          className="route-copy-input"
          aria-label="Traveller invite link"
          readOnly
          value={manualLink}
          onFocus={(event) => event.target.select()}
        />
      )}
      {tripError && (
        <p className="route-error" role="alert">
          {tripError}
        </p>
      )}

      {bothArrived && (
        <div className="route-result">
          <h3 role="status">
            {durationA === durationB
              ? "Both routes took the same time."
              : `${durationA < durationB ? A.route : B.route} was faster by ${Math.abs(durationA - durationB)} seconds.`}
          </h3>
          <div className="route-bars">
            {(["A", "B"] as const).map((traveller) => {
              const trip = trial.travellers[traveller];
              const duration = traveller === "A" ? durationA : durationB;
              const longest = Math.max(durationA, durationB, 1);
              return (
                <div
                  className="route-bar"
                  data-traveller={traveller}
                  key={traveller}
                >
                  <span>{trip.route}</span>
                  <strong>{formatDuration(duration)}</strong>
                  <div className="route-bar-track" aria-hidden="true">
                    <span style={{ width: `${(duration / longest) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {selectedTraveller === null && (
            <button
              className="route-button route-primary"
              type="button"
              disabled={isBusy}
              onClick={onSwap}
            >
              <span aria-hidden="true">⇄</span> Swap Routes
            </button>
          )}
        </div>
      )}
    </section>
  );
}
