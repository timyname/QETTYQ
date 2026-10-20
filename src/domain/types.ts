export type Goal = "food" | "walk" | "activity" | "new";

export type Place = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address: string | null;
  tags: string[];
  sourceUrl: string;
  sourceName: string;
  retrievedAt: string;
  dataMode: "snapshot";
  price: { min: number; max: number } | null;
  durationMinutes: number;
  openingHours?: string | null;
  website?: string | null;
  cuisines?: string[];
  coordinateQuality?: "observed" | "derived";
  nameTranslations?: Partial<Record<"ru" | "kk" | "en", string>>;
};

export type Recommendation = Place & {
  distanceKm: number;
  travelMinutes: number;
  totalMinutes: number;
  feasibility: "feasible" | "uncertain" | "infeasible";
  reason: string;
  unknowns: string[];
};
