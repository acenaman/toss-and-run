// Export & share helpers.
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

async function renderToCanvas(el: HTMLElement) {
  return html2canvas(el, { backgroundColor: "#1a1a1a", scale: 2, useCORS: true });
}

export async function exportPng(el: HTMLElement, filename: string) {
  const canvas = await renderToCanvas(el);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export async function exportPdf(el: HTMLElement, filename: string) {
  const canvas = await renderToCanvas(el);
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "px", format: [canvas.width, canvas.height], orientation: canvas.width > canvas.height ? "landscape" : "portrait" });
  pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}

export async function shareScorecard(el: HTMLElement, title: string, text: string) {
  try {
    const canvas = await renderToCanvas(el);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return;
    const file = new File([blob], "scorecard.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title, text, files: [file] });
      return;
    }
    // Fallback: WhatsApp URL with text only
    const url = `https://wa.me/?text=${encodeURIComponent(`${title}\n${text}`)}`;
    window.open(url, "_blank");
  } catch (e) {
    console.error(e);
  }
}
