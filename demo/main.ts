import {
  composePngBlob,
  copyPngBlobToClipboard,
  copyPngToClipboard,
  sharePngBlobToInstagramStory
} from "../src/browser.js";
import type { BrowserComposeOptions } from "../src/index.js";

import { results, type RunnerResult } from "./results.js";
import "./styles.css";

const EVENT_NAME = "Grand 5km Run";
const routeStickerPng = new URL(
  "./assets/grand-5km-route-cropped-transparent.png",
  import.meta.url
).href;

const tableBody = queryRequired<HTMLTableSectionElement>("#results-body");
const statusText = queryRequired<HTMLParagraphElement>("#share-status");
const stickerPanel = queryRequired<HTMLElement>("#sticker-panel");
const stickerPreview = queryRequired<HTMLImageElement>("#sticker-preview");
const selectedTime = queryRequired<HTMLParagraphElement>("#selected-time");
const selectedName = queryRequired<HTMLParagraphElement>("#selected-name");
const copyButton = queryRequired<HTMLButtonElement>("#copy-button");
const downloadLink = queryRequired<HTMLAnchorElement>("#download-link");

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
    const blobPromise = composePngBlob(options);
    const storyClipboardCopy = shouldPreferStoryClipboard()
      ? copyPngBlobToClipboard(blobPromise)
          .then(() => ({ ok: true as const }))
          .catch(() => ({ ok: false as const }))
      : null;
    const blob = await blobPromise;
    const dataUrl = await blobToDataUrl(blob);
    updatePreview(runner, dataUrl);
    setStatus(`Sticker ready for ${runner.participant} (${runner.time}).`);

    if (storyClipboardCopy) {
      const copyResult = await storyClipboardCopy;
      if (copyResult.ok) {
        setStatus(
          `Copied PNG for ${runner.participant} (${runner.time}). Paste it into Instagram Story, or use Download PNG.`
        );
        return;
      }
    }

    try {
      await sharePngBlobToInstagramStory(blob, {
        filename: stickerFilename(runner)
      });
      setStatus(
        `Opened the native share sheet for ${runner.participant} (${runner.time}).`
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
        box: { x: 240, y: 904, width: 960, height: 78 },
        font: { family: "Arial, Helvetica, sans-serif", size: 74, weight: 900 },
        color: "rgba(0, 0, 0, 0.55)",
        align: "center",
        valign: "middle",
        maxLines: 1,
        minFontSize: 30,
        fit: "shrink"
      },
      {
        text: runner.time,
        box: { x: 232, y: 896, width: 960, height: 78 },
        font: { family: "Arial, Helvetica, sans-serif", size: 74, weight: 900 },
        color: "#ffffff",
        align: "center",
        valign: "middle",
        maxLines: 1,
        minFontSize: 30,
        fit: "shrink"
      },
      {
        text: runner.participant,
        box: { x: 240, y: 976, width: 960, height: 52 },
        font: { family: "Arial, Helvetica, sans-serif", size: 38, weight: 900 },
        color: "rgba(0, 0, 0, 0.6)",
        align: "center",
        valign: "middle",
        maxLines: 1,
        minFontSize: 18,
        fit: "shrink"
      },
      {
        text: runner.participant,
        box: { x: 232, y: 968, width: 960, height: 52 },
        font: { family: "Arial, Helvetica, sans-serif", size: 38, weight: 900 },
        color: "#ffffff",
        align: "center",
        valign: "middle",
        maxLines: 1,
        minFontSize: 18,
        fit: "shrink"
      },
      {
        text: EVENT_NAME,
        box: { x: 494, y: 1028, width: 460, height: 36 },
        font: { family: "Arial, Helvetica, sans-serif", size: 20, weight: 800 },
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

function shouldPreferStoryClipboard(): boolean {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const isIpadOS = platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isIOS = /iPad|iPhone|iPod/.test(platform) || isIpadOS;
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
  return isIOS && isSafari;
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
