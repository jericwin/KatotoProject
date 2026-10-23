// Versions and shared wording for the privacy pages, consent controls and
// privacy requests. Plain data so the server can import it too. When the
// wording of a consent changes, change its version so new consents are
// recorded against the new text.

export const POLICY_UPDATED = 'October 23, 2026'

export const CONTACT_CONSENT_VERSION = 'contact-2026-10-23'
export const CONTACT_CONSENT_TEXT =
  'I agree that Katoto Project may use my name, email address, and message to reply to me, as explained in the Privacy Policy.'

// Bump to ask every visitor again (e.g. when a new optional category is added).
export const PRIVACY_CHOICES_VERSION = 1

export const PRIVACY_REQUEST_TYPES = [
  { id: 'deletion', label: 'Delete my information' },
  { id: 'access', label: 'Get a copy of my information' },
  { id: 'correction', label: 'Correct my information' },
  { id: 'photo', label: 'Remove a photo of me or my child' },
  { id: 'other', label: 'Another privacy question' },
]
