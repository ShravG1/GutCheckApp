// Downscale a picked image to keep IndexedDB small.

const MAX_DIMENSION = 1280
const QUALITY = 0.8

export async function compressImage(file) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('That file is not an image.')
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Could not read that image.')
  })

  let { width, height } = bitmap
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  width = Math.round(width * scale)
  height = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  )
  if (!blob) throw new Error('Could not process that image.')
  return blob
}
