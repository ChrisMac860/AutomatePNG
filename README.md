# story-sticker-kit

Create transparent PNG story stickers with text overlays, clipboard copy, downloads, and an iPhone-friendly share-sheet flow.

This is built for Strava-style web stickers: render a transparent PNG, place text into controlled boxes, then let the user copy, download, or share the image through the native iOS share sheet.

## Features

- Browser PNG composition with alpha preserved.
- Node.js PNG composition via optional `sharp`.
- Multiple text layers with pixel boxes, alignment, opacity, font settings, shrink/wrap fitting, and max lines.
- `copyPngToClipboard()` for image clipboard writes.
- `sharePngBlobToInstagramStory()` for the Strava-style iPhone share-sheet flow.
- Tiny framework-agnostic TypeScript API.
- Vite demo and Playwright browser tests.

## Install

```sh
npm install story-sticker-kit
```

## Browser Quick Start

```ts
import {
  composePngBlob,
  copyPngToClipboard,
  sharePngBlobToInstagramStory
} from "story-sticker-kit/browser";

const stickerOptions = {
  image: "/route-sticker.png",
  layers: [
    {
      text: "Christopher Mackle",
      box: { x: 118, y: 704, width: 360, height: 56 },
      font: { family: "Arial, sans-serif", size: 42, weight: 800 },
      color: "#111820",
      align: "center",
      valign: "middle",
      maxLines: 1,
      minFontSize: 18,
      fit: "shrink"
    },
    {
      text: "22:41",
      box: { x: 480, y: 688, width: 220, height: 78 },
      font: { family: "Arial, sans-serif", size: 68, weight: 900 },
      color: "#ff4f0a"
    }
  ]
} as const;

let readyBlob = await composePngBlob(stickerOptions);

copyButton.addEventListener("click", () => {
  void copyPngToClipboard(stickerOptions);
});

shareButton.addEventListener("click", () => {
  void sharePngBlobToInstagramStory(readyBlob);
});
```

For iPhone sharing, pre-render the PNG before the tap with `composePngBlob()`, then call `sharePngBlobToInstagramStory()` directly from the button handler. That opens the native iOS share sheet with a PNG file, where the user can choose Instagram, Copy, Messages, or any other target iOS exposes.

Browser JavaScript cannot force Instagram Stories to open with a prepared sticker. Native apps can integrate more deeply with Instagram-specific schemes/intents; web apps should use the iOS share sheet.

## Node.js

```ts
import { readFile, writeFile } from "node:fs/promises";
import { composePngBuffer } from "story-sticker-kit/node";

const output = await composePngBuffer({
  image: await readFile("route-sticker.png"),
  layers: [
    {
      text: "22:41",
      box: { x: 480, y: 688, width: 220, height: 78 },
      font: { family: "Arial, sans-serif", size: 68, weight: 900 },
      color: "#ff4f0a"
    }
  ]
});

await writeFile("sticker-output.png", output);
```

## API

### Root export

- `normalizeTextLayers(layers)`
- `validateTextLayers(layers)`
- `layoutTextLayer(layer, measurer)`
- `PngTextOverlayError`
- Shared TypeScript types

### `story-sticker-kit/browser`

- `composePngBlob(options): Promise<Blob>`
- `composePngDataUrl(options): Promise<string>`
- `copyPngToClipboard(options): Promise<void>`
- `sharePngFile(options, shareOptions): Promise<void>`
- `sharePngBlob(blob, shareOptions): Promise<void>`
- `sharePngToInstagramStory(options, shareOptions): Promise<void>`
- `sharePngBlobToInstagramStory(blob, shareOptions): Promise<void>`

### `story-sticker-kit/node`

- `composePngBuffer(options): Promise<Buffer>`

## Text Layer Shape

```ts
type TextLayer = {
  text: string;
  box: { x: number; y: number; width: number; height: number };
  font?: {
    family?: string;
    size?: number;
    weight?: string | number;
    style?: string;
    lineHeight?: number;
  };
  color?: string;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  opacity?: number;
  maxLines?: number;
  minFontSize?: number;
  fit?: "none" | "shrink" | "wrap" | "shrink-wrap";
};
```

Coordinates are pixel-based from the top-left of the source PNG.

## iPhone Testing

Tailwind CSS works fine with this library. Styling does not affect iPhone clipboard or share-sheet support.

For local iPhone testing, expose the demo on your network:

```sh
npm run dev:phone
```

Then open your computer's LAN or Tailscale URL on the iPhone, for example:

```text
http://100.118.226.71:5173/
```

For reliable iPhone Safari clipboard/Web Share behavior, use HTTPS. Plain HTTP is fine for viewing the demo, but Safari may block clipboard/share APIs outside secure contexts. Use Tailscale Serve, Cloudflare Tunnel, ngrok, or another trusted HTTPS setup for full mobile testing.

## Demo

```sh
npm install
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

The demo renders a route sticker, places name/time/event text into bottom text boxes, and provides Render, Copy, Share, and Download controls.

## Development

```sh
npm test
npm run build
npm run test:browser
npm pack --dry-run
```

Install Playwright's browser once if needed:

```sh
npx playwright install chromium
```

## Notes

- Browser URL inputs must be same-origin or CORS-enabled so the canvas can be exported.
- Exact font rendering can differ across browser, OS, and Node environments.
- `sharp` is optional and only needed for the Node adapter.
- Clipboard and Web Share actions must be triggered by real user gestures.

## License

MIT
