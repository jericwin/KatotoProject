// Small, explicit validators. Everything the admin saves is rendered as text
// by React (never as HTML), so validation is about shape and length.

export class ValidationError extends Error {
  constructor(errors) {
    super('Please fix the highlighted fields.')
    this.status = 400
    this.errors = errors
  }
}

export function text(value, field, { max = 2000, required = false, errors }) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (typeof value !== 'string' && value !== undefined && value !== null) errors[field] = 'Must be text.'
  else if (required && !v) errors[field] = 'This field is required.'
  else if (v.length > max) errors[field] = `Keep this under ${max} characters.`
  return v
}

const LINK_RE = /^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:\+?[0-9\s-]+)$/i

export function link(value, field, { required = false, errors }) {
  const v = text(value, field, { max: 1000, required, errors })
  if (v && !LINK_RE.test(v)) errors[field] = 'Use a full link starting with https://, mailto:, or tel:.'
  return v
}

export function email(value, field, { errors }) {
  const v = text(value, field, { max: 200, required: true, errors })
  if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[field] = 'Enter a valid email address.'
  return v
}

export function list(value, field, { max = 12, min = 0, errors }, each) {
  if (!Array.isArray(value)) {
    errors[field] = 'Must be a list.'
    return []
  }
  if (value.length > max) errors[field] = `Use at most ${max} items.`
  if (value.length < min) errors[field] = `Add at least ${min} item${min === 1 ? '' : 's'}.`
  return value.slice(0, max).map((item, i) => each(item, `${field}.${i}`))
}

export function done(errors, value) {
  if (Object.keys(errors).length) throw new ValidationError(errors)
  return value
}

export const ids = (value) =>
  Array.isArray(value) && value.length <= 1000 && value.every((n) => Number.isInteger(n) && n > 0) ? value : null
