import { Router } from 'express'
import { ActivityLog } from '../models/ActivityLog.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /activity — admin fetches recent activity (last 50 by default)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200)
  const logs = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
  res.json(logs)
})

export default router
