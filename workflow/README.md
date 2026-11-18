# Meet Flow workflow

Import `Meet_Flow_Week4_FINAL_SIMPLE_V2.json` into n8n as a new workflow.

This file does **not** contain API keys, Notion tokens, or Google OAuth secrets. After import:

1. Select model credentials on every OpenAI Chat Model node  
2. Select your Notion credential and database on **Create Notion Task**  
3. Select your Google Calendar credential and calendar on **Create Calendar Event**  

## JavaScript helpers

| File | Role |
| --- | --- |
| `src/structure_tasks_and_events.js` | Extract and validate tasks and calendar events from the summary |
| `src/routing_guardrail.js` | Apply confidence, confirmation, and category routing rules |
| `src/action_log_and_review.js` | Action-log fields and human-review decision helpers |
| `src/team_directory.js` | Example directory lookup (`*@example.com` only); guest invites are a future enhancement and not part of the tested final path |

Do not commit real email addresses or credentials into these files.
