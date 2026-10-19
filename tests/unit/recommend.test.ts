import { describe, expect, it } from "vitest";
import { recommend } from "../../src/domain/recommend";
import type { Place } from "../../src/domain/types";

const base: Place = { id:"osm:node:1", name:"Тест", category:"museum", lat:51.129, lon:71.431, address:null, tags:["museum","culture"], sourceUrl:"https://www.openstreetmap.org/node/1", sourceName:"OSM", retrievedAt:"2026-10-19T00:00:00.000Z", dataMode:"snapshot", price:null, durationMinutes:40 };

describe("recommend", () => {
  it("keeps unknown price uncertain under a strict budget", () => {
    const [item] = recommend([base], { goal:"activity", minutes:120, budget:3000, origin:{lat:51.1282,lon:71.4304}, likedTags:["museum"] });
    expect(item.feasibility).toBe("uncertain");
    expect(item.unknowns).toContain("Стоимость не указана в источнике");
  });
  it("excludes a candidate that cannot fit the time window", () => {
    const items = recommend([{...base, durationMinutes:180}], { goal:"activity", minutes:30, budget:null, origin:{lat:51.1282,lon:71.4304}, likedTags:[] });
    expect(items).toHaveLength(0);
  });
});
