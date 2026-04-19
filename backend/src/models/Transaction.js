import mongoose from 'mongoose'

const TransactionSchema = new mongoose.Schema({
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', index: true },
  vehicle: { type: String, index: true },
  entryTime: { type: Date, default: null, index: true },
  exitTime: { type: Date, default: null },
  durationMinutes: { type: Number, default: 0 },
  fee: { type: Number, default: 0 },
  status: { type: String, default: 'OPEN', index: true },
})

export const Transaction = mongoose.model('Transaction', TransactionSchema)
