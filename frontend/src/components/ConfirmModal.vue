<template>
  <div v-if="visible" class="overlay">
    <div class="modal">
      <h3 class="title">{{ title }}</h3>
      <div class="body">
        <slot>{{ message }}</slot>
      </div>
      <div class="actions">
        <button class="btn secondary" @click="$emit('cancel')">{{ secondaryLabel }}</button>
        <button class="btn primary" @click="$emit('confirm')">{{ primaryLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: 'Confirm' },
  message: { type: String, default: '' },
  primaryLabel: { type: String, default: 'OK' },
  secondaryLabel: { type: String, default: 'Cancel' },
})

defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; display:flex; align-items:center; justify-content:center;
  background: var(--overlay); z-index:1000;
}
.modal { background: var(--card-bg); padding:18px; border-radius:8px; width:340px; box-shadow:0 12px 32px rgba(0,0,0,0.24); color:var(--text) }
.title { margin:0 0 8px 0; font-size:18px }
.body { margin-bottom:12px; color:var(--muted) }
.actions { display:flex; justify-content:flex-end; gap:8px }
.btn { padding:8px 12px; border-radius:6px; border:none; cursor:pointer }
.btn.primary { background:var(--btn-bg); color:var(--btn-text) }
.btn.secondary { background:transparent; border:1px solid rgba(0,0,0,0.08) }
</style>
