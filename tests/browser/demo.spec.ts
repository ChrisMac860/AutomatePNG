import { expect, test } from "@playwright/test";

declare global {
  interface Window {
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

test("row share sends the generated runner PNG to the native share sheet when supported", async ({
  page
}) => {
  await page.addInitScript(() => {
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
  await page.getByRole("button", { name: "Share runner 2", exact: true }).click();

  await expect(page.getByRole("status")).toHaveText(/choose instagram/i);
  const shareCall = await page.evaluate(() => window.__shareCall);
  expect(shareCall).toMatchObject({
    title: "Grand 5km Run finisher sticker",
    text: "Erik Muller finished the Grand 5km Run in 18:38.31.",
    fileName: "grand-5km-run-2.png",
    fileType: "image/png"
  });
  expect(shareCall?.fileSize).toBeGreaterThan(100);
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
