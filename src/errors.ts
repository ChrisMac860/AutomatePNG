export type PngTextOverlayErrorCode =
  | "invalid_options"
  | "unsupported_image"
  | "image_decode_failed"
  | "canvas_unavailable"
  | "png_export_failed"
  | "tainted_canvas"
  | "clipboard_unavailable"
  | "clipboard_write_failed"
  | "share_unavailable"
  | "share_failed"
  | "node_render_failed";

export class PngTextOverlayError extends Error {
  readonly code: PngTextOverlayErrorCode;

  constructor(
    code: PngTextOverlayErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "PngTextOverlayError";
    this.code = code;
  }
}
