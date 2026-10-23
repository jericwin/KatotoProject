// Scans the project (source, docs, built files) for secrets. Never prints a
// secret: only the file, line, and which rule matched.
//   npm run security:secrets        (exit code 1 if anything is found)
//
// Two kinds of checks:
// 1. Exact values of secret settings in .env (passwords, keys, tokens) found
//    anywhere else, e.g. copied into code, docs, or the browser bundle.
// 2. Common secret patterns (private keys, API keys, hard-coded passwords).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKIP_DIRS = new Set(['node_modules', 'server-data', '.git'])
const SKIP_FILES = new Set(['.env', 'package-lock.json'])
const BINARY = /\.(png|jpe?g|webp|gif|ico|pdf|woff2?|ttf|db|zip)$/i

// Settings whose values are secrets (names only; values are read, never shown).
const SECRET_NAME = /(PASS|PASSWORD|SECRET|TOKEN|API_?KEY|PRIVATE)/i
function secretValues() {
  const file = path.join(root, '.env')
  if (!fs.existsSync(file)) return []
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter((m) => m && SECRET_NAME.test(m[1]))
    .map((m) => ({ name: m[1], value: m[2].replace(/^["']|["']$/g, '').trim() }))
    .filter((s) => s.value.length >= 8)
    .flatMap((s) => [s, { name: s.name, value: s.value.replace(/\s+/g, '') }])
}

const PATTERNS = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['Slack token', /\bxox[abposr]-[A-Za-z0-9-]{10,}/],
  ['Stripe secret key', /\bsk_live_[A-Za-z0-9]{20,}/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['connection string with password', /\b(postgres|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s@/]+@/i],
  // NAME=value assignments of secret settings outside .env (placeholders and
  // shell variable expansions such as "$VAR" allowed).
  ['secret assigned in a config file', /^\s*[A-Z0-9_]*(PASS|PASSWORD|SECRET|TOKEN|API_?KEY)[A-Z0-9_]*\s*=\s*["']?[^\s"'<#$]{6,}/],
]

function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* files(path.join(dir, entry.name))
    } else if (!SKIP_FILES.has(entry.name) && !BINARY.test(entry.name)) {
      yield path.join(dir, entry.name)
    }
  }
}

const secrets = secretValues()
const findings = []
let scanned = 0
for (const file of files(root)) {
  const rel = path.relative(root, file).replaceAll('\\', '/')
  if (rel === 'scripts/scan-secrets.js') continue
  scanned += 1
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    for (const s of secrets) if (line.includes(s.value)) findings.push(`${rel}:${i + 1}  value of ${s.name} from .env`)
    for (const [rule, re] of PATTERNS) if (re.test(line)) findings.push(`${rel}:${i + 1}  ${rule}`)
  })
}

// .env must never be published with the site or committed.
const gitignore = fs.existsSync(path.join(root, '.gitignore')) ? fs.readFileSync(path.join(root, '.gitignore'), 'utf8') : ''
if (!/^\.env$/m.test(gitignore)) findings.push('.gitignore  does not exclude .env')
if (fs.existsSync(path.join(root, 'dist', '.env'))) findings.push('dist/.env  environment file inside the built site')

console.log(`Scanned ${scanned} files for ${secrets.length / 2} secret setting value(s) from .env and ${PATTERNS.length} patterns.`)
const unique = [...new Set(findings)]
if (unique.length) {
  console.log(`\n${unique.length} finding(s):`)
  for (const f of unique) console.log(`  ${f}`)
  process.exit(1)
}
console.log('No secrets found.')
