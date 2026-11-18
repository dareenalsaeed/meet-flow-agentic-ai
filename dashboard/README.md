# Meet Flow dashboard (Demo Mode)

One-page employee view prototype for Meet Flow.

**Demo Mode only.** The **Process Meeting Notes** button does not call n8n, an AI model, Notion, or Google Calendar. It matches pasted text to local samples (Task, Meeting, Follow-up, Unclear, and Task + Meeting). Every result is labeled Demo.

Human Review appears as a message, not a live form. Nothing on this page creates external records.

## Open it

```bash
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765`.

Query shortcuts: `?demo=both`, `task`, `meeting`, `follow`, `unclear`.

## Note

A Team Directory section describes a possible later connection to an employee directory. It is not part of the tested n8n workflow path shown in this portfolio.
