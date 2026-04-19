import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/parking',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  ratePerHour: Number(process.env.RATE_PER_HOUR) || 20,
  defaultSlotCount: Number(process.env.DEFAULT_SLOT_COUNT) || 50,
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
}
