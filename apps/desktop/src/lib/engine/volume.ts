export function volumeToDb(vol: number): number {
  if (vol === 0) return -Infinity
  return 20 * Math.log10(vol)
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}