import crypto from 'node:crypto'

// Argon2id (built into Node ≥ 24.7) with OWASP's recommended minimum:
// 19 MiB memory, 2 passes, 1 lane. Stored format:
//   argon2id$v=19$m=19456,t=2,p=1$saltB64$hashB64
// Older scrypt hashes (scrypt$N$r$p$salt$hash) still verify and are replaced
// with Argon2id at the next successful sign-in (see needsRehash).
const ARGON = { memory: 19456, passes: 2, parallelism: 1, tagLength: 32 }

function argon2id(password, nonce, { memory, passes, parallelism, tagLength }) {
  return new Promise((resolve, reject) => {
    crypto.argon2('argon2id', { message: password, nonce, memory, passes, parallelism, tagLength }, (err, key) =>
      err ? reject(err) : resolve(key),
    )
  })
}

function scrypt(password, salt, n, r, p, keylen) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, { N: n, r, p, maxmem: 256 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    )
  })
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await argon2id(password.normalize('NFKC'), salt, ARGON)
  const params = `m=${ARGON.memory},t=${ARGON.passes},p=${ARGON.parallelism}`
  return ['argon2id', 'v=19', params, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split('$')
  const input = password.normalize('NFKC')
  if (parts.length === 5 && parts[0] === 'argon2id') {
    const params = Object.fromEntries(parts[2].split(',').map((kv) => kv.split('=')))
    const expected = Buffer.from(parts[4], 'base64')
    const key = await argon2id(input, Buffer.from(parts[3], 'base64'), {
      memory: Number(params.m),
      passes: Number(params.t),
      parallelism: Number(params.p),
      tagLength: expected.length,
    })
    return crypto.timingSafeEqual(key, expected)
  }
  if (parts.length === 6 && parts[0] === 'scrypt') {
    const [, n, r, p, saltB64, hashB64] = parts
    const expected = Buffer.from(hashB64, 'base64')
    const key = await scrypt(input, Buffer.from(saltB64, 'base64'), Number(n), Number(r), Number(p), expected.length)
    return crypto.timingSafeEqual(key, expected)
  }
  return false
}

// True when a stored hash uses an older algorithm or weaker settings.
export function needsRehash(stored) {
  const parts = String(stored).split('$')
  return !(parts[0] === 'argon2id' && parts[2] === `m=${ARGON.memory},t=${ARGON.passes},p=${ARGON.parallelism}`)
}

// Used when the username doesn't exist, so a failed lookup costs the same
// time as a wrong password.
let dummyHash = null
export async function burnTime(password) {
  dummyHash ??= await hashPassword('timing-equalizer')
  await verifyPassword(password, dummyHash)
}

export function validateNewPassword(pw, username = '') {
  if (typeof pw !== 'string' || pw.length < 12) return 'Use at least 12 characters.'
  if (pw.length > 200) return 'Use at most 200 characters.'
  if (username && pw.toLowerCase().includes(username.toLowerCase())) return 'The password must not contain the username.'
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length
  if (classes < 3) return 'Mix at least three of: lowercase, uppercase, numbers, symbols.'
  return null
}
