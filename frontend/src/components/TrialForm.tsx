import { useId, useRef, useState, type FormEvent } from "react";
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
  const pickerId = useId();
  const [openTraveller, setOpenTraveller] = useState<Traveller | null>(null);
  const triggers = useRef<Record<Traveller, HTMLButtonElement | null>>({
    A: null,
    B: null,
  });

  function closePicker(traveller: Traveller) {
    setOpenTraveller(null);
    triggers.current[traveller]?.focus();
  }

  const routeA = routes.find((route) => String(route.id) === routeIds.A);
  const routeB = routes.find((route) => String(route.id) === routeIds.B);
  const sameRoute = routeA !== undefined && routeA.id === routeB?.id;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy || !routeA || !routeB || sameRoute) return;
    setOpenTraveller(null);
    void onCreate(routeA, routeB);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="route-grid">
        {(["A", "B"] as const).map((traveller) => {
          const route = traveller === "A" ? routeA : routeB;
          const isOpen = openTraveller === traveller;
          const labelId = `${pickerId}-label-${traveller}`;
          const triggerId = `${pickerId}-trigger-${traveller}`;
          const optionsId = `${pickerId}-options-${traveller}`;

          return (
            <div
              className="route-choice"
              data-traveller={traveller}
              key={traveller}
              onKeyDown={(event) => {
                if (event.key === "Escape" && isOpen) {
                  event.preventDefault();
                  closePicker(traveller);
                }
              }}
            >
              <h3 className="route-choice-label" id={labelId}>
                <span className="route-letter" aria-hidden="true">
                  {traveller}
                </span>
                Traveller {traveller}
              </h3>
              <div
                className="route-picker-control"
                data-has-selection={Boolean(route)}
              >
                <button
                  className="route-picker-trigger"
                  type="button"
                  id={triggerId}
                  ref={(button) => {
                    triggers.current[traveller] = button;
                  }}
                  aria-labelledby={`${labelId} ${triggerId}`}
                  aria-expanded={isOpen}
                  aria-controls={optionsId}
                  disabled={isBusy}
                  onClick={() => setOpenTraveller(isOpen ? null : traveller)}
                >
                  <span>{route?.name ?? "Select a route"}</span>
                  <span className="route-picker-chevron" aria-hidden="true" />
                </button>
                {route && (
                  <button
                    className="route-picker-clear"
                    type="button"
                    aria-label={`Clear Traveller ${traveller}’s route`}
                    disabled={isBusy}
                    onClick={() => {
                      onRouteChange(traveller, "");
                      closePicker(traveller);
                    }}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                )}
              </div>

              <ul
                className="route-picker-options"
                id={optionsId}
                hidden={!isOpen}
              >
                {routes.map((option) => {
                  const id = String(option.id);
                  const isSelected = routeIds[traveller] === id;

                  return (
                    <li key={option.id}>
                      <button
                        className="route-picker-option"
                        type="button"
                        aria-pressed={isSelected}
                        disabled={isBusy}
                        onClick={() => {
                          if (!isSelected) onRouteChange(traveller, id);
                          closePicker(traveller);
                        }}
                      >
                        <span>{option.name}</span>
                        {isSelected && <span aria-hidden="true">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
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
