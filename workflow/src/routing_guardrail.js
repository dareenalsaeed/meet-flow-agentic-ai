/**
 * Week 4 routing guardrail for Meet Flow.
 * The classifier proposes a category. This function decides the route.
 * It does not invent an owner, deadline, date, or time.
 */

var ROUTE_OWNERS = {
  TASK: "Project / Task Owner",
  MEETING: "Calendar / Meeting Coordinator",
  FOLLOW_UP: "Communication / Follow-up Owner",
  UNCLEAR: "Human Reviewer",
};

var CONFIDENCE_THRESHOLD = 0.75;

function normalizeCategory(value) {
  if (typeof value !== "string") return null;
  var key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (key === "TASK" || key === "MEETING" || key === "FOLLOW_UP" || key === "UNCLEAR") {
    return key;
  }
  return null;
}

function parseConfidence(value) {
  var number = null;
  if (typeof value === "number") number = value;
  else if (typeof value === "string" && value.trim() !== "") number = Number(value.trim());
  else return null;
  if (!isFinite(number)) return null;
  if (number > 1 && number <= 100) number = number / 100;
  if (number < 0 || number > 1) return null;
  return Math.round(number * 1000) / 1000;
}

function unwrapClassifier(value, depth) {
  if (depth > 5 || value == null) return null;
  if (typeof value === "string") {
    var trimmed = value.trim();
    if (!trimmed) return null;
    var fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    var raw = fenced ? fenced[1].trim() : trimmed;
    try {
      return unwrapClassifier(JSON.parse(raw), depth + 1);
    } catch (error) {
      return null;
    }
  }
  if (typeof value !== "object" || Array.isArray(value)) return null;
  if (Object.prototype.hasOwnProperty.call(value, "category")) return value;
  if (Object.prototype.hasOwnProperty.call(value, "output")) {
    var nested = unwrapClassifier(value.output, depth + 1);
    if (nested) return nested;
  }
  if (Object.prototype.hasOwnProperty.call(value, "text")) {
    var nestedText = unwrapClassifier(value.text, depth + 1);
    if (nestedText) return nestedText;
  }
  return null;
}

