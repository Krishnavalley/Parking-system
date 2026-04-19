import mongoose from 'mongoose'

const SlotSchema = new mongoose.Schema({
  number: { type: Number, unique: true, index: true },
  status: { type: String, default: 'FREE', index: true },
  vehicle: { type: String, default: '' },
  entryTime: { type: Date, default: null },
})

export const Slot = mongoose.model('Slot', SlotSchema)
