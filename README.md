# story-sticker-kit

Create transparent PNG story stickers with text overlays, clipboard copy, downloads, and an iPhone-friendly story paste flow.

This is built for Strava-style web stickers: render a transparent PNG, place text into controlled boxes, then let the user copy, download, or pass the image to the browser's native share sheet.

## Features

- Browser PNG composition with alpha preserved.
- Node.js PNG composition via optional `sharp`.
- Multiple text layers with pixel boxes, alignment, opacity, font settings, shrink/wrap fitting, and max lines.
- `copyPngToClipboard()` for image clipboard writes.
- `copyPngBlobToClipboard()` for reusing an already-rendering PNG Blob.
- `sharePngBlobToInstagramStory()` for file-share fallback when clipboard paste is unavailable.
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
  copyPngBlobToClipboard,
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

copyButton.addEventListener("click", () => {
  void copyPngToClipboard(stickerOptions);
});

shareButton.addEventListener("click", async () => {
  const readyBlob = composePngBlob(stickerOptions);

  try {
    await copyPngBlobToClipboard(readyBlob);
  } catch {
    await sharePngBlobToInstagramStory(await readyBlob);
  }
});
```

For iPhone story sharing, start `composePngBlob()` inside the tap handler and pass that promise straight to `copyPngBlobToClipboard()`. Safari can keep the clipboard write tied to the user's tap while the PNG finishes rendering, letting the user paste the sticker into Instagram Story. If image clipboard writes are unavailable, fall back to `sharePngBlobToInstagramStory()` or a download link.

Browser JavaScript cannot force Instagram Stories to open with a prepared sticker or reproduce a native app's custom Strava-style share screen. Native apps can integrate more deeply with Instagram-specific schemes/intents; web apps should use clipboard paste plus Web Share/download fallbacks.

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
- `copyPngBlobToClipboard(blobOrPromise): Promise<void>`
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

## Grand 5km Run Demo

```sh
npm install
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

The demo page is a mobile-first **Grand 5km Run** results table. It uses the fake
100-runner result set, keeps the generated sticker hidden until a row share action,
then creates a transparent PNG with the runner's time and name in white text.

The sticker artwork lives in `demo/assets/`. The demo uses
`grand-5km-route-cropped-transparent.png`, a transparent 1448x1086 route PNG, as the
source image for `composePngBlob()`. Keep source images in `demo/assets/`; `demo-dist/`
is generated by Vite and will be overwritten on each production build.

For a production demo build:

```sh
npm run build:demo
```

That writes the static site to `demo-dist/`.

## GitHub Pages Deployment

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`.
To deploy the demo:

1. Enable GitHub Pages for the repository and choose **GitHub Actions** as the source.
2. Push to `main` or `AutomatePNGMain`.
3. The workflow runs `npm ci`, `npm test`, `npm run build`, and `npm run build:demo`.
4. GitHub Pages publishes `demo-dist/`.

If the public URL shows the README/Jekyll page instead of the Grand 5km Run demo,
GitHub Pages is still set to deploy from a branch. Change the Pages source to
**GitHub Actions**, then re-run the **Deploy demo to GitHub Pages** workflow.

Expected demo URL:

```text
https://chrismac860.github.io/AutomatePNG/
```

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
