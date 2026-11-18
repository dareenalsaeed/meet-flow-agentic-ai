# Public demo architecture

The portfolio dashboard in `dashboard/` runs in **PUBLIC_DEMO** mode only.

## Safety rules

- `PUBLIC_DEMO = true` in `dashboard/app.js`
- Local sample scenarios only (Task + Meeting, Task, Meeting, Follow-up, Unclear)
- No n8n webhook calls
- No LLM / OpenAI API calls from the browser
- No Notion or Google Calendar writes
- Approve / Reject only simulates the Human Approval form outcome
- External tool cards are labeled **Simulated · Portfolio Demo**

## What visitors see

1. Processing stages (no fake percentages)
2. Meeting summary and status
3. Result overview counts
4. Action cards with “Not stated” / human-review messaging when facts are missing
5. Review & Approve when a tool-ready path exists
6. Simulated Notion / Calendar results after Approve
7. Expandable “How Meet Flow handled this” flow for recruiters

The live n8n workflow remains in `workflow/`. Credentials are never shipped in this repository.
