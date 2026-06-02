import {
  composePngBlob,
  copyPngToClipboard,
  sharePngBlobToInstagramStory
} from "../src/browser.js";
import type { BrowserComposeOptions } from "../src/index.js";

import { results, type RunnerResult } from "./results.js";
import "./styles.css";

const EVENT_NAME = "Grand 5km Run";
const STICKER_WIDTH = 1440;
const STICKER_HEIGHT = 1080;

const tableBody = queryRequired<HTMLTableSectionElement>("#results-body");
const statusText = queryRequired<HTMLParagraphElement>("#share-status");
const stickerPanel = queryRequired<HTMLElement>("#sticker-panel");
const stickerPreview = queryRequired<HTMLImageElement>("#sticker-preview");
const selectedTime = queryRequired<HTMLParagraphElement>("#selected-time");
const selectedName = queryRequired<HTMLParagraphElement>("#selected-name");
const copyButton = queryRequired<HTMLButtonElement>("#copy-button");
const downloadLink = queryRequired<HTMLAnchorElement>("#download-link");

const routeStickerPng = createRouteStickerBase();
let selectedRunner: RunnerResult | null = null;
let latestObjectUrl: string | null = null;

document.documentElement.classList.add("js");

renderResults();
setupRevealAnimations();

tableBody.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
    "[data-share-position]"
  );
  if (!button) {
    return;
  }

  const position = Number(button.dataset.sharePosition);
  const runner = results.find((result) => result.position === position);
  if (!runner) {
    setStatus("Runner not found. Refresh the page and try again.");
    return;
  }

  void shareRunner(runner, button);
});

copyButton.addEventListener("click", () => {
  void copySelectedPng();
});

