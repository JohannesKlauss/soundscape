export const mimeToExt: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/webm': 'webm',
}

export function getExtensionFromContentType(contentType: string): string {
  const mime = contentType.split(';')[0].trim().toLowerCase()

  if (!mimeToExt[mime]) {
    throw new Error(`Unmapped content type: ${contentType}`)
  }

  return mimeToExt[mime]
}

export async function getSamplesDirectory() {
  const dir = await navigator.storage.getDirectory()
  return dir.getDirectoryHandle('samples', { create: true })
}

export async function readFileFromSamplesDirectory(fileName: string) {
  const dir = await getSamplesDirectory()
  const fileHandle = await dir.getFileHandle(fileName, { create: false })
  return await fileHandle.getFile()
}

export async function writeFileToSamplesDirectory(
  fileName: string,
  blob: Blob,
) {
  const dir = await getSamplesDirectory()
  const fileHandle = await dir.getFileHandle(fileName, { create: true })
  const writer = await fileHandle.createWritable({ keepExistingData: false })

  await writer.write(blob)
  await writer.close()
}

export async function readBufferFromSamplesFile(fileName: string) {
  const file = await readFileFromSamplesDirectory(fileName)

  return await file.arrayBuffer()
}
