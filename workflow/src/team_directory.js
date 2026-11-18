/**
 * Team Directory for Meet Flow.
 * Edit TEAM_DIRECTORY before a live calendar test.
 * Replace the example addresses with addresses you control or may use.
 * This function never builds an address from a name.
 */

var TEAM_DIRECTORY = [
  { name: "Alex", role: "Project Team", email: "alex@example.com" },
  { name: "Priya", role: "Project Team", email: "priya@example.com" },
  { name: "Sarah", role: "Project Team", email: "sarah@example.com" },
];

function cleanName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function usableEmail(value) {
  var email = String(value || "").trim();
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) ? email : "";
}

function lookupEmail(name) {
  var key = cleanName(name).toLowerCase();
  if (!key) return "";
  var index;
  for (index = 0; index < TEAM_DIRECTORY.length; index += 1) {
    var entry = TEAM_DIRECTORY[index];
    if (cleanName(entry.name).toLowerCase() === key) return usableEmail(entry.email);
  }
  return "";
}

function copyEvents(events) {
  return (Array.isArray(events) ? events : []).map(function (event) {
    var copy = {};
    Object.keys(event || {}).forEach(function (key) {
      copy[key] = event[key];
    });
    copy.attendee_names = Array.isArray(event && event.attendee_names) ? event.attendee_names.slice() : [];
    return copy;
  });
}

function resolveAttendees(item, events) {
  var source = item && typeof item === "object" ? item : {};
  var schedulable = copyEvents(events);
  var names = [];
  schedulable.forEach(function (event) {
    event.attendee_names.forEach(function (name) {
      var clean = cleanName(name);
      if (clean && names.indexOf(clean) === -1) names.push(clean);
    });
  });

  var found = [];
  var missing = [];
  names.forEach(function (name) {
    var email = lookupEmail(name);
    if (email) found.push({ name: name, email: email });
    else missing.push(name);
  });

  var emailList = found.map(function (person) { return person.email; }).join(", ");
  schedulable.forEach(function (event) {
    if (!event.attendee_names.length || missing.length) {
      event.attendee_email_list = "";
      return;
    }
    var emails = [];
    event.attendee_names.forEach(function (name) {
      var email = lookupEmail(name);
      if (email && emails.indexOf(email) === -1) emails.push(email);
    });
    event.attendee_email_list = emails.join(", ");
  });

  var decision = {};
  Object.keys(source).forEach(function (key) {
    decision[key] = source[key];
  });
  decision.schedulableEvents = schedulable;
  decision.team_directory_names = names;
  decision.resolved_attendees = found.map(function (person) { return person.name; });
  decision.missing_attendee_names = missing;
  decision.attendee_email_list = missing.length ? "" : emailList;

  if (source.route_key === "MEETING" && missing.length) {
    decision.calendar_execution_allowed = "no";
    decision.execution_held = true;
    decision.needs_human_review = true;
    decision.guardrail_applied = "missing_attendee_email";
    decision.hold_reason = "Missing attendee email: " + missing.join(", ") + ". That address is not in the Team Directory, and no address was invented.";
    decision.routing_reason = decision.hold_reason;
    decision.output = decision.hold_reason + " Human review is required before a calendar event. No calendar event was created.";
  } else if (source.route_key === "MEETING" && names.length && source.calendar_execution_allowed === "yes") {
    decision.hold_reason = "";
    var note = "Attendees with a directory email: " + found.map(function (person) { return person.name + " (email found)"; }).join(", ") + ".";
    decision.approvalText = String(source.approvalText || "") + "\n\n" + note + "\nApprove is still required before Google Calendar.";
  }

  return decision;
}

/* N8N_ENTRY */

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TEAM_DIRECTORY: TEAM_DIRECTORY,
    resolveAttendees: resolveAttendees,
  };
}
