/**
 * Meet Flow result processor.
 *
 * Local mode returns curated sample scenarios.
 * Live mode POSTs { notes } to MEETFLOW_CONFIG.PROCESSOR_URL and expects
 * a JSON body shaped like the local scenario objects used by the UI.
 *
 * The UI never calls Notion or Google Calendar directly. Tool cards in the
 * response remain simulated in the portfolio demo.
 */
(function (global) {
  "use strict";

  var SAMPLES = [
    {
      key: "both",
      label: "Task + Meeting",
      text: "During today's project meeting, Alex agreed to update the project dashboard by November 13, 2026. Alex is responsible for completing the task. We also scheduled a project review meeting on November 17, 2026, from 2:00 PM to 2:30 PM to review the completed dashboard.",
    },
    {
      key: "task",
      label: "Task",
      text: "During today's project meeting, Alex agreed to update the project dashboard by November 13, 2026. Alex is responsible for completing this task.",
    },
    {
      key: "meeting",
      label: "Meeting",
      text: "Schedule a project meeting with Alex and Priya on November 17, 2026 from 2:00 PM to 2:30 PM.",
    },
    {
      key: "follow",
      label: "Follow-up",
      text: "Priya should follow up with the sponsor tomorrow about the project presentation.",
    },
    {
      key: "unclear",
      label: "Unclear",
      text: "The project dashboard needs to be updated. The person responsible and deadline were not decided.",
    },
  ];

  var SCENARIOS = {
    both: {
      title: "Project dashboard check-in",
      summary:
        "Alex will update the project dashboard by November 13, 2026. A project review meeting is scheduled for November 17, 2026, from 2:00 PM to 2:30 PM.",
      status: "Ready for human approval",
      statusTone: "pending",
      counts: { tasks: 1, meetings: 1, followUps: 0, humanReview: 0 },
      actions: [
        {
          kind: "TASK",
          title: "Update project dashboard",
          owner: "Alex",
          deadline: "November 13, 2026",
          classification: "TASK",
          status: "Awaiting approval",
          statusTone: "pending",
        },
        {
          kind: "MEETING",
          title: "Project Review Meeting",
          date: "November 17, 2026",
          time: "2:00 PM – 2:30 PM",
          status: "Awaiting approval",
          statusTone: "pending",
        },
      ],
      ready: [
        { label: "Notion task", detail: "Update project dashboard · Owner: Alex · Deadline: November 13, 2026" },
        { label: "Google Calendar event", detail: "Project Review Meeting · November 17, 2026 · 2:00–2:30 PM" },
      ],
      toolsOnApprove: [
        {
          system: "Notion",
          ok: true,
          headline: "Task prepared",
          title: "Update project dashboard",
          lines: ["Owner: Alex", "Deadline: November 13, 2026"],
        },
        {
          system: "Google Calendar",
          ok: true,
          headline: "Event prepared",
          title: "Project Review Meeting",
          lines: ["November 17, 2026", "2:00 PM – 2:30 PM"],
        },
      ],
      pathHighlight: ["Meeting Notes", "AI Structuring", "Classification", "Guardrails", "Human Approval", "External Tools"],
    },
    task: {
      title: "Dashboard update",
      summary: "Alex will update the project dashboard. The deadline stated in the notes is November 13, 2026.",
      status: "Ready for human approval",
      statusTone: "pending",
      counts: { tasks: 1, meetings: 0, followUps: 0, humanReview: 0 },
      actions: [
        {
          kind: "TASK",
          title: "Update project dashboard",
          owner: "Alex",
          deadline: "November 13, 2026",
          classification: "TASK",
          status: "Awaiting approval",
          statusTone: "pending",
        },
      ],
      ready: [{ label: "Notion task", detail: "Update project dashboard · Owner: Alex · Deadline: November 13, 2026" }],
      toolsOnApprove: [
        {
          system: "Notion",
          ok: true,
          headline: "Task prepared",
          title: "Update project dashboard",
          lines: ["Owner: Alex", "Deadline: November 13, 2026"],
        },
      ],
      pathHighlight: ["Meeting Notes", "AI Structuring", "Classification", "Guardrails", "Human Approval", "External Tools"],
    },
    meeting: {
      title: "Project meeting request",
      summary:
        "The notes ask to schedule a project meeting with Alex and Priya on November 17, 2026, from 2:00 PM to 2:30 PM. Guest emails are not added in this workflow.",
      status: "Ready for human approval",
      statusTone: "pending",
      counts: { tasks: 0, meetings: 1, followUps: 0, humanReview: 0 },
      actions: [
        {
          kind: "MEETING",
          title: "Project meeting",
          date: "November 17, 2026",
          time: "2:00 PM – 2:30 PM",
          status: "Awaiting approval",
          statusTone: "pending",
        },
      ],
      ready: [
        { label: "Google Calendar event", detail: "Project meeting · November 17, 2026 · 2:00–2:30 PM" },
      ],
      toolsOnApprove: [
        {
          system: "Google Calendar",
          ok: true,
          headline: "Event prepared",
          title: "Project meeting",
          lines: ["November 17, 2026", "2:00 PM – 2:30 PM"],
        },
      ],
      pathHighlight: ["Meeting Notes", "AI Structuring", "Classification", "Guardrails", "Human Approval", "External Tools"],
    },
    follow: {
      title: "Sponsor follow-up",
      summary:
        "Priya should follow up with the sponsor tomorrow about the project presentation. Meet Flow queues this for a person and does not send email.",
      status: "Routed · no external tool",
      statusTone: "pending",
      counts: { tasks: 0, meetings: 0, followUps: 1, humanReview: 0 },
      actions: [
        {
          kind: "FOLLOW_UP",
          title: "Follow up with the sponsor about the project presentation",
          owner: "Priya",
          status: "Queued for Communication / Follow-up Owner",
          statusTone: "pending",
        },
      ],
      ready: [],
      toolsOnApprove: [],
      skipApproval: true,
      pathHighlight: ["Meeting Notes", "AI Structuring", "Classification", "Guardrails"],
    },
    unclear: {
      title: "Dashboard update — incomplete",
      summary:
        "The notes say the project dashboard needs an update, but they do not name an owner or a deadline. Meet Flow stops automatic action.",
      status: "Human Review required",
      statusTone: "review",
      counts: { tasks: 0, meetings: 0, followUps: 0, humanReview: 1 },
      actions: [
        {
          kind: "UNCLEAR",
          title: "Update project dashboard",
          identified: "A dashboard update was mentioned in the notes.",
          missing: ["Owner: Not stated", "Deadline: Not stated"],
          why: "Owner and deadline were not decided. Confidence and completeness checks send this item to Human Review. No Notion task, calendar event, or message is created.",
          status: "Needs human review",
          statusTone: "review",
        },
      ],
      ready: [],
      toolsOnApprove: [],
      skipApproval: true,
      pathHighlight: ["Meeting Notes", "AI Structuring", "Classification", "Guardrails", "Human Review"],
    },
  };

  function chooseLocalKey(text) {
    var notesText = String(text || "").toLowerCase();
    if (!notesText.trim()) return { error: "empty" };
    if (notesText.indexOf("not decided") !== -1 || notesText.indexOf("were not") !== -1) {
      return { key: "unclear" };
    }
    if (notesText.indexOf("dashboard") !== -1 && notesText.indexOf("alex") !== -1 && notesText.indexOf("november 17") !== -1) {
      return { key: "both" };
    }
    if (notesText.indexOf("alex and priya") !== -1 && notesText.indexOf("november 17") !== -1) {
      return { key: "meeting" };
    }
    if (notesText.indexOf("follow up") !== -1) return { key: "follow" };
    if (notesText.indexOf("dashboard") !== -1 && notesText.indexOf("alex") !== -1) return { key: "task" };
    return { error: "unmatched" };
  }

  function processLocal(notes) {
    var match = chooseLocalKey(notes);
    if (match.error === "empty") {
      return Promise.reject(new Error("Paste meeting notes, or choose a sample, before processing."));
    }
    if (match.error === "unmatched") {
      return Promise.reject(
        new Error("This demo supports the sample scenarios: Task + Meeting, Task, Meeting, Follow-up, or Unclear.")
      );
    }
    return Promise.resolve(JSON.parse(JSON.stringify(SCENARIOS[match.key])));
  }

  function processLive(notes, url) {
    if (!url) {
      return Promise.reject(new Error("PROCESSOR_URL is not set for live mode."));
    }
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ notes: notes }),
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Meet Flow processor returned " + response.status + ".");
      }
      return response.json();
    });
  }

  function processNotes(notes) {
    var config = global.MEETFLOW_CONFIG || { MODE: "local" };
    if (config.MODE === "live") {
      return processLive(notes, config.PROCESSOR_URL);
    }
    return processLocal(notes);
  }

  global.MeetFlowProcessor = {
    SAMPLES: SAMPLES,
    SCENARIOS: SCENARIOS,
    processNotes: processNotes,
    getScenario: function (key) {
      return SCENARIOS[key] ? JSON.parse(JSON.stringify(SCENARIOS[key])) : null;
    },
  };
})(window);
