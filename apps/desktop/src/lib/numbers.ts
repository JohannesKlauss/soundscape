export function round(value: number, precision: number) {
  const multiplier = 10 ** (precision || 0)

  return Math.round(value * multiplier) / multiplier
}

export function panToLabel(panValue: number) {
  if (panValue === 0) {
    return 'C'
  }

  const scaledValue = Math.round(panValue * 60)

  return `${Math.abs(scaledValue)}${scaledValue < 0 ? 'L' : 'R'}`
}

export function panRangeToLabel(values: [number, number]) {
  if (values[0] === values[1] && values[0] === 0) {
    return 'C'
  }

  return `${panToLabel(values[0])}-${panToLabel(values[1])}`
}

export function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
