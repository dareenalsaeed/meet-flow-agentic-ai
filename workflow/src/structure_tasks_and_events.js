/**
 * Track C tool for the Week 3 Meeting Notes Assistant.
 * Parses the final markdown summary into action items and confirmed meetings.
 * It does not read the raw notes and does not fill in missing facts.
 *
 * Supported meeting formats:
 * - Date: YYYY-MM-DD, or a full calendar date such as November 17, 2026
 * - Start and End: HH:MM, or a clock time such as 2:00 PM
 *
 * A weekday by itself, such as Friday, is still not a date.
 * This node does not invent a date or a time, and it does not look up email addresses.
 *
 * event_start and event_end keep that clock time and append America/Phoenix's
 * fixed offset (-07:00). Phoenix does not use daylight saving time.
 * A timezone-less timestamp is not read as Phoenix local time by the Calendar node.
 */

const DEMO_UTC_OFFSET = "-07:00";

const MISSING_TEXT = new Set([
  "",
  "not stated / unclear",
  "not stated",
  "unclear",
  "n/a",
  "na",
  "n.a.",
  "tbd",
  "unknown",
  "someone",
  "somebody",
  "asap",
  "none",
  "nobody",
  "none stated",
  "no owner stated",
  "no deadline stated",
  "soon",
]);

const TENTATIVE_PATTERN =
  /\b(maybe|might|could|tentative|tbd|asap|soon|sometime|someone|somebody|next week|if we have time)\b/i;

function sectionBody(summary, heading) {
  const source = String(summary || "");
  const match = new RegExp("^##\\s+" + heading + "\\s*$", "im").exec(source);
  if (!match) return "";
  const rest = source.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function normalizeSpace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isPlaceholder(value) {
  const key = normalizeSpace(value).toLowerCase().replace(/[.\s]+$/g, "").trim();
  return MISSING_TEXT.has(key);
}

function cleanTask(value) {
  const text = normalizeSpace(value);
  if (!text || isPlaceholder(text)) return null;
  if (/^no action item stated$/i.test(text)) return null;
  return text;
}

function cleanOwnerOrDeadline(value) {
  const text = normalizeSpace(value);
  if (!text || isPlaceholder(text)) return null;
  if (TENTATIVE_PATTERN.test(text)) return null;
  if (/\bor\b/i.test(text)) return null;
  return text;
}

function cleanTitle(value) {
  const text = normalizeSpace(value);
  if (!text || isPlaceholder(text)) return null;
  if (/^no confirmed meeting stated$/i.test(text)) return null;
  return text;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-").map(function (part) {
    return Number(part);
  });
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isClockTime(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function minutes(value) {
  const parts = value.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(value) {
  const text = normalizeSpace(value);
  if (isIsoDate(text)) return text;
  const match = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!month || day < 1 || day > 31) return null;
  const iso = year + "-" + pad2(month) + "-" + pad2(day);
  return isIsoDate(iso) ? iso : null;
}

function toClockTime(value) {
  const text = normalizeSpace(value);
  if (isClockTime(text)) return text;
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (meridiem === "AM") hour = hour === 12 ? 0 : hour;
  else hour = hour === 12 ? 12 : hour + 12;
  const clock = pad2(hour) + ":" + pad2(minute);
  return isClockTime(clock) ? clock : null;
}

function titleFromPhrase(value) {
  const text = normalizeSpace(value).replace(/^(a|an|the)\s+/i, "");
  if (!text || isPlaceholder(text)) return null;
  return text.replace(/\b[a-z]/g, function (letter) {
    return letter.toUpperCase();
  });
}

function parseActionItems(summary) {
  const body = sectionBody(summary, "Action Items");
  const notes = [];
  if (!body) {
    notes.push("The summary has no Action Items section.");
    return { actionItems: [], notes: notes };
  }
  if (/no action item stated/i.test(body) && !/task\s*:/i.test(body)) {
    return { actionItems: [], notes: notes };
  }

  const pattern =
    /(?:^|\n)\s*\d+\.\s*Task:\s*(.+)\s*\n+\s*Owner:\s*(.*)\s*\n+\s*Deadline:\s*(.*)/gi;
  const actionItems = [];
  let match = pattern.exec(body);
  while (match) {
    const task = cleanTask(match[1]);
    if (task) {
      const owner = cleanOwnerOrDeadline(match[2]);
      const deadline = cleanOwnerOrDeadline(match[3]);
      const missing = [];
      if (!owner) missing.push("owner");
      if (!deadline) missing.push("deadline");
      actionItems.push({
        task: task,
        owner: owner,
        deadline: deadline,
        missing_information: missing,
        needs_review: missing.length > 0,
      });
    }
    match = pattern.exec(body);
  }

  if (!actionItems.length && /task\s*:/i.test(body)) {
    notes.push("Action Items text was present but did not match Task / Owner / Deadline.");
  }
  return { actionItems: actionItems, notes: notes };
}

function explicitMeetingFromNotes(notes) {
  const text = normalizeSpace(notes);
  if (!text) return null;
  const withPeople = text.match(
    /\bschedule\s+(?:an?\s+)?(.+?)\s+with\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})\s+from\s+(\d{1,2}(?::\d{2})?\s*[AP]M)\s+to\s+(\d{1,2}(?::\d{2})?\s*[AP]M)\b/i
  );
  const dated = text.match(
    /\bschedule\s+(?:an?\s+)?(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})\s+from\s+(\d{1,2}(?::\d{2})?\s*[AP]M)\s+to\s+(\d{1,2}(?::\d{2})?\s*[AP]M)\b/i
  );
  const match = withPeople || dated;
  if (!match) return null;
  const span = match[0];
  if (TENTATIVE_PATTERN.test(span)) return null;
  const title = titleFromPhrase(withPeople ? match[1] : match[1].replace(/\s+with\s+.+$/i, ""));
  const date = toIsoDate(withPeople ? match[3] : match[2]);
  const start = toClockTime(withPeople ? match[4] : match[3]);
  const end = toClockTime(withPeople ? match[5] : match[4]);
  if (!title || !date || !start || !end || minutes(end) <= minutes(start)) return null;
  return {
    event: {
      event_title: title,
      event_date: date,
      event_time: start,
      event_end_time: end,
      missing_information: [],
      needs_review: false,
    },
    schedulable: {
      event_title: title,
      event_date: date,
      event_time: start,
      event_end_time: end,
      event_start: date + "T" + start + ":00" + DEMO_UTC_OFFSET,
      event_end: date + "T" + end + ":00" + DEMO_UTC_OFFSET,
      missing_information: [],
      needs_review: false,
    },
  };
}

