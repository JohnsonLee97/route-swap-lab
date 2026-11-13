import { useEffect, useState } from "react";
import * as api from "../api";
import type { Route, Traveller, Trial } from "../types";

function getTripKey(
  id: number,
  traveller: Traveller,
  selected: Traveller | null,
) {
  if (selected !== null) {
    return selected === traveller
      ? new URLSearchParams(window.location.hash.slice(1)).get("key")
      : null;
  }

  return sessionStorage.getItem(`trial:${id}:${traveller}`);
}

export function useTrial() {
  const travellerParam = new URLSearchParams(window.location.search).get(
    "traveller",
  );
  const selectedTraveller: Traveller | null =
    travellerParam === "A" || travellerParam === "B" ? travellerParam : null;

  const [trial, setTrial] = useState<Trial | null>(null);
  const [isLoadingTrial, setIsLoadingTrial] = useState(() =>
    new URLSearchParams(window.location.search).has("trial"),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [trialMessage, setTrialMessage] = useState("");
  const [tripError, setTripError] = useState("");
  const [pendingTrip, setPendingTrip] = useState<{
    traveller: Traveller;
    action: "start" | "arrive";
  } | null>(null);

  const trialId = trial?.id;
  const bothArrived =
    trial !== null &&
    trial.travellers.A.durationSeconds !== null &&
    trial.travellers.B.durationSeconds !== null;
  const isBusy = isSaving || pendingTrip !== null;

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("trial");
    if (id === null) return;

    const controller = new AbortController();

    async function loadTrial(trialId: string) {
      try {
        const savedTrial = await api.getTrial(trialId, controller.signal);
        if (!controller.signal.aborted) setTrial(savedTrial);
      } catch (error) {
        if (!controller.signal.aborted) {
          setTrialMessage(
            error instanceof Error ? error.message : "Could not load trial.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingTrial(false);
      }
    }

    void loadTrial(id);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (
      trialId === undefined ||
      selectedTraveller !== null ||
      isLoadingTrial ||
      isBusy ||
      bothArrived
    ) {
      return;
    }

    const controller = new AbortController();
    let timer: number;

    async function refreshTrial(id: number) {
      try {
        const savedTrial = await api.getTrial(id, controller.signal);
        if (!controller.signal.aborted) setTrial(savedTrial);
      } catch {
        // Keep the last displayed results and retry on the next check.
      } finally {
        if (!controller.signal.aborted) {
          timer = window.setTimeout(() => void refreshTrial(id), 3000);
        }
      }
    }

    timer = window.setTimeout(() => void refreshTrial(trialId), 3000);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trialId, selectedTraveller, isLoadingTrial, isBusy, bothArrived]);

  async function createTrial(routeA: Route, routeB: Route) {
    if (isLoadingTrial || isBusy || routeA.id === routeB.id) return;

    setIsSaving(true);
    setTrialMessage("");

    try {
      const result = await api.createTrial(routeA.id, routeB.id);
      sessionStorage.setItem(`trial:${result.id}:A`, result.tripKeys.A);
      sessionStorage.setItem(`trial:${result.id}:B`, result.tripKeys.B);

      const url = new URL(window.location.href);
      url.searchParams.set("trial", String(result.id));
      window.history.replaceState(null, "", url);

      setTrial({
        id: result.id,
        routeAId: result.routeAId,
        routeBId: result.routeBId,
        travellers: {
          A: { route: routeA.name, started: false, durationSeconds: null },
          B: { route: routeB.name, started: false, durationSeconds: null },
        },
      });
      setTripError("");
      setTrialMessage(`Trial #${result.id} created.`);
    } catch (error) {
      setTrialMessage(
        error instanceof Error ? error.message : "Could not create trial.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTrip(traveller: Traveller, action: "start" | "arrive") {
    if (trial === null || isBusy) return;

    const trip = trial.travellers[traveller];
    if (
      trip.durationSeconds !== null ||
      trip.started !== (action === "arrive")
    ) {
      return;
    }

    const id = trial.id;
    const key = getTripKey(id, traveller, selectedTraveller);
    setPendingTrip({ traveller, action });
    setTripError("");

    try {
      let durationSeconds: number | null = null;

      if (action === "start") {
        await api.startTrip(id, traveller, key);
      } else {
        const result = await api.markArrived(id, traveller, key);
        durationSeconds = result.durationSeconds;
      }

      setTrial((previous) => {
        if (previous === null || previous.id !== id) return previous;

        return {
          ...previous,
          travellers: {
            ...previous.travellers,
            [traveller]: { ...trip, started: true, durationSeconds },
          },
        };
      });
    } catch (error) {
      setTripError(
        error instanceof Error ? error.message : "Could not save trip.",
      );
    } finally {
      setPendingTrip(null);
    }
  }

  function travellerLink(id: number, traveller: Traveller) {
    const key = getTripKey(id, traveller, selectedTraveller) ?? "";
    return `/?trial=${id}&traveller=${traveller}#key=${encodeURIComponent(key)}`;
  }

  return {
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
  };
}
