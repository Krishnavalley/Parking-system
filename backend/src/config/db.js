import mongoose from 'mongoose'
import { config } from './index.js'

export async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri)
    console.log('DB Connected')
  } catch (err) {
    console.error('DB Connection Error:', err.message)
    process.exit(1)
  }
}
