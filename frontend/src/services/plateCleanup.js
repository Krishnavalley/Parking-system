/**
 * Smart Plate Cleanup — fixes common Tesseract OCR misreads
 * for Indian license plates (format: XX 00 XX 0000).
 *
 * Indian plate pattern:  2 letters, 2 digits, 1-2 letters, 4 digits
 * Examples: KA01AB1234, MH12DE5678, DL3CAF9012
 */

// Characters OCR commonly confuses
const alphaFixes = { 0: 'O', 1: 'I', 5: 'S', 8: 'B', 2: 'Z' }
const digitFixes = { O: '0', I: '1', S: '5', B: '8', Z: '2', o: '0', l: '1', s: '5' }

function fixAlpha(ch) {
  return alphaFixes[ch] || ch.toUpperCase()
}

function fixDigit(ch) {
  return digitFixes[ch] || ch
}

/**
 * Attempt to clean an OCR-recognised Indian plate string.
 * Steps:
 *  1. Strip spaces, dashes, and lowercase → uppercase
 *  2. Apply positional character fixes based on expected pattern
 *  3. Return the cleaned plate
 */
export function cleanPlate(raw) {
  if (!raw) return ''

  // Normalise: strip everything except alphanumeric, uppercase
  let plate = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

  if (plate.length < 6) return plate // too short to reason about

  // Indian plate pattern segments:
  //   [0-1]  state code  — alpha  (KA, MH, DL …)
  //   [2-3]  district    — digit  (01, 12, …)
  //   [4..]  series+number — 1-3 alpha then 1-4 digit
  // Total typical length: 9-10 chars

  // Fix state code (positions 0-1 must be alpha)
  plate = fixAlpha(plate[0]) + fixAlpha(plate[1]) + plate.slice(2)

  // Fix district digits (positions 2-3 must be digits)
  plate = plate.slice(0, 2) + fixDigit(plate[2]) + fixDigit(plate[3]) + plate.slice(4)

  // Split remaining into alpha series + trailing digits
  const tail = plate.slice(4)
  const alphaMatch = tail.match(/^([A-Z0-9]{1,3})([A-Z0-9]{1,4})$/)
  if (alphaMatch) {
    const seriesRaw = alphaMatch[1]
    const numberRaw = alphaMatch[2]

    // Series part — fix digits that should be letters
    const seriesFixed = [...seriesRaw].map(ch => (/\d/.test(ch) ? fixAlpha(ch) : ch.toUpperCase())).join('')
    // Number part — fix letters that should be digits
    const numberFixed = [...numberRaw].map(ch => (/[A-Z]/i.test(ch) ? fixDigit(ch) : ch)).join('')

    plate = plate.slice(0, 4) + seriesFixed + numberFixed
  }

  return plate
}

/**
 * Format plate with standard Indian spacing: XX 00 XX 0000
 */
export function formatPlate(plate) {
  const clean = cleanPlate(plate)
  if (clean.length < 9) return clean
  // XX 00 XX 0000 or XX 00 X 0000
  const state = clean.slice(0, 2)
  const district = clean.slice(2, 4)
  const rest = clean.slice(4)
  const alphaEnd = rest.search(/\d/)
  if (alphaEnd <= 0) return clean
  const series = rest.slice(0, alphaEnd)
  const num = rest.slice(alphaEnd)
  return `${state} ${district} ${series} ${num}`
}
