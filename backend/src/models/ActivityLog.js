import mongoose from 'mongoose'

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    action: { type: String, enum: ['login', 'logout'], required: true },
  },
  { timestamps: true },
)

activityLogSchema.index({ createdAt: -1 })
activityLogSchema.index({ userId: 1 })

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema)
