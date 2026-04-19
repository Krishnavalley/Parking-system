import { Router } from 'express'
import { Transaction } from '../models/Transaction.js'
import { Slot } from '../models/Slot.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /insights — admin-only dashboard aggregation
router.get('/', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      todayEntries,
      todayExits,
      revenueAgg,
      avgDurationAgg,
      peakHourAgg,
      totalSlots,
      occupiedSlots,
    ] = await Promise.all([
      // Entries today
      Transaction.countDocuments({ entryTime: { $gte: startOfDay } }),
      // Exits today
      Transaction.countDocuments({ exitTime: { $gte: startOfDay }, status: 'CLOSED' }),
      // Revenue today
      Transaction.aggregate([
        { $match: { exitTime: { $gte: startOfDay }, status: 'CLOSED' } },
        { $group: { _id: null, total: { $sum: '$fee' } } },
      ]),
      // Average duration today (closed transactions)
      Transaction.aggregate([
        { $match: { exitTime: { $gte: startOfDay }, status: 'CLOSED' } },
        { $group: { _id: null, avg: { $avg: '$durationMinutes' } } },
      ]),
      // Peak hour today (by entry count per hour)
      Transaction.aggregate([
        { $match: { entryTime: { $gte: startOfDay } } },
        { $group: { _id: { $hour: '$entryTime' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      // Total slots
      Slot.countDocuments(),
      // Currently occupied
      Slot.countDocuments({ status: 'OCCUPIED' }),
    ])

    const todayRevenue = revenueAgg[0]?.total || 0
    const avgDuration = Math.round(avgDurationAgg[0]?.avg || 0)
    const peakHour = peakHourAgg[0] ? peakHourAgg[0]._id : null
    const occupancyPercent = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0

    res.json({
      todayEntries,
      todayExits,
      todayRevenue,
      avgDurationMinutes: avgDuration,
      peakHour,
      totalSlots,
      occupiedSlots,
      occupancyPercent,
    })
  } catch (err) {
    next(err)
  }
})

export default router
