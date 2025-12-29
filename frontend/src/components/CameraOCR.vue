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

<script>
// tesseract import will be loaded dynamically in mounted() to handle different bundler shapes

export default {
  name: 'CameraOCR',
  emits: ['recognized'],
  data() {
    return { streaming: false, stream: null, worker: null, working: false, videoReady: false }
  },
  async mounted() {
    // initialize tesseract worker with basic logging
    try {
      const mod = await import('tesseract.js')
      const maybe = mod.createWorker ?? mod.default?.createWorker ?? mod.default ?? mod
      const create = typeof maybe === 'function' ? maybe : (maybe && typeof maybe.createWorker === 'function' ? maybe.createWorker : null)
      if (!create) throw new Error('tesseract.createWorker not available on dynamic import')
      // create may return the worker or a Promise resolving to the worker
      let w = create({ logger: m => console.log('tesseract:', m) })
      if (w && typeof w.then === 'function') w = await w
      this.worker = w
      if (!this.worker || typeof this.worker.load !== 'function') throw new Error('worker API missing (load)')
      await this.worker.load()
      await this.worker.loadLanguage('eng')
      await this.worker.initialize('eng')
      // allow lowercase and use single-line page segmentation mode (psm 7)
      await this.worker.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- ', tessedit_pageseg_mode: '7' })
      console.log('OCR worker initialized')
    } catch (err) {
      console.error('OCR worker init failed', err)
      alert('OCR initialization failed. Check console for details.')
    }
  },
  methods: {
    async startCamera() {
      try {
        this.videoReady = false
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })
        const videoEl = this.$refs.video
        videoEl.srcObject = this.stream
        // wait for metadata so width/height are available
        const onLoaded = () => {
          this.videoReady = true
          videoEl.removeEventListener('loadedmetadata', onLoaded)
        }
        videoEl.addEventListener('loadedmetadata', onLoaded)
        this.streaming = true
      } catch (e) { console.error('Camera start failed', e); alert('Camera access failed') }
    },
    stopCamera() {
      if (this.stream && this.stream.getTracks) this.stream.getTracks().forEach(t => t.stop())
      if (this.$refs.video) this.$refs.video.srcObject = null
      this.stream = null
      this.streaming = false
      this.videoReady = false
    },
    toggleCamera() {
      if (this.streaming) this.stopCamera(); else this.startCamera()
    },
    capture() {
      const video = this.$refs.video
      if (!video || !this.videoReady || (video.videoWidth === 0 && video.videoHeight === 0)) {
        alert('Camera not ready yet. Please wait a moment.')
        return
      }
      const canvas = this.$refs.canvas
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      this.recognizeCanvas(canvas)
    },
    onFile(e) {
      const file = e.target.files[0]
      if (!file) return
      const img = new Image()
      img.onload = () => {
        const canvas = this.$refs.canvas
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        this.recognizeCanvas(canvas)
      }
      img.src = URL.createObjectURL(file)
    },
    async recognizeCanvas(canvas) {
      this.working = true
      try {
        // simple preprocessing: resize if large and convert to grayscale+threshold
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
        // adaptive preprocessing: grayscale, compute mean, threshold around mean
        try {
          const ctx = target.getContext('2d')
          const imgd = ctx.getImageData(0, 0, target.width, target.height)
          const d = imgd.data
          // grayscale and mean
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

        if (!this.worker) throw new Error('OCR worker not initialized')
        const result = await this.worker.recognize(target)
        const text = (result?.data?.text || '').replace(/[^A-Z0-9\- ]/gi, '').trim()
        if (text) this.$emit('recognized', text)
      } catch (e) { console.error('OCR error', e); alert('Recognition failed — see console') }
      this.working = false
    }
  },
  beforeUnmount() {
    if (this.worker) this.worker.terminate()
    this.stopCamera()
  }
}
</script>

<style scoped>
.camera-ocr { display:flex; flex-direction:column; gap:8px }
.viewer { width:320px; height:200px; background:#000; border-radius:8px; overflow:hidden }
.viewer video { width:100%; height:100%; object-fit:cover }
.controls { display:flex; gap:8px; align-items:center }
.status { color:var(--muted); font-size:13px }
</style>
