<template>
  <div class="container">
    <h1>Parking Slots</h1>

    <div class="total-vehicles">
      Total Vehicles Parked: {{ totalVehicles }}
    </div>

    <div class="slots">
      <div
        v-for="slot in slots"
        :key="slot._id"
        class="slot-card"
        :class="slot.status.toLowerCase()"
      >
        <div class="slot-number">Slot {{ slot.number }}</div>
        <div class="slot-status">Status: {{ slot.status }}</div>
        <div class="slot-vehicle" v-if="slot.vehicle">Vehicle: {{ slot.vehicle }}</div>

        <div class="slot-action">
          <!-- FREE slot -->
          <div v-if="slot.status === 'FREE'">
            <input
              v-model="vehicleInput[slot._id]"
              placeholder="Enter vehicle no"
            />
            <button @click="bookSlot(slot._id)">Book</button>
          </div>

          <!-- OCCUPIED slot -->
          <div v-else>
            <button @click="exitSlot(slot._id)">Exit</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      slots: [],
      vehicleInput: {}
    };
  },
  computed: {
    totalVehicles() {
      return this.slots.filter(slot => slot.status === "OCCUPIED").length;
    }
  },
  methods: {
    load() {
      axios
        .get("http://localhost:5000/slots")
        .then((res) => (this.slots = res.data))
        .catch((err) => console.log(err));
    },
    bookSlot(id) {
      const vehicle = this.vehicleInput[id];
      if (!vehicle) return alert("Enter vehicle number");
      axios
        .post(`http://localhost:5000/slots/book/${id}`, { vehicle })
        .then(() => {
          this.vehicleInput[id] = "";
          this.load();
        });
    },
    exitSlot(id) {
      axios.post(`http://localhost:5000/slots/free/${id}`).then(this.load);
    }
  },
  mounted() {
    this.load();
  }
};
</script>

<style>
.container {
  width: 800px;
  margin: auto;
  font-family: sans-serif;
}
.total-vehicles {
  font-size: 18px;
  margin-bottom: 10px;
  font-weight: bold;
}
.slots {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  margin-top: 20px;
}
.slot-card {
  padding: 15px;
  border-radius: 10px;
  color: white;
  text-align: center;
  transition: transform 0.2s;
}
.slot-card:hover {
  transform: scale(1.05);
}
.free {
  background: #1abc9c;
}
.occupied {
  background: #e74c3c;
}
.slot-number {
  font-size: 18px;
  font-weight: bold;
}
.slot-status,
.slot-vehicle {
  margin-top: 5px;
  font-size: 14px;
}
.slot-action {
  margin-top: 10px;
}
input {
  padding: 5px;
  width: 70%;
  border-radius: 5px;
  border: none;
  margin-bottom: 5px;
}
button {
  padding: 5px 10px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
}
</style>
