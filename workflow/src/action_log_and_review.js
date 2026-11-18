/**
 * Action-log fields and the human-review decision for Meet Flow.
 * The decision can change the route. It cannot authorize Notion or
 * Google Calendar by itself.
 */

var REVIEW_OWNERS = {
  TASK: "Project / Task Owner",
  MEETING: "Calendar / Meeting Coordinator",
  FOLLOW_UP: "Communication / Follow-up Owner",
  UNCLEAR: "Human Reviewer",
};

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function firstTask(item) {
  var items = item && Array.isArray(item.actionItems) ? item.actionItems : [];
  var index;
  for (index = 0; index < items.length; index += 1) {
    if (items[index] && cleanText(items[index].task)) return items[index];
  }
  return null;
}

function readyTaskCount(item) {
  var items = item && Array.isArray(item.actionItems) ? item.actionItems : [];
  var count = 0;
  items.forEach(function (task) {
    if (task && cleanText(task.task) && task.needs_review !== true) count += 1;
  });
  return count;
}

function schedulableCount(item) {
  var count = Number(item && item.schedulableEventCount);
  if (!isFinite(count) || count < 0) return 0;
  return count;
}

function shortAction(item) {
  var task = firstTask(item);
  if (task) return cleanText(task.task);
  var notes = cleanText(item && item.original_notes);
  if (!notes) return "Meeting action";
  if (notes.length <= 120) return notes;
  return notes.slice(0, 117) + "...";
}

function assignedPerson(item) {
  var task = firstTask(item);
  var owner = task ? cleanText(task.owner) : "";
  return owner || "Not assigned";
}

function deadlineText(item) {
  var task = firstTask(item);
  return task ? cleanText(task.deadline) : "";
}

function missingText(item) {
  var parts = [];
  var task = firstTask(item);
  if (task && Array.isArray(task.missing_information)) {
    task.missing_information.forEach(function (part) {
      var text = cleanText(part);
      if (text) parts.push(text);
    });
  }
  if (item && item.hold_reason) parts.push(cleanText(item.hold_reason));
  return parts.join("; ");
}

function displayOrBlank(value) {
  var text = cleanText(value);
  return text || "Not available";
}

function buildActionRecord(item) {
  var source = item || {};
  var now = new Date().toISOString();
  var routeKey = cleanText(source.route_key) || "HUMAN_REVIEW";
  var status = "NEEDS_REVIEW";
  var externalStatus = "not_started";
  if (routeKey === "HUMAN_REVIEW") {
    status = "NEEDS_REVIEW";
    externalStatus = "not_started";
  } else if (routeKey === "MEETING" && source.calendar_execution_allowed === "yes") {
    status = "AWAITING_APPROVAL";
    externalStatus = "pending_approval";
  } else if (routeKey === "MEETING") {
    status = "ROUTED";
    externalStatus = "held_missing_datetime";
  } else if (routeKey === "TASK") {
    status = "ROUTED";
    externalStatus = "pending_approval";
  } else if (routeKey === "FOLLOW_UP") {
    status = "ROUTED";
    externalStatus = "queued_for_person";
  }

  var record = {
    action_id: source.action_id || "",
    created_at: source.created_at || now,
    original_request: cleanText(source.original_notes),
    action: shortAction(source),
    category: cleanText(source.category) || "UNCLEAR",
    ai_suggested_category: cleanText(source.model_category) || cleanText(source.category) || "UNCLEAR",
    route_owner: cleanText(source.route_owner) || REVIEW_OWNERS.UNCLEAR,
    assigned_person: assignedPerson(source),
    deadline: deadlineText(source),
    confidence: source.confidence === null || source.confidence === undefined ? "" : String(source.confidence),
    routing_reason: cleanText(source.routing_reason),
    missing_information: missingText(source),
    needs_review: routeKey === "HUMAN_REVIEW" ? "true" : "false",
    review_reason: routeKey === "HUMAN_REVIEW" ? cleanText(source.escalation_message || source.routing_reason) : "",
    status: status,
    human_decision: "",
    final_category: "",
    external_action: "none",
    external_action_status: externalStatus,
    updated_at: now,
  };
  return record;
}

function reviewFormText(item, record) {
  return [
    "Human review asks: what should happen to this item?",
    "It does not approve a Notion task or a Google Calendar event.",
    "",
    "Original request: " + displayOrBlank(record.original_request),
    "Action: " + displayOrBlank(record.action),
    "AI suggested category: " + displayOrBlank(record.ai_suggested_category),
    "Category after the routing check: " + displayOrBlank(record.category),
    "AI confidence: " + displayOrBlank(record.confidence),
    "Routing reason: " + displayOrBlank(record.routing_reason),
    "Route owner: " + displayOrBlank(record.route_owner),
    "Assigned person: " + displayOrBlank(record.assigned_person),
    "Deadline: " + displayOrBlank(record.deadline),
    "Date and time: " + (schedulableCount(item) > 0 ? "A complete calendar slot is already in the validated events." : "Not available"),
    "Missing information: " + displayOrBlank(record.missing_information),
    "Reason human review is required: " + displayOrBlank(record.review_reason),
    "Current status: NEEDS_REVIEW",
    "",
    "Route as Task, Route as Meeting, or Route as Follow-up sends the item back to that queue.",
    "Existing validation still applies. Human Approval is still required before Notion or Google Calendar.",
    "Reject / Stop ends the item with no external action.",
  ].join("\n");
}

