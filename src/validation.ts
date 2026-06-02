import { PngTextOverlayError } from "./errors.js";
import type {
  NormalizedTextFont,
  NormalizedTextLayer,
  TextAlign,
  TextBox,
  TextFit,
  TextFont,
  TextLayer,
  TextVerticalAlign
} from "./types.js";

const DEFAULT_FONT: NormalizedTextFont = {
  family: "Arial, sans-serif",
  size: 48,
  weight: 700,
  style: "normal",
  lineHeight: 1.16
};

const DEFAULT_LAYER = {
  color: "#ffffff",
  align: "center" satisfies TextAlign,
  valign: "middle" satisfies TextVerticalAlign,
  opacity: 1,
  maxLines: 2,
  minFontSize: 12,
  fit: "shrink-wrap" satisfies TextFit
} as const;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION_COLOR = /^(?:rgb|rgba|hsl|hsla)\(\s*[-+./%0-9a-z,\s]+\)$/i;
const NAMED_COLOR = /^[a-z]+$/i;
const ALLOWED_ALIGN = new Set<TextAlign>(["left", "center", "right"]);
const ALLOWED_VALIGN = new Set<TextVerticalAlign>(["top", "middle", "bottom"]);
const ALLOWED_FIT = new Set<TextFit>(["none", "shrink", "wrap", "shrink-wrap"]);

export function validateTextLayers(layers: readonly TextLayer[]): void {
  normalizeTextLayers(layers);
}

export function normalizeTextLayers(layers: readonly TextLayer[]): NormalizedTextLayer[] {
  if (!Array.isArray(layers) || layers.length === 0) {
    throw new PngTextOverlayError(
      "invalid_options",
      "Compose options must include at least one text layer."
    );
  }

  return layers.map((layer, index) => normalizeTextLayer(layer, index));
}

function normalizeTextLayer(layer: TextLayer, index: number): NormalizedTextLayer {
  if (!layer || typeof layer !== "object") {
    throw invalidLayer(index, "must be an object.");
  }

  if (typeof layer.text !== "string") {
    throw invalidLayer(index, "must include text as a string.");
  }

  const box = normalizeBox(layer.box, index);
  const font = normalizeFont(layer.font, index);
  const color = layer.color ?? DEFAULT_LAYER.color;
  const align = layer.align ?? DEFAULT_LAYER.align;
  const valign = layer.valign ?? DEFAULT_LAYER.valign;
  const opacity = layer.opacity ?? DEFAULT_LAYER.opacity;
  const maxLines = layer.maxLines ?? DEFAULT_LAYER.maxLines;
  const minFontSize = layer.minFontSize ?? DEFAULT_LAYER.minFontSize;
  const fit = layer.fit ?? DEFAULT_LAYER.fit;

  if (!isValidColor(color)) {
    throw invalidLayer(index, `has invalid color "${color}".`);
  }
  if (!ALLOWED_ALIGN.has(align)) {
    throw invalidLayer(index, `has invalid align "${align}".`);
  }
  if (!ALLOWED_VALIGN.has(valign)) {
    throw invalidLayer(index, `has invalid valign "${valign}".`);
  }
  if (!isFiniteNumber(opacity) || opacity < 0 || opacity > 1) {
    throw invalidLayer(index, "must use opacity between 0 and 1.");
  }
  if (!Number.isInteger(maxLines) || maxLines < 1) {
    throw invalidLayer(index, "must use maxLines as a positive integer.");
  }
  if (!isFiniteNumber(minFontSize) || minFontSize <= 0 || minFontSize > font.size) {
    throw invalidLayer(index, "must use minFontSize greater than 0 and no larger than font.size.");
  }
  if (!ALLOWED_FIT.has(fit)) {
    throw invalidLayer(index, `has invalid fit "${fit}".`);
  }

  return {
    text: layer.text,
    box,
    font,
    color,
    align,
    valign,
    opacity,
    maxLines,
    minFontSize,
    fit
  };
}

function normalizeBox(box: TextBox, index: number): TextBox {
  if (!box || typeof box !== "object") {
    throw invalidLayer(index, "must include a box.");
  }

  const { x, y, width, height } = box;
  if (![x, y, width, height].every(isFiniteNumber)) {
    throw invalidLayer(index, "box values must be finite numbers.");
  }
  if (width <= 0 || height <= 0) {
    throw invalidLayer(index, "box must have positive width and height.");
  }

  return { x, y, width, height };
}

function normalizeFont(font: TextFont | undefined, index: number): NormalizedTextFont {
  const family = font?.family ?? DEFAULT_FONT.family;
  const size = font?.size ?? DEFAULT_FONT.size;
  const weight = font?.weight ?? DEFAULT_FONT.weight;
  const style = font?.style ?? DEFAULT_FONT.style;
  const lineHeight = font?.lineHeight ?? DEFAULT_FONT.lineHeight;

  if (typeof family !== "string" || family.trim().length === 0) {
    throw invalidLayer(index, "must use a non-empty font family.");
  }
  if (!isFiniteNumber(size) || size <= 0) {
    throw invalidLayer(index, "must use a positive font size.");
  }
  if (typeof weight !== "string" && typeof weight !== "number") {
    throw invalidLayer(index, "must use font weight as a string or number.");
  }
  if (typeof style !== "string" || style.trim().length === 0) {
    throw invalidLayer(index, "must use a non-empty font style.");
  }
  if (!isFiniteNumber(lineHeight) || lineHeight <= 0) {
    throw invalidLayer(index, "must use a positive font lineHeight.");
  }

  return { family, size, weight, style, lineHeight };
}

function isValidColor(color: string): boolean {
  return HEX_COLOR.test(color) || FUNCTION_COLOR.test(color) || NAMED_COLOR.test(color);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function invalidLayer(index: number, message: string): PngTextOverlayError {
  return new PngTextOverlayError("invalid_options", `Text layer ${index} ${message}`);
}
