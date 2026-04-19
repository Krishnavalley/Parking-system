import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
})

export const User = mongoose.model('User', UserSchema)