function authorizationHold(notes) {
  var text = String(notes || "");
  var named = text.match(/\bconfirm with\s+([A-Za-z]+)/i);
  if (named) {
    return "Confirmation from " + named[1] + " is required before action.";
  }
  if (/\b(let'?s confirm|confirm first|needs to confirm|need to confirm)\b/i.test(text)) {
    return "Confirmation is required before action.";
  }
  if (/\b(we may need|may need to|might need to|not yet authorized|not authorized|someone should)\b/i.test(text)) {
    return "The notes do not authorize this action. Human review is required before action.";
  }
  return null;
}

function hasFollowUpLanguage(notes) {
  return /\b(follow[\s-]?up|e-mail|emails?)\b/i.test(String(notes || ""));
}

function hasScheduleRequest(notes) {
  var text = String(notes || "");
  return /\bschedule\b/i.test(text) && /\bmeeting\b/i.test(text);
}

function readyTaskCount(track) {
  var items = track && Array.isArray(track.actionItems) ? track.actionItems : [];
  var count = 0;
  items.forEach(function (item) {
    if (item && item.task && item.needs_review !== true) count += 1;
  });
  return count;
}

function applyRoutingGuardrail(modelPayload, track, notes) {
  var source = track && typeof track === "object" ? track : {};
  var parsed = unwrapClassifier(modelPayload, 0) || {};
  var modelCategory = normalizeCategory(parsed.category);
  var modelConfidence = parseConfidence(parsed.confidence);
  var modelReason = typeof parsed.routing_reason === "string" ? parsed.routing_reason.trim() : "";
  var modelOwner = typeof parsed.route_owner === "string" ? parsed.route_owner.trim() : "";
  var originalNotes = String(notes || "").trim();

  var category = modelCategory || "UNCLEAR";
  var confidence = modelConfidence === null ? 0 : modelConfidence;
  var guardrail = "none";
  var escalation = "";
  var correction = "";
  var holdReason = "";
  var authMessage = authorizationHold(originalNotes);

  if (!originalNotes) {
    category = "UNCLEAR";
    confidence = 0;
    guardrail = "missing_notes";
    escalation = "No meeting notes were found. Human review is required before action.";
  } else if (authMessage) {
    category = "UNCLEAR";
    guardrail = "confirmation_required";
    escalation = authMessage;
  } else if (!modelCategory || modelConfidence === null) {
    category = "UNCLEAR";
    confidence = 0;
    guardrail = "invalid_classifier_output";
    escalation = "The classifier did not return a usable category and confidence. Human review is required before action.";
  } else if (modelCategory === "UNCLEAR" || !(confidence >= CONFIDENCE_THRESHOLD)) {
    category = "UNCLEAR";
    guardrail = modelCategory === "UNCLEAR" ? "unclear_category" : "low_confidence";
    escalation = modelCategory === "UNCLEAR"
      ? "The category is unclear. Human review is required before action."
      : "Confidence is below 0.75, so the item was sent to human review before any external action.";
  } else if (hasFollowUpLanguage(originalNotes) && !hasScheduleRequest(originalNotes) && category !== "FOLLOW_UP") {
    category = "FOLLOW_UP";
    guardrail = "follow_up_language";
    correction = "The notes describe a communication follow-up, so the item was kept out of Notion and Google Calendar.";
  } else if (hasScheduleRequest(originalNotes) && !hasFollowUpLanguage(originalNotes) && category !== "MEETING") {
    category = "MEETING";
    guardrail = "meeting_language";
    correction = "The notes ask to schedule a meeting, so the item was sent to the calendar queue.";
  }

  var routeKey = "HUMAN_REVIEW";
  var notionAllowed = "no";
  var calendarAllowed = "no";
  var executionHeld = false;
  var schedulableCount = Number(source.schedulableEventCount || 0);
  if (!isFinite(schedulableCount) || schedulableCount < 0) schedulableCount = 0;

  if (escalation) {
    category = "UNCLEAR";
    routeKey = "HUMAN_REVIEW";
  } else if (category === "TASK") {
    if (readyTaskCount(source) > 0) {
      routeKey = "TASK";
      notionAllowed = "yes";
    } else {
      category = "UNCLEAR";
      routeKey = "HUMAN_REVIEW";
      guardrail = "week3_validation";
      escalation = "Week 3 validation did not find a complete task. Human review is required before action.";
    }
  } else if (category === "MEETING") {
    routeKey = "MEETING";
    if (schedulableCount > 0) {
      calendarAllowed = "yes";
    } else {
      executionHeld = true;
      holdReason = "The meeting route is correct, but the notes do not contain a YYYY-MM-DD date and 24-hour start and end times. No date or time was invented. Google Calendar was not called.";
      if (guardrail === "none" || guardrail === "meeting_language") {
        guardrail = "meeting_details_missing";
      }
    }
  } else if (category === "FOLLOW_UP") {
    routeKey = "FOLLOW_UP";
  } else {
    category = "UNCLEAR";
    routeKey = "HUMAN_REVIEW";
    guardrail = "unclear_category";
    escalation = "The route could not be determined. Human review is required before action.";
  }

  if (notionAllowed === "yes" && routeKey !== "TASK") notionAllowed = "no";
  if (calendarAllowed === "yes" && routeKey !== "MEETING") calendarAllowed = "no";

  var routingReason = modelReason || "Routed from the meeting notes.";
  if (escalation) routingReason = escalation;
  else if (holdReason) routingReason = holdReason;
  else if (correction) routingReason = correction;

  var needsHumanReview = routeKey === "HUMAN_REVIEW" || executionHeld;

  var decision = {
    output: "",
    category: category,
    route_owner: ROUTE_OWNERS[category],
    confidence: confidence,
    routing_reason: routingReason,
    needs_human_review: needsHumanReview,
    route_key: routeKey,
    guardrail_applied: guardrail,
    escalation_message: escalation,
    hold_reason: holdReason,
    route_correction: correction,
    notion_execution_allowed: notionAllowed,
    calendar_execution_allowed: calendarAllowed,
    execution_held: executionHeld,
    email_sent: false,
    external_action: "none",
    original_notes: originalNotes,
    model_category: modelCategory,
    model_confidence: modelConfidence,
    model_route_owner: modelOwner,
    model_routing_reason: modelReason,
    model_needs_human_review: parsed.needs_human_review === true,
    actionItems: Array.isArray(source.actionItems) ? source.actionItems : [],
    actionItemCount: Number(source.actionItemCount || 0),
    schedulableEventCount: schedulableCount,
    week2_route: source.route || null,
  };

  decision.output = [
    decision.category,
    "→",
    decision.route_owner,
    "(" + decision.route_key + ", confidence " + decision.confidence + ").",
    decision.routing_reason,
  ].join(" ");

  decision.approvalText = [
    "Week 4 category: " + decision.category,
    "Route owner: " + decision.route_owner,
    "Confidence: " + decision.confidence,
    "Routing reason: " + decision.routing_reason,
    "",
    String(source.approvalText || ""),
  ].join("\n");

  return decision;
}

/* N8N_ENTRY */

if (typeof module !== "undefined" && module.exports) {
  module.exports = { applyRoutingGuardrail: applyRoutingGuardrail };
}
