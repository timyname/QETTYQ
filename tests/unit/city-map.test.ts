import { describe, expect, it } from "vitest";
import { clusterMapPoints, clusterMarkerSize, createClusterLabel, createMapTooltip, coLocatedMapPoints, mapOccurrenceLabel } from "../../src/components/CityMap";

describe("CityMap tooltip DOM", () => {
  it("keeps untrusted title and date as text rather than HTML", () => {
    type TestNode = { tag: string; textContent: string | null; children: TestNode[]; appendChild: (node: TestNode) => TestNode };
    const created: TestNode[] = [];
    const document = { createElement(tag: string) {
      const node: TestNode = { tag, textContent: null, children: [], appendChild(child) { this.children.push(child); return child; } };
      created.push(node);
      return node;
    } } as unknown as Document;
    const title = '<img src=x onerror="alert(1)">';
    const dateLabel = "<script>untrusted()</script>";
    const tooltip = createMapTooltip({ title, dateLabel }, document) as unknown as TestNode;
    expect(created.map((node) => node.tag)).toEqual(["div", "strong", "span", "br"]);
    expect(tooltip.children[0].textContent).toBe(title);
    expect(tooltip.children[2].textContent).toBe(dateLabel);
    expect(created.some((node) => "innerHTML" in node)).toBe(false);
  });
});

describe("CityMap screen-space clusters", () => {
  const point = (id: string, x: number, y: number) => ({ id, lat: y, lon: x, title: id, dateLabel: "Уточните расписание", category: "cafe" });
  const project = (value: { lat: number; lon: number }) => ({ x: value.lon, y: value.lat });
  const viewport = { width: 390, height: 400 };

  it("merges nearby points even across a 52px cell boundary and excludes offscreen points", () => {
    const result = clusterMapPoints([point("a", 49, 20), point("b", 53, 20), point("far", 220, 220), point("outside", 500, 200), point("invalid", Number.NaN, 20)], project, viewport);
    expect(result).toHaveLength(2);
    expect(result[0].points.map(value => value.id)).toEqual(["a", "b"]);
    expect(result[0].x).toBe(51);
    expect(result[1].points.map(value => value.id)).toEqual(["far"]);
  });

  it("always keeps the active visible point as an individual marker", () => {
    const result = clusterMapPoints([point("active", 50, 50), point("b", 51, 51), point("c", 52, 52)], project, viewport, "active");
    expect(result).toHaveLength(2);
    expect(result.find(group => group.points.some(value => value.id === "active"))?.points).toHaveLength(1);
    expect(result.find(group => group.points.length === 2)?.points.map(value => value.id)).toEqual(["b", "c"]);
  });
  it('keeps exact coordinate peers in one selectable cluster even when one is active, without changing coordinates', () => {
    const points = [point('active', 50, 50), point('other-occurrence', 50, 50)];
    const before = structuredClone(points);
    for (const values of [points, [...points].reverse()]) {
      const result = clusterMapPoints(values, project, viewport, 'active');
      expect(result).toHaveLength(1); expect(result[0].points.map(value => value.id).sort()).toEqual(['active', 'other-occurrence']);
      expect(coLocatedMapPoints(result[0].points)).toBe(true);
    }
    expect(points).toEqual(before);
  });
  it('recognizes only exact same-coordinate groups for an immediate occurrence picker', () => {
    expect(coLocatedMapPoints([point('a', 50, 50), point('b', 50, 50)])).toBe(true);
    expect(coLocatedMapPoints([point('a', 50, 50), point('b', 50.000001, 50)])).toBe(false);
    expect(coLocatedMapPoints([])).toBe(false); expect(coLocatedMapPoints([point('a', 50, 50)])).toBe(false);
    expect(coLocatedMapPoints([point('a', NaN, 50), point('b', NaN, 50)])).toBe(false);
  });
  it('labels each occurrence with its original title and date as plain text', () => {
    expect(mapOccurrenceLabel({ title: '<script>untrusted()</script>', dateLabel: '25 октября, 18:00' }))
      .toBe('<script>untrusted()</script> · 25 октября, 18:00');
    expect(mapOccurrenceLabel({ title: 'Title', dateLabel: '' })).toBe('Title');
  });

  it("recalculates grouping from projected pixels when zoom changes", () => {
    const points = [point("a", 10, 10), point("b", 30, 10)];
    expect(clusterMapPoints(points, project, viewport)).toHaveLength(1);
    expect(clusterMapPoints(points, value => ({ x: value.lon * 4, y: value.lat * 4 }), viewport)).toHaveLength(2);
  });

  it("builds a bounded count circle with DOM text, not generated HTML", () => {
    const node = { style: {}, className: "", textContent: null as string | null };
    const document = { createElement(tag: string) { expect(tag).toBe("span"); return node; } } as unknown as Document;
    createClusterLabel(17, document);
    expect(node.textContent).toBe("17");
    expect(node.className).toBe("qettyq-map-cluster");
    expect(node.style).toMatchObject({ width: "42px", height: "42px", borderRadius: "50%" });
    expect(node).not.toHaveProperty("innerHTML");
    expect(clusterMarkerSize(1)).toBe(34);
    expect(clusterMarkerSize(1_000_000)).toBe(46);
  });
});
