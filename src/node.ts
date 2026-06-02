import sharp from "sharp";

import { PngTextOverlayError } from "./errors.js";
import { layoutTextLayer } from "./layout.js";
import { normalizeTextLayers } from "./validation.js";
import type { NodeComposeOptions, NormalizedTextLayer, TextMeasurer } from "./types.js";

export async function composePngBuffer(options: NodeComposeOptions): Promise<Buffer> {
  const layers = normalizeTextLayers(options.layers);
  const input = normalizeNodeImageInput(options.image);

  try {
    const metadata = await sharp(input).metadata();
    if (!metadata.width || !metadata.height) {
      throw new PngTextOverlayError("image_decode_failed", "Node image has no width or height.");
    }

    const overlay = renderSvgOverlay(metadata.width, metadata.height, layers);

    return sharp(input)
      .composite([{ input: Buffer.from(overlay), top: 0, left: 0, blend: "over" }])
      .png()
      .toBuffer();
  } catch (error) {
    if (error instanceof PngTextOverlayError) {
      throw error;
    }
    throw new PngTextOverlayError("node_render_failed", "Failed to compose PNG in Node.js.", {
      cause: error
    });
  }
}

function normalizeNodeImageInput(image: NodeComposeOptions["image"]): string | Buffer {
  if (typeof image === "string") {
    return image;
  }
  if (Buffer.isBuffer(image)) {
    return image;
  }
  if (image instanceof Uint8Array) {
    return Buffer.from(image);
  }

  throw new PngTextOverlayError(
    "unsupported_image",
    "Node image must be a file path, Buffer, or Uint8Array."
  );
}

function renderSvgOverlay(
  width: number,
  height: number,
  layers: readonly NormalizedTextLayer[]
): string {
  const body = layers.map((layer) => renderSvgTextLayer(layer)).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    body,
    "</svg>"
  ].join("");
}

function renderSvgTextLayer(layer: NormalizedTextLayer): string {
  const layout = layoutTextLayer(layer, approximateNodeMeasurer);
  const anchor = layer.align === "left" ? "start" : layer.align === "right" ? "end" : "middle";
  const tspans = layout.drawLines
    .map(
      (line) =>
        `<tspan x="${round(line.x)}" y="${round(line.y)}">${escapeXmlText(line.text)}</tspan>`
    )
    .join("");

  return [
    `<text`,
    ` font-family="${escapeXmlAttribute(layer.font.family)}"`,
    ` font-size="${round(layout.fontSize)}"`,
    ` font-weight="${escapeXmlAttribute(String(layer.font.weight))}"`,
    ` font-style="${escapeXmlAttribute(layer.font.style)}"`,
    ` fill="${escapeXmlAttribute(layer.color)}"`,
    ` fill-opacity="${round(layer.opacity)}"`,
    ` text-anchor="${anchor}"`,
    `>`,
    tspans,
    `</text>`
  ].join("");
}

const approximateNodeMeasurer: TextMeasurer = {
  measureText(text, fontSize) {
    let width = 0;
    for (const char of Array.from(text)) {
      if (char === " ") {
        width += fontSize * 0.28;
      } else if (/[A-Z0-9]/.test(char)) {
        width += fontSize * 0.62;
      } else if (/[il.,'|]/.test(char)) {
        width += fontSize * 0.28;
      } else {
        width += fontSize * 0.52;
      }
    }
    return width;
  }
};

function escapeXmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value).replaceAll('"', "&quot;");
}

function round(value: number): string {
  return Number(value.toFixed(3)).toString();
}
