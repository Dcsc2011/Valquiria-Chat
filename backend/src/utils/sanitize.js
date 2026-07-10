// Sanitização simples de texto para evitar XSS básico em mensagens e perfis.
function sanitizeText(input, maxLength = 2000) {
  if (typeof input !== 'string') return '';
  let text = input.trim().slice(0, maxLength);
  text = text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return text;
}

// Username: apenas letras, números, ponto e underscore.
function sanitizeUsername(input) {
  if (typeof input !== 'string') return '';
  return input.trim().toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 32);
}

function isNonEmptyString(value, maxLength = 500) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

module.exports = { sanitizeText, sanitizeUsername, isNonEmptyString };
