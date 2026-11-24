/** Arquivo .ics (Apple/Google/Outlook) para "Adicionar à agenda" */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

export function buildIcs(ev: { uid: string; title: string; start: string; end: string; location?: string; description?: string; url?: string }) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agendas Pro//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@agendaspro`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(new Date(ev.start))}`,
    `DTEND:${stamp(new Date(ev.end))}`,
    `SUMMARY:${esc(ev.title)}`,
    ev.location ? `LOCATION:${esc(ev.location)}` : "",
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : "",
    ev.url ? `URL:${ev.url}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(ev.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function googleCalendarLink(ev: { title: string; start: string; end: string; location?: string; description?: string }) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${stamp(new Date(ev.start))}/${stamp(new Date(ev.end))}`,
    ...(ev.location ? { location: ev.location } : {}),
    ...(ev.description ? { details: ev.description } : {}),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
