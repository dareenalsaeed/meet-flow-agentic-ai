# Meet Flow — Agentic AI Meeting Assistant

Public portfolio UI for Meet Flow.

**Current mode:** local sample scenarios (`config.js` → `MODE: "local"`).  
No n8n, LLM, Notion, or Google Calendar calls from this page. Approve / Reject and tool cards are simulated.

## Open it

```bash
cd dashboard
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765`.

Query shortcuts: `?demo=both`, `task`, `meeting`, `follow`, `unclear`.

## Switch to a live n8n processor later

1. Set `MODE: "live"` in `config.js`
2. Set `PROCESSOR_URL` to your webhook
3. Keep the same UI — `processor.js` posts `{ notes }` and expects the scenario JSON shape already used locally

See `docs/public-demo.md`.
