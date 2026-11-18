# Public demo architecture

The portfolio dashboard in `dashboard/` is the UI for **Meet Flow — Agentic AI Meeting Assistant**.

## Current mode (local)

`dashboard/config.js`:

```js
MODE: "local"
```

- Local sample scenarios only
- No n8n webhook calls
- No LLM API calls from the browser
- No Notion or Google Calendar writes
- Approve / Reject simulates Human Approval
- Tool cards remain simulated

Public wording while local:

> Public Demo — sample scenarios only. External Notion and Google Calendar actions are always simulated.

## Live AI preparation (not enabled yet)

To connect a real n8n processor later without redesigning the UI:

1. Set `MODE: "live"` in `config.js`
2. Set `PROCESSOR_URL` to your n8n webhook
3. Return JSON shaped like the local scenario objects in `processor.js`

When live mode is on, the UI will show:

> Live AI Demo — Meeting notes are processed by Meet Flow. External Notion and Google Calendar actions are simulated for safety.

Do **not** use that live banner while `MODE` is still `"local"`.

## Files

| File | Role |
| --- | --- |
| `config.js` | Mode, processor URL, banner copy |
| `processor.js` | Local samples + live `fetch` adapter |
| `app.js` | Shared result UI |
| `index.html` / `styles.css` | Layout and design |
