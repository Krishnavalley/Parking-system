import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { Slot } from '../models/Slot.js'
import { Transaction } from '../models/Transaction.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { calculateFee, getRatePerHour } from '../services/feeCalculator.js'
import { config } from '../config/index.js'

const router = Router()

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg })
  next()
}

// Get all slots (auth required)
router.get('/', authenticate, async (req, res) => {
  const slots = await Slot.find().sort({ number: 1 })
  res.json(slots)
})

// Seed slots (admin only)
router.post('/seed', authenticate, requireRole('admin'), async (req, res) => {
  const count = config.defaultSlotCount
  await Slot.deleteMany({})
  const slots = Array.from({ length: count }, (_, i) => ({ number: i + 1 }))
  await Slot.insertMany(slots)
  res.json({ message: `Seeded ${count} slots` })
})

// Adjust total slot count (admin only) — adds or removes FREE slots
router.post(
  '/adjust',
  authenticate,
  requireRole('admin'),
  body('totalSlots').isInt({ min: 1, max: 1000 }).withMessage('totalSlots must be between 1 and 1000'),
  validate,
  async (req, res) => {
    const desired = parseInt(req.body.totalSlots, 10)
    const current = await Slot.countDocuments()

    if (desired > current) {
      // Add new slots, numbering continues from highest existing
      const highest = await Slot.findOne().sort({ number: -1 })
      const startNum = (highest?.number || 0) + 1
      const newSlots = Array.from({ length: desired - current }, (_, i) => ({ number: startNum + i }))
      await Slot.insertMany(newSlots)
      return res.json({ message: `Added ${desired - current} slots (total: ${desired})`, total: desired })
    }

    if (desired < current) {
      // Only remove FREE slots from the highest numbers down
      const toRemove = current - desired
      const freeCount = await Slot.countDocuments({ status: 'FREE' })
      if (toRemove > freeCount) {
        return res.status(409).json({ error: `Cannot remove ${toRemove} slots — only ${freeCount} are free` })
      }
      const slotsToRemove = await Slot.find({ status: 'FREE' }).sort({ number: -1 }).limit(toRemove)
      await Slot.deleteMany({ _id: { $in: slotsToRemove.map(s => s._id) } })
      return res.json({ message: `Removed ${toRemove} free slots (total: ${desired})`, total: desired })
    }

    res.json({ message: 'No change needed', total: desired })
  },
)

// Book a slot — atomic check-and-set to prevent race conditions
router.post(
  '/book/:id',
  authenticate,
  requireRole('user'),
  body('vehicle').trim().notEmpty().withMessage('Vehicle number is required')
    .isLength({ max: 20 }).withMessage('Vehicle number too long'),
  validate,
  async (req, res) => {
    const vehicle = req.body.vehicle.trim().toUpperCase()

    // Check if vehicle is already parked (uniqueness)
    const alreadyParked = await Slot.findOne({ vehicle, status: 'OCCUPIED' })
    if (alreadyParked) {
      return res.status(409).json({ error: `Vehicle ${vehicle} is already parked in slot ${alreadyParked.number}` })
    }

    const entryTime = new Date()

    // Atomic: only update if the slot is currently FREE
    const updated = await Slot.findOneAndUpdate(
      { _id: req.params.id, status: 'FREE' },
      { status: 'OCCUPIED', vehicle, entryTime },
      { new: true },
    )
    if (!updated) {
      return res.status(409).json({ error: 'Slot is not available (already taken or not found)' })
    }

    const tx = await Transaction.create({ slot: updated._id, vehicle, entryTime, status: 'OPEN' })
    res.json({ message: `Slot booked for ${vehicle}`, slot: updated, transactionId: tx._id })
  },
)

// Free a slot
router.post('/free/:id', authenticate, requireRole('user'), async (req, res) => {
  const slot = await Slot.findById(req.params.id)
  if (!slot) return res.status(404).json({ error: 'Slot not found' })

  const now = new Date()
  const rate = await getRatePerHour()
  const { durationMinutes, fee } = calculateFee(slot.entryTime, now, rate)

  await Slot.findByIdAndUpdate(req.params.id, { status: 'FREE', vehicle: '', entryTime: null })

  const tx = await Transaction.findOne({ slot: req.params.id, status: 'OPEN' }).sort({ _id: -1 })
  if (tx) {
    tx.exitTime = now
    tx.durationMinutes = durationMinutes
    tx.fee = fee
    tx.status = 'CLOSED'
    await tx.save()
    await tx.populate('slot')
  }
  res.json({ message: 'Slot freed', durationMinutes, fee, transaction: tx })
})

// Estimate fee without freeing
router.get('/estimate/:id', authenticate, async (req, res) => {
  const slot = await Slot.findById(req.params.id)
  if (!slot) return res.status(404).json({ error: 'Slot not found' })

  const rate = await getRatePerHour()
  const { durationMinutes, fee } = calculateFee(slot.entryTime, undefined, rate)
  res.json({ durationMinutes, fee, entryTime: slot.entryTime })
})

export default router
