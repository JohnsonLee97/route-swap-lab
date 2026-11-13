import type { FormEvent } from "react";
import type { Route, Traveller } from "../types";

type TrialFormProps = {
  routes: Route[];
  routeIds: Record<Traveller, string>;
  onRouteChange: (traveller: Traveller, id: string) => void;
  onCreate: (routeA: Route, routeB: Route) => Promise<void>;
  isBusy: boolean;
  isSaving: boolean;
};

export function TrialForm({
  routes,
  routeIds,
  onRouteChange,
  onCreate,
  isBusy,
  isSaving,
}: TrialFormProps) {
  const routeA = routes.find((route) => String(route.id) === routeIds.A);
  const routeB = routes.find((route) => String(route.id) === routeIds.B);
  const sameRoute = routeA !== undefined && routeA.id === routeB?.id;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy || !routeA || !routeB || sameRoute) return;
    void onCreate(routeA, routeB);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="route-grid">
        {(["A", "B"] as const).map((traveller) => {
          const route = traveller === "A" ? routeA : routeB;
          return (
            <div
              className="route-choice"
              data-traveller={traveller}
              key={traveller}
            >
              <label htmlFor={`route-${traveller}`}>
                <span className="route-letter" aria-hidden="true">
                  {traveller}
                </span>
                Traveller {traveller}
              </label>
              <select
                id={`route-${traveller}`}
                value={routeIds[traveller]}
                onChange={(event) =>
                  onRouteChange(traveller, event.target.value)
                }
                disabled={isBusy}
              >
                <option value="">Select a route</option>
                {routes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {route?.origin && route.destination && (
                <p className="route-endpoints">
                  {route.origin} <span aria-hidden="true">→</span>{" "}
                  {route.destination}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="route-form-footer">
        {sameRoute && (
          <p className="route-error" role="status">
            Choose two different routes.
          </p>
        )}
        <button
          className="route-button route-primary"
          type="submit"
          disabled={isBusy || !routeA || !routeB || sameRoute}
        >
          {isSaving ? "Creating…" : "Create Trial"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </form>
  );
}
