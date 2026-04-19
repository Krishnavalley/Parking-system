import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = header.split(' ')[1]
  try {
    req.user = jwt.verify(token, config.jwtSecret)
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    if (role === 'user') {
      if (req.user.role === 'user' || req.user.role === 'admin') return next()
    } else {
      if (req.user.role === role) return next()
    }
    return res.status(403).json({ error: 'Forbidden' })
  }
}
