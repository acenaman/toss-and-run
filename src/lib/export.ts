// Export & share helpers. Uses html-to-image (supports oklch/modern CSS).
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

async function renderPng(el: HTMLElement): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  const rect = el.getBoundingClientRect();
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    backgroundColor: "#1a1a1a",
    cacheBust: true,
    width: rect.width,
    height: rect.height,
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  // measure using image so PDF uses real px
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  return { dataUrl, blob, width: img.width, height: img.height };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportPng(el: HTMLElement, filename: string) {
  try {
    const { blob } = await renderPng(el);
    download(blob, filename);
  } catch (e) {
    console.error("PNG export failed", e);
    alert("Could not export PNG: " + (e instanceof Error ? e.message : String(e)));
  }
}

export async function exportPdf(el: HTMLElement, filename: string) {
  try {
    const { dataUrl, width, height } = await renderPng(el);
    const pdf = new jsPDF({
      unit: "px",
      format: [width, height],
      orientation: width > height ? "landscape" : "portrait",
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
    pdf.save(filename);
  } catch (e) {
    console.error("PDF export failed", e);
    alert("Could not export PDF: " + (e instanceof Error ? e.message : String(e)));
  }
}

export async function shareScorecard(el: HTMLElement, title: string, text: string) {
  try {
    const { blob } = await renderPng(el);
    const file = new File([blob], "scorecard.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ title, text, files: [file] });
      return;
    }
    // Fallback: download image + open WhatsApp with text
    download(blob, "scorecard.png");
    const url = `https://wa.me/?text=${encodeURIComponent(`${title}\n${text}`)}`;
    window.open(url, "_blank");
  } catch (e) {
    console.error("Share failed", e);
    alert("Could not share scorecard: " + (e instanceof Error ? e.message : String(e)));
  }
}
