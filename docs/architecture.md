# Meet Flow architecture

Meet Flow is an n8n workflow that turns rough meeting notes into structured actions, then routes those actions to the right organizational owner before any external tool runs.

## End-to-end path

```text
Meeting notes (chat)
        │
        ▼
AI meeting processing
  Draft agent → Reviewer (PASS / REVISE, one revision max)
        │
        ▼
Track C: Structure Tasks and Events
  Keeps stated owners and deadlines
  Accepts calendar slots only as YYYY-MM-DD + 24-hour HH:MM
  Does not invent missing facts
        │
        ▼
Classify Organizational Action
  category + confidence + route owner + reason
        │
        ▼
Check Routing Confidence (≥ 0.75)
        │
        ├── TASK      → Project / Task Owner
        ├── MEETING   → Calendar / Meeting Coordinator
        ├── FOLLOW_UP → Communication / Follow-up Owner (no email sent)
        └── UNCLEAR / low confidence / confirmation required
                        → Human Reviewer → stop
        │
        ▼
Human Approval (Approve / Do not create)
        │
        ├── Approve + action items present      → Create Notion Task
        └── Approve + schedulable events present → Create Calendar Event
            (both may run in the same execution)
```

## Roles

| Role | Responsibility |
| --- | --- |
| Requester | Pastes meeting notes into the chat trigger |
| AI meeting agent | Drafts and reviews the summary |
| AI classifier | Recommends category, owner, confidence, and reason |
| Project / Task Owner | Receives task-routed items |
| Calendar / Meeting Coordinator | Receives meeting-routed items |
| Communication / Follow-up Owner | Receives follow-ups; a person decides contact |
| Human Reviewer | Handles unclear or low-confidence items |
| Human approver | Allows or blocks Notion and Google Calendar |

## Category routing

| Category | Owner | External action |
| --- | --- | --- |
| TASK | Project / Task Owner | Notion after Approve, when a complete task was extracted |
| MEETING | Calendar / Meeting Coordinator | Google Calendar after Approve, when date and times are complete |
| FOLLOW_UP | Communication / Follow-up Owner | Queued for a person; no message is sent |
| UNCLEAR | Human Reviewer | Stop; no Notion task, calendar event, or message |

## Control points

1. **Factual validation (Track C)** — owners, deadlines, and calendar times must already appear in the notes.
2. **Routing confidence** — below 0.75, or an unclear category, goes to Human Review.
3. **Confirmation language** — notes that require confirmation before action stop at Human Review.
4. **Human Approval** — required before Notion or Google Calendar.
5. **Independent tool gates** — after Approve, Notion runs only when action items exist; Calendar runs only when a schedulable event exists.

## Portfolio evidence

- `screenshots/01_n8n_execution.png` — final execution with Notion and Calendar branches after approval
- `screenshots/02_notion_result.png` — Notion task created for the dashboard update
- `screenshots/03_calendar_result.png` — Google Calendar event created after human approval (calendar account name redacted)
