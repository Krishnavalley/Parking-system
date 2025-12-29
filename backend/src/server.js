import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB URL
const MONGO_URL = process.env.MONGO_URI || "mongodb+srv://vishalroygzb_db_user:lIl5O4Y60vzt0p22@vibe.cunobnc.mongodb.net/parking?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("DB Connected"))
  .catch((err) => console.log(err));

// ensure default admin exists
async function ensureDefaultAdmin() {
  try {
    const cnt = await User.countDocuments()
    if (cnt === 0) {
      const pw = 'admin123'
      const hash = await bcrypt.hash(pw, 10)
      await User.create({ username: 'admin', passwordHash: hash, role: 'admin' })
      console.log('Created default admin: admin / admin123')
    }
  } catch (e) { console.error('ensureDefaultAdmin error', e) }
}

mongoose.connection.on('connected', () => { ensureDefaultAdmin().catch(e=>console.error(e)) })

// Slot Schema
const SlotSchema = new mongoose.Schema({
  number: Number,
  status: { type: String, default: "FREE" },
  vehicle: { type: String, default: "" },
  entryTime: { type: Date, default: null }
});

const Slot = mongoose.model("Slot", SlotSchema);

// User schema for authentication
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['admin','user'], default: 'user' }
});
const User = mongoose.model('User', UserSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';
// Default model for any LLM calls from this backend. Set via env var DEFAULT_MODEL.
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gpt-5-mini';

// Transaction Schema - records each vehicle's entry and exit
const TransactionSchema = new mongoose.Schema({
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot' },
  vehicle: String,
  entryTime: { type: Date, default: null },
  exitTime: { type: Date, default: null },
  durationMinutes: { type: Number, default: 0 },
  fee: { type: Number, default: 0 },
  status: { type: String, default: 'OPEN' } // OPEN | CLOSED
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

// Seed route
app.get("/seed", async (req, res) => {
  await Slot.deleteMany({});
  for (let i = 1; i <= 50; i++) {
    await Slot.create({ number: i });
  }
  res.send("Seeded 10 slots!");
});

// --- Auth middleware and endpoints ---
function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function requireRole(role) {
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

// login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'username and password required' })
  const user = await User.findOne({ username })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ token, role: user.role })
})

// admin registers users
app.post('/auth/register', authenticate, requireRole('admin'), async (req, res) => {
  const { username, password, role } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'username and password required' })
  const existing = await User.findOne({ username })
  if (existing) return res.status(409).json({ error: 'User exists' })
  const hash = await bcrypt.hash(password, 10)
  const u = await User.create({ username, passwordHash: hash, role: role === 'admin' ? 'admin' : 'user' })
  res.json({ id: u._id, username: u.username, role: u.role })
})

app.get('/auth/me', authenticate, async (req, res) => {
  const u = await User.findById(req.user.id).select('-passwordHash')
  res.json(u)
})

// Get all slots
app.get("/slots", async (req, res) => {
  const slots = await Slot.find();
  res.json(slots);
});

// Assign vehicle to a slot
app.post("/slots/book/:id", authenticate, requireRole('user'), async (req, res) => {
  const { vehicle } = req.body;
  if (!vehicle) return res.status(400).json({ error: "Vehicle required" });

  const entryTime = new Date()
  await Slot.findByIdAndUpdate(req.params.id, { status: "OCCUPIED", vehicle, entryTime });
  const updated = await Slot.findById(req.params.id);

  // create transaction record
  const tx = await Transaction.create({ slot: updated._id, vehicle, entryTime, status: 'OPEN' });

  res.json({ message: `Slot booked for ${vehicle}`, slot: updated, transactionId: tx._id });
});

// Free a slot
app.post("/slots/free/:id", authenticate, requireRole('user'), async (req, res) => {
  const slot = await Slot.findById(req.params.id);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });

  const now = new Date();
  let durationMinutes = 0;
  let fee = 0;
  if (slot.entryTime) {
    durationMinutes = Math.ceil((now - slot.entryTime) / 60000);
    const ratePerHour = 20; // default rate, can be made configurable
    const hours = Math.max(1, durationMinutes / 60);
    fee = Math.ceil(hours * ratePerHour);
  }

  await Slot.findByIdAndUpdate(req.params.id, { status: "FREE", vehicle: "", entryTime: null });

  // close the associated transaction (if any)
  const tx = await Transaction.findOne({ slot: req.params.id, status: 'OPEN' }).sort({ _id: -1 });
  if (tx) {
    tx.exitTime = now;
    tx.durationMinutes = durationMinutes;
    tx.fee = fee;
    tx.status = 'CLOSED';
    await tx.save();
    await tx.populate('slot');
  }
  res.json({ message: "Slot freed", durationMinutes, fee, transaction: tx });
});

// Estimate fee for a slot without freeing it
app.get("/slots/estimate/:id", async (req, res) => {
  const slot = await Slot.findById(req.params.id);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });

  const now = new Date();
  let durationMinutes = 0;
  let fee = 0;
  if (slot.entryTime) {
    durationMinutes = Math.ceil((now - slot.entryTime) / 60000);
    const ratePerHour = 20; // same rate as free route
    const hours = Math.max(1, durationMinutes / 60);
    fee = Math.ceil(hours * ratePerHour);
  }

  res.json({ durationMinutes, fee, entryTime: slot.entryTime });
});

// List all transactions (history)
app.get('/transactions', authenticate, requireRole('admin'), async (req, res) => {
  const txs = await Transaction.find().sort({ entryTime: -1 }).populate('slot');
  res.json(txs);
});

// Simple config endpoint to expose runtime defaults (useful for clients)
app.get('/config', (req, res) => {
  res.json({ defaultModel: DEFAULT_MODEL });
});

export default app;
