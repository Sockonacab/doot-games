import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ALLOWED_TYPES: Record<string, { ext: string; maxBytes: number }> = {
  'video/mp4': { ext: 'mp4', maxBytes: 250 * 1024 * 1024 },
  'video/webm': { ext: 'webm', maxBytes: 250 * 1024 * 1024 },
  'audio/mpeg': { ext: 'mp3', maxBytes: 50 * 1024 * 1024 },
  'audio/mp3': { ext: 'mp3', maxBytes: 50 * 1024 * 1024 },
  'audio/ogg': { ext: 'ogg', maxBytes: 50 * 1024 * 1024 },
  'audio/wav': { ext: 'wav', maxBytes: 50 * 1024 * 1024 },
  'image/png': { ext: 'png', maxBytes: 15 * 1024 * 1024 },
  'image/jpeg': { ext: 'jpg', maxBytes: 15 * 1024 * 1024 },
  'image/webp': { ext: 'webp', maxBytes: 15 * 1024 * 1024 },
  'image/gif': { ext: 'gif', maxBytes: 15 * 1024 * 1024 },
}

export function getMediaDir(): string {
  return process.env.MEDIA_DIR || join(process.cwd(), '.data', 'media')
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const form = await readMultipartFormData(event)
  const filePart = form?.find((part) => part.name === 'file' && part.data?.length)

  if (!filePart || !filePart.type) {
    throw createError({ statusCode: 400, statusMessage: 'Missing media file.' })
  }

  const rule = ALLOWED_TYPES[filePart.type]
  if (!rule) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported media type: ${filePart.type}` })
  }

  if (filePart.data.length > rule.maxBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: `File too large (max ${Math.round(rule.maxBytes / (1024 * 1024))} MB).`,
    })
  }

  const hash = createHash('sha256').update(filePart.data).digest('hex').slice(0, 16)
  const filename = `${user.id}-${hash}.${rule.ext}`
  const dir = getMediaDir()

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), filePart.data)

  return {
    url: `/api/media/${filename}`,
    filename,
    contentType: filePart.type,
    size: filePart.data.length,
  }
})