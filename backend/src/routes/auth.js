import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { User } from '../models/User.js'
import { ActivityLog } from '../models/ActivityLog.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { loginLimiter } from '../middleware/rateLimiter.js'
import { config } from '../config/index.js'

const router = Router()

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg })
  next()
}

// login
router.post(
  '/login',
  loginLimiter,
  body('username').trim().notEmpty().withMessage('username is required'),
  body('password').notEmpty().withMessage('password is required'),
  validate,
  async (req, res) => {
    const { username, password } = req.body
    const user = await User.findOne({ username })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: '8h' },
    )
    // record login activity
    ActivityLog.create({ userId: user._id, username: user.username, action: 'login' }).catch(() => {})
    res.json({ token, role: user.role })
  },
)

// admin registers users
router.post(
  '/register',
  authenticate,
  requireRole('admin'),
  body('username').trim().notEmpty().withMessage('username is required'),
  body('password').isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'user']).withMessage('role must be admin or user'),
  validate,
  async (req, res) => {
    const { username, password, role } = req.body
    const existing = await User.findOne({ username })
    if (existing) return res.status(409).json({ error: 'User already exists' })
    const hash = await bcrypt.hash(password, 10)
    const u = await User.create({ username, passwordHash: hash, role: role || 'user' })
    res.json({ id: u._id, username: u.username, role: u.role })
  },
)

// logout — record activity
router.post('/logout', authenticate, async (req, res) => {
  ActivityLog.create({ userId: req.user.id, username: req.user.username, action: 'logout' }).catch(() => {})
  res.json({ message: 'Logged out' })
})

// current user info
router.get('/me', authenticate, async (req, res) => {
  const u = await User.findById(req.user.id).select('-passwordHash')
  res.json(u)
})

// change own password
router.post(
  '/change-password',
  authenticate,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate,
  async (req, res) => {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    const ok = await bcrypt.compare(req.body.currentPassword, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' })
    user.passwordHash = await bcrypt.hash(req.body.newPassword, 10)
    await user.save()
    res.json({ message: 'Password changed successfully' })
  },
)

// --- User management (admin only) ---

// list all users
router.get('/users', authenticate, requireRole('admin'), async (_req, res) => {
  const users = await User.find().select('-passwordHash').sort({ username: 1 })
  res.json(users)
})

// delete a user (admin cannot delete self)
router.delete('/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }
  const user = await User.findByIdAndDelete(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ message: `User ${user.username} deleted` })
})

// reset a user's password (admin only)
router.post(
  '/users/:id/reset-password',
  authenticate,
  requireRole('admin'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
  async (req, res) => {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    user.passwordHash = await bcrypt.hash(req.body.newPassword, 10)
    await user.save()
    res.json({ message: `Password reset for ${user.username}` })
  },
)

export default router
