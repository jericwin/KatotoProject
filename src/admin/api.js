// Thin fetch wrapper for the admin API. Auth lives in an HttpOnly cookie the
// browser sends automatically; nothing secret is kept in JS or web storage.
export class ApiError extends Error {
  constructor(message, { status, errors, code } = {}) {
    super(message)
    this.status = status
    this.errors = errors || {}
    this.code = code
  }
}

const listeners = new Set()
// Lets the app react globally to a lost session or a required password change.
export const onAuthProblem = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { 'X-Requested-With': 'katoto-admin' }
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  let res
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, credentials: 'same-origin' })
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', { status: 0 })
  }
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await res.json() : {}

  if (!isJson && res.ok) {
    throw new ApiError('The server returned an unexpected non-JSON response. The API backend may not be responding.', { status: res.status })
  }

  if (!res.ok) {
    const err = new ApiError(data.error || `Request failed (${res.status}).`, { status: res.status, errors: data.errors, code: data.code })
    if (res.status === 401 || data.code === 'PASSWORD_CHANGE_REQUIRED') listeners.forEach((fn) => fn(err))
    throw err
  }
  return data
}
