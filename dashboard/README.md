# Meet Flow public demo

Polished portfolio UI for the final Meet Flow agentic workflow.

**PUBLIC_DEMO only.** This page never calls n8n, an LLM, Notion, or Google Calendar. Sample notes are matched locally. Approve / Reject simulates Human Approval. External tool cards are labeled simulated.

## Open it

```bash
cd dashboard
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765`.

Query shortcuts: `?demo=both`, `task`, `meeting`, `follow`, `unclear`.

## What is simulated

| Surface | Behavior |
| --- | --- |
| Process meeting notes | Staged progress UI, then local scenario results |
| Action cards | Structured demo outputs; missing facts stay “Not stated” |
| Review & Approve | Local Approve / Reject only |
| Notion / Google Calendar cards | Simulated after Approve; no API writes |

See `docs/public-demo.md` for the safety model.
