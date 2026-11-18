# Course evolution

Meet Flow was developed as an individual academic project in **CIS 515 — AI and Data Analytics Strategy** at **Arizona State University**. The public portfolio presents the final Week 4 system. The notes below summarize how the design grew across the course.

## Week 1 — Meeting notes assistant

- Chat trigger, AI agent, language model, and short-term memory
- Structured summary of discussion points, decisions, action items, and unclear information
- Rule: do not invent owners, deadlines, or other facts missing from the notes

## Week 2 — Draft and review loop

- Separate draft agent and reviewer
- Reviewer returns PASS or REVISE against the original notes
- One revision cycle when the draft needs correction

## Week 3 — Validated tools

- Code node (Track C) structures tasks and calendar events for downstream tools
- Human Approval form before any external write
- Notion for tasks and Google Calendar for complete events
- Incomplete owners, deadlines, or times stay null; they are not guessed

## Week 4 — Organizational action router (final)

- Classifier assigns TASK, MEETING, FOLLOW_UP, or UNCLEAR
- Routes to role-based owners
- Confidence threshold (0.75) and Human Review for uncertain cases
- After one Approve, a complete task and a complete meeting can both be created in the same run

The portfolio workflow file is `workflow/Meet_Flow_Week4_FINAL_SIMPLE_V2.json`.
