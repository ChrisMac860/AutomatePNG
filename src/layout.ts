import type { DrawnTextLine, NormalizedTextLayer, TextLayout, TextMeasurer } from "./types.js";

const EPSILON = 0;

type CandidateLayout = {
  fontSize: number;
  lineHeight: number;
  lines: string[];
  widths: number[];
  fits: boolean;
};

export function layoutTextLayer(
  layer: NormalizedTextLayer,
  measurer: TextMeasurer
): TextLayout {
  const best = findBestLayout(layer, measurer);
  const drawLines = createDrawLines(layer, best);

  return {
    fontSize: best.fontSize,
    lineHeight: best.lineHeight,
    lines: best.lines,
    drawLines
  };
}

function findBestLayout(layer: NormalizedTextLayer, measurer: TextMeasurer): CandidateLayout {
  const target = layer.font.size;
  const canShrink = layer.fit === "shrink" || layer.fit === "shrink-wrap";
  const targetLayout = createCandidate(layer, measurer, target);

  if (!canShrink || targetLayout.fits) {
    return targetLayout;
  }

  let low = layer.minFontSize;
  let high = target;
  let best = createCandidate(layer, measurer, low);

  for (let i = 0; i < 18; i += 1) {
    const mid = (low + high) / 2;
    const candidate = createCandidate(layer, measurer, mid);

    if (candidate.fits) {
      best = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }

  if (!best.fits) {
    return createClampedCandidate(layer, measurer, layer.minFontSize);
  }

  return best;
}

function createCandidate(
  layer: NormalizedTextLayer,
  measurer: TextMeasurer,
  fontSize: number
): CandidateLayout {
  const shouldWrap = layer.fit === "wrap" || layer.fit === "shrink-wrap";
  const lines = shouldWrap
    ? wrapText(layer.text, layer.box.width, layer.maxLines, fontSize, layer, measurer)
    : [layer.text];
  const widths = lines.map((line) => measurer.measureText(line, fontSize, layer));
  const lineHeight = fontSize * layer.font.lineHeight;
  const textHeight = lines.length * lineHeight;
  const fits =
    widths.every((width) => width <= layer.box.width + EPSILON) &&
    textHeight <= layer.box.height + EPSILON &&
    lines.length <= layer.maxLines;

  return { fontSize, lineHeight, lines, widths, fits };
}

function createClampedCandidate(
  layer: NormalizedTextLayer,
  measurer: TextMeasurer,
  fontSize: number
): CandidateLayout {
  const shouldWrap = layer.fit === "wrap" || layer.fit === "shrink-wrap";
  const rawLines = shouldWrap
    ? wrapText(layer.text, layer.box.width, layer.maxLines, fontSize, layer, measurer)
    : [truncateLine(layer.text, layer.box.width, fontSize, layer, measurer)];
  const lines = rawLines.slice(0, layer.maxLines);
  const widths = lines.map((line) => measurer.measureText(line, fontSize, layer));
  const lineHeight = fontSize * layer.font.lineHeight;

  return { fontSize, lineHeight, lines, widths, fits: false };
}

function wrapText(
  text: string,
  maxWidth: number,
  maxLines: number,
  fontSize: number,
  layer: NormalizedTextLayer,
  measurer: TextMeasurer
): string[] {
  if (text.length === 0) {
    return [""];
  }

  const words = splitWords(text);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measurer.measureText(candidate, fontSize, layer) <= maxWidth + EPSILON) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (measurer.measureText(word, fontSize, layer) <= maxWidth + EPSILON) {
      current = word;
    } else {
      const broken = breakLongWord(word, maxWidth, fontSize, layer, measurer);
      lines.push(...broken.slice(0, -1));
      current = broken[broken.length - 1] ?? "";
    }

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    const last = lines[maxLines - 1];
    if (last !== undefined) {
      lines[maxLines - 1] = truncateLine(last, maxWidth, fontSize, layer, measurer);
    }
  }

  return lines.length > 0 ? lines : [""];
}

function splitWords(text: string): string[] {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/) : [text];
}

function breakLongWord(
  word: string,
  maxWidth: number,
  fontSize: number,
  layer: NormalizedTextLayer,
  measurer: TextMeasurer
): string[] {
  const lines: string[] = [];
  let current = "";

  for (const char of Array.from(word)) {
    const candidate = `${current}${char}`;
    if (candidate && measurer.measureText(candidate, fontSize, layer) <= maxWidth + EPSILON) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      current = char;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function truncateLine(
  line: string,
  maxWidth: number,
  fontSize: number,
  layer: NormalizedTextLayer,
  measurer: TextMeasurer
): string {
  if (measurer.measureText(line, fontSize, layer) <= maxWidth + EPSILON) {
    return line;
  }

  const ellipsis = "...";
  let result = "";

  for (const char of Array.from(line)) {
    const candidate = `${result}${char}${ellipsis}`;
    if (measurer.measureText(candidate, fontSize, layer) > maxWidth + EPSILON) {
      break;
    }
    result += char;
  }

  return result ? `${result}${ellipsis}` : ellipsis;
}

function createDrawLines(layer: NormalizedTextLayer, layout: CandidateLayout): DrawnTextLine[] {
  const textHeight = layout.lines.length * layout.lineHeight;
  const top = getBlockTop(layer, textHeight);
  const anchorX = getAnchorX(layer);

  return layout.lines.map((line, index) => ({
    text: line,
    x: anchorX,
    y: top + index * layout.lineHeight + layout.fontSize * 0.82,
    width: layout.widths[index] ?? 0
  }));
}

function getBlockTop(layer: NormalizedTextLayer, textHeight: number): number {
  if (layer.valign === "top") {
    return layer.box.y;
  }
  if (layer.valign === "bottom") {
    return layer.box.y + layer.box.height - textHeight;
  }
  return layer.box.y + (layer.box.height - textHeight) / 2;
}

function getAnchorX(layer: NormalizedTextLayer): number {
  if (layer.align === "left") {
    return layer.box.x;
  }
  if (layer.align === "right") {
    return layer.box.x + layer.box.width;
  }
  return layer.box.x + layer.box.width / 2;
}
