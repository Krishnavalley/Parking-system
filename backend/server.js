import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB URL
const MONGO_URL = "mongodb+srv://vishalroygzb_db_user:lIl5O4Y60vzt0p22@vibe.cunobnc.mongodb.net/parking?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("DB Connected"))
  .catch((err) => console.log(err));

// Slot Schema
const SlotSchema = new mongoose.Schema({
  number: Number,
  status: { type: String, default: "FREE" },
  vehicle: { type: String, default: "" }
});

const Slot = mongoose.model("Slot", SlotSchema);

// Seed route
app.get("/seed", async (req, res) => {
  await Slot.deleteMany({});
  for (let i = 1; i <= 10; i++) {
    await Slot.create({ number: i });
  }
  res.send("Seeded 10 slots!");
});

// Get all slots
app.get("/slots", async (req, res) => {
  const slots = await Slot.find();
  res.json(slots);
});

// Assign vehicle to a slot
app.post("/slots/book/:id", async (req, res) => {
  const { vehicle } = req.body;
  if (!vehicle) return res.status(400).json({ error: "Vehicle required" });

  await Slot.findByIdAndUpdate(req.params.id, { status: "OCCUPIED", vehicle });
  res.json({ message: `Slot booked for ${vehicle}` });
});

// Free a slot
app.post("/slots/free/:id", async (req, res) => {
  await Slot.findByIdAndUpdate(req.params.id, { status: "FREE", vehicle: "" });
  res.json({ message: "Slot freed" });
});

app.listen(5000, () => console.log("Server running on port 5000"));
