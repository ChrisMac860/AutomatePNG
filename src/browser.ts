import { PngTextOverlayError } from "./errors.js";
import { layoutTextLayer } from "./layout.js";
import { normalizeTextLayers } from "./validation.js";
import type {
  BrowserComposeOptions,
  BrowserImageSource,
  BrowserShareOptions,
  NormalizedTextLayer,
  TextMeasurer
} from "./types.js";

export async function composePngBlob(options: BrowserComposeOptions): Promise<Blob> {
  const layers = normalizeTextLayers(options.layers);
  const source = await decodeBrowserImage(options.image);
  const { width, height } = getImageDimensions(source);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new PngTextOverlayError("canvas_unavailable", "2D canvas context is unavailable.");
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  for (const layer of layers) {
    drawLayer(ctx, layer);
  }

  return canvasToPngBlob(canvas);
}

export async function composePngDataUrl(options: BrowserComposeOptions): Promise<string> {
  const blob = await composePngBlob(options);
  return blobToDataUrl(blob);
}

export async function copyPngToClipboard(options: BrowserComposeOptions): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new PngTextOverlayError(
      "clipboard_unavailable",
      "Image clipboard writes are not supported in this browser."
    );
  }

  const pngBlob = composePngBlob(options);

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": pngBlob
      })
    ]);
  } catch (error) {
    if (error instanceof PngTextOverlayError) {
      throw error;
    }
    throw new PngTextOverlayError("clipboard_write_failed", "Failed to copy PNG to clipboard.", {
      cause: error
    });
  }
}

export async function sharePngFile(
  options: BrowserComposeOptions,
  shareOptions: BrowserShareOptions = {}
): Promise<void> {
  const blob = await composePngBlob(options);
  return sharePngBlob(blob, shareOptions);
}

export function sharePngBlob(blob: Blob, shareOptions: BrowserShareOptions = {}): Promise<void> {
  const file = new File([blob], shareOptions.filename ?? "finisher-sticker.png", {
    type: "image/png"
  });
  const shareData: ShareData = {
    files: [file],
    title: shareOptions.title ?? "PNG text overlay"
  };
  if (shareOptions.text) {
    shareData.text = shareOptions.text;
  }

  if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
    return Promise.reject(
      new PngTextOverlayError(
        "share_unavailable",
        "File sharing is not supported in this browser. Use copy or download instead."
      )
    );
  }

  return navigator.share(shareData).catch((error: unknown) => {
    throw new PngTextOverlayError("share_failed", "Failed to share PNG file.", { cause: error });
  });
}

export async function sharePngToInstagramStory(
  options: BrowserComposeOptions,
  shareOptions: BrowserShareOptions = {}
): Promise<void> {
  await sharePngFile(options, {
    filename: "finisher-sticker.png",
    title: "Share to Instagram Story",
    text: "Choose Instagram from the share sheet.",
    ...shareOptions
  });
}

export function sharePngBlobToInstagramStory(
  blob: Blob,
  shareOptions: BrowserShareOptions = {}
): Promise<void> {
  return sharePngBlob(blob, {
    filename: "finisher-sticker.png",
    title: "Share to Instagram Story",
    text: "Choose Instagram from the share sheet.",
    ...shareOptions
  });
}

async function decodeBrowserImage(source: BrowserImageSource): Promise<CanvasImageSource> {
  if (isImageBitmap(source)) {
    return source;
  }

  if (isHtmlImageElement(source)) {
    await waitForHtmlImage(source);
    return source;
  }

  if (typeof source === "string") {
    return loadImage(source);
  }

  if (isBlob(source)) {
    const url = URL.createObjectURL(source);
    try {
      return await loadImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  throw new PngTextOverlayError(
    "unsupported_image",
    "Browser image must be a URL/data URL string, Blob, HTMLImageElement, or ImageBitmap."
  );
}

function drawLayer(ctx: CanvasRenderingContext2D, layer: NormalizedTextLayer): void {
  const measurer = createCanvasMeasurer(ctx);
  const layout = layoutTextLayer(layer, measurer);

  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.fillStyle = layer.color;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "alphabetic";
  ctx.font = formatCanvasFont(layer, layout.fontSize);

  for (const line of layout.drawLines) {
    ctx.fillText(line.text, line.x, line.y);
  }

  ctx.restore();
}

function createCanvasMeasurer(ctx: CanvasRenderingContext2D): TextMeasurer {
  return {
    measureText(text, fontSize, layer) {
      ctx.save();
      ctx.font = formatCanvasFont(layer, fontSize);
      const width = ctx.measureText(text).width;
      ctx.restore();
      return width;
    }
  };
}

function formatCanvasFont(layer: NormalizedTextLayer, fontSize: number): string {
  const { style, weight, family } = layer.font;
  return `${style} ${weight} ${fontSize}px ${family}`;
}

function getImageDimensions(source: CanvasImageSource): { width: number; height: number } {
  if (isImageBitmap(source)) {
    return { width: source.width, height: source.height };
  }

  if (isHtmlImageElement(source)) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }

  throw new PngTextOverlayError("unsupported_image", "Decoded browser image has no dimensions.");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new PngTextOverlayError("image_decode_failed", "Failed to decode browser image."));
    image.src = src;
  });
}

async function waitForHtmlImage(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) {
    return;
  }

  try {
    await image.decode();
  } catch (error) {
    throw new PngTextOverlayError("image_decode_failed", "Failed to decode HTMLImageElement.", {
      cause: error
    });
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(
            new PngTextOverlayError(
              "png_export_failed",
              "Canvas PNG export failed. The canvas may be tainted by cross-origin image data."
            )
          );
          return;
        }
        resolve(blob);
      }, "image/png");
    } catch (error) {
      const code =
        error instanceof DOMException && error.name === "SecurityError"
          ? "tainted_canvas"
          : "png_export_failed";
      reject(new PngTextOverlayError(code, "Canvas PNG export failed.", { cause: error }));
    }
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new PngTextOverlayError("png_export_failed", "Blob did not produce a data URL."));
    };
    reader.onerror = () =>
      reject(new PngTextOverlayError("png_export_failed", "Failed to read PNG blob as data URL."));
    reader.readAsDataURL(blob);
  });
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isHtmlImageElement(value: unknown): value is HTMLImageElement {
  return typeof HTMLImageElement !== "undefined" && value instanceof HTMLImageElement;
}

function isImageBitmap(value: unknown): value is ImageBitmap {
  return typeof ImageBitmap !== "undefined" && value instanceof ImageBitmap;
}
