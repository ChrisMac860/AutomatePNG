import { describe, expect, it } from "vitest";

import { layoutTextLayer, normalizeTextLayers, type TextMeasurer } from "../src/index.js";

const deterministicMeasurer: TextMeasurer = {
  measureText(text, fontSize) {
    return text.length * fontSize * 0.5;
  }
};

describe("text layout", () => {
  it("keeps short text on one centered line", () => {
    const layer = normalizeTextLayers([
      {
        text: "22:41",
        box: { x: 0, y: 0, width: 220, height: 80 },
        font: { size: 48 }
      }
    ])[0]!;

    const layout = layoutTextLayer(layer, deterministicMeasurer);

    expect(layout.fontSize).toBe(48);
    expect(layout.lines).toEqual(["22:41"]);
    expect(layout.drawLines[0]?.x).toBeCloseTo(110);
  });

  it("shrinks long single-line text to fit the box", () => {
    const layer = normalizeTextLayers([
      {
        text: "Christopher Mackle",
        box: { x: 0, y: 0, width: 170, height: 52 },
        font: { size: 48 },
        fit: "shrink",
        maxLines: 1,
        minFontSize: 14
      }
    ])[0]!;

    const layout = layoutTextLayer(layer, deterministicMeasurer);

    expect(layout.lines).toEqual(["Christopher Mackle"]);
    expect(layout.fontSize).toBeLessThan(48);
    expect(layout.fontSize).toBeGreaterThanOrEqual(14);
    expect(layout.drawLines[0]?.width).toBeLessThanOrEqual(170);
  });

  it("wraps multi-word text into the configured number of lines", () => {
    const layer = normalizeTextLayers([
      {
        text: "The Long Woman's Five Kilometre Challenge",
        box: { x: 0, y: 0, width: 180, height: 96 },
        font: { size: 34 },
        fit: "shrink-wrap",
        maxLines: 3,
        minFontSize: 12
      }
    ])[0]!;

    const layout = layoutTextLayer(layer, deterministicMeasurer);

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.length).toBeLessThanOrEqual(3);
    for (const line of layout.drawLines) {
      expect(line.width).toBeLessThanOrEqual(180);
    }
  });
});
