import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { config } from './config.js'

// Freedom of Information attachments. The type is decided from the file's
// contents, never from its name or the browser-supplied MIME type.
const OFFICE = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
const IMAGE_MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const IMAGE_EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' }

export const ACCEPTED_DOCUMENTS = 'PDF, JPEG, PNG, WebP, Word (.docx) or Excel (.xlsx)'
const reject = () =>
  Object.assign(new Error(`This file type isn’t supported. Use a ${ACCEPTED_DOCUMENTS} file.`), { status: 400 })

async function inspect(buffer, originalName) {
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return { ext: 'pdf', mime: 'application/pdf', data: buffer }

  const ext = path.extname(originalName || '').toLowerCase()
  if (OFFICE[ext]) {
    // Office files are ZIP packages with a [Content_Types].xml entry.
    const isZip = buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    if (isZip && buffer.includes('[Content_Types].xml')) return { ext: ext.slice(1), mime: OFFICE[ext], data: buffer }
    throw reject()
  }

  let meta
  try {
    meta = await sharp(buffer).metadata()
  } catch {
    throw reject()
  }
  if (!IMAGE_MIME[meta.format]) throw reject()
  // Re-encode to drop EXIF/GPS metadata, keeping scans legible.
  const data = await sharp(buffer)
    .rotate()
    .resize({ width: 4000, height: 4000, fit: 'inside', withoutEnlargement: true })
    .toFormat(meta.format, { quality: 90 })
    .toBuffer()
  return { ext: IMAGE_EXT[meta.format], mime: IMAGE_MIME[meta.format], data }
}

// Keeps a readable download name without path parts or control characters.
function cleanName(name, ext) {
  const base = path
    .basename(String(name || 'document'))
    .replace(/\.[^.]+$/, '')
    .replace(/[^\p{L}\p{N} ._()&,-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
  return `${base || 'document'}.${ext}`
}

export async function storeDocument(upload) {
  const { ext, mime, data } = await inspect(upload.buffer, upload.originalname)
  const file = `${crypto.randomBytes(12).toString('hex')}.${ext}`
  await fs.writeFile(path.join(config.documentsDir, file), data)
  return { file, fileName: cleanName(upload.originalname, ext), fileType: mime, fileSize: data.length }
}

export async function removeDocument(file) {
  if (file) await fs.rm(path.join(config.documentsDir, path.basename(file)), { force: true })
}

export const documentPath = (file) => path.join(config.documentsDir, path.basename(file))
// PDFs and images open in the browser; Office files download.
export const opensInline = (mime) => mime === 'application/pdf' || mime.startsWith('image/')
