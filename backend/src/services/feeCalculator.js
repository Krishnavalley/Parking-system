import { config } from '../config/index.js'
import { Setting } from '../models/Setting.js'

export async function getRatePerHour() {
  const doc = await Setting.findOne({ key: 'ratePerHour' })
  return doc ? doc.value : config.ratePerHour
}

export function calculateFee(entryTime, exitTime = new Date(), ratePerHour = config.ratePerHour) {
  if (!entryTime) return { durationMinutes: 0, fee: 0 }
  const durationMinutes = Math.ceil((exitTime - new Date(entryTime)) / 60000)
  const hours = Math.max(1, durationMinutes / 60)
  const fee = Math.ceil(hours * ratePerHour)
  return { durationMinutes, fee }
}
