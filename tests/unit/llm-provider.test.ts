import { describe, expect, it } from "vitest";
import { DeterministicProvider } from "../../src/server/providers/llm";

describe("DeterministicProvider", () => {
  it("uses only supplied candidate IDs and preserves unknowns", async () => {
    const result = await new DeterministicProvider().explain([{ id:"osm:node:1", name:"Музей", category:"museum", totalMinutes:70, feasibility:"uncertain", unknowns:["Цена неизвестна"], sourceUrl:"https://www.openstreetmap.org/node/1" }]);
    expect(result.mode).toBe("deterministic");
    expect(result.items[0].candidateId).toBe("osm:node:1");
    expect(result.items[0].unknowns).toEqual(["Цена неизвестна"]);
  });
});
