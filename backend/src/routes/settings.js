import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import mongoose from 'mongoose'
import os from 'os'
import { Setting } from '../models/Setting.js'
import { User } from '../models/User.js'
import { Slot } from '../models/Slot.js'
import { Transaction } from '../models/Transaction.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { config } from '../config/index.js'

const router = Router()
const startTime = Date.now()

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg })
  next()
}

// GET /settings/rate — anyone authenticated can see the rate
router.get('/rate', authenticate, async (_req, res) => {
  const doc = await Setting.findOne({ key: 'ratePerHour' })
  res.json({ ratePerHour: doc ? doc.value : config.ratePerHour })
})

// POST /settings/rate — admin only, update hourly rate
router.post(
  '/rate',
  authenticate,
  requireRole('admin'),
  body('ratePerHour').isFloat({ min: 1, max: 10000 }).withMessage('Rate must be between 1 and 10000'),
  validate,
  async (req, res) => {
    const rate = parseFloat(req.body.ratePerHour)
    await Setting.findOneAndUpdate(
      { key: 'ratePerHour' },
      { key: 'ratePerHour', value: rate },
      { upsert: true },
    )
    res.json({ message: `Rate updated to ₹${rate}/hr`, ratePerHour: rate })
  },
)

// GET /settings/info — admin only, system overview
router.get('/info', authenticate, requireRole('admin'), async (_req, res) => {
  const [totalUsers, totalSlots, occupiedSlots, totalTransactions] = await Promise.all([
    User.countDocuments(),
    Slot.countDocuments(),
    Slot.countDocuments({ status: 'OCCUPIED' }),
    Transaction.countDocuments(),
  ])

  const uptimeMs = Date.now() - startTime
  const uptimeHours = Math.floor(uptimeMs / 3600000)
  const uptimeMins = Math.floor((uptimeMs % 3600000) / 60000)

  res.json({
    totalUsers,
    totalSlots,
    occupiedSlots,
    totalTransactions,
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    serverUptime: `${uptimeHours}h ${uptimeMins}m`,
    nodeVersion: process.version,
    platform: `${os.type()} ${os.release()}`,
  })
})

export default router
