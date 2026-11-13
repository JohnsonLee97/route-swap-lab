export type Route = {
  id: number;
  name: string;
  origin: string;
  destination: string;
};

export type Traveller = "A" | "B";

export type Trip = {
  route: string;
  started: boolean;
  durationSeconds: number | null;
};

export type Trial = {
  id: number;
  routeAId: number;
  routeBId: number;
  travellers: Record<Traveller, Trip>;
};
