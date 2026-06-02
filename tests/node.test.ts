import { describe, expect, it } from "vitest";
import sharp from "sharp";

import { composePngBuffer } from "../src/node.js";

describe("composePngBuffer", () => {
  it("composes multiple text layers onto a transparent PNG", async () => {
    const base = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .png()
      .toBuffer();

    const output = await composePngBuffer({
      image: base,
      layers: [
        {
          text: "FINISHER",
          box: { x: 20, y: 24, width: 280, height: 52 },
          font: { family: "Arial, sans-serif", size: 42, weight: 700 },
          color: "#ff6b35"
        },
        {
          text: "22:41",
          box: { x: 40, y: 92, width: 240, height: 58 },
          font: { family: "Arial, sans-serif", size: 50, weight: 700 },
          color: "#ffffff"
        }
      ]
    });

    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(320);
    expect(metadata.height).toBe(180);

    const raw = await sharp(output).ensureAlpha().raw().toBuffer();
    const alphaAt = (x: number, y: number) => raw[(y * 320 + x) * 4 + 3] ?? 0;

    expect(alphaAt(0, 0)).toBe(0);
    expect(Array.from(raw).some((_, index) => index % 4 === 3 && (raw[index] ?? 0) > 0)).toBe(
      true
    );
  });
});
