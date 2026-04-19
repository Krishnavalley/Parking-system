import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { config } from '../config/index.js'

export async function ensureDefaultAdmin() {
  try {
    const count = await User.countDocuments()
    if (count === 0) {
      const hash = await bcrypt.hash(config.defaultAdminPassword, 10)
      await User.create({ username: 'admin', passwordHash: hash, role: 'admin' })
      console.log('Created default admin: admin')
    }
  } catch (e) {
    console.error('ensureDefaultAdmin error', e)
  }
}
