import { expect, test } from "@playwright/test";

test("demo composes a PNG data URL with visible text and transparent corners", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Name").fill("Christopher Mackle");
  await page.getByLabel("Time").fill("22:41");
  await page.getByRole("button", { name: "Render PNG" }).click();

  const image = page.getByAltText("Composed PNG preview");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", /^data:image\/png;base64,/);

  const pixelReport = await page.evaluate(async () => {
    const img = document.querySelector<HTMLImageElement>("#output-preview");
    if (!img?.src) {
      throw new Error("Preview image missing");
    }

    const decoded = new Image();
    decoded.src = img.src;
    await decoded.decode();

    const canvas = document.createElement("canvas");
    canvas.width = decoded.naturalWidth;
    canvas.height = decoded.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas unavailable");
    }
    ctx.drawImage(decoded, 0, 0);

    const cornerAlpha = ctx.getImageData(0, 0, 1, 1).data[3];
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let visiblePixels = 0;
    for (let i = 3; i < imageData.length; i += 4) {
      if (imageData[i] > 0) {
        visiblePixels += 1;
      }
    }

    return { cornerAlpha, visiblePixels };
  });

  expect(pixelReport.cornerAlpha).toBe(0);
  expect(pixelReport.visiblePixels).toBeGreaterThan(100);
  await expect(image).toHaveJSProperty("naturalWidth", 1120);
  await expect(image).toHaveJSProperty("naturalHeight", 820);
});

test("demo copies the composed PNG to the async clipboard", async ({ page }) => {
  await page.addInitScript(() => {
    class MockClipboardItem {
      readonly types: string[];
      private readonly items: Record<string, Blob | string | Promise<Blob | string>>;

      constructor(items: Record<string, Blob | string | Promise<Blob | string>>) {
        this.items = items;
        this.types = Object.keys(items);
      }

      async getType(type: string): Promise<Blob | string> {
        const value = this.items[type];
        if (!value) {
          throw new Error(`Missing clipboard type ${type}`);
        }
        return value;
      }
    }

    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: MockClipboardItem
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async write(items: Array<{ types: string[]; getType(type: string): Promise<Blob | string> }>) {
          const first = items[0];
          if (!first) {
            throw new Error("No clipboard item was written");
          }
          const blob = await first.getType("image/png");
          if (!(blob instanceof Blob)) {
            throw new Error("Clipboard payload was not a Blob");
          }
          Object.assign(window, {
            __clipboardWrite: {
              itemCount: items.length,
              types: first.types,
              blobType: blob.type,
              blobSize: blob.size
            }
          });
        }
      }
    });
  });

  await page.goto("/");
  await page.getByLabel("Name").fill("Christopher Mackle");
  await page.getByRole("button", { name: "Copy PNG" }).click();

  await expect(page.getByRole("status")).toHaveText("Copied PNG to clipboard");

  const clipboardWrite = await page.evaluate(() => window.__clipboardWrite);
  expect(clipboardWrite).toMatchObject({
    itemCount: 1,
    types: ["image/png"],
    blobType: "image/png"
  });
  expect(clipboardWrite.blobSize).toBeGreaterThan(100);
});

test("demo shares the composed PNG through the native share sheet", async ({ page }) => {
  await page.addInitScript(() => {
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (
      callback: BlobCallback,
      type?: string,
      quality?: unknown
    ) {
      window.__toBlobCount = (window.__toBlobCount ?? 0) + 1;
      return originalToBlob.call(this, callback, type, quality);
    };

    Object.assign(navigator, {
      canShare(data: ShareData) {
        return Array.isArray(data.files) && data.files.length === 1;
      },
      async share(data: ShareData) {
        const file = data.files?.[0];
        if (!file) {
          throw new Error("No file was shared");
        }
        Object.assign(window, {
          __shareCall: {
            title: data.title,
            text: data.text,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
          }
        });
      }
    });
  });

  await page.goto("/");
  await page.getByLabel("Name").fill("Christopher Mackle");
  await expect(page.getByAltText("Composed PNG preview")).toHaveJSProperty("complete", true);

  await page.evaluate(() => {
    window.__toBlobCount = 0;
  });
  await page.getByRole("button", { name: "Share to Story" }).click();

  await expect(page.getByRole("status")).toHaveText("Choose Instagram from the share sheet");

  const shareCall = await page.evaluate(() => window.__shareCall);
  expect(shareCall).toMatchObject({
    title: "Share to Instagram Story",
    text: "Choose Instagram from the share sheet.",
    fileName: "finisher-sticker.png",
    fileType: "image/png"
  });
  expect(shareCall.fileSize).toBeGreaterThan(100);
  expect(await page.evaluate(() => window.__toBlobCount)).toBe(0);
});
