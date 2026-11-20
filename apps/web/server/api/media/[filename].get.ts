import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { sendStream, setHeader } from 'h3'
import { getMediaDir } from './upload.post'

const EXT_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'filename') || ''
  const safeName = basename(rawName)
  if (!safeName || safeName !== rawName || !/^[A-Za-z0-9._-]+$/.test(safeName)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid media filename.' })
  }

  const filePath = join(getMediaDir(), safeName)
  let info
  try {
    info = await stat(filePath)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Media not found.' })
  }

  const ext = safeName.slice(safeName.lastIndexOf('.')).toLowerCase()
  const mime = EXT_MIME[ext] || 'application/octet-stream'

  setHeader(event, 'Content-Type', mime)
  setHeader(event, 'Accept-Ranges', 'bytes')
  setHeader(event, 'Cache-Control', 'public, max-age=86400')

  const range = getHeader(event, 'range')
  if (range && info.size > 0) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    if (match) {
      const start = match[1] ? Number.parseInt(match[1], 10) : 0
      const end = match[2] ? Number.parseInt(match[2], 10) : info.size - 1
      if (start <= end && end < info.size) {
        setResponseStatus(event, 206)
        setHeader(event, 'Content-Range', `bytes ${start}-${end}/${info.size}`)
        setHeader(event, 'Content-Length', end - start + 1)
        return sendStream(event, createReadStream(filePath, { start, end }))
      }
    }
  }

  setHeader(event, 'Content-Length', info.size)
  return sendStream(event, createReadStream(filePath))
})