import {
  composePngBlob,
  copyPngToClipboard,
  sharePngBlobToInstagramStory
} from "../src/browser.js";

import "./styles.css";

const nameInput = document.querySelector<HTMLInputElement>("#name-input");
const timeInput = document.querySelector<HTMLInputElement>("#time-input");
const eventInput = document.querySelector<HTMLInputElement>("#event-input");
const renderButton = document.querySelector<HTMLButtonElement>("#render-button");
const copyButton = document.querySelector<HTMLButtonElement>("#copy-button");
const shareButton = document.querySelector<HTMLButtonElement>("#share-button");
const preview = document.querySelector<HTMLImageElement>("#output-preview");
const downloadLink = document.querySelector<HTMLAnchorElement>("#download-link");
const copyStatus = document.querySelector<HTMLParagraphElement>("#copy-status");
let latestPngBlob: Blob | null = null;

if (
  !nameInput ||
  !timeInput ||
  !eventInput ||
  !renderButton ||
  !copyButton ||
  !shareButton ||
  !preview ||
  !downloadLink ||
  !copyStatus
) {
  throw new Error("Demo controls failed to initialize");
}

function createSampleTransparentPng(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1120;
  canvas.height = 820;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unavailable");
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const route = offsetPoints([
    [120, 380],
    [150, 505],
    [185, 500],
    [200, 555],
    [315, 555],
    [455, 570],
    [620, 615],
    [855, 665],
    [1000, 690],
    [1018, 610],
    [1005, 560],
    [1025, 480],
    [990, 450],
    [985, 380],
    [930, 295],
    [790, 275],
    [712, 325],
    [635, 312],
    [560, 270],
    [500, 220],
    [430, 175],
    [395, 130],
    [350, 185],
    [120, 380]
  ], 0, -55);

  const darkSegment = offsetPoints([
    [350, 185],
    [395, 130],
    [430, 175],
    [500, 220],
    [560, 270],
    [605, 305]
  ], 0, -55);

  drawRoute(ctx, route, "#ffffff", 54, "rgba(16, 24, 32, 0.18)", 0, 12);
  drawRoute(ctx, route, "#ff4f0a", 20);
  drawRoute(ctx, darkSegment, "#303134", 20);

  drawArrow(ctx, 336, 125, -44);
  drawArrow(ctx, 600, 563, -15);

  ctx.save();
  ctx.shadowColor = "rgba(16, 24, 32, 0.16)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(520, 189, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#67d11c";
  ctx.beginPath();
  ctx.arc(504, 169, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(548, 193, 29, 0, Math.PI * 2);
  ctx.fill();

  drawFinishMarker(ctx, 548, 193, 42);

  return canvas.toDataURL("image/png");
}

function offsetPoints(
  points: Array<[number, number]>,
  offsetX: number,
  offsetY: number
): Array<[number, number]> {
  return points.map(([x, y]) => [x + offsetX, y + offsetY]);
}

function drawRoute(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string,
  width: number,
  shadowColor = "transparent",
  shadowBlur = 0,
  shadowOffsetY = 0
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = shadowOffsetY;
  ctx.beginPath();
  const [first, ...rest] = points;
  if (!first) {
    ctx.restore();
    return;
  }
  ctx.moveTo(first[0], first[1]);
  for (const point of rest) {
    ctx.lineTo(point[0], point[1]);
  }
  ctx.stroke();
  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, rotationDeg: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.strokeStyle = "#ff4f0a";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-24, -18);
  ctx.lineTo(0, 0);
  ctx.lineTo(-24, 18);
  ctx.stroke();
  ctx.restore();
}

function drawFinishMarker(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number
): void {
  const square = size / 3;
  const left = centerX - size / 2;
  const top = centerY - size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  ctx.clip();
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      ctx.fillStyle = (row + column) % 2 === 0 ? "#050505" : "#ffffff";
      ctx.fillRect(left + column * square, top + row * square, square, square);
    }
  }
  ctx.restore();
}

const baseImage = createSampleTransparentPng();

function getComposeOptions() {
  return {
    image: baseImage,
    layers: [
      {
        text: nameInput.value,
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
        text: timeInput.value,
        box: { x: 480, y: 688, width: 220, height: 78 },
        font: { family: "Arial, sans-serif", size: 68, weight: 900 },
        color: "#ff4f0a",
        align: "center",
        valign: "middle",
        maxLines: 1,
        minFontSize: 24,
        fit: "shrink"
      },
      {
        text: eventInput.value,
        box: { x: 710, y: 704, width: 300, height: 56 },
        font: { family: "Arial, sans-serif", size: 30, weight: 700 },
        color: "#303134",
        align: "center",
        valign: "middle",
        maxLines: 2,
        minFontSize: 14,
        fit: "shrink-wrap"
      }
    ]
  } as const;
}

async function renderDemo(): Promise<void> {
  renderButton.disabled = true;
  shareButton.disabled = true;
  try {
    const blob = await composePngBlob(getComposeOptions());
    const dataUrl = await blobToDataUrl(blob);

    latestPngBlob = blob;
    preview.src = dataUrl;
    downloadLink.href = dataUrl;
  } finally {
    renderButton.disabled = false;
    shareButton.disabled = latestPngBlob === null;
  }
}

async function copyDemo(): Promise<void> {
  copyButton.disabled = true;
  copyStatus.textContent = "Copying PNG...";
  try {
    await copyPngToClipboard(getComposeOptions());
    copyStatus.textContent = "Copied PNG to clipboard";
  } catch (error) {
    copyStatus.textContent =
      error instanceof Error ? `Copy failed: ${error.message}` : "Copy failed";
  } finally {
    copyButton.disabled = false;
  }
}

async function shareDemo(): Promise<void> {
  if (!latestPngBlob) {
    copyStatus.textContent = "Render the PNG before sharing";
    return;
  }

  shareButton.disabled = true;
  copyStatus.textContent = "Opening iPhone share sheet...";
  try {
    await sharePngBlobToInstagramStory(latestPngBlob);
    copyStatus.textContent = "Choose Instagram from the share sheet";
  } catch (error) {
    copyStatus.textContent =
      error instanceof Error ? `Share failed: ${error.message}` : "Share failed";
  } finally {
    shareButton.disabled = false;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Blob did not produce a data URL"));
    };
    reader.onerror = () => reject(new Error("Failed to read PNG blob"));
    reader.readAsDataURL(blob);
  });
}

renderButton.addEventListener("click", () => {
  void renderDemo();
});

copyButton.addEventListener("click", () => {
  void copyDemo();
});

shareButton.addEventListener("click", () => {
  void shareDemo();
});

for (const input of [nameInput, timeInput, eventInput]) {
  input.addEventListener("input", () => {
    copyStatus.textContent = "";
    void renderDemo();
  });
}

void renderDemo();
