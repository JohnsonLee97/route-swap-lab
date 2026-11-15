import type { Route, Traveller, Trial } from "./types";

type CreatedTrial = {
  id: number;
  routeAId: number;
  routeBId: number;
  tripKeys: Record<Traveller, string>;
};

async function request<T>(
  path: string,
  errorMessage: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, options);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || errorMessage);
  }

  return (await response.json()) as T;
}

export function getApiHealth() {
  return request<{ status: string }>("/api/health", "Could not connect.");
}

export function getRoutes() {
  return request<Route[]>("/api/routes", "Could not load routes.");
}

export function getTrial(id: string | number, signal: AbortSignal) {
  return request<Trial>(
    `/api/trials/${encodeURIComponent(id)}`,
    "Could not load trial.",
    { signal, cache: "no-store" },
  );
}

export function createTrial(
  routeAId: number,
  routeBId: number,
  previousTrialId: number | null = null,
) {
  return request<CreatedTrial>("/api/trials", "Could not create trial.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routeAId, routeBId, previousTrialId }),
  });
}

export function startTrip(
  id: number,
  traveller: Traveller,
  key: string | null,
) {
  return request<{ status: string }>(
    `/api/trials/${id}/trips/${traveller}/start`,
    "Could not start trip.",
    { method: "POST", headers: { Authorization: `Bearer ${key ?? ""}` } },
  );
}

export function markArrived(
  id: number,
  traveller: Traveller,
  key: string | null,
) {
  return request<{ durationSeconds: number }>(
    `/api/trials/${id}/trips/${traveller}/arrive`,
    "Could not mark arrival.",
    { method: "POST", headers: { Authorization: `Bearer ${key ?? ""}` } },
  );
}
