import { useEffect, useRef, useState } from "react";
import { getApiHealth, getRoutes } from "./api";
import { TrialForm } from "./components/TrialForm";
import { TrialPanel } from "./components/TrialPanel";
import { useTrial } from "./hooks/useTrial";
import type { Route, Traveller } from "./types";
import "./route-swap.css";

export default function App() {
  const [apiStatus, setApiStatus] = useState("Checking connection…");
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [routeError, setRouteError] = useState(false);
  const [routeIds, setRouteIds] = useState({ A: "", B: "" });
  const setupHeading = useRef<HTMLHeadingElement>(null);
  const {
    trial,
    selectedTraveller,
    isLoadingTrial,
    isSaving,
    isBusy,
    pendingTrip,
    trialMessage,
    tripError,
    createTrial,
    updateTrip,
    travellerLink,
  } = useTrial();

  useEffect(() => {
    void getApiHealth()
      .then((data) => {
        setApiStatus(
          data.status === "ok" ? "Connected" : "Unexpected response",
        );
      })
      .catch(() => setApiStatus("Could not connect"));

    void getRoutes()
      .then(setRoutes)
      .catch(() => setRouteError(true));
  }, []);

  function changeRoute(traveller: Traveller, id: string) {
    setRouteIds((previous) => ({ ...previous, [traveller]: id }));
  }

  function swapRoutes() {
    if (trial === null) return;
    setRouteIds({ A: String(trial.routeBId), B: String(trial.routeAId) });
    setupHeading.current?.focus();
  }

  return (
    <div className="route-app">
      <header className="route-header">
        <a className="route-brand" href="/">
          <span className="route-brand-mark" aria-hidden="true">
            ⇄
          </span>
          Route Swap Lab
        </a>
        <p
          className="route-connection"
          data-connected={apiStatus === "Connected"}
        >
          <span aria-hidden="true" />
          <span>{apiStatus === "Connected" ? "Connected" : apiStatus}</span>
        </p>
      </header>

      <main className="route-main">
        <div className="route-hero">
          <div>
            <h1>
              {selectedTraveller
                ? `Traveller ${selectedTraveller}`
                : "Same destination. Different routes."}
            </h1>
            <p>
              {selectedTraveller
                ? "Log your departure and arrival from this page."
                : "Pick two routes, travel at the same time, and see which one gets you there faster."}
            </p>
          </div>
          <div className="route-map" aria-hidden="true">
            <div className="route-map-track route-map-track-a">
              <span>A</span>
              <i />
              <i />
            </div>
            <div className="route-map-track route-map-track-b">
              <span>B</span>
              <i />
              <i />
            </div>
          </div>
        </div>

        {selectedTraveller === null && (
          <section
            className="route-panel"
            aria-labelledby="route-setup-heading"
          >
            <h2 id="route-setup-heading" tabIndex={-1} ref={setupHeading}>
              Set up a trial
            </h2>
            {routeError && (
              <p className="route-notice" role="alert">
                Could not load routes. Refresh to try again.
              </p>
            )}
            {!routeError && routes === null && (
              <p className="route-notice" role="status">
                Loading routes…
              </p>
            )}
            {routes?.length === 0 && (
              <p className="route-notice">No routes available.</p>
            )}
            {routes && routes.length > 0 && (
              <TrialForm
                routes={routes}
                routeIds={routeIds}
                onRouteChange={changeRoute}
                onCreate={createTrial}
                isBusy={isBusy || isLoadingTrial}
                isSaving={isSaving}
              />
            )}
          </section>
        )}

        {isLoadingTrial && (
          <p className="route-notice" role="status">
            Loading trial…
          </p>
        )}
        {trial && (
          <TrialPanel
            key={trial.id}
            trial={trial}
            selectedTraveller={selectedTraveller}
            isBusy={isBusy}
            pendingTrip={pendingTrip}
            tripError={tripError}
            travellerLink={travellerLink}
            onUpdateTrip={updateTrip}
            onSwap={swapRoutes}
          />
        )}

        {trialMessage && (
          <p className="route-notice" role="status">
            {trialMessage}
          </p>
        )}
      </main>
    </div>
  );
}
