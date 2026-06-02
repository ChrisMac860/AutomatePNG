import { describe, expect, it } from "vitest";

import {
  PngTextOverlayError,
  normalizeTextLayers,
  validateTextLayers
} from "../src/index.js";

describe("text layer validation", () => {
  it("rejects an empty layer list", () => {
    expect(() => validateTextLayers([])).toThrow(PngTextOverlayError);
    expect(() => validateTextLayers([])).toThrow(/at least one text layer/i);
  });

  it("rejects boxes without positive width and height", () => {
    expect(() =>
      validateTextLayers([
        {
          text: "Time",
          box: { x: 0, y: 0, width: 0, height: 32 }
        }
      ])
    ).toThrow(/positive width and height/i);
  });

  it("rejects invalid color values", () => {
    expect(() =>
      validateTextLayers([
        {
          text: "Runner",
          box: { x: 0, y: 0, width: 160, height: 48 },
          color: "not a color"
        }
      ])
    ).toThrow(/invalid color/i);
  });

  it("normalizes defaults for a minimal layer", () => {
    const [layer] = normalizeTextLayers([
      {
        text: "Runner",
        box: { x: 12, y: 16, width: 180, height: 48 }
      }
    ]);

    expect(layer).toMatchObject({
      text: "Runner",
      box: { x: 12, y: 16, width: 180, height: 48 },
      color: "#ffffff",
      align: "center",
      valign: "middle",
      opacity: 1,
      maxLines: 2,
      minFontSize: 12,
      fit: "shrink-wrap"
    });
    expect(layer.font.family).toBe("Arial, sans-serif");
    expect(layer.font.size).toBe(48);
  });
});
