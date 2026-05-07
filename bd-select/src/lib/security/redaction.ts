const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{16,}/g,
  /Bearer\s+[a-zA-Z0-9._-]+/g,
  /password\s*[:=]\s*[^,\s]+/gi,
  /api[_-]?key\s*[:=]\s*[^,\s]+/gi,
  /secret\s*[:=]\s*[^,\s]+/gi,
];

const MARKETPLACE_PII_PATTERNS = [
  /(?:\+?234|0)[789][01]\d{8}\b/g,
  /\b(?:whatsapp|wa\.me|t\.me|telegram)\b[^\s]*/gi,
  /\b(?:https?:\/\/|www\.)[^\s]+/gi,
  /(?:^|\s)@[a-zA-Z0-9._]{3,30}\b/g,
];

export function redactSensitiveText(value: string) {
  return SECRET_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, "[redacted]"),
    value,
  );
}

export function redactMarketplacePii(value: string) {
  return MARKETPLACE_PII_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, " [redacted-contact]"),
    redactSensitiveText(value),
  )
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function hasMarketplacePii(value: string) {
  return MARKETPLACE_PII_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}
