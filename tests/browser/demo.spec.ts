import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __clipboardWrite?: {
      blobSize?: number;
      blobType?: string;
      types?: string[];
    };
    __shareCall?: {
      title?: string;
      text?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    };
  }
}

test("demo renders the full Grand 5km Run results table before any PNG preview", async ({
  page
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Grand 5km Run/);
  await expect(
    page.getByRole("heading", { name: "Grand 5km Run", exact: true })
  ).toBeVisible();

  const runnerRows = page.locator("[data-runner-row]");
  await expect(runnerRows).toHaveCount(100);
  await expect(runnerRows.first()).toContainText("Nikolai Kovalev");
  await expect(runnerRows.first()).toContainText("18:36.00");
  await expect(page.getByRole("table", { name: "Grand 5km Run results" })).toBeVisible();
  await expect(page.getByAltText("Generated Grand 5km Run sticker preview")).toBeHidden();
  await expect(page.getByRole("status")).toHaveText(/choose a finisher/i);
});

test("row share generates a transparent runner PNG and reveals the preview", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Share runner 1", exact: true }).click();

  const preview = page.getByAltText("Generated Grand 5km Run sticker preview");
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(page.locator("#selected-time")).toHaveText("18:36.00");
  await expect(page.locator("#selected-name")).toHaveText("Nikolai Kovalev");
  await expect(page.getByRole("status")).toHaveText(/sticker ready/i);
  await expect(page.getByRole("link", { name: /download/i })).toHaveAttribute(
    "href",
    /^data:image\/png;base64,/
  );

  const pixelReport = await page.evaluate(async () => {
    const img = document.querySelector<HTMLImageElement>("#sticker-preview");
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
    let whitePixels = 0;
    let visiblePixels = 0;
    for (let i = 0; i < imageData.length; i += 4) {
      const red = imageData[i] ?? 0;
      const green = imageData[i + 1] ?? 0;
      const blue = imageData[i + 2] ?? 0;
      const alpha = imageData[i + 3] ?? 0;
      if (alpha > 0) {
        visiblePixels += 1;
      }
      if (alpha > 180 && red > 235 && green > 235 && blue > 235) {
        whitePixels += 1;
      }
    }

    return {
      cornerAlpha,
      height: decoded.naturalHeight,
      visiblePixels,
      whitePixels,
      width: decoded.naturalWidth
    };
  });

  expect(pixelReport).toMatchObject({
    cornerAlpha: 0,
    width: 1440,
    height: 1080
  });
  expect(pixelReport.visiblePixels).toBeGreaterThan(1_000);
  expect(pixelReport.whitePixels).toBeGreaterThan(100);
});

test("iPhone row share copies the generated PNG instead of opening a generic file sheet", async ({
  page
}) => {
  await page.addInitScript(() => {
    class MockClipboardItem {
      static supports(type: string): boolean {
        return type === "image/png";
      }

      readonly data: Record<string, Blob | Promise<Blob>>;
      readonly types: string[];

      constructor(data: Record<string, Blob | Promise<Blob>>) {
        this.data = data;
        this.types = Object.keys(data);
      }

      async getType(type: string): Promise<Blob> {
        const value = this.data[type];
        if (!value) {
          throw new Error(`Missing clipboard type ${type}`);
        }
        return value;
      }
    }

    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "iPhone"
    });
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: MockClipboardItem
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async write(items: ClipboardItem[]) {
          const item = items[0] as unknown as MockClipboardItem | undefined;
          if (!item) {
            throw new Error("No clipboard item was written");
          }
          const blob = await item.getType("image/png");
          Object.assign(window, {
            __clipboardWrite: {
              blobSize: blob.size,
              blobType: blob.type,
              types: item.types
            }
          });
        }
      }
    });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value(data: ShareData) {
        return Array.isArray(data.files) && data.files.length === 1;
      }
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
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
  await page.getByRole("button", { name: "Share runner 2", exact: true }).click();

  await expect(page.getByRole("status")).toHaveText(/copied png/i);
  await expect(page.getByRole("status")).toHaveText(/paste it into instagram story/i);
  const clipboardWrite = await page.evaluate(() => window.__clipboardWrite);
  expect(clipboardWrite).toMatchObject({
    blobType: "image/png",
    types: ["image/png"]
  });
  expect(clipboardWrite?.blobSize).toBeGreaterThan(100);
  await expect(page.getByAltText("Generated Grand 5km Run sticker preview")).toBeVisible();
  await expect(page.locator("#selected-time")).toHaveText("18:38.31");
  await expect(page.locator("#selected-name")).toHaveText("Erik Müller");
  await expect(page.evaluate(() => window.__shareCall)).resolves.toBeUndefined();
});

test("non-iPhone row share sends one generated runner PNG to the native share sheet", async ({
  page
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value(data: ShareData) {
        return Array.isArray(data.files) && data.files.length === 1;
      }
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
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
  await page.getByRole("button", { name: "Share runner 2", exact: true }).click();

  await expect(page.getByRole("status")).toHaveText(/native share sheet/i);
  const shareCall = await page.evaluate(() => window.__shareCall);
  expect(shareCall).toMatchObject({
    fileName: "grand-5km-run-2.png",
    fileType: "image/png"
  });
  expect(shareCall?.fileSize).toBeGreaterThan(100);
  expect(shareCall?.title).toBeUndefined();
  expect(shareCall?.text).toBeUndefined();
});

test("unsupported native share keeps copy and download fallbacks available", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Share runner 3", exact: true }).click();

  await expect(page.getByRole("status")).toHaveText(/sticker ready/i);
  await expect(page.getByRole("button", { name: "Copy PNG" })).toBeEnabled();
  await expect(page.getByRole("link", { name: /download/i })).toHaveAttribute(
    "download",
    "grand-5km-run-3.png"
  );
});
