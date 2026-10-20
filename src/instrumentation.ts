/** Controlled Node VPS startup. Worker/client code never imports the SQLite runtime. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.QETTYQ_DEPLOYMENT === "vps") {
    const { getHostedRuntime } = await import("./server/pilot/host-runtime");
    const { initializeVpsRuntime } = await import("./server/vps/runtime");
    if (!getHostedRuntime()) initializeVpsRuntime();
    const { initializeVpsGoogleRuntime } = await import("./server/vps/google-runtime");
    initializeVpsGoogleRuntime();
  }
}
