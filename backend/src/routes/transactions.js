import { Router } from 'express'
import { query, validationResult } from 'express-validator'
import { Transaction } from '../models/Transaction.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

// List transactions with pagination
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg })

    const page = req.query.page || 1
    const limit = req.query.limit || 50
    const skip = (page - 1) * limit

    const [transactions, total] = await Promise.all([
      Transaction.find().sort({ entryTime: -1 }).skip(skip).limit(limit).populate('slot'),
      Transaction.countDocuments(),
    ])

    res.json({
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  },
)

export default router
