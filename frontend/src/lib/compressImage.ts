const MAX_EDGE = 1600
const TARGET_BYTES = 700 * 1024

export async function compressKycFile(file: File): Promise<File> {
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return file
  if (file.size <= TARGET_BYTES) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    let quality = 0.82
    let blob: Blob | null = null
    while (quality >= 0.5) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (!blob || blob.size <= TARGET_BYTES) break
      quality -= 0.12
    }
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.(png|webp|jpe?g)$/i, '.jpg')
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
