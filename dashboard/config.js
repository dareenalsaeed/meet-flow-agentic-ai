/**
 * Meet Flow dashboard configuration.
 *
 * MODE:
 * - "local"  → sample scenarios only (current public portfolio)
 * - "live"   → POST notes to PROCESSOR_URL (n8n webhook) and render the same UI
 *
 * When MODE is "live", set PROCESSOR_URL to your n8n webhook.
 * Keep LIVE_BANNER_TEXT for that mode. Do not use LIVE_BANNER_TEXT while MODE is "local".
 */
window.MEETFLOW_CONFIG = {
  MODE: "local",
  PROCESSOR_URL: "",
  LOCAL_BANNER_TEXT:
    "Public Demo — sample scenarios only. External Notion and Google Calendar actions are always simulated.",
  LIVE_BANNER_TEXT:
    "Live AI Demo — Meeting notes are processed by Meet Flow. External Notion and Google Calendar actions are simulated for safety.",
  MODE_PILL_LOCAL: "Public Demo",
  MODE_PILL_LIVE: "Live AI Demo",
};
