// Automatic safety checks for community posts. A flagged post is HELD (visible only to its author and moderators)
// until a person reviews it. The patterns target the scams Indian students most often meet in groups:
// "agents" selling admissions or visas, payment requests, and moving the conversation to private chats.
export type Flag = { id: string; label: string };

const RULES: { id: string; label: string; re: RegExp }[] = [
  // Phone numbers have 10+ digits; dates like 15.10.2026 (8 digits) or amounts are not flagged.
  { id: "phone", label: "Contains a phone number", re: { test: (t: string) => (t.match(/\+?\d[\d\s()./-]{6,}\d/g) ?? []).some((m) => m.replace(/\D/g, "").length >= 10) } as RegExp },
  { id: "chat-link", label: "Link to a private chat (WhatsApp / Telegram / Instagram)", re: /wa\.me|whatsapp|t\.me\/|telegram|instagram\.com|chat\.whatsapp/i },
  { id: "email", label: "Contains an email address", re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  {
    id: "payment",
    label: "Mentions payment, fees for services or agents",
    re: /\b(upi|paytm|g ?pay|phonepe|western union|bank transfer to me|pay me|paid service|charges?\b|consultan(t|cy)|agent|guaranteed (admission|visa)|100% (admission|visa)|dm me|contact me privately|advance payment|pay\b.{0,25}\b(upfront|in advance)|send (me )?money|money transfer)\b/i,
  },
];

// Links are fine when they point to official or well-known information sources.
const ALLOWED_LINK = /^https?:\/\/([a-z0-9-]+\.)*(daad\.de|uni-assist\.de|aps-india\.de|d-mat\.de|gast\.de|diplo\.de|auswaertiges-amt\.de|gesetze-im-internet\.de|studierendenwerke?\.de|[a-z0-9-]+\.de|gov\.in|nic\.in)(\/|$)/i;

export function checkContent(text: string): Flag[] {
  const flags: Flag[] = RULES.filter((r) => r.re.test(text)).map((r) => ({ id: r.id, label: r.label }));
  const links = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  if (links.some((l) => !ALLOWED_LINK.test(l))) flags.push({ id: "link", label: "Contains a link to a non-official website" });
  return flags;
}

export const AUTO_HIDE_REPORTS = 3;
export const MAX_POSTS_PER_HOUR = 5;
