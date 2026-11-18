/**
 * Meet Flow — Agentic AI Meeting Assistant
 * Public portfolio UI. Rendering is shared for local and future live processors.
 */
(function () {
  "use strict";

  var config = window.MEETFLOW_CONFIG || { MODE: "local" };
  var processor = window.MeetFlowProcessor;
  var isLive = config.MODE === "live";

  var STAGES = [
    { id: "read", label: "Reading notes" },
    { id: "structure", label: "Structuring information" },
    { id: "classify", label: "Classifying actions" },
    { id: "guardrails", label: "Applying guardrails" },
    { id: "review", label: "Human Review check" },
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

  var KIND_META = {
    TASK: { label: "Task", tone: "task", icon: "☑" },
    MEETING: { label: "Meeting", tone: "meeting", icon: "▦" },
    FOLLOW_UP: { label: "Follow-up", tone: "follow", icon: "↗" },
    UNCLEAR: { label: "Human Review", tone: "unclear", icon: "!" },
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

  document.getElementById("banner").textContent = isLive
    ? config.LIVE_BANNER_TEXT
    : config.LOCAL_BANNER_TEXT;
  document.getElementById("mode-pill").textContent = isLive
    ? config.MODE_PILL_LIVE
    : config.MODE_PILL_LOCAL;

  processor.SAMPLES.forEach(function (sample) {
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
        '<span class="stage-mark" aria-hidden="true">' + mark + "</span>" +
        "<span class=\"stage-label\">" + escapeHtml(stage.label) + "</span>";
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
    processing.scrollIntoView({ behavior: "smooth", block: "nearest" });
    renderStages(0);

    function tick() {
      if (index >= STAGES.length) {
        renderStages(STAGES.length);
        processTimer = window.setTimeout(function () {
          processing.hidden = true;
          processBtn.disabled = false;
          onDone();
        }, 280);
        return;
      }
      renderStages(index);
      index += 1;
      processTimer = window.setTimeout(tick, 380);
    }

    tick();
  }

  function actionTotal(counts) {
    return Number(counts.tasks || 0) + Number(counts.meetings || 0) + Number(counts.followUps || 0) + Number(counts.humanReview || 0);
  }

  function renderResultHeader(scenario) {
    var counts = scenario.counts || {};
    var total = actionTotal(counts);
    var review = Number(counts.humanReview || 0);
    document.getElementById("result-counts").textContent =
      total + (total === 1 ? " Action Identified" : " Actions Identified") +
      " · " +
      review +
      (review === 1 ? " Need Human Review" : " Need Human Review");
    setResultStatus(scenario.status, scenario.statusTone);
  }

  function renderStats(counts) {
    var stats = document.getElementById("stats");
    var items = [
      { label: "Tasks", value: counts.tasks, tone: "task" },
      { label: "Meetings", value: counts.meetings, tone: "meeting" },
      { label: "Follow-ups", value: counts.followUps, tone: "follow" },
      { label: "Human Review", value: counts.humanReview, tone: "review", review: true },
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
      '<div class="field"><dt>' +
      escapeHtml(label) +
      "</dt><dd" +
      (missing ? ' class="missing"' : "") +
      ">" +
      escapeHtml(value) +
      "</dd></div>"
    );
  }

  function renderActionCard(action) {
    var meta = KIND_META[action.kind] || KIND_META.UNCLEAR;
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
      '<article class="action-card kind-' +
      meta.tone +
      (action.kind === "UNCLEAR" ? " review" : "") +
      '">' +
      '<div class="action-card-top">' +
      '<div class="action-identity">' +
      '<span class="kind-icon" aria-hidden="true">' +
      meta.icon +
      "</span>" +
      "<div>" +
      '<span class="badge ' +
      meta.tone +
      '">' +
      escapeHtml(meta.label) +
      "</span>" +
      "<h3>" +
      escapeHtml(action.title) +
      "</h3>" +
      "</div></div>" +
      '<span class="badge ' +
      statusTone +
      '">' +
      escapeHtml(action.status) +
      "</span>" +
      "</div>" +
      '<div class="fields">' +
      body +
      "</div>" +
      (action.why
        ? '<p class="review-why"><strong>Why human review:</strong> ' + escapeHtml(action.why) + "</p>"
        : "") +
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
      .map(function (item, index) {
        return (
          '<div class="ready-item">' +
          '<span class="ready-index" aria-hidden="true">' +
          (index + 1) +
          "</span>" +
          "<div><strong>" +
          escapeHtml(item.label) +
          '</strong><div class="panel-sub">' +
          escapeHtml(item.detail) +
          "</div></div>" +
          '<span class="badge pending">Needs approval</span></div>'
        );
      })
      .join("");
  }

  function renderTools(items, rejected) {
    var toolResults = document.getElementById("tool-results");
    toolsPanel.hidden = false;

    if (rejected) {
      toolResults.innerHTML =
        '<article class="tool-card stopped">' +
        '<div class="tool-head"><h3>External actions</h3><span class="badge rejected">Not created</span></div>' +
        "<p>Reject / do not create was selected. Notion and Google Calendar were not prepared.</p>" +
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
              return '<p class="muted">' + escapeHtml(line) + "</p>";
            })
            .join("") +
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
    renderResultHeader(scenario);
    renderStats(scenario.counts);
    document.getElementById("actions").innerHTML = scenario.actions.map(renderActionCard).join("");
    renderApproval(scenario);
    toolsPanel.hidden = true;
    renderFlow(scenario.pathHighlight);
    results.hidden = false;
    results.classList.add("results-enter");
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
    if (!activeScenario) return;
    setResultStatus("Approved · simulated tools prepared", "ok");
    approvalNote.hidden = false;
    approvalNote.textContent = "Approved. Showing simulated Notion and Google Calendar results.";
    document.getElementById("approval-actions").hidden = true;
    renderTools(activeScenario.toolsOnApprove, false);
    toolsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("reject").addEventListener("click", function () {
    if (!activeScenario) return;
    setResultStatus("Rejected · no external actions", "rejected");
    approvalNote.hidden = false;
    approvalNote.textContent = "Rejected. No simulated Notion or Calendar output was prepared.";
    document.getElementById("approval-actions").hidden = true;
    renderTools([], true);
    toolsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  processBtn.addEventListener("click", function () {
    clearTimers();
    formNote.hidden = true;
    runProcessing(function () {
      processor.processNotes(notes.value).then(
        function (scenario) {
          renderResults(scenario);
        },
        function (error) {
          formNote.hidden = false;
          formNote.textContent = error.message || "Unable to process these notes.";
          results.hidden = true;
          processing.hidden = true;
        }
      );
    });
  });

  var demoKey = new URLSearchParams(window.location.search).get("demo");
  if (demoKey) {
    var scenario = processor.getScenario(demoKey);
    var preset = processor.SAMPLES.filter(function (sample) {
      return sample.key === demoKey;
    })[0];
    if (preset) {
      notes.value = preset.text;
      Array.prototype.forEach.call(samples.querySelectorAll(".chip"), function (chip) {
        chip.classList.toggle("active", chip.dataset.key === demoKey);
      });
    }
    if (scenario) renderResults(scenario);
  }
})();