function parseMeetings(summary, originalNotes) {
  const body = sectionBody(summary, "Confirmed Meetings");
  const notes = [];
  const calendarEvents = [];
  const rejectedMeetings = [];
  const schedulableEvents = [];

  const skipBody = !body || (/no confirmed meeting stated/i.test(body) && !/title\s*:/i.test(body));
  if (!body) notes.push("The summary has no Confirmed Meetings section.");

  const pattern =
    /(?:^|\n)\s*\d+\.\s*Title:\s*(.+)\s*\n+\s*Date:\s*(.*)\s*\n+\s*Start:\s*(.*)\s*\n+\s*End:\s*(.*)/gi;
  let match = skipBody ? null : pattern.exec(body);
  while (match) {
    const raw = {
      title: normalizeSpace(match[1]),
      date: normalizeSpace(match[2]),
      start: normalizeSpace(match[3]),
      end: normalizeSpace(match[4]),
    };
    const combined = [raw.title, raw.date, raw.start, raw.end].join(" ");
    if (TENTATIVE_PATTERN.test(combined)) {
      rejectedMeetings.push({
        event_title: cleanTitle(raw.title),
        reason: "Tentative language is not a confirmed meeting.",
      });
      match = pattern.exec(body);
      continue;
    }

    const eventTitle = cleanTitle(raw.title);
    const eventDate = !isPlaceholder(raw.date) ? toIsoDate(raw.date) : null;
    const eventTime = !isPlaceholder(raw.start) ? toClockTime(raw.start) : null;
    let eventEndTime = !isPlaceholder(raw.end) ? toClockTime(raw.end) : null;
    const missing = [];
    if (!eventTitle) missing.push("event_title");
    if (!eventDate) missing.push("event_date");
    if (!eventTime) missing.push("event_time");
    if (!eventEndTime) {
      missing.push("event_end_time");
    } else if (eventTime && minutes(eventEndTime) <= minutes(eventTime)) {
      eventEndTime = null;
      missing.push("event_end_time");
    }

    const event = {
      event_title: eventTitle,
      event_date: eventDate,
      event_time: eventTime,
      event_end_time: eventEndTime,
      missing_information: missing,
      needs_review: missing.length > 0,
    };

    if (eventTitle || eventDate || eventTime || eventEndTime) {
      calendarEvents.push(event);
    } else {
      rejectedMeetings.push({
        event_title: null,
        reason: "The meeting row did not contain a title, date, or time.",
      });
    }

    if (!event.needs_review && eventTitle && eventDate && eventTime && event.event_end_time) {
      schedulableEvents.push({
        event_title: eventTitle,
        event_date: eventDate,
        event_time: eventTime,
        event_end_time: event.event_end_time,
        event_start: eventDate + "T" + eventTime + ":00" + DEMO_UTC_OFFSET,
        event_end: eventDate + "T" + event.event_end_time + ":00" + DEMO_UTC_OFFSET,
        missing_information: [],
        needs_review: false,
      });
    }

    match = pattern.exec(body);
  }

  if (!calendarEvents.length && !rejectedMeetings.length && /title\s*:/i.test(body)) {
    notes.push("Confirmed Meetings text was present but did not match Title / Date / Start / End.");
  }

  const parsed = {
    calendarEvents: calendarEvents,
    rejectedMeetings: rejectedMeetings,
    schedulableEvents: schedulableEvents,
    notes: notes,
  };
  const fromNotes = explicitMeetingFromNotes(originalNotes);
  if (fromNotes && !parsed.schedulableEvents.length) {
    parsed.calendarEvents.push(fromNotes.event);
    parsed.schedulableEvents.push(fromNotes.schedulable);
    parsed.notes.push("A confirmed meeting was read from an explicit date and time in the original notes.");
  }
  return parsed;
}

