<template>
  <div class="camera-ocr">
    <div class="viewer">
      <video ref="video" autoplay playsinline></video>
      <canvas ref="canvas" style="display:none"></canvas>
    </div>
    <div class="controls">
      <button @click="toggleCamera">{{ streaming ? 'Stop' : 'Open Camera' }}</button>
      <button @click="capture" :disabled="!streaming">Capture</button>
      <input type="file" accept="image/*" @change="onFile" />
    </div>
    <div v-if="working" class="status">Recognizing...</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import { cleanPlate } from '../services/plateCleanup'

const emit = defineEmits(['recognized'])

const videoEl = useTemplateRef('video')
const canvasEl = useTemplateRef('canvas')

const streaming = ref(false)
const stream = ref(null)
const worker = ref(null)
const working = ref(false)
const videoReady = ref(false)

onMounted(async () => {
  try {
    const mod = await import('tesseract.js')
    const maybe = mod.createWorker ?? mod.default?.createWorker ?? mod.default ?? mod
    const create = typeof maybe === 'function' ? maybe : (maybe && typeof maybe.createWorker === 'function' ? maybe.createWorker : null)
    if (!create) throw new Error('tesseract.createWorker not available on dynamic import')
    let w = create({ logger: m => console.log('tesseract:', m) })
    if (w && typeof w.then === 'function') w = await w
    worker.value = w
    if (!worker.value || typeof worker.value.load !== 'function') throw new Error('worker API missing (load)')
    await worker.value.load()
    await worker.value.loadLanguage('eng')
    await worker.value.initialize('eng')
    await worker.value.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- ', tessedit_pageseg_mode: '7' })
    console.log('OCR worker initialized')
  } catch (err) {
    console.error('OCR worker init failed', err)
  }
})

async function startCamera() {
  try {
    videoReady.value = false
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    })
    const v = videoEl.value
    v.srcObject = stream.value
    const onLoaded = () => { videoReady.value = true; v.removeEventListener('loadedmetadata', onLoaded) }
    v.addEventListener('loadedmetadata', onLoaded)
    streaming.value = true
  } catch (e) {
    console.error('Camera start failed', e)
  }
}

function stopCamera() {
  if (stream.value?.getTracks) stream.value.getTracks().forEach(t => t.stop())
  if (videoEl.value) videoEl.value.srcObject = null
  stream.value = null
  streaming.value = false
  videoReady.value = false
}

function toggleCamera() {
  if (streaming.value) stopCamera(); else startCamera()
}

function capture() {
  const video = videoEl.value
  if (!video || !videoReady.value || (video.videoWidth === 0 && video.videoHeight === 0)) return
  const canvas = canvasEl.value
  const ctx = canvas.getContext('2d')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 480
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  recognizeCanvas(canvas)
}

function onFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const img = new Image()
  img.onload = () => {
    const canvas = canvasEl.value
    const ctx = canvas.getContext('2d')
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    recognizeCanvas(canvas)
  }
  img.src = URL.createObjectURL(file)
}

async function recognizeCanvas(canvas) {
  working.value = true
  try {
    const maxW = 1024
    let target = canvas
    if (canvas.width > maxW) {
      const ratio = maxW / canvas.width
      const tmp = document.createElement('canvas')
      tmp.width = Math.round(canvas.width * ratio)
      tmp.height = Math.round(canvas.height * ratio)
      tmp.getContext('2d').drawImage(canvas, 0, 0, tmp.width, tmp.height)
      target = tmp
    }
    try {
      const ctx = target.getContext('2d')
      const imgd = ctx.getImageData(0, 0, target.width, target.height)
      const d = imgd.data
      let sum = 0
      for (let i = 0; i < d.length; i += 4) {
        const g = Math.round((d[i] + d[i + 1] + d[i + 2]) / 3)
        d[i] = d[i + 1] = d[i + 2] = g
        sum += g
      }
      const mean = sum / (d.length / 4) || 128
      const thresh = Math.max(90, Math.min(200, Math.round(mean * 0.9)))
      for (let i = 0; i < d.length; i += 4) {
        const v = d[i] > thresh ? 255 : 0
        d[i] = d[i + 1] = d[i + 2] = v
      }
      ctx.putImageData(imgd, 0, 0)
    } catch (preErr) { console.warn('preprocessing skipped', preErr) }

    if (!worker.value) throw new Error('OCR worker not initialized')
    const result = await worker.value.recognize(target)
    const raw = (result?.data?.text || '').replace(/[^A-Z0-9\- ]/gi, '').trim()
    const text = cleanPlate(raw)
    if (text) emit('recognized', text)
  } catch (e) {
    console.error('OCR error', e)
  }
  working.value = false
}

onBeforeUnmount(() => {
  if (worker.value) worker.value.terminate()
  stopCamera()
})
</script>

<style scoped>
.camera-ocr { display:flex; flex-direction:column; gap:8px }
.viewer { width:320px; height:200px; background:#000; border-radius:8px; overflow:hidden }
.viewer video { width:100%; height:100%; object-fit:cover }
.controls { display:flex; gap:8px; align-items:center }
.status { color:var(--muted); font-size:13px }
</style>
