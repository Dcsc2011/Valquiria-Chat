// Insígnias disponíveis no sistema. Mantém sincronizado com o frontend
// (frontend/src/components/Badge.tsx).
const VALID_BADGES = ['verified', 'developer', 'founder', 'early_supporter', 'translator'];

function sanitizeBadges(input) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((b) => VALID_BADGES.includes(b)))];
}

module.exports = { VALID_BADGES, sanitizeBadges };