function lineOrNone(items, formatter) {
  if (!items.length) return "(none)";
  return items
    .map(function (item, index) {
      return index + 1 + ". " + formatter(item);
    })
    .join("\n");
}

function approvalText(result) {
  const heldBack = result.calendarEvents.filter(function (event) {
    return event.needs_review;
  });
  return [
    "Week 2 route: " + (result.route || "unknown"),
    "",
    "Action items proposed for Notion:",
    lineOrNone(result.actionItems, function (item) {
      return (
        item.task +
        " | owner: " +
        (item.owner || "missing") +
        " | deadline: " +
        (item.deadline || "missing") +
        " | needs review: " +
        item.needs_review
      );
    }),
    "",
    "Events that will be created in Google Calendar:",
    lineOrNone(result.schedulableEvents, function (event) {
      return event.event_title + " | " + event.event_date + " | " + event.event_time + "-" + event.event_end_time;
    }),
    "",
    "Confirmed events held back because a date, start, or end is missing:",
    lineOrNone(heldBack, function (event) {
      return (event.event_title || "Untitled") + " | missing: " + event.missing_information.join(", ");
    }),
    "",
    "Tentative rows excluded from calendar events:",
    lineOrNone(result.rejectedMeetings, function (event) {
      return (event.event_title || "Untitled") + " | " + event.reason;
    }),
    "",
    "Approve creates the Notion tasks and the complete calendar events listed above.",
    "Do not create sends nothing to Notion or Google Calendar.",
  ].join("\n");
}

function structureMeeting(source) {
  const summary = String(source.summary || "").trim();
  const actions = parseActionItems(summary);
  const meetings = parseMeetings(summary, source.notes || "");
  const result = {
    output: summary,
    route: source.route || null,
    reviewTrace: source.reviewTrace || null,
    codeNode: "Track C: Structure Tasks and Events",
    demoUtcOffset: DEMO_UTC_OFFSET,
    actionItems: actions.actionItems,
    actionItemCount: actions.actionItems.length,
    calendarEvents: meetings.calendarEvents,
    calendarEventCount: meetings.calendarEvents.length,
    schedulableEvents: meetings.schedulableEvents,
    schedulableEventCount: meetings.schedulableEvents.length,
    rejectedMeetings: meetings.rejectedMeetings,
    parseNotes: actions.notes.concat(meetings.notes),
  };
  result.approvalText = approvalText(result);
  return result;
}

// N8N_ENTRY
const sourceItem = $input.first().json;
if (!sourceItem || typeof sourceItem.output !== "string" || !sourceItem.output.trim()) {
  throw new Error("Track C expected the final meeting summary in the output field.");
}

let originalNotes = "";
try {
  originalNotes = $("When chat message received").first().json.chatInput || "";
} catch (error) {
  originalNotes = "";
}

return [
  {
    json: structureMeeting({
      summary: sourceItem.output,
      notes: originalNotes,
      route: sourceItem.route || null,
      reviewTrace: sourceItem.reviewTrace || null,
    }),
  },
];
