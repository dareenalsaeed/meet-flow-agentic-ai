/**
 * Meet Flow public portfolio demo.
 *
 * PUBLIC_DEMO is always on for this page. The UI simulates the Week 4
 * agentic path with local sample scenarios only. It never calls n8n,
 * an LLM, Notion, Google Calendar, or any webhook.
 */
(function () {
  "use strict";

  var PUBLIC_DEMO = true;

  var STAGES = [
    { id: "read", label: "Reading meeting notes", detail: "Intake from the chat-style notes field" },
    { id: "structure", label: "Structuring information", detail: "Draft, review, and Track C validation" },
    { id: "classify", label: "Classifying actions", detail: "TASK · MEETING · FOLLOW_UP · UNCLEAR" },
    { id: "guardrails", label: "Applying guardrails", detail: "Confidence, confirmation language, no invented facts" },
    { id: "review", label: "Checking for Human Review", detail: "Unclear or low-confidence items stop here" },
  ];

  var FLOW_STEPS = [
    "Meeting Notes",
    "AI Structuring",
    "Classification",
    "Guardrails",
    "Human Review",
    "Human Approval",
    "External Tools",
  ];

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
        { label: "Notion task", detail: "Update project dashboard · Alex · November 13, 2026" },
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
      ready: [{ label: "Notion task", detail: "Update project dashboard · Alex · November 13, 2026" }],
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
        {
          label: "Google Calendar event",
          detail: "Project meeting · November 17, 2026 · 2:00–2:30 PM",
        },
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

  var notes = document.getElementById("notes");
  var samples = document.getElementById("samples");
  var formNote = document.getElementById("form-note");
  var processing = document.getElementById("processing");
  var stagesEl = document.getElementById("stages");
  var results = document.getElementById("results");
  var approvalPanel = document.getElementById("approval-panel");
  var toolsPanel = document.getElementById("tools-panel");
  var approvalNote = document.getElementById("approval-note");
  var processBtn = document.getElementById("process");

  var activeScenario = null;
  var processTimer = null;

  document.getElementById("banner").textContent = PUBLIC_DEMO
    ? "Public Demo — results are simulated from local sample scenarios. This page does not call n8n, an AI API, Notion, or Google Calendar."
    : "";

  document.getElementById("mode-pill").textContent = PUBLIC_DEMO ? "Public Demo" : "Demo Mode";

  SAMPLES.forEach(function (sample) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = sample.label;
    button.dataset.key = sample.key;
    button.addEventListener("click", function () {
      notes.value = sample.text;
      formNote.hidden = true;
      Array.prototype.forEach.call(samples.querySelectorAll(".chip"), function (chip) {
        chip.classList.toggle("active", chip === button);
      });
    });
    samples.appendChild(button);
  });

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function choose(text) {
    var notesText = String(text || "").toLowerCase();
    if (!notesText.trim()) return "";
    if (notesText.indexOf("not decided") !== -1 || notesText.indexOf("were not") !== -1) return "unclear";
    if (notesText.indexOf("dashboard") !== -1 && notesText.indexOf("alex") !== -1 && notesText.indexOf("november 17") !== -1) {
      return "both";
    }
    if (notesText.indexOf("alex and priya") !== -1 && notesText.indexOf("november 17") !== -1) return "meeting";
    if (notesText.indexOf("follow up") !== -1) return "follow";
    if (notesText.indexOf("dashboard") !== -1 && notesText.indexOf("alex") !== -1) return "task";
    return "unmatched";
  }

  function clearTimers() {
    if (processTimer) {
      window.clearTimeout(processTimer);
      processTimer = null;
    }
  }

  function renderStages(activeIndex) {
    stagesEl.innerHTML = "";
    STAGES.forEach(function (stage, index) {
      var li = document.createElement("li");
      li.className = "stage";
      if (index < activeIndex) li.classList.add("done");
      if (index === activeIndex) li.classList.add("active");
      var mark = index < activeIndex ? "✓" : String(index + 1);
      li.innerHTML =
        '<div class="stage-mark" aria-hidden="true">' + mark + "</div>" +
        "<div><strong>" + escapeHtml(stage.label) + "</strong><span>" + escapeHtml(stage.detail) + "</span></div>";
      stagesEl.appendChild(li);
    });
  }

  function runProcessing(onDone) {
    var index = 0;
    processing.hidden = false;
    results.hidden = true;
    toolsPanel.hidden = true;
    approvalNote.hidden = true;
    processBtn.disabled = true;
    processing.scrollIntoView({ behavior: "smooth", block: "start" });
    renderStages(0);

    function tick() {
      if (index >= STAGES.length) {
        renderStages(STAGES.length);
        processTimer = window.setTimeout(function () {
          processing.hidden = true;
          processBtn.disabled = false;
          onDone();
        }, 350);
        return;
      }
      renderStages(index);
      index += 1;
      processTimer = window.setTimeout(tick, 520);
    }

    tick();
  }

  function renderStats(counts) {
    var stats = document.getElementById("stats");
    var items = [
      { label: "Tasks", value: counts.tasks },
      { label: "Meetings", value: counts.meetings },
      { label: "Follow-ups", value: counts.followUps },
      { label: "Human Review", value: counts.humanReview, review: true },
    ];
    stats.innerHTML = items
      .map(function (item) {
        return (
          '<article class="stat' + (item.review ? " review-stat" : "") + '">' +
          '<span class="label">' + escapeHtml(item.label) + "</span>" +
          '<span class="value">' + escapeHtml(item.value) + "</span>" +
          "</article>"
        );
      })
      .join("");
  }

  function fieldRow(label, value, missing) {
    return (
      "<div class=\"field\"><dt>" +
      escapeHtml(label) +
      "</dt><dd" +
      (missing ? ' class="missing"' : "") +
      ">" +
      escapeHtml(value) +
      "</dd></div>"
    );
  }

  function renderActionCard(action) {
    var badgeTone =
      action.kind === "FOLLOW_UP" ? "follow" : action.kind === "UNCLEAR" ? "unclear" : action.kind.toLowerCase();
    var statusTone = action.statusTone || "pending";
    var body = "";

    if (action.kind === "TASK") {
      body =
        fieldRow("Owner", action.owner || "Not stated", !action.owner) +
        fieldRow("Deadline", action.deadline || "Not stated", !action.deadline) +
        fieldRow("Classification", action.classification || "TASK") +
        fieldRow("Status", action.status);
    } else if (action.kind === "MEETING") {
      body =
        fieldRow("Date", action.date || "Not stated", !action.date) +
        fieldRow("Time", action.time || "Not stated", !action.time) +
        fieldRow("Status", action.status);
    } else if (action.kind === "FOLLOW_UP") {
      body =
        fieldRow("Owner", action.owner || "Not stated", !action.owner) +
        fieldRow("Status", action.status);
    } else {
      body =
        fieldRow("Identified", action.identified || "Not stated") +
        (action.missing || [])
          .map(function (line) {
            return fieldRow("Missing", line, true);
          })
          .join("") +
        fieldRow("Status", action.status || "Needs human review", true);
    }

    return (
      '<article class="action-card' +
      (action.kind === "UNCLEAR" ? " review" : "") +
      '">' +
      '<div class="action-card-top">' +
      "<h3>" +
      escapeHtml(action.title) +
      "</h3>" +
      '<span class="badge ' +
      badgeTone +
      '">' +
      escapeHtml(action.kind) +
      "</span>" +
      "</div>" +
      '<div class="fields">' +
      body +
      "</div>" +
      (action.why
        ? '<p class="review-why"><strong>Why human review:</strong> ' + escapeHtml(action.why) + "</p>"
        : "") +
      '<div style="margin-top:10px">' +
      '<span class="badge ' +
      statusTone +
      '">' +
      escapeHtml(action.status) +
      "</span>" +
      "</div>" +
      "</article>"
    );
  }

  function renderFlow(highlight) {
    var flow = document.getElementById("flow");
    var set = {};
    (highlight || []).forEach(function (step) {
      set[step] = true;
    });
    flow.innerHTML = FLOW_STEPS.map(function (step, index) {
      var arrow =
        index < FLOW_STEPS.length - 1 ? '<span class="flow-arrow" aria-hidden="true">→</span>' : "";
      return (
        "<li>" +
        '<span class="flow-step' +
        (set[step] ? " active-path" : "") +
        '">' +
        escapeHtml(step) +
        "</span>" +
        arrow +
        "</li>"
      );
    }).join("");
  }

  function renderApproval(scenario) {
    var readyList = document.getElementById("ready-list");
    if (scenario.skipApproval || !scenario.ready || !scenario.ready.length) {
      approvalPanel.hidden = true;
      return;
    }
    approvalPanel.hidden = false;
    document.getElementById("approval-actions").hidden = false;
    readyList.innerHTML = scenario.ready
      .map(function (item) {
        return (
          '<div class="ready-item"><div><strong>' +
          escapeHtml(item.label) +
          "</strong><div class=\"panel-sub\">" +
          escapeHtml(item.detail) +
          "</div></div><span class=\"badge pending\">Ready</span></div>"
        );
      })
      .join("");
  }

  function renderTools(items, rejected) {
    var toolResults = document.getElementById("tool-results");
    toolsPanel.hidden = false;
    document.getElementById("sim-banner").textContent =
      "Portfolio Demo — External actions are simulated. No changes were made to Notion or Google Calendar.";

    if (rejected) {
      toolResults.innerHTML =
        '<article class="tool-card stopped">' +
        '<div class="tool-head"><h3>External actions</h3><span class="badge rejected">Not created</span></div>' +
        "<p>Do not create was selected. Notion and Google Calendar were not called.</p>" +
        '<p class="muted">Simulated form outcome only.</p>' +
        "</article>";
      return;
    }

    if (!items || !items.length) {
      toolResults.innerHTML =
        '<article class="tool-card stopped">' +
        '<div class="tool-head"><h3>External actions</h3><span class="badge pending">None</span></div>' +
        "<p>No Notion task or calendar event was prepared for this route.</p>" +
        "</article>";
      return;
    }

    toolResults.innerHTML = items
      .map(function (item) {
        return (
          '<article class="tool-card">' +
          '<div class="tool-head"><h3>' +
          escapeHtml(item.system) +
          '</h3><span class="tool-check">✓ ' +
          escapeHtml(item.headline) +
          "</span></div>" +
          "<p><strong>" +
          escapeHtml(item.title) +
          "</strong></p>" +
          item.lines
            .map(function (line) {
              return "<p class=\"muted\">" + escapeHtml(line) + "</p>";
            })
            .join("") +
          '<p class="muted" style="margin-top:10px">Simulated · Portfolio Demo</p>' +
          "</article>"
        );
      })
      .join("");
  }

  function setResultStatus(text, tone) {
    var pill = document.getElementById("result-status");
    pill.textContent = text;
    pill.className = "status-pill" + (tone && tone !== "ok" ? " " + tone : "");
  }

  function renderResults(scenario) {
    activeScenario = scenario;
    document.getElementById("result-title").textContent = scenario.title;
    document.getElementById("result-summary").textContent = scenario.summary;
    setResultStatus(scenario.status, scenario.statusTone);
    renderStats(scenario.counts);
    document.getElementById("actions").innerHTML = scenario.actions.map(renderActionCard).join("");
    renderApproval(scenario);
    toolsPanel.hidden = true;
    renderFlow(scenario.pathHighlight);
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("process-toggle").addEventListener("click", function () {
    var body = document.getElementById("process-body");
    var open = body.hidden;
    body.hidden = !open;
    this.setAttribute("aria-expanded", open ? "true" : "false");
    this.querySelector(".chevron").textContent = open ? "–" : "+";
  });

  document.getElementById("approve").addEventListener("click", function () {
    if (!PUBLIC_DEMO || !activeScenario) return;
    setResultStatus("Approved · simulated tools prepared", "ok");
    approvalNote.hidden = false;
    approvalNote.textContent = "Approve selected. Showing simulated external results only.";
    document.getElementById("approval-actions").hidden = true;
    renderTools(activeScenario.toolsOnApprove, false);
    toolsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("reject").addEventListener("click", function () {
    if (!PUBLIC_DEMO || !activeScenario) return;
    setResultStatus("Rejected · no external actions", "rejected");
    approvalNote.hidden = false;
    approvalNote.textContent = "Do not create selected. No simulated Notion or Calendar output was prepared.";
    document.getElementById("approval-actions").hidden = true;
    renderTools([], true);
    toolsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  processBtn.addEventListener("click", function () {
    if (!PUBLIC_DEMO) {
      formNote.hidden = false;
      formNote.textContent = "This portfolio build only supports Public Demo mode.";
      return;
    }

    clearTimers();
    var key = choose(notes.value);
    if (!key) {
      formNote.hidden = false;
      formNote.textContent = "Paste meeting notes, or choose a sample, before processing.";
      results.hidden = true;
      processing.hidden = true;
      return;
    }
    if (key === "unmatched") {
      formNote.hidden = false;
      formNote.textContent =
        "Public Demo only supports the sample scenarios: Task + Meeting, Task, Meeting, Follow-up, or Unclear.";
      results.hidden = true;
      processing.hidden = true;
      return;
    }

    formNote.hidden = true;
    runProcessing(function () {
      renderResults(SCENARIOS[key]);
    });
  });

  var demoKey = new URLSearchParams(window.location.search).get("demo");
  if (demoKey && SCENARIOS[demoKey]) {
    var preset = SAMPLES.filter(function (sample) {
      return sample.key === demoKey;
    })[0];
    if (preset) {
      notes.value = preset.text;
      Array.prototype.forEach.call(samples.querySelectorAll(".chip"), function (chip) {
        chip.classList.toggle("active", chip.dataset.key === demoKey);
      });
    }
    renderResults(SCENARIOS[demoKey]);
  }
})();
