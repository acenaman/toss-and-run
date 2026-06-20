const PREVIEW_HOSTS = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];

function shouldRefuseServiceWorker() {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (PREVIEW_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))) return true;
  return new URLSearchParams(window.location.search).get("sw") === "off";
}

async function unregisterAppServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter((reg) => reg.active?.scriptURL.endsWith("/sw.js") || reg.installing?.scriptURL.endsWith("/sw.js") || reg.waiting?.scriptURL.endsWith("/sw.js")).map((reg) => reg.unregister()));
}

export async function setupPwa() {
  if (!("serviceWorker" in navigator)) return;
  if (shouldRefuseServiceWorker()) {
    await unregisterAppServiceWorkers();
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}