(function () {
  var SAMPLES = [
    {
      label: "Task + Meeting",
      text: "During today's project meeting, Alex agreed to update the project dashboard by November 13, 2026. Alex is responsible for completing the task. We also scheduled a project review meeting on November 17, 2026, from 2:00 PM to 2:30 PM to review the completed dashboard.",
    },
    {
      label: "Task",
      text: "During today's project meeting, Alex agreed to update the project dashboard by November 13, 2026. Alex is responsible for completing this task.",
    },
    {
      label: "Meeting",
      text: "Schedule a project meeting with Alex and Priya on November 17, 2026 from 2:00 PM to 2:30 PM.",
    },
    {
      label: "Follow-up",
      text: "Priya should follow up with the sponsor tomorrow about the project presentation.",
    },
    {
      label: "Unclear",
      text: "The project dashboard needs to be updated. The person responsible and deadline were not decided.",
    },
  ];

  var SCENARIOS = {
    both: {
      summary: {
        points: "The project dashboard and a later review meeting were discussed.",
        decisions: "Alex will update the dashboard. A project review meeting was scheduled.",
        actions: "One task for Notion and one meeting for Google Calendar.",
      },
      actions: [
        {
          title: "Update project dashboard",
          owner: "Alex",
          deadline: "November 13, 2026",
          category: "TASK",
          route: "Project / Task Owner",
          status: "Created in Notion / Demo result",
          tone: "ok",
        },
        {
          title: "Project Review Meeting",
          owner: "Calendar / Meeting Coordinator",
          deadline: "November 17, 2026",
          category: "MEETING",
          route: "Calendar / Meeting Coordinator",
          status: "Created in Google Calendar / Demo result",
          tone: "ok",
        },
      ],
      meeting: {
        title: "Project Review Meeting",
        date: "November 17, 2026",
        time: "2:00 PM–2:30 PM",
      },
      activity: [
        ["Task routed to Project / Task Owner", "Demo"],
        ["Meeting routed to Calendar / Meeting Coordinator", "Demo"],
        ["Approved before external actions", "Demo"],
        ["Task created in Notion", "Demo"],
        ["Event created in Google Calendar", "Demo"],
      ],
    },
    task: {
      summary: {
        points: "The project dashboard needs the latest results.",
        decisions: "Alex will update the project dashboard.",
        actions: "One task, assigned to Alex, due November 13, 2026.",
      },
      actions: [
        {
          title: "Update project dashboard",
          owner: "Alex",
          deadline: "Nov 13",
          category: "TASK",
          route: "Project / Task Owner",
          status: "Created in Notion",
          tone: "ok",
        },
      ],
      activity: [
        ["Task routed to Project / Task Owner", "Demo"],
        ["Task created in Notion", "Demo"],
      ],
    },
    meeting: {
      summary: {
        points: "A project meeting was requested.",
        decisions: "The meeting time was stated in the notes.",
        actions: "One meeting for the calendar coordinator.",
      },
      actions: [
        {
          title: "Project meeting",
          owner: "Calendar / Meeting Coordinator",
          deadline: "Nov 17",
          category: "MEETING",
          route: "Calendar / Meeting Coordinator",
          status: "Awaiting Approval",
          tone: "pending",
        },
      ],
      meeting: {
        title: "Project Meeting",
        date: "November 17, 2026",
        time: "2:00 PM – 2:30 PM",
        people: "Alex and Priya are named in the notes. No guest emails are added.",
      },
      activity: [
        ["Meeting routed to Calendar Coordinator", "Demo"],
        ["Waiting for Human Approval before Google Calendar", "Demo"],
      ],
    },
    follow: {
      summary: {
        points: "The sponsor needs a follow-up about the project presentation.",
        decisions: "No calendar event was requested.",
        actions: "One follow-up for Priya.",
      },
      actions: [
        {
          title: "Follow up with sponsor",
          owner: "Priya",
          deadline: "Tomorrow",
          category: "FOLLOW_UP",
          route: "Communication / Follow-up Owner",
          status: "Routed",
          tone: "pending",
        },
      ],
      activity: [
        ["Follow-up routed to Communication Owner", "Demo"],
        ["No email was sent", "Demo"],
      ],
    },
    unclear: {
      summary: {
        points: "The project dashboard needs an update.",
        decisions: "No owner or deadline was decided.",
        actions: "The action cannot be routed safely.",
      },
      actions: [
        {
          title: "Update project dashboard",
          owner: "Not assigned",
          deadline: "Not decided",
          category: "UNCLEAR",
          route: "Human Reviewer",
          status: "Automatic action stopped",
          tone: "review",
        },
      ],
      review: {
        action: "UNCLEAR / LOW CONFIDENCE",
        issue: "Owner and deadline were not provided.",
        result: "Human Reviewer. Automatic action stopped.",
      },
      activity: [
        ["Action sent for Human Review", "Demo"],
        ["No Notion task, calendar event, or message was created", "Demo"],
      ],
    },
  };

  var notes = document.getElementById("notes");
  var samples = document.getElementById("samples");
  var results = document.getElementById("results");
  var formNote = document.getElementById("form-note");

  document.getElementById("notice").textContent =
    "Demo Mode — workflow results are simulated for the dashboard prototype. This page does not call the AI or n8n.";

  SAMPLES.forEach(function (sample) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = sample.label;
    button.addEventListener("click", function () {
      notes.value = sample.text;
      formNote.hidden = true;
    });
    samples.appendChild(button);
  });

  function choose(text) {
    var notesText = text.toLowerCase();
    if (!notesText.trim()) return "";
    if (notesText.indexOf("not decided") !== -1 || notesText.indexOf("were not") !== -1) return "unclear";
    if (notesText.indexOf("dashboard") !== -1 && notesText.indexOf("alex") !== -1 && notesText.indexOf("november 17") !== -1) return "both";
    if (notesText.indexOf("alex and priya") !== -1 && notesText.indexOf("november 17") !== -1) return "meeting";
    if (notesText.indexOf("follow up") !== -1) return "follow";
    if (notesText.indexOf("dashboard") !== -1 && notesText.indexOf("alex") !== -1) return "task";
    return "unmatched";
  }

  function categoryTone(category) {
    if (category === "FOLLOW_UP") return "follow";
    if (category === "UNCLEAR") return "unclear";
    return category.toLowerCase();
  }

  function badge(text, tone) {
    return '<span class="badge ' + tone + '">' + text + "</span>";
  }

  function render(scenario) {
    var summary = document.getElementById("summary");
    summary.innerHTML = "";
    [
      ["Main Discussion Points", scenario.summary.points],
      ["Key Decisions", scenario.summary.decisions],
      ["Action Items Identified", scenario.summary.actions],
    ].forEach(function (pair) {
      var block = document.createElement("div");
      var heading = document.createElement("h3");
      var copy = document.createElement("p");
      heading.textContent = pair[0];
      copy.textContent = pair[1];
      block.appendChild(heading);
      block.appendChild(copy);
      summary.appendChild(block);
    });

    var actions = document.getElementById("actions");
    actions.innerHTML = "";
    scenario.actions.forEach(function (action) {
      var card = document.createElement("article");
      card.className = "action";
      var title = document.createElement("h3");
      title.textContent = action.title;
      var meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML =
        "<span><strong>Owner</strong> " + action.owner + "</span>" +
        "<span><strong>Deadline</strong> " + action.deadline + "</span>" +
        "<span><strong>Category</strong> " + badge(action.category, categoryTone(action.category)) + "</span>" +
        "<span><strong>Route</strong> " + action.route + "</span>" +
        "<span><strong>Status</strong> " + badge(action.status, action.tone) + "</span>";
      card.appendChild(title);
      card.appendChild(meta);
      actions.appendChild(card);
    });

    var meetingPanel = document.getElementById("meeting-panel");
    var meeting = document.getElementById("meeting");
    meeting.innerHTML = "";
    if (scenario.meeting) {
      meetingPanel.hidden = false;
      var details = document.createElement("div");
      details.className = "meeting";
      var heading = document.createElement("h3");
      heading.textContent = scenario.meeting.title;
      var when = document.createElement("p");
      when.textContent = scenario.meeting.date + " · " + scenario.meeting.time;
      var people = document.createElement("p");
      people.textContent = scenario.meeting.people || "";
      details.appendChild(heading);
      details.appendChild(when);
      if (scenario.meeting.people) details.appendChild(people);
      meeting.appendChild(details);
    } else {
      meetingPanel.hidden = true;
    }

    var reviewPanel = document.getElementById("review-panel");
    var review = document.getElementById("review");
    review.innerHTML = "";
    if (scenario.review) {
      reviewPanel.hidden = false;
      var box = document.createElement("div");
      box.className = "review-box";
      box.innerHTML =
        "<h3>" + scenario.review.action + "</h3>" +
        "<p><strong>Issue.</strong> " + scenario.review.issue + "</p>" +
        "<p><strong>Result.</strong> " + scenario.review.result + "</p>" +
        "<p>Meet Flow does not guess missing information.</p>";
      review.appendChild(box);
    } else {
      reviewPanel.hidden = true;
    }

    var activity = document.getElementById("activity");
    activity.innerHTML = "";
    scenario.activity.forEach(function (item) {
      var row = document.createElement("li");
      var label = document.createElement("span");
      var tag = document.createElement("span");
      label.textContent = item[0];
      tag.className = "badge pending";
      tag.textContent = item[1];
      row.appendChild(label);
      row.appendChild(tag);
      activity.appendChild(row);
    });

    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  var demoKey = new URLSearchParams(window.location.search).get("demo");
  if (demoKey && SCENARIOS[demoKey]) {
    var preset = SAMPLES.filter(function (sample) {
      return choose(sample.text) === demoKey;
    })[0];
    if (preset) notes.value = preset.text;
    render(SCENARIOS[demoKey]);
  }

  document.getElementById("process").addEventListener("click", function () {
    var key = choose(notes.value);
    if (!key) {
      formNote.hidden = false;
      formNote.textContent = "Paste meeting notes, or choose a sample, before processing.";
      results.hidden = true;
      return;
    }
    if (key === "unmatched") {
      formNote.hidden = false;
      formNote.textContent = "Demo Mode does not have a sample for these notes. Choose Task + Meeting, Task, Meeting, Follow-up, or Unclear.";
      results.hidden = true;
      return;
    }
    formNote.hidden = true;
    render(SCENARIOS[key]);
  });
})();
