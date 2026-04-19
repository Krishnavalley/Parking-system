import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import mongoose from 'mongoose'
import { config } from './config/index.js'
import { connectDB } from './config/db.js'
import { ensureDefaultAdmin } from './services/seedAdmin.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import slotRoutes from './routes/slots.js'
import transactionRoutes from './routes/transactions.js'
import insightsRoutes from './routes/insights.js'
import settingsRoutes from './routes/settings.js'
import activityRoutes from './routes/activity.js'

const app = express()

// --- Global middleware ---
app.use(cors({ origin: config.corsOrigin, credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

// --- Routes ---
app.use('/auth', authRoutes)
app.use('/slots', slotRoutes)
app.use('/transactions', transactionRoutes)
app.use('/insights', insightsRoutes)
app.use('/settings', settingsRoutes)
app.use('/activity', activityRoutes)

// --- Error handler (must be last) ---
app.use(errorHandler)

// --- DB connect + seed ---
connectDB().then(() => {
  mongoose.connection.on('connected', () => ensureDefaultAdmin().catch(console.error))
  // If already connected (which it is after connectDB resolves), run seed immediately
  ensureDefaultAdmin().catch(console.error)
})

export default app
