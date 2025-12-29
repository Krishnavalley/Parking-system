<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <div class="left">
        <div class="brand">Smart Parking System</div>
        <div class="meta">&copy; {{ year }} SmartParking. All rights reserved.</div>
      </div>

      <div class="links">
        <a href="#" @click.prevent="$emit('open','terms')">Terms</a>
        <a href="#" @click.prevent="$emit('open','privacy')">Privacy</a>
        <a href="#" @click.prevent="$emit('open','help')">Help</a>
        <a href="mailto:support@smartparking.example">Contact</a>
      </div>

      <div class="right">
        <div class="version">v1.0.0</div>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'AppFooter',
  data() {
    return { year: new Date().getFullYear() }
  }
}
</script>

<style scoped>
.app-footer { padding:18px 20px; background:var(--nav-bg); border-top:1px solid rgba(0,0,0,0.04); color:var(--muted); width:100% }
.footer-inner { max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:12px }
.brand { font-weight:700; color:var(--text) }
.meta { font-size:13px; margin-top:4px }
.links { display:flex; gap:12px; align-items:center }
.links a { color:var(--muted); text-decoration:none; font-weight:600; padding:6px 8px; border-radius:6px }
.links a:hover { color:var(--accent); background:rgba(29,78,216,0.06) }
.version { font-size:13px; color:var(--muted) }

@media (max-width:700px) {
  .footer-inner { flex-direction:column; align-items:flex-start }
  .links { flex-wrap:wrap }
}
</style>