function buildReviewPacket(item) {
  var source = Object.assign({}, item || {});
  if (!source.action_id) source.action_id = "MF-review-" + Date.now().toString(36);
  var record = buildActionRecord(source);
  record.status = "NEEDS_REVIEW";
  record.needs_review = "true";
  record.review_reason = cleanText(source.escalation_message || source.routing_reason) || "Human review is required before action.";
  record.external_action = "none";
  record.external_action_status = "not_started";
  var merged = Object.assign({}, source, record, {
    output: record.review_reason + " Status is NEEDS_REVIEW. No Notion task was created. No calendar event was created. No message was sent.",
    queue_name: "Human Review - Unclear or Low Confidence",
    queue_owner: "Human Reviewer",
    next_action: "Wait for the human review form. Do not call Notion or Google Calendar.",
    notionCreated: false,
    calendarCreated: false,
    email_sent: false,
    notion_execution_allowed: "no",
    calendar_execution_allowed: "no",
    route_key: "HUMAN_REVIEW",
    status: "NEEDS_REVIEW",
  });
  merged.review_form_text = reviewFormText(source, record);
  return merged;
}

function normalizeChoice(choice) {
  var key = cleanText(choice).toLowerCase();
  if (key === "route as task") return "task_queue";
  if (key === "route as meeting") return "meeting_queue";
  if (key === "route as follow-up" || key === "route as follow_up") return "follow_queue";
  if (key === "reject / stop" || key === "reject") return "reject";
  return "reject";
}

function applyHumanReviewDecision(packet, choice) {
  var source = packet || {};
  var selected = cleanText(choice) || "Reject / Stop";
  var reviewRoute = normalizeChoice(selected);
  var now = new Date().toISOString();
  var finalCategory = "UNCLEAR";
  var routeKey = "REJECT";
  var notion = "no";
  var calendar = "no";
  var status = "REJECTED";
  var owner = REVIEW_OWNERS.UNCLEAR;
  var output = "Rejected by the human reviewer. No Notion task, calendar event, or message was created.";
  var externalStatus = "not_created";

  if (reviewRoute === "task_queue") {
    finalCategory = "TASK";
    owner = REVIEW_OWNERS.TASK;
    if (readyTaskCount(source) > 0) {
      routeKey = "TASK";
      notion = "yes";
      status = "AWAITING_APPROVAL";
      externalStatus = "pending_approval";
      output = "Human review corrected this item to TASK. It returns to the Project Task Queue. Human Approval is still required before Notion.";
    } else {
      reviewRoute = "blocked";
      routeKey = "TASK";
      notion = "no";
      status = "NEEDS_REVIEW";
      externalStatus = "blocked_by_validation";
      output = "Human review selected TASK, but Week 3 validation did not find a complete task. Notion was not called.";
    }
  } else if (reviewRoute === "meeting_queue") {
    finalCategory = "MEETING";
    owner = REVIEW_OWNERS.MEETING;
    routeKey = "MEETING";
    if (schedulableCount(source) > 0) {
      calendar = "yes";
      status = "AWAITING_APPROVAL";
      externalStatus = "pending_approval";
      output = "Human review corrected this item to MEETING. It returns to the Calendar Coordinator Queue. Human Approval is still required before Google Calendar.";
    } else {
      calendar = "no";
      status = "ROUTED";
      externalStatus = "held_missing_datetime";
      output = "Human review corrected this item to MEETING. The calendar queue will hold it because an exact date and time are still missing. No date was invented. Google Calendar was not called.";
    }
  } else if (reviewRoute === "follow_queue") {
    finalCategory = "FOLLOW_UP";
    owner = REVIEW_OWNERS.FOLLOW_UP;
    routeKey = "FOLLOW_UP";
    status = "ROUTED";
    externalStatus = "queued_for_person";
    output = "Human review corrected this item to FOLLOW_UP. It is queued for the Communication / Follow-up Owner. No email was sent.";
  }

  if (notion === "yes" && finalCategory !== "TASK") notion = "no";
  if (calendar === "yes" && finalCategory !== "MEETING") calendar = "no";
  if (reviewRoute === "reject" || reviewRoute === "blocked") {
    notion = "no";
    calendar = "no";
  }

  var approvalText = [
    "Human review decision: " + selected,
    "Final category: " + finalCategory,
    "",
    "This next form is Human Approval. It is separate from Human Review.",
    "Approve is still required before Notion or Google Calendar.",
    "Do not create sends nothing to either service.",
    "",
    String(source.approvalText || ""),
  ].join("\n");

  return Object.assign({}, source, {
    output: output,
    human_decision: selected,
    final_category: finalCategory,
    category: finalCategory,
    route_key: routeKey,
    route_owner: owner,
    review_route: reviewRoute,
    notion_execution_allowed: notion,
    calendar_execution_allowed: calendar,
    status: status,
    needs_review: "false",
    external_action: "none",
    external_action_status: externalStatus,
    notionCreated: false,
    calendarCreated: false,
    email_sent: false,
    updated_at: now,
    approvalText: approvalText,
    queue_name: "",
    next_action: output,
  });
}

/* N8N_ENTRY */

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    buildActionRecord: buildActionRecord,
    buildReviewPacket: buildReviewPacket,
    applyHumanReviewDecision: applyHumanReviewDecision,
  };
}
