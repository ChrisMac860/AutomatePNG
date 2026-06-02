export type TextFit = "none" | "shrink" | "wrap" | "shrink-wrap";
export type TextAlign = "left" | "center" | "right";
export type TextVerticalAlign = "top" | "middle" | "bottom";

export type TextBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextFont = {
  family?: string;
  size?: number;
  weight?: string | number;
  style?: string;
  lineHeight?: number;
};

export type TextLayer = {
  text: string;
  box: TextBox;
  font?: TextFont;
  color?: string;
  align?: TextAlign;
  valign?: TextVerticalAlign;
  opacity?: number;
  maxLines?: number;
  minFontSize?: number;
  fit?: TextFit;
};

export type NormalizedTextFont = {
  family: string;
  size: number;
  weight: string | number;
  style: string;
  lineHeight: number;
};

export type NormalizedTextLayer = {
  text: string;
  box: TextBox;
  font: NormalizedTextFont;
  color: string;
  align: TextAlign;
  valign: TextVerticalAlign;
  opacity: number;
  maxLines: number;
  minFontSize: number;
  fit: TextFit;
};

export type TextMeasurer = {
  measureText(text: string, fontSize: number, layer: NormalizedTextLayer): number;
};

export type DrawnTextLine = {
  text: string;
  x: number;
  y: number;
  width: number;
};

export type TextLayout = {
  fontSize: number;
  lineHeight: number;
  lines: string[];
  drawLines: DrawnTextLine[];
};

export type BrowserImageSource = string | Blob | HTMLImageElement | ImageBitmap;

export type BrowserComposeOptions = {
  image: BrowserImageSource;
  layers: TextLayer[];
};

export type BrowserShareOptions = {
  filename?: string;
  title?: string;
  text?: string;
};

export type NodeImageSource = string | Buffer | Uint8Array;

export type NodeComposeOptions = {
  image: NodeImageSource;
  layers: TextLayer[];
};