function queryRequired<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required demo element: ${selector}`);
  }
  return element;
}

function renderResults(): void {
  const rows = results.map((runner) => {
    const row = document.createElement("tr");
    row.dataset.runnerRow = String(runner.position);

    const position = document.createElement("td");
    position.textContent = String(runner.position);

    const participant = document.createElement("td");
    participant.textContent = runner.participant;

    const time = document.createElement("td");
    time.textContent = runner.time;

    const action = document.createElement("td");
    const button = document.createElement("button");
    button.className = "share-row-button";
    button.type = "button";
    button.textContent = "Share";
    button.dataset.sharePosition = String(runner.position);
    button.setAttribute("aria-label", `Share runner ${runner.position}`);
    action.append(button);

    row.append(position, participant, time, action);
    return row;
  });

  tableBody.replaceChildren(...rows);
}

async function shareRunner(runner: RunnerResult, trigger: HTMLButtonElement): Promise<void> {
  selectedRunner = runner;
  setActiveRow(runner.position);
  setRowButtonsBusy(trigger, true);
  setStatus(`Rendering sticker for ${runner.participant} (${runner.time})...`);

  try {
    const options = createStickerOptions(runner);
    const blob = await composePngBlob(options);
    const dataUrl = await blobToDataUrl(blob);
    updatePreview(runner, dataUrl);
    setStatus(`Sticker ready for ${runner.participant} (${runner.time}).`);

    try {
      await sharePngBlobToInstagramStory(blob, {
        filename: stickerFilename(runner),
        title: `${EVENT_NAME} finisher sticker`,
        text: `${plainTextName(runner.participant)} finished the ${EVENT_NAME} in ${runner.time}.`
      });
      setStatus(
        `Choose Instagram from the share sheet. ${runner.participant} finished in ${runner.time}.`
      );
    } catch {
      setStatus(
        `Sticker ready for ${runner.participant} (${runner.time}). Native share is not available here; use Copy PNG or Download PNG.`
      );
    }
  } catch (error) {
    setStatus(error instanceof Error ? `Sticker failed: ${error.message}` : "Sticker failed.");
  } finally {
    setRowButtonsBusy(trigger, false);
  }
}

async function copySelectedPng(): Promise<void> {
  if (!selectedRunner) {
    setStatus("Choose a finisher before copying a PNG.");
    return;
  }

  copyButton.disabled = true;
  setStatus(`Copying sticker for ${selectedRunner.participant}...`);

  try {
    await copyPngToClipboard(createStickerOptions(selectedRunner));
    setStatus(`Copied PNG for ${selectedRunner.participant} (${selectedRunner.time}).`);
  } catch (error) {
    setStatus(
      error instanceof Error
        ? `Copy failed: ${error.message}. Download PNG is still available.`
        : "Copy failed. Download PNG is still available."
    );
  } finally {
    copyButton.disabled = false;
  }
}

function createStickerOptions(runner: RunnerResult): BrowserComposeOptions {
  const options: BrowserComposeOptions = {
    image: routeStickerPng,
    layers: [
      {
        text: runner.time,
        box: { x: 230, y: 762, width: 980, height: 118 },
        font: { family: "Arial, Helvetica, sans-serif", size: 100, weight: 900 },
        color: "rgba(0, 0, 0, 0.55)",
        align: "center",
        valign: "middle",
        maxLines: 1,
        minFontSize: 34,
        fit: "shrink"
      },
      {
        text: runner.time,
        box: { x: 220, y: 752, width: 980, height: 118 },
        font: { family: "Arial, Helvetica, sans-serif", size: 100, weight: 900 },
        color: "#ffffff",
        align: "center",
        valign: "middle",
        maxLines: 1,
        minFontSize: 34,
        fit: "shrink"
      },
      {
        text: runner.participant,
        box: { x: 224, y: 906, width: 990, height: 88 },
        font: { family: "Arial, Helvetica, sans-serif", size: 58, weight: 900 },
        color: "rgba(0, 0, 0, 0.6)",
        align: "center",
        valign: "middle",
        maxLines: 1,
        minFontSize: 24,
        fit: "shrink"
      },
      {
        text: runner.participant,
        box: { x: 214, y: 896, width: 990, height: 88 },
        font: { family: "Arial, Helvetica, sans-serif", size: 58, weight: 900 },
        color: "#ffffff",
        align: "center",
        valign: "middle",
        maxLines: 1,
        minFontSize: 24,
        fit: "shrink"
      },
      {
        text: EVENT_NAME,
        box: { x: 440, y: 1008, width: 560, height: 42 },
        font: { family: "Arial, Helvetica, sans-serif", size: 26, weight: 800 },
        color: "rgba(255, 255, 255, 0.9)",
        align: "center",
        valign: "middle",
        maxLines: 1,
        minFontSize: 16,
        fit: "shrink"
      }
    ]
  };
  return options;
}

function updatePreview(runner: RunnerResult, dataUrl: string): void {
  if (latestObjectUrl) {
    URL.revokeObjectURL(latestObjectUrl);
    latestObjectUrl = null;
  }

  selectedTime.textContent = runner.time;
  selectedName.textContent = runner.participant;
  stickerPreview.src = dataUrl;
  stickerPreview.hidden = false;
  stickerPanel.hidden = false;
  stickerPanel.classList.add("is-visible");
  copyButton.disabled = false;
  downloadLink.href = dataUrl;
  downloadLink.download = stickerFilename(runner);
  stickerPanel.scrollIntoView({ block: "start", behavior: "auto" });
}

function setActiveRow(position: number): void {
  for (const row of tableBody.querySelectorAll("tr")) {
    row.classList.toggle("is-active", row.dataset.runnerRow === String(position));
  }
}

function setRowButtonsBusy(activeButton: HTMLButtonElement, busy: boolean): void {
  for (const button of tableBody.querySelectorAll<HTMLButtonElement>("[data-share-position]")) {
    button.disabled = busy;
  }
  activeButton.textContent = busy ? "Making..." : "Share";
}

function setStatus(message: string): void {
  statusText.textContent = message;
}

function stickerFilename(runner: RunnerResult): string {
  return `grand-5km-run-${runner.position}.png`;
}

function plainTextName(name: string): string {
  return name.normalize("NFD").replace(/\p{Diacritic}/gu, "");
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

function setupRevealAnimations(): void {
  const items = document.querySelectorAll<HTMLElement>(".reveal");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const item of items) {
      item.classList.add("is-visible");
    }
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );

  for (const item of items) {
    observer.observe(item);
  }
}

function createRouteStickerBase(): string {
  const canvas = document.createElement("canvas");
  canvas.width = STICKER_WIDTH;
  canvas.height = STICKER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unavailable");
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const route = offsetPoints([
    [178, 582],
    [238, 534],
    [366, 412],
    [492, 280],
    [578, 334],
    [700, 426],
    [806, 456],
    [934, 438],
    [1050, 382],
    [1216, 404],
    [1306, 512],
    [1262, 632],
    [1322, 728],
    [1268, 862],
    [972, 822],
    [744, 784],
    [476, 748],
    [280, 746],
    [260, 698],
    [214, 704],
    [178, 582]
  ], 0, -140);

  const startSegment = offsetPoints([
    [492, 280],
    [578, 334],
    [700, 426],
    [776, 450]
  ], 0, -140);

  drawRoute(ctx, route, "#ffffff", 70, "rgba(0, 0, 0, 0.24)", 0, 16);
  drawRoute(ctx, route, "#2079ed", 30);
  drawRoute(ctx, startSegment, "#111111", 30);
  drawRouteArrow(ctx, 418, 244, -40);
  drawRouteArrow(ctx, 812, 646, -18);
  drawRunner(ctx, 560, 136);
  drawCheckpoint(ctx, 760, 300);

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
  const [first, ...rest] = points;
  if (!first) {
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);
  for (const point of rest) {
    ctx.lineTo(point[0], point[1]);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRouteArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotationDeg: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.strokeStyle = "#2079ed";
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-38, -26);
  ctx.lineTo(0, 0);
  ctx.lineTo(-38, 26);
  ctx.stroke();
  ctx.restore();
}

function drawRunner(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 44;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(x + 58, y, 36, 0, Math.PI * 2);
  ctx.moveTo(x + 28, y + 56);
  ctx.lineTo(x + 58, y + 92);
  ctx.lineTo(x + 54, y + 158);
  ctx.moveTo(x + 54, y + 158);
  ctx.lineTo(x + 14, y + 226);
  ctx.moveTo(x + 56, y + 154);
  ctx.lineTo(x + 116, y + 222);
  ctx.moveTo(x + 44, y + 96);
  ctx.lineTo(x - 28, y + 70);
  ctx.moveTo(x + 58, y + 94);
  ctx.lineTo(x + 136, y + 126);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#050505";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(x + 58, y, 30, 0, Math.PI * 2);
  ctx.moveTo(x + 28, y + 56);
  ctx.lineTo(x + 58, y + 92);
  ctx.lineTo(x + 54, y + 158);
  ctx.moveTo(x + 54, y + 158);
  ctx.lineTo(x + 14, y + 226);
  ctx.moveTo(x + 56, y + 154);
  ctx.lineTo(x + 116, y + 222);
  ctx.moveTo(x + 44, y + 96);
  ctx.lineTo(x - 28, y + 70);
  ctx.moveTo(x + 58, y + 94);
  ctx.lineTo(x + 136, y + 126);
  ctx.stroke();
  ctx.restore();
}

function drawCheckpoint(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#5bd30f";
  ctx.beginPath();
  ctx.arc(x - 30, y - 22, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + 34, y + 8, 34, 0, Math.PI * 2);
  ctx.fill();
  drawFinishMarker(ctx, x + 34, y + 8, 48);
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
