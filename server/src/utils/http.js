export function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function getPagination(query, defaults = {}) {
  const page = Math.max(Number(query.page || defaults.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || defaults.limit || 12), 1), defaults.maxLimit || 50);
  return { page, limit, skip: (page - 1) * limit };
}

export function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeTags(values = []) {
  return [...new Set(values.map((value) => String(value).trim().toLowerCase()).filter(Boolean))];
}

