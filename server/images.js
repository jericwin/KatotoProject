import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { config } from './config.js'

const FULL_MAX = 1800
const THUMB_MAX = 640

// Decodes the upload with sharp (rejecting anything that isn't a real image),
// auto-rotates it, strips all metadata (EXIF, GPS), and writes two WebP files
// under random names.
export async function storeImage(buffer) {
  let meta
  try {
    meta = await sharp(buffer, { failOn: 'error' }).metadata()
  } catch {
    throw Object.assign(new Error('That file is not a supported image.'), { status: 400 })
  }
  if (!['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff'].includes(meta.format)) {
    throw Object.assign(new Error('Use a JPEG, PNG, or WebP image.'), { status: 400 })
  }
  if ((meta.width || 0) * (meta.height || 0) > 60_000_000) {
    throw Object.assign(new Error('That image is too large.'), { status: 400 })
  }

  const id = crypto.randomBytes(12).toString('hex')
  const file = `${id}.webp`
  const thumb = `${id}-thumb.webp`
  const base = sharp(buffer, { failOn: 'error' }).rotate()

  const full = await base
    .clone()
    .resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
  await fs.writeFile(path.join(config.uploadsDir, file), full.data)
  await base
    .clone()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(config.uploadsDir, thumb))

  return { file, thumb, width: full.info.width, height: full.info.height }
}

export async function removeImageFiles(photo) {
  for (const name of [photo.file, photo.thumb]) {
    // Names are generated server-side; basename() is a belt-and-braces guard.
    await fs.rm(path.join(config.uploadsDir, path.basename(name)), { force: true })
  }
}

export const publicUrl = (name) => `/uploads/${name}`
